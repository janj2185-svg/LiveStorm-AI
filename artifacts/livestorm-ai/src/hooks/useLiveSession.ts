import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";

export type ConnectionMode = "real" | "demo" | "error";

export interface LiveEvent {
  type: "comment" | "gift" | "like" | "follow" | "share" | "viewerCount" | "ai_announcement";
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

export type TtsMode = "off" | "browser" | "openai";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE_URL}/api`;

async function playOpenAiTts(text: string, voice: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/ai/voice`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? `HTTP ${res.status}`;
      console.warn(`[TTS] OpenAI TTS error: ${msg}`);
      // Surface error to the page via custom event so the UI can show it
      window.dispatchEvent(new CustomEvent("tts:error", { detail: msg }));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.warn("[TTS] OpenAI TTS playback error:", msg);
    window.dispatchEvent(new CustomEvent("tts:error", { detail: msg }));
  }
}

function playBrowserTts(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.1;
  utt.pitch = 1.05;
  window.speechSynthesis.speak(utt);
}

export function useLiveSession(
  sessionId: number | null | undefined,
  initialMode?: ConnectionMode | null,
) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [automationsFired, setAutomationsFired] = useState<AutomationFiredEvent[]>([]);
  const [aiAnnouncements, setAiAnnouncements] = useState<AiAnnouncementEvent[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<ModerationFlaggedEvent[]>([]);

  // TikTok connection status — initialised from HTTP session data, then updated by socket
  const [tiktokMode, setTiktokMode] = useState<ConnectionMode | null>(initialMode ?? null);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [tiktokUsername, setTiktokUsername] = useState<string | null>(null);

  // Sync initialMode once when it first arrives (e.g. after session query resolves).
  // Uses functional updater so we never overwrite a live socket update.
  useEffect(() => {
    if (initialMode != null) {
      setTiktokMode((prev) => prev ?? initialMode);
    }
  }, [initialMode]);

  const ttsModeRef = useRef<TtsMode>("off");
  const ttsVoiceRef = useRef<string>("nova");

  const setTtsMode = useCallback((mode: TtsMode) => { ttsModeRef.current = mode; }, []);
  const setTtsVoice = useCallback((voice: string) => { ttsVoiceRef.current = voice; }, []);

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

  const clearEvents = useCallback(() => {
    setEvents([]);
    setAutomationsFired([]);
    setAiAnnouncements([]);
    setFlaggedComments([]);
    setStats({
      viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0,
      totalComments: 0, totalShares: 0, topSupporters: [],
    });
    supportersRef.current = new Map();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Prevent stale async continuations from attaching to a new socket after
    // cleanup (React StrictMode double-invoke, rapid sessionId changes, etc.)
    let cancelled = false;

    const connect = async () => {
      const token = await getToken();
      // Don't connect if Clerk hasn't finished hydrating (no valid session yet)
      if (cancelled || !token) return;

      const socket = io(window.location.origin, {
        path: `${BASE_URL}/api/socket.io`,
        transports: ["websocket", "polling"],
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("session:join", sessionId);
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("session:error", (err: { message: string }) => {
        console.error("[LiveSession] Socket auth error:", err.message);
      });

      // ── TikTok connection status updates ──────────────────────────────────
      socket.on("tiktok:status", (payload: TikTokStatusEvent) => {
        setTiktokMode(payload.mode);
        setTiktokError(payload.error ?? null);
        setTiktokUsername(payload.username ?? null);
      });

      // ── Live events ───────────────────────────────────────────────────────
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

      socket.on("automation:fired", (event: AutomationFiredEvent) => {
        setAutomationsFired((prev) => [event, ...prev].slice(0, 50));
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
        if (mode === "openai") {
          playOpenAiTts(payload.text, ttsVoiceRef.current);
        } else if (mode === "browser") {
          playBrowserTts(payload.text);
        }
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
      // socketRef.current is set synchronously inside connect() after io() — if
      // connect() hasn't completed yet (still awaiting getToken), the ref is null
      // and no cleanup is needed. If the socket exists, disconnect gracefully.
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
    stats,
    automationsFired,
    aiAnnouncements,
    flaggedComments,
    connected,
    clearEvents,
    setTtsEnabled,
    setTtsMode,
    setTtsVoice,
    tiktokMode,
    tiktokError,
    tiktokUsername,
  };
}
