import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";

export type ConnectionMode = "real" | "demo" | "error";

export interface LiveEvent {
  type: "comment" | "gift" | "like" | "follow" | "share" | "viewerCount" | "ai_announcement"
      | "xp_awarded" | "achievement_unlocked" | "level_up"
      | "lucky_drop" | "boss_reward" | "quiz_win" | "treasure_hunt_win" | "kingdom_upgrade";
  sessionId: number;
  username?: string;
  avatarUrl?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AutomationFiredEvent {
  automationId: number;
  automationName: string;
  actionType: string;
  actionPayload: string;
  triggerEvent: LiveEvent;
  timestamp: number;
}

export interface AiAnnouncementEvent {
  text: string;
  type: "gift" | "level_up" | "boss_defeated" | string;
  viewerName?: string;
  bossName?: string;
  timestamp: number;
}

export interface ModerationFlaggedEvent {
  viewerName: string;
  comment: string;
  reason: string;
  timestamp: number;
}

export interface TikTokStatusEvent {
  mode: ConnectionMode;
  error?: string;
  username?: string;
}

export interface LiveStats {
  viewerCount: number;
  totalGifts: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalShares: number;
  topSupporters: Array<{ username: string; coins: number }>;
}

export interface XpAwardedEvent {
  viewerName: string;
  tiktokViewerId: string;
  xp: number;
  coins: number;
  totalXp: number;
  level: number;
  eventType: string;
  timestamp: number;
}

export interface LevelUpEvent {
  viewerName: string;
  newLevel: number;
  timestamp: number;
}

export interface AchievementUnlockEvent {
  viewerName: string;
  achievement: {
    key: string;
    name: string;
    description: string;
    iconType: string;
    xpReward: number;
    coinReward: number;
  };
  timestamp: number;
}

export interface LuckyDropEvent {
  id?: number;
  dropName: string;
  prizeDescription: string;
  xpReward: number;
  coinReward: number;
  winnerName: string;
  triggerType: string;
  timestamp: number;
}

export interface KingdomUpdateEvent {
  streamerId: number;
  gold: number;
  wood: number;
  stone: number;
  goldDelta: number;
  woodDelta: number;
  stoneDelta: number;
  timestamp: number;
}

export interface LeaderboardUpdateEvent {
  sessionId: number | null;
  streamerId: number;
  viewerName: string;
  tiktokViewerId: string;
  totalXp: number;
  level: number;
  timestamp: number;
}

export type TtsMode = "off" | "browser" | "openai";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE_URL}/api`;

// Queue to prevent overlapping TTS playback
let ttsQueue: Promise<void> = Promise.resolve();

async function playOpenAiTts(text: string, voice: string, volume: number, speed = 1.0): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/ai/voice`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? `HTTP ${res.status}`;
      console.warn(`[TTS] OpenAI TTS error: ${msg} — falling back to browser TTS`);
      window.dispatchEvent(new CustomEvent("tts:error", { detail: msg }));
      playBrowserTts(text);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));

    // Dispatch tts:audio so useLipSync can tap in via Web Audio API
    window.dispatchEvent(new CustomEvent("tts:audio", { detail: audio }));
    window.dispatchEvent(new CustomEvent("tts:start"));

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        window.dispatchEvent(new CustomEvent("tts:end"));
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        playBrowserTts(text);
        resolve();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          URL.revokeObjectURL(url);
          playBrowserTts(text);
          resolve();
        });
      }
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.warn("[TTS] OpenAI TTS playback error:", msg, "— falling back to browser TTS");
    window.dispatchEvent(new CustomEvent("tts:error", { detail: msg }));
    playBrowserTts(text);
  }
}

function detectTtsLang(text: string): string {
  if (/[іїєІЇЄґҐ]/.test(text)) return "uk-UA";
  if (/виграв|виграш|щасли|привіт|вітаємо|дякую|будь ласка|зараз|будемо|рівень|переможе/i.test(text)) return "uk-UA";
  if (/[а-яА-Я]/.test(text)) return "ru-RU";
  if (/[ąęóśźżćłńÄĘÓŚŹŻĆŁŃ]/i.test(text)) return "pl-PL";
  if (/[äöüÄÖÜß]/.test(text)) return "de-DE";
  return "en-US";
}

function playBrowserTts(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = detectTtsLang(text);
  utt.rate = 1.1;
  utt.pitch = 1.05;
  utt.onstart = () => window.dispatchEvent(new CustomEvent("tts:start"));
  utt.onend = () => window.dispatchEvent(new CustomEvent("tts:end"));
  window.speechSynthesis.speak(utt);
}

function enqueueTts(fn: () => Promise<void>): void {
  ttsQueue = ttsQueue.then(fn).catch(() => {});
}

export function useLiveSession(
  sessionId: number | null | undefined,
  initialMode?: ConnectionMode | null,
) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [automationsFired, setAutomationsFired] = useState<AutomationFiredEvent[]>([]);
  const [aiAnnouncements, setAiAnnouncements] = useState<AiAnnouncementEvent[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<ModerationFlaggedEvent[]>([]);
  const [recentXpAwards, setRecentXpAwards] = useState<XpAwardedEvent[]>([]);
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlockEvent[]>([]);
  const [luckyDrops, setLuckyDrops] = useState<LuckyDropEvent[]>([]);
  const [levelUps, setLevelUps] = useState<LevelUpEvent[]>([]);
  const [kingdomUpdates, setKingdomUpdates] = useState<KingdomUpdateEvent[]>([]);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);

  const [tiktokMode, setTiktokMode] = useState<ConnectionMode | null>(initialMode ?? null);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [tiktokUsername, setTiktokUsername] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode != null) {
      setTiktokMode((prev) => prev ?? initialMode);
    }
  }, [initialMode]);

  const ttsModeRef = useRef<TtsMode>(
    (() => {
      try { return (localStorage.getItem("ttsMode") as TtsMode | null) ?? "off"; }
      catch { return "off"; }
    })()
  );
  const ttsVoiceRef = useRef<string>(
    (() => { try { return localStorage.getItem("ttsVoice") ?? "nova"; } catch { return "nova"; } })()
  );
  const ttsVolumeRef = useRef<number>(
    (() => { try { return Number(localStorage.getItem("ttsVolume") ?? "1.0") || 1.0; } catch { return 1.0; } })()
  );
  const ttsSpeedRef = useRef<number>(
    (() => { try { return Number(localStorage.getItem("ttsSpeed") ?? "1.0") || 1.0; } catch { return 1.0; } })()
  );

  const setTtsMode = useCallback((mode: TtsMode) => { ttsModeRef.current = mode; }, []);
  const setTtsVoice = useCallback((voice: string) => { ttsVoiceRef.current = voice; }, []);
  const setTtsVolume = useCallback((volume: number) => {
    ttsVolumeRef.current = Math.max(0, Math.min(1, volume));
  }, []);
  const setTtsSpeed = useCallback((speed: number) => {
    ttsSpeedRef.current = Math.max(0.25, Math.min(4.0, speed));
  }, []);

  // Legacy compatibility
  const setTtsEnabled = useCallback((enabled: boolean) => {
    ttsModeRef.current = enabled ? "browser" : "off";
  }, []);

  const [stats, setStats] = useState<LiveStats>({
    viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0,
    totalComments: 0, totalShares: 0, topSupporters: [],
  });
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const supportersRef = useRef<Map<string, number>>(new Map());
  const authRetryRef = useRef(false);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setAutomationsFired([]);
    setAiAnnouncements([]);
    setFlaggedComments([]);
    setRecentXpAwards([]);
    setAchievementUnlocks([]);
    setLuckyDrops([]);
    setLevelUps([]);
    setTranslations({});
    setKingdomUpdates([]);
    setLeaderboardVersion(0);
    setStats({
      viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0,
      totalComments: 0, totalShares: 0, topSupporters: [],
    });
    supportersRef.current = new Map();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const connect = async () => {
      authRetryRef.current = false;
      const token = await getToken();
      if (cancelled || !token) return;

      const socket = io(window.location.origin, {
        path: `${BASE_URL}/api/socket.io`,
        transports: ["websocket", "polling"],
        auth: { token },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("session:join", sessionId);
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("session:error", (err: { message: string }) => {
        console.error("[LiveSession] Socket auth error:", err.message);
        if (err.message === "Invalid auth token" && !authRetryRef.current && !cancelled) {
          authRetryRef.current = true;
          console.log("[LiveSession] Token expired — refreshing and reconnecting…");
          socket.removeAllListeners();
          socket.disconnect();
          socketRef.current = null;
          setTimeout(() => { if (!cancelled) void connect(); }, 1500);
        }
      });

      socket.on("tiktok:status", (payload: TikTokStatusEvent) => {
        setTiktokMode(payload.mode);
        setTiktokError(payload.error ?? null);
        setTiktokUsername(payload.username ?? null);
      });

      socket.on("live:event", (event: LiveEvent) => {
        setEvents((prev) => [event, ...prev].slice(0, 200));

        setStats((prev) => {
          const next = { ...prev };
          if (event.type === "viewerCount") {
            next.viewerCount = (event.data.count as number) ?? prev.viewerCount;
          } else if (event.type === "gift") {
            const coins = (event.data.coins as number) ?? 0;
            next.totalGifts += coins;
            if (event.username) {
              const current = supportersRef.current.get(event.username) ?? 0;
              supportersRef.current.set(event.username, current + coins);
              next.topSupporters = Array.from(supportersRef.current.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([username, coins]) => ({ username, coins }));
            }
          } else if (event.type === "like") {
            next.totalLikes += (event.data.likeCount as number) ?? 1;
          } else if (event.type === "follow") {
            next.totalFollows += 1;
          } else if (event.type === "comment") {
            next.totalComments += 1;
          } else if (event.type === "share") {
            next.totalShares += 1;
          }
          return next;
        });
      });

      socket.on("xp:awarded", (payload: XpAwardedEvent) => {
        setRecentXpAwards((prev) => [payload, ...prev].slice(0, 30));
        setEvents((prev) => [{
          type: "xp_awarded" as const,
          sessionId: sessionId!,
          username: payload.viewerName,
          data: {
            xp: payload.xp,
            coins: payload.coins,
            level: payload.level,
            totalXp: payload.totalXp,
            eventType: payload.eventType,
          },
          timestamp: payload.timestamp,
        }, ...prev].slice(0, 200));
      });

      socket.on("level:up", (payload: LevelUpEvent) => {
        setLevelUps((prev) => [payload, ...prev].slice(0, 20));
        setEvents((prev) => [{
          type: "level_up" as const,
          sessionId: sessionId!,
          username: payload.viewerName,
          data: { newLevel: payload.newLevel },
          timestamp: payload.timestamp,
        }, ...prev].slice(0, 200));
      });

      socket.on("achievement:unlocked", (payload: AchievementUnlockEvent) => {
        setAchievementUnlocks((prev) => [payload, ...prev].slice(0, 20));
        setEvents((prev) => [{
          type: "achievement_unlocked" as const,
          sessionId: sessionId!,
          username: payload.viewerName,
          data: {
            achievementName: payload.achievement.name,
            achievementKey: payload.achievement.key,
            xpReward: payload.achievement.xpReward,
          },
          timestamp: payload.timestamp,
        }, ...prev].slice(0, 200));
      });

      socket.on("lucky_drop:fired", (payload: LuckyDropEvent) => {
        setLuckyDrops((prev) => [payload, ...prev].slice(0, 20));
      });

      socket.on("kingdom:update", (payload: KingdomUpdateEvent) => {
        setKingdomUpdates((prev) => [payload, ...prev].slice(0, 20));
      });

      socket.on("leaderboard:update", (_payload: LeaderboardUpdateEvent) => {
        setLeaderboardVersion((v) => v + 1);
      });

      socket.on("automation:fired", (event: AutomationFiredEvent) => {
        setAutomationsFired((prev) => [event, ...prev].slice(0, 50));
      });

      socket.on("tts:play", (payload: { audioBase64: string; mimeType: string; text: string }) => {
        try {
          const binary = atob(payload.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: payload.mimeType ?? "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = Math.max(0, Math.min(1, ttsVolumeRef.current));
          window.dispatchEvent(new CustomEvent("tts:audio", { detail: audio }));
          window.dispatchEvent(new CustomEvent("tts:start"));
          enqueueTts(() => new Promise<void>((resolve) => {
            audio.onended = () => { URL.revokeObjectURL(url); window.dispatchEvent(new CustomEvent("tts:end")); resolve(); };
            audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
            audio.play().catch(() => resolve());
          }));
        } catch (err) {
          console.warn("[tts:play] Failed to play automation audio:", err);
        }
      });

      socket.on("system:message", (payload: { text: string; automationName: string; timestamp: number }) => {
        const ts = payload.timestamp ?? Date.now();
        setEvents((prev) =>
          [
            {
              type: "ai_announcement" as const,
              sessionId: sessionId!,
              username: payload.automationName ?? "Automation",
              data: { text: payload.text, announcementType: "system_message" },
              timestamp: ts,
            },
            ...prev,
          ].slice(0, 200),
        );
      });

      socket.on("ai:announcement", (payload: Omit<AiAnnouncementEvent, "timestamp">) => {
        const ts = Date.now();
        setAiAnnouncements((prev) => [{ ...payload, timestamp: ts }, ...prev].slice(0, 30));
        setEvents((prev) =>
          [
            {
              type: "ai_announcement" as const,
              sessionId: sessionId!,
              username: "AI Co-host",
              data: { text: payload.text, announcementType: payload.type },
              timestamp: ts,
            },
            ...prev,
          ].slice(0, 200),
        );

        const mode = ttsModeRef.current;
        console.log(`[TTS] ai:announcement | mode=${mode} | type=${payload.type} | text="${payload.text.slice(0, 60)}"`);
        if (mode === "openai") {
          console.log(`[TTS] → enqueuing OpenAI TTS | voice=${ttsVoiceRef.current} | speed=${ttsSpeedRef.current}`);
          enqueueTts(() => playOpenAiTts(payload.text, ttsVoiceRef.current, ttsVolumeRef.current, ttsSpeedRef.current));
        } else if (mode === "browser") {
          const detectedLang = detectTtsLang(payload.text);
          console.log(`[TTS] → calling Browser Speech API | lang=${detectedLang}`);
          playBrowserTts(payload.text);
        } else {
          console.warn(`[TTS] mode=off — speech skipped. Enable TTS via AI Co-Host settings or Dashboard toggle.`);
        }
      });

      socket.on("live:translation", (payload: { msgId: string; sessionId: number; translatedText: string; targetLang: string }) => {
        setTranslations((prev) => ({ ...prev, [payload.msgId]: payload.translatedText }));
      });

      socket.on("moderation:flagged", (payload: Omit<ModerationFlaggedEvent, "timestamp">) => {
        const flaggedAt = Date.now();
        setFlaggedComments((prev) =>
          [{ ...payload, timestamp: flaggedAt }, ...prev].slice(0, 30),
        );
        setEvents((prev) =>
          prev.filter(
            (e) =>
              !(
                e.type === "comment" &&
                e.username === payload.viewerName &&
                (e.data.text as string) === payload.comment
              ),
          ),
        );
      });

      socket.on("session:ended", () => {
        socket.disconnect();
      });
    };

    connect();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.removeAllListeners();
        s.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [sessionId, getToken]);

  return {
    events,
    translations,
    stats,
    automationsFired,
    aiAnnouncements,
    flaggedComments,
    recentXpAwards,
    achievementUnlocks,
    luckyDrops,
    levelUps,
    kingdomUpdates,
    leaderboardVersion,
    connected,
    clearEvents,
    setTtsEnabled,
    setTtsMode,
    setTtsVoice,
    setTtsVolume,
    setTtsSpeed,
    tiktokMode,
    tiktokError,
    tiktokUsername,
  };
}
