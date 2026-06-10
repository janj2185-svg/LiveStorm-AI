import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetActiveSession,
  getGetActiveSessionQueryKey,
  useGetAvatarConfig,
  useUpdateAvatarConfig,
  useGetAvatarPresets,
  type AvatarConfig,
  type BuiltInAvatar,
} from "@workspace/api-client-react";
import { AvatarCanvas, type RendererStats } from "@/components/avatar/AvatarCanvas";
import { AvatarThumbnail } from "@/components/avatar/AvatarThumbnail";
import { BACKGROUND_PRESETS, getBackgroundGradient, rendererLabel } from "@/components/avatar/avatarAssets";
import { AvatarCreatorModal, type AvatarCreatorResult } from "@/components/avatar/AvatarCreatorModal";
import { AvatarAnimationMachine, type AnimationState, ANIMATION_LABELS, ANIMATION_EMOJI } from "@/components/avatar/avatarAnimationMachine";
import { useLipSync } from "@/hooks/useLipSync";
import { useAvatarReactions } from "@/hooks/useAvatarReactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot, Send, Trash2, Sparkles, Zap, Shield, RefreshCw,
  Star, MessageSquare, Mic, Volume2, VolumeX,
  Globe, Gift, Users, Heart, Share2, Loader2, Radio, Play,
  ChevronDown, ChevronRight, CornerDownRight, AlertCircle,
  Server, AlertTriangle, CheckCircle2, WifiOff, Plug, TestTube2,
  Boxes, SlidersHorizontal, Monitor, Upload, Cpu,
  Shirt, Tv2, Palette, Sun, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveSession, type TtsMode, type LiveEvent } from "@/hooks/useLiveSession";
import { useLanguage } from "@/contexts/LanguageContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE}/api`;

async function apiFetch(path: string, options?: RequestInit) {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return resp.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PersonaConfig = {
  id: number;
  streamerId: number;
  personaName: string;
  tone: string;
  personalityType: string;
  customPersonality: string | null;
  operatingMode: string;
  announceGifts: boolean;
  announceGiftThreshold: number;
  announceLevelUp: boolean;
  announceBossKill: boolean;
  moderationEnabled: boolean;
  autoReplyEnabled: boolean;
  replyLanguage: string;
  spamProtectionEnabled: boolean;
  spamCooldownSeconds: number;
  voiceEnabled: boolean;
  voiceName: string;
  voiceSpeed: number;
  voiceVolume: number;
  voiceEmotion: string;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};


// ─── Constants ────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: "hype", label: "🔥 Hype", desc: "Energetic, high energy" },
  { value: "friendly", label: "😊 Friendly", desc: "Warm and welcoming" },
  { value: "professional", label: "📊 Professional", desc: "Polished and analytical" },
  { value: "savage", label: "😈 Savage", desc: "Bold and witty" },
];

const VOICE_OPTIONS = [
  { value: "nova", label: "Nova", desc: "Warm & natural" },
  { value: "alloy", label: "Alloy", desc: "Neutral & balanced" },
  { value: "echo", label: "Echo", desc: "Clear & direct" },
  { value: "fable", label: "Fable", desc: "British accent" },
  { value: "onyx", label: "Onyx", desc: "Deep & authoritative" },
  { value: "shimmer", label: "Shimmer", desc: "Light & expressive" },
];

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto-detect", flag: "🌍" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "uk", label: "Українська", flag: "🇺🇦" },
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
];

const PERSONALITY_OPTIONS = [
  { value: "funny", label: "Funny", emoji: "😂" },
  { value: "serious", label: "Serious", emoji: "🎯" },
  { value: "troll", label: "Troll", emoji: "😈" },
  { value: "motivator", label: "Motivator", emoji: "💪" },
  { value: "battle", label: "Battle", emoji: "⚔️" },
  { value: "friendly", label: "Friendly", emoji: "😊" },
];

const OPERATING_MODES = [
  { value: "assistant", label: "Assistant", emoji: "💡", desc: "AI suggests replies, you approve before sending" },
  { value: "semi-auto", label: "Semi-Auto", emoji: "⚡", desc: "AI auto-handles simple messages, you control the rest" },
  { value: "autopilot", label: "Autopilot", emoji: "🤖", desc: "AI fully manages all chat interactions" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeAgo({ ts }: { ts: number }) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return <span className="text-xs text-muted-foreground/50">{diff}s ago</span>;
  if (diff < 3600) return <span className="text-xs text-muted-foreground/50">{Math.floor(diff / 60)}m ago</span>;
  return <span className="text-xs text-muted-foreground/50">{Math.floor(diff / 3600)}h ago</span>;
}

function Avatar({ username, size = "sm" }: { username?: string; size?: "sm" | "md" }) {
  const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  const color = colors[(username?.charCodeAt(0) ?? 0) % colors.length];
  const dim = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white flex-shrink-0", color, dim)}>
      {(username ?? "?")[0].toUpperCase()}
    </div>
  );
}

function CommentCard({
  event,
  onReply,
  isReplying,
  sessionId,
}: {
  event: LiveEvent;
  onReply: (event: LiveEvent) => void;
  isReplying: boolean;
  sessionId: number | null;
}) {
  const text = (event.data.text as string) ?? "";
  return (
    <div className="group flex gap-2.5 py-2 px-3 rounded-lg hover:bg-white/3 transition-colors">
      <Avatar username={event.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-purple-300">@{event.username ?? "unknown"}</span>
          <TimeAgo ts={event.timestamp} />
        </div>
        <p className="text-sm text-foreground/90 leading-snug break-words">{text}</p>
        {sessionId && (
          <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              onClick={() => onReply(event)}
              disabled={isReplying}
            >
              {isReplying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CornerDownRight className="h-3 w-3 mr-1" />
              )}
              {isReplying ? "Replying…" : "Reply with AI"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function GiftCard({ event }: { event: LiveEvent }) {
  const giftName = (event.data.giftName as string) ?? "Gift";
  const coins = (event.data.coins as number) ?? 0;
  return (
    <div className="flex gap-2.5 py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
      <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <Gift className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-amber-300">@{event.username ?? "unknown"}</span>
          <Badge className="h-4 px-1.5 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
            {coins} coins
          </Badge>
          <TimeAgo ts={event.timestamp} />
        </div>
        <p className="text-xs text-amber-200/80">sent a <strong>{giftName}</strong> gift! 🎁</p>
      </div>
    </div>
  );
}

function FollowCard({ event }: { event: LiveEvent }) {
  return (
    <div className="flex gap-2.5 py-2 px-3 rounded-lg bg-green-500/5 border border-green-500/10">
      <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
        <Users className="h-3.5 w-3.5 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-300">@{event.username ?? "unknown"}</span>
          <span className="text-xs text-green-200/70">followed the stream!</span>
          <TimeAgo ts={event.timestamp} />
        </div>
      </div>
    </div>
  );
}

function LikeCard({ event }: { event: LiveEvent }) {
  const count = (event.data.likeCount as number) ?? 1;
  return (
    <div className="flex gap-2 py-1.5 px-3 items-center opacity-60">
      <Heart className="h-3 w-3 text-pink-400 flex-shrink-0" />
      <span className="text-xs text-muted-foreground">
        <span className="text-pink-300 font-medium">@{event.username ?? "?"}</span> sent {count} like{count !== 1 ? "s" : ""}
      </span>
      <TimeAgo ts={event.timestamp} />
    </div>
  );
}

function ShareCard({ event }: { event: LiveEvent }) {
  return (
    <div className="flex gap-2 py-1.5 px-3 items-center opacity-60">
      <Share2 className="h-3 w-3 text-blue-400 flex-shrink-0" />
      <span className="text-xs text-muted-foreground">
        <span className="text-blue-300 font-medium">@{event.username ?? "?"}</span> shared the stream
      </span>
      <TimeAgo ts={event.timestamp} />
    </div>
  );
}

// ── Sidebar section — must be defined OUTSIDE the main component ──────────────
// Defining it inside causes React to treat it as a new type each render,
// which unmounts/remounts children and triggers infinite update loops.
function SidebarSection({
  isOpen,
  onToggle,
  title,
  icon,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card border-white/5 flex-shrink-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={onToggle}
      >
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon}{title}
        </CardTitle>
        {isOpen
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {isOpen && (
        <CardContent className="space-y-3 pb-4 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function AiAnnouncementCard({ event }: { event: LiveEvent }) {
  const text = (event.data.text as string) ?? "";
  const annType = (event.data.announcementType as string) ?? "";
  const isReply = annType === "comment_reply";
  const attrName = event.username;
  return (
    <div className="flex gap-2.5 py-2 px-3 rounded-lg bg-purple-500/8 border border-purple-500/15">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
        AI
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-purple-300">AI Co-host</span>
          {isReply && attrName && (
            <span className="text-xs text-muted-foreground/60">replying to @{attrName}</span>
          )}
          <TimeAgo ts={event.timestamp} />
        </div>
        <p className="text-sm text-foreground/90 leading-snug italic">"{text}"</p>
      </div>
    </div>
  );
}

function StatBubble({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-sm font-bold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground leading-none mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiAssistant() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  // ── Session ──────────────────────────────────────────────────────────────────
  const { data: activeSessionRes } = useGetActiveSession({
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 15000 },
  });
  const activeSessionId = (activeSessionRes as any)?.session?.id ?? null;
  const isSessionActive = (activeSessionRes as any)?.active ?? false;

  // ── Live events (socket) ──────────────────────────────────────────────────────
  // Pass the HTTP-fetched mode as initialMode so the badge is correct immediately on refresh.
  const initialMode = (activeSessionRes as any)?.session?.mode ?? null;
  const initialError = (activeSessionRes as any)?.session?.connectionError ?? null;
  const { events, stats, flaggedComments, connected, setTtsMode, setTtsVoice, setTtsVolume, setTtsSpeed,
    tiktokMode, tiktokError: socketError, tiktokUsername,
    aiAnnouncements, luckyDrops, achievementUnlocks,
  } = useLiveSession(activeSessionId, initialMode);

  // Effective values: prefer socket-live data, fall back to HTTP snapshot
  const effectiveMode = tiktokMode ?? (isSessionActive ? "demo" : null);
  const effectiveError = socketError ?? initialError;

  // ── Config ───────────────────────────────────────────────────────────────────
  const { data: config, isLoading: configLoading } = useQuery<PersonaConfig>({
    queryKey: ["ai-config"],
    queryFn: () => apiFetch("/ai/config"),
  });

  const updateConfig = useMutation({
    mutationFn: (updates: Partial<PersonaConfig>) =>
      apiFetch("/ai/config", { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-config"] }),
  });

  // ── Local TTS state (synced to hook on load) ──────────────────────────────────
  // Use localStorage to persist the TTS mode so "browser" isn't lost on reload.
  const [ttsMode, setTtsModeLocal] = useState<TtsMode>(() => {
    try {
      return (localStorage.getItem("ttsMode") as TtsMode | null) ?? "off";
    } catch {
      return "off";
    }
  });
  const [ttsVoice, setTtsVoiceLocal] = useState("nova");

  useEffect(() => {
    if (config && !configLoading) {
      // Restore from localStorage first; fall back to DB voiceEnabled flag
      let mode: TtsMode;
      try {
        mode = (localStorage.getItem("ttsMode") as TtsMode | null) ?? (config.voiceEnabled ? "openai" : "off");
      } catch {
        mode = config.voiceEnabled ? "openai" : "off";
      }
      setTtsModeLocal(mode);
      setTtsMode(mode);
      setTtsVoiceLocal(config.voiceName ?? "nova");
      setTtsVoice(config.voiceName ?? "nova");
      setTtsVolume(config.voiceVolume ?? 1.0);
      setTtsSpeed(config.voiceSpeed ?? 1.0);
    }
  }, [config?.voiceEnabled, config?.voiceName, config?.voiceVolume, config?.voiceSpeed]);

  const handleTtsModeChange = useCallback((mode: TtsMode) => {
    setTtsModeLocal(mode);
    setTtsMode(mode);
    try { localStorage.setItem("ttsMode", mode); } catch {}
    // Only update DB when actually toggling OpenAI voice on/off
    if (mode === "openai") updateConfig.mutate({ voiceEnabled: true });
    else if (mode === "off") updateConfig.mutate({ voiceEnabled: false });
    // "browser" mode: leave voiceEnabled as-is in DB (no API cost)
  }, [setTtsMode]);

  const handleTtsVoiceChange = useCallback((voice: string) => {
    setTtsVoiceLocal(voice);
    setTtsVoice(voice);
    updateConfig.mutate({ voiceName: voice });
  }, [setTtsVoice]);

  // ── Reply state ───────────────────────────────────────────────────────────────
  const [replyingTo, setReplyingTo] = useState<Set<number>>(new Set());

  const handleReply = useCallback(async (event: LiveEvent) => {
    const key = event.timestamp;
    if (replyingTo.has(key)) return;
    setReplyingTo((prev) => new Set([...prev, key]));
    try {
      await apiFetch("/ai/reply-to-comment", {
        method: "POST",
        body: JSON.stringify({
          comment: event.data.text ?? "",
          viewerName: event.username ?? "viewer",
          sessionId: activeSessionId,
          language: config?.replyLanguage ?? "auto",
        }),
      });
      // Reply comes back via socket as ai:announcement — no local storage needed
    } catch {
      // silent fail
    } finally {
      setReplyingTo((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [replyingTo, activeSessionId, config?.replyLanguage]);

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"live" | "chat" | "moderation" | "avatar">("live");

  // ── Avatar config ─────────────────────────────────────────────────────────────
  const { data: avatarConfig, isLoading: avatarLoading } = useGetAvatarConfig();
  const { mutate: saveAvatar, isPending: avatarSaving } = useUpdateAvatarConfig({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["avatarConfig"] }) },
  });
  const { data: avatarPresets } = useGetAvatarPresets();
  const builtInAvatars: BuiltInAvatar[] = avatarConfig?.builtInAvatars ?? [];
  const selectedAvatar = builtInAvatars.find((a) => a.key === avatarConfig?.avatarKey) ?? builtInAvatars[0];

  // ── Avatar upload (session-only, cleared on refresh) ─────────────────────────
  const [uploadedVrmUrl, setUploadedVrmUrl] = useState<string | null>(null);
  const [uploadedVrmName, setUploadedVrmName] = useState<string | null>(null);
  const [rpmAvatarUrl, setRpmAvatarUrl] = useState<string | null>(null);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);

  const handleCreatorSave = useCallback((result: AvatarCreatorResult) => {
    setRpmAvatarUrl(null);
    setUploadedVrmUrl(null);
    setUploadedVrmName(null);
    saveAvatar({
      avatarUrl: result.avatarUrl,
      renderer: result.renderer,
      avatarThumbnailUrl: result.thumbnailUrl ?? undefined,
    });
  }, [saveAvatar]);
  const [rendererStats, setRendererStats] = useState<RendererStats | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string>("studio");
  const [lightingIntensity, setLightingIntensity] = useState<number>(80);

  // ── Phase 4: Animation machine + lip sync ─────────────────────────────────
  const machineRef = useRef<AvatarAnimationMachine>(new AvatarAnimationMachine());
  const [animState, setAnimState] = useState<AnimationState>("idle");
  const [lipSyncSensitivity, setLipSyncSensitivity] = useState(0.75);
  const [expressionIntensity, setExpressionIntensity] = useState(0.8);

  // Subscribe to animation state changes + tick for expiry
  useEffect(() => {
    const machine = machineRef.current;
    const unsubscribe = machine.subscribe(setAnimState);
    const interval = setInterval(() => machine.tick(), 100);
    return () => { unsubscribe(); clearInterval(interval); };
  }, []);

  // Wire TTS start/end to animation machine base state
  useEffect(() => {
    const handleStart = () => machineRef.current.setBase("talking");
    const handleEnd = () => machineRef.current.setBase("idle");
    window.addEventListener("tts:start", handleStart);
    window.addEventListener("tts:end", handleEnd);
    return () => {
      window.removeEventListener("tts:start", handleStart);
      window.removeEventListener("tts:end", handleEnd);
    };
  }, []);

  const { mouthOpen, isSpeaking } = useLipSync({
    sensitivity: lipSyncSensitivity,
    enabled: avatarConfig?.avatarEnabled ?? false,
  });

  const { lastReaction } = useAvatarReactions({
    machine: machineRef.current,
    events,
    aiAnnouncements: aiAnnouncements ?? [],
    luckyDrops: luckyDrops ?? [],
    achievementUnlocks: achievementUnlocks ?? [],
  });

  // ── AI private chat ───────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // NOTE: do NOT use `= []` default here — a new [] each render makes the effect
  // dep change every render → setLocalMessages fires every render → infinite loop.
  const { data: chatMessages } = useQuery<ChatMessage[]>({
    queryKey: ["ai-messages"],
    queryFn: () => apiFetch("/ai/messages"),
    retry: false,
  });
  useEffect(() => setLocalMessages(chatMessages ?? []), [chatMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMessages]);

  const clearMessages = useMutation({
    mutationFn: () => apiFetch("/ai/messages", { method: "DELETE" }),
    onSuccess: () => {
      setLocalMessages([]);
      queryClient.invalidateQueries({ queryKey: ["ai-messages"] });
    },
  });

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;
    setChatInput("");
    setIsChatLoading(true);
    const tempId = Date.now();
    setLocalMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: msg, createdAt: new Date().toISOString() },
      { id: tempId + 1, role: "assistant", content: "...", createdAt: new Date().toISOString() },
    ]);
    try {
      const data = await apiFetch("/ai/chat", { method: "POST", body: JSON.stringify({ message: msg }) });
      setLocalMessages((prev) =>
        prev.map((m) => m.id === tempId + 1 ? { ...m, content: data.reply } : m),
      );
      queryClient.invalidateQueries({ queryKey: ["ai-messages"] });
    } catch {
      setLocalMessages((prev) =>
        prev.map((m) => m.id === tempId + 1 ? { ...m, content: "Sorry, couldn't respond. Try again." } : m),
      );
    } finally {
      setIsChatLoading(false);
      inputRef.current?.focus();
    }
  }, [chatInput, isChatLoading, queryClient]);


  // ── TikTok connection test UI ──────────────────────────────────────────────
  const [testUsername, setTestUsername] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; latencyMs?: number } | null>(null);

  const handleTestConnection = async () => {
    if (!testUsername.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/tiktok/test-connection", {
        method: "POST",
        body: JSON.stringify({ username: testUsername.trim() }),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, error: err?.message ?? "Request failed" });
    } finally {
      setIsTesting(false);
    }
  };


  const handleVoicePreview = async () => {
    if (!config || isVoicePreviewing) return;
    setIsVoicePreviewing(true);
    try {
      const previewText = `Hey! I'm ${config.personaName}, your AI co-host. Let's make this stream absolutely amazing!`;
      const resp = await fetch(`${API_BASE}/ai/voice`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: previewText,
          voice: config.voiceName ?? "nova",
          speed: config.voiceSpeed ?? 1.0,
        }),
      });
      if (!resp.ok) throw new Error("Voice generation failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, config.voiceVolume ?? 1.0));
      audio.onended = () => { URL.revokeObjectURL(url); setIsVoicePreviewing(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); setIsVoicePreviewing(false); };
      await audio.play();
    } catch {
      setIsVoicePreviewing(false);
    }
  };

  const handleTranslateComment = async (eventId: number, text: string) => {
    if (translatingComments.has(eventId)) return;
    setTranslatingComments((prev) => new Set(prev).add(eventId));
    try {
      const resp = await fetch(`${API_BASE}/ai/content`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "script",
          topic: `Translate exactly to ${chatTranslateLang}. Reply with only the translation, nothing else: "${text}"`,
          language: chatTranslateLang,
        }),
      });
      if (!resp.ok) throw new Error("Translation failed");
      const data = await resp.json();
      const translated = (data.script ?? data.content ?? "").trim() || text;
      setTranslatedComments((prev) => ({ ...prev, [eventId]: translated }));
    } catch {
      setTranslatedComments((prev) => ({ ...prev, [eventId]: null }));
    } finally {
      setTranslatingComments((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  // ── Filtered event feed ───────────────────────────────────────────────────────
  const feedEvents = useMemo(
    () => events.filter((e) => e.type !== "viewerCount").slice(0, 80),
    [events],
  );

  const personaName = config?.personaName ?? "Storm";

  // ── Settings sidebar sections (collapsible — fewer open by default on mobile) ──
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // On narrow viewports, only expand the two most-used sections so the live
    // feed is visible without scrolling. On wider screens open all main sections.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    return isMobile
      ? new Set(["persona", "mode", "autoreply", "announcements", "moderation"])
      : new Set(["persona", "mode", "voice", "language", "autoreply", "announcements", "moderation"]);
  });
  const [isVoicePreviewing, setIsVoicePreviewing] = useState(false);
  const [chatTranslateEnabled, setChatTranslateEnabled] = useState(false);
  const [chatTranslateLang, setChatTranslateLang] = useState("en");
  const [translatedComments, setTranslatedComments] = useState<Record<number, string | null>>({});
  const [translatingComments, setTranslatingComments] = useState<Set<number>>(new Set());
  const [accentColor, setAccentColor] = useState("#3b82f6");

  // Sync accentColor and selectedBackground from DB once config loads
  useEffect(() => {
    if (!avatarConfig) return;
    if (avatarConfig.accentColor) setAccentColor(avatarConfig.accentColor);
    if (avatarConfig.backgroundValue) setSelectedBackground(avatarConfig.backgroundValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarConfig?.id]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-7rem)] flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-8 w-8 text-purple-400" />
            AI Co-Host
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Real-time chat replies, gift reactions, voice & moderation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live stats */}
          {isSessionActive && (
            <>
              <StatBubble label="viewers" value={stats.viewerCount} icon={<Users className="h-3.5 w-3.5" />} />
              <StatBubble label="gifts" value={stats.totalGifts} icon={<Gift className="h-3.5 w-3.5 text-amber-400" />} />
              <StatBubble label="follows" value={stats.totalFollows} icon={<Users className="h-3.5 w-3.5 text-green-400" />} />
            </>
          )}
          {/* Socket connection badge */}
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1.5 border",
              isSessionActive && connected
                ? "border-green-500/50 text-green-300 bg-green-500/10"
                : isSessionActive
                ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
                : "border-white/10 text-muted-foreground",
            )}
          >
            <div className={cn(
              "h-2 w-2 rounded-full mr-2",
              isSessionActive && connected ? "bg-green-400 animate-pulse" : isSessionActive ? "bg-yellow-400 animate-pulse" : "bg-gray-600",
            )} />
            {isSessionActive && connected ? "Live — connected" : isSessionActive ? "Connecting…" : "No active session"}
          </Badge>

          {/* TikTok mode badge */}
          {isSessionActive && effectiveMode === "demo" && (
            <Badge variant="outline" className="px-3 py-1.5 border border-orange-500/50 text-orange-300 bg-orange-500/10 gap-1.5">
              <Server className="h-3 w-3" />
              DEMO
            </Badge>
          )}
          {isSessionActive && effectiveMode === "real" && (
            <Badge variant="outline" className="px-3 py-1.5 border border-emerald-500/50 text-emerald-300 bg-emerald-500/10 gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              REAL TIKTOK
              {tiktokUsername && <span className="text-emerald-400/70">@{tiktokUsername}</span>}
            </Badge>
          )}
          {isSessionActive && effectiveMode === "error" && (
            <Badge variant="outline" className="px-3 py-1.5 border border-red-500/50 text-red-300 bg-red-500/10 gap-1.5 cursor-pointer" title={effectiveError ?? "Connection failed"}>
              <WifiOff className="h-3 w-3" />
              CONNECTION FAILED
            </Badge>
          )}
          {/* Persona badge */}
          <Badge variant="outline" className="border-purple-500/50 text-purple-300 bg-purple-500/10 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-purple-400 mr-2 animate-pulse" />
            {personaName}
          </Badge>
        </div>
      </div>

      {/* ── Connection error banner ── */}
      {isSessionActive && effectiveMode === "error" && effectiveError && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-300 mb-0.5">TikTok connection failed</p>
            <p className="text-xs text-red-300/80 font-mono whitespace-pre-wrap break-words">{effectiveError}</p>
            <p className="text-xs text-muted-foreground/70 mt-1.5">
              See the TikTok Connection panel in the sidebar to test and diagnose, or check DEPLOY.md.
            </p>
          </div>
        </div>
      )}

      {/* ── Body: sidebar + main ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">

        {/* ── LEFT: Settings sidebar ── */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-0.5 min-h-0 lg:max-h-none">

          {/* Persona */}
          <SidebarSection isOpen={expandedSections.has("persona")} onToggle={() => toggleSection("persona")} title="Persona" icon={<Sparkles className="h-4 w-4 text-purple-400" />}>
            {configLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">AI Name</Label>
                  <Input
                    key={config?.personaName}
                    defaultValue={config?.personaName}
                    placeholder="Storm"
                    className="bg-background/50 border-white/10 h-8 text-sm"
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== config?.personaName)
                        updateConfig.mutate({ personaName: e.target.value.trim() });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tone</Label>
                  <Select value={config?.tone ?? "hype"} onValueChange={(v) => updateConfig.mutate({ tone: v })}>
                    <SelectTrigger className="bg-background/50 border-white/10 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span>{t.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Personality</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {PERSONALITY_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => updateConfig.mutate({ personalityType: p.value })}
                        className={cn(
                          "flex flex-col items-center justify-center py-1.5 px-1 rounded-md border text-xs transition-all",
                          (config?.personalityType ?? "friendly") === p.value
                            ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                            : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                        )}
                      >
                        <span className="text-base leading-none mb-0.5">{p.emoji}</span>
                        <span className="font-medium text-[10px]">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </SidebarSection>

          {/* Operating Mode */}
          <SidebarSection isOpen={expandedSections.has("mode")} onToggle={() => toggleSection("mode")} title="Operating Mode" icon={<Radio className="h-4 w-4 text-emerald-400" />}>
            <div className="space-y-1.5">
              {OPERATING_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateConfig.mutate({ operatingMode: mode.value })}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all",
                    (config?.operatingMode ?? "assistant") === mode.value
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                  )}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">{mode.emoji}</span>
                  <div>
                    <div className="text-xs font-semibold">{mode.label}</div>
                    <div className="text-[10px] opacity-70 leading-relaxed mt-0.5">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </SidebarSection>

          {/* Voice Controls */}
          <SidebarSection isOpen={expandedSections.has("voice")} onToggle={() => toggleSection("voice")} title="Voice" icon={<Volume2 className="h-4 w-4 text-blue-400" />}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">TTS Mode</Label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-lg">
                {(["off", "browser", "openai"] as TtsMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleTtsModeChange(mode)}
                    className={cn(
                      "text-xs py-1.5 px-1 rounded-md font-medium transition-all capitalize",
                      ttsMode === mode
                        ? "bg-blue-600 text-white shadow"
                        : "text-muted-foreground hover:text-white hover:bg-white/5",
                    )}
                  >
                    {mode === "off" && <VolumeX className="h-3 w-3 mx-auto mb-0.5" />}
                    {mode === "browser" && <Radio className="h-3 w-3 mx-auto mb-0.5" />}
                    {mode === "openai" && <Mic className="h-3 w-3 mx-auto mb-0.5" />}
                    {mode}
                  </button>
                ))}
              </div>
              {ttsMode !== "off" && (
                <p className="text-xs text-muted-foreground/70 pt-0.5">
                  {ttsMode === "browser"
                    ? "Uses your browser's built-in speech synthesis"
                    : "Uses OpenAI TTS — high-quality AI voice"}
                </p>
              )}
            </div>
            {ttsMode === "openai" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Voice</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.value}
                        onClick={() => handleTtsVoiceChange(v.value)}
                        className={cn(
                          "text-left px-2.5 py-1.5 rounded-md border text-xs transition-all",
                          ttsVoice === v.value
                            ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                            : "border-white/5 bg-white/3 text-muted-foreground hover:border-white/10 hover:text-white",
                        )}
                      >
                        <div className="font-medium">{v.label}</div>
                        <div className="text-[10px] opacity-70">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Speed</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {(config?.voiceSpeed ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.05"
                    key={config?.voiceSpeed}
                    defaultValue={config?.voiceSpeed ?? 1.0}
                    onMouseUp={(e) => updateConfig.mutate({ voiceSpeed: Number((e.target as HTMLInputElement).value) })}
                    onTouchEnd={(e) => updateConfig.mutate({ voiceSpeed: Number((e.target as HTMLInputElement).value) })}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/50">
                    <span>0.25×</span>
                    <span>1×</span>
                    <span>2×</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Volume</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round((config?.voiceVolume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    key={`vol-${config?.voiceVolume}`}
                    defaultValue={config?.voiceVolume ?? 1.0}
                    onMouseUp={(e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      setTtsVolume(v);
                      updateConfig.mutate({ voiceVolume: v });
                    }}
                    onTouchEnd={(e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      setTtsVolume(v);
                      updateConfig.mutate({ voiceVolume: v });
                    }}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/50">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10 h-7 text-xs"
                  onClick={handleVoicePreview}
                  disabled={isVoicePreviewing}
                >
                  {isVoicePreviewing ? (
                    <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generating…</>
                  ) : (
                    <><Play className="h-3 w-3 mr-1.5" />Preview Voice</>
                  )}
                </Button>
              </div>
            )}
          </SidebarSection>

          {/* Language */}
          <SidebarSection isOpen={expandedSections.has("language")} onToggle={() => toggleSection("language")} title="Reply Language" icon={<Globe className="h-4 w-4 text-teal-400" />}>
            <div className="grid grid-cols-1 gap-1">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => updateConfig.mutate({ replyLanguage: lang.value })}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-all text-left",
                    config?.replyLanguage === lang.value
                      ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                      : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="text-xs font-medium">{lang.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Auto-detect identifies the viewer's language and replies in the same language.
            </p>
          </SidebarSection>

          {/* Chat Translation */}
          <SidebarSection
            isOpen={expandedSections.has("translate")}
            onToggle={() => toggleSection("translate")}
            title={t("chat_translate_title")}
            icon={<Globe className="h-4 w-4 text-teal-400" />}
          >
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">{t("chat_translate_enable")}</Label>
              <Switch
                checked={chatTranslateEnabled}
                onCheckedChange={setChatTranslateEnabled}
              />
            </div>
            {chatTranslateEnabled && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("chat_translate_lang")}</Label>
                <div className="grid grid-cols-2 gap-1">
                  {LANGUAGE_OPTIONS.filter((l) => l.value !== "auto").map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => {
                        setChatTranslateLang(lang.value);
                        setTranslatedComments({});
                      }}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all text-left",
                        chatTranslateLang === lang.value
                          ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                          : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                      )}
                    >
                      <span>{lang.flag}</span>
                      <span className="font-medium truncate">{lang.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  {t("chat_translate_note")}
                </p>
              </div>
            )}
          </SidebarSection>

          {/* Auto-Reply */}
          <SidebarSection isOpen={expandedSections.has("autoreply")} onToggle={() => toggleSection("autoreply")} title="Auto-Reply" icon={<MessageSquare className="h-4 w-4 text-orange-400" />}>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Reply to comments</Label>
              <Switch
                checked={config?.autoReplyEnabled ?? false}
                onCheckedChange={(v) => updateConfig.mutate({ autoReplyEnabled: v })}
              />
            </div>
            {config?.autoReplyEnabled && (
              <div className="space-y-3 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    Spam protection
                  </Label>
                  <Switch
                    checked={config?.spamProtectionEnabled ?? true}
                    onCheckedChange={(v) => updateConfig.mutate({ spamProtectionEnabled: v })}
                  />
                </div>
                {config?.spamProtectionEnabled && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Cooldown per viewer (seconds)
                    </Label>
                    <Input
                      key={config?.spamCooldownSeconds}
                      type="number"
                      defaultValue={config?.spamCooldownSeconds ?? 30}
                      min={5}
                      max={300}
                      className="bg-background/50 border-white/10 h-8 text-sm"
                      onBlur={(e) => {
                        const val = Math.max(5, Math.min(300, Number(e.target.value)));
                        if (val !== config?.spamCooldownSeconds)
                          updateConfig.mutate({ spamCooldownSeconds: val });
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground/60">
                      AI won't reply to the same viewer more than once per {config?.spamCooldownSeconds ?? 30}s
                    </p>
                  </div>
                )}
              </div>
            )}
          </SidebarSection>

          {/* Announcements */}
          <SidebarSection isOpen={expandedSections.has("announcements")} onToggle={() => toggleSection("announcements")} title="Announcements" icon={<Zap className="h-4 w-4 text-yellow-400" />}>
            {([
              { key: "announceGifts", label: "Gift alerts", icon: "🎁" },
              { key: "announceLevelUp", label: "Follow alerts", icon: "💚" },
              { key: "announceBossKill", label: "Boss kills", icon: "💀" },
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <span>{item.icon}</span>{item.label}
                </Label>
                <Switch
                  checked={(config?.[item.key] as boolean) ?? false}
                  onCheckedChange={(v) => updateConfig.mutate({ [item.key]: v })}
                />
              </div>
            ))}
            <Separator className="bg-white/5" />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Min gift threshold (coins)</Label>
              <Input
                key={config?.announceGiftThreshold}
                type="number"
                defaultValue={config?.announceGiftThreshold ?? 100}
                className="bg-background/50 border-white/10 h-8 text-sm"
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val !== config?.announceGiftThreshold)
                    updateConfig.mutate({ announceGiftThreshold: val });
                }}
              />
            </div>
          </SidebarSection>

          {/* Moderation */}
          <SidebarSection isOpen={expandedSections.has("moderation")} onToggle={() => toggleSection("moderation")} title="Moderation" icon={<Shield className="h-4 w-4 text-blue-400" />}>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Auto-flag harmful comments</Label>
              <Switch
                checked={config?.moderationEnabled ?? false}
                onCheckedChange={(v) => updateConfig.mutate({ moderationEnabled: v })}
              />
            </div>
            {config?.moderationEnabled && (
              <p className="text-xs text-muted-foreground p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                ✓ Comments are being scanned for hate speech, harassment and spam
              </p>
            )}
            {flaggedComments.length > 0 && (
              <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
                {flaggedComments.length} flagged this session
              </Badge>
            )}
          </SidebarSection>

          {/* ── TikTok Connection ── */}
          <SidebarSection isOpen={expandedSections.has("tiktok")} onToggle={() => toggleSection("tiktok")} title="TikTok Connection" icon={<Plug className="h-4 w-4 text-pink-400" />}>

            {/* Current mode */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
              {effectiveMode === "real" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-300">Real TikTok LIVE</p>
                    {tiktokUsername && <p className="text-[10px] text-muted-foreground">@{tiktokUsername}</p>}
                  </div>
                </>
              ) : effectiveMode === "error" ? (
                <>
                  <WifiOff className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-300">Connection failed</p>
                    <p className="text-[10px] text-muted-foreground truncate">{effectiveError}</p>
                  </div>
                </>
              ) : (
                <>
                  <Server className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-300">Demo simulator</p>
                    <p className="text-[10px] text-muted-foreground">Fake events (set TIKTOK_MODE=real on VPS)</p>
                  </div>
                </>
              )}
            </div>

            {/* Error detail */}
            {effectiveMode === "error" && effectiveError && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-[11px] text-red-300 font-mono whitespace-pre-wrap break-words">{effectiveError}</p>
              </div>
            )}

            {/* Test connection */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Test a TikTok username</Label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="@username"
                  value={testUsername}
                  onChange={(e) => { setTestUsername(e.target.value); setTestResult(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleTestConnection()}
                  className="flex-1 h-8 text-xs bg-white/5 border-white/10"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 border-white/10 hover:bg-white/10"
                  onClick={handleTestConnection}
                  disabled={isTesting || !testUsername.trim()}
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={cn(
                  "p-2 rounded-lg border text-xs",
                  testResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300",
                )}>
                  {testResult.ok ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      Connected! ({testResult.latencyMs}ms)
                    </span>
                  ) : (
                    <span className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                      <span className="font-mono whitespace-pre-wrap break-words">{testResult.error}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Set <code className="bg-white/10 rounded px-1">TIKTOK_MODE=real</code> on your VPS/Docker server
              to connect to real TikTok LIVE. See <code className="bg-white/10 rounded px-1">DEPLOY.md</code> for setup.
            </p>
          </SidebarSection>

          {/* ── 3D Avatar ── */}
          <SidebarSection
            isOpen={expandedSections.has("avatar")}
            onToggle={() => toggleSection("avatar")}
            title="3D Avatar"
            icon={<Boxes className="h-4 w-4 text-violet-400" />}
          >
            {avatarLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Enable toggle */}
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-3.5 w-3.5 text-violet-400" />
                    <div>
                      <p className="text-xs font-medium text-white">3D Co-Host</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Show avatar on stream</p>
                    </div>
                  </div>
                  <Switch
                    checked={avatarConfig?.avatarEnabled ?? false}
                    onCheckedChange={(v) => saveAvatar({ avatarEnabled: v })}
                    disabled={avatarSaving}
                    className="data-[state=checked]:bg-violet-600 flex-shrink-0"
                  />
                </div>

                {/* Selected avatar */}
                {avatarConfig?.avatarEnabled && selectedAvatar && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ background: `radial-gradient(circle at 35% 35%, ${selectedAvatar.accentColor}cc, ${selectedAvatar.accentColor}55)` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-violet-200 truncate">{selectedAvatar.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedAvatar.style}</p>
                    </div>
                  </div>
                )}

                {/* Open avatar tab */}
                <button
                  onClick={() => setActiveTab("avatar")}
                  className="w-full text-xs text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors border border-violet-500/20"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  {avatarConfig?.avatarEnabled ? "Configure Avatar" : "Set Up Avatar"}
                </button>
              </div>
            )}
          </SidebarSection>

        </div>

        {/* ── RIGHT: Tab content ── */}
        <div className="flex flex-col min-h-0">

          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-3 flex-shrink-0">
            {[
              { key: "live", label: "Live Feed", icon: <Radio className="h-3.5 w-3.5" />, badge: feedEvents.length > 0 ? feedEvents.filter(e => e.type === "comment").length : null },
              { key: "chat", label: "AI Chat", icon: <Bot className="h-3.5 w-3.5" />, badge: null },
              { key: "moderation", label: "Flagged", icon: <Shield className="h-3.5 w-3.5" />, badge: flaggedComments.length > 0 ? flaggedComments.length : null },
              { key: "avatar", label: "3D Avatar", icon: <Boxes className="h-3.5 w-3.5" />, badge: null },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-md transition-all relative",
                  activeTab === tab.key
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white hover:bg-white/5",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== null && tab.badge! > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 text-[10px] font-bold flex items-center justify-center text-white">
                    {tab.badge! > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── LIVE FEED TAB ── */}
          {activeTab === "live" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-sm font-medium">Live Chat & Events</span>
                  <span className="text-xs text-muted-foreground">
                    {feedEvents.length > 0 ? `${feedEvents.length} events` : "Waiting for events…"}
                  </span>
                </div>
                {!isSessionActive && (
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-xs">
                    Start a session to see live events
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="py-2 space-y-0.5">
                  {feedEvents.length === 0 && (
                    <div className="text-center py-16">
                      <Radio className="h-10 w-10 text-purple-400/20 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        {isSessionActive ? "Waiting for viewers to interact…" : "No active session"}
                      </p>
                      {isSessionActive && (
                        <p className="text-muted-foreground/50 text-xs mt-1">
                          Demo events will start flowing shortly
                        </p>
                      )}
                    </div>
                  )}
                  {feedEvents.map((event) => {
                    if (event.type === "comment") {
                      const evtId = event.timestamp;
                      const translated = translatedComments[evtId];
                      const isTranslating = translatingComments.has(evtId);
                      return (
                        <div key={event.timestamp} className="space-y-1">
                          <CommentCard
                            event={event}
                            onReply={handleReply}
                            isReplying={replyingTo.has(event.timestamp)}
                            sessionId={activeSessionId}
                          />
                          {chatTranslateEnabled && (
                            <div className="ml-10 flex items-start gap-2">
                              {translated ? (
                                <p className="text-xs text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded px-2 py-1 flex-1">
                                  🌐 {translated}
                                </p>
                              ) : (
                                <button
                                  onClick={() => handleTranslateComment(evtId, (event.data.text as string) ?? "")}
                                  disabled={isTranslating}
                                  className="text-[11px] text-teal-400/60 hover:text-teal-300 flex items-center gap-1 transition-colors disabled:opacity-40"
                                >
                                  {isTranslating ? t("chat_translate_translating") : "🌐 Translate"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (event.type === "gift") return <GiftCard key={event.timestamp} event={event} />;
                    if (event.type === "follow") return <FollowCard key={event.timestamp} event={event} />;
                    if (event.type === "like") return <LikeCard key={event.timestamp} event={event} />;
                    if (event.type === "share") return <ShareCard key={event.timestamp} event={event} />;
                    if (event.type === "ai_announcement") return <AiAnnouncementCard key={event.timestamp} event={event} />;
                    return null;
                  })}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* ── AI CHAT TAB ── */}
          {activeTab === "chat" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-sm font-medium">{personaName}</span>
                  <span className="text-xs text-muted-foreground">— your stream strategist</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => clearMessages.mutate()}
                  title="Clear conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-4">
                  {localMessages.length === 0 && (
                    <div className="text-center py-10">
                      <Bot className="h-10 w-10 text-purple-400/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">Hey! I'm {personaName}, your AI co-host.</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">
                        Ask me about stream strategy, event ideas, or how to boost engagement.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {["How do I get more gifts?", "Give me a hype event idea", "Tips for growing viewers", "What quests should I run?"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setChatInput(p)}
                            className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {localMessages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                        msg.role === "user" ? "bg-purple-600" : "bg-gradient-to-br from-purple-500 to-pink-500",
                      )}>
                        {msg.role === "user" ? "U" : "AI"}
                      </div>
                      <div className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user" ? "bg-purple-600 text-white rounded-tr-sm" : "bg-white/5 text-foreground rounded-tl-sm",
                      )}>
                        {msg.content === "..." ? (
                          <span className="flex gap-1 items-center h-5">
                            {[0, 150, 300].map((d) => (
                              <span key={d} className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator className="bg-white/5" />
              <div className="p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    placeholder={`Ask ${personaName} anything…`}
                    className="bg-background/50 border-white/10 flex-1"
                    disabled={isChatLoading}
                  />
                  <Button
                    onClick={handleChatSend}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ── MODERATION TAB ── */}
          {activeTab === "moderation" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <div className="px-4 py-2.5 flex-shrink-0 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Flagged Comments</p>
                  <p className="text-xs text-muted-foreground">Real-time AI moderation log</p>
                </div>
                {flaggedComments.length > 0 && (
                  <Badge variant="outline" className="border-red-500/30 text-red-400">
                    {flaggedComments.length} flagged
                  </Badge>
                )}
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {!config?.moderationEnabled && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-300 font-medium">Moderation is disabled</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Enable it in the sidebar to auto-flag harmful comments.</p>
                      </div>
                    </div>
                  )}
                  {flaggedComments.length === 0 && config?.moderationEnabled && (
                    <div className="text-center py-10">
                      <Shield className="h-8 w-8 text-blue-400/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No flagged comments yet</p>
                    </div>
                  )}
                  {flaggedComments.map((item) => (
                    <div key={item.timestamp} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-red-300">@{item.viewerName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 bg-black/20 rounded px-2.5 py-1.5">"{item.comment}"</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">
                          {item.reason}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* ── AVATAR TAB ── */}
          {activeTab === "avatar" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Boxes className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-sm font-bold text-white">AI CO-HOST</span>
                  <span className="text-xs text-muted-foreground hidden sm:block">Realistic Presenters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Enabled</span>
                  <Switch
                    checked={avatarConfig?.avatarEnabled ?? false}
                    onCheckedChange={(v) => saveAvatar({ avatarEnabled: v })}
                    disabled={avatarSaving || avatarLoading}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
              </div>
              {/* Feature badges */}
              <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-white/5">
                {["RPM · Avaturn · VRM", "ARKit Lip Sync", "Expressions · Reactions", "TikTok LIVE Ready"].map((b) => (
                  <Badge key={b} variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 bg-blue-500/5">{b}</Badge>
                ))}
              </div>

              <ScrollArea className="flex-1">
                {avatarLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 space-y-5">

                    {/* Your AI Presenter */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                        Your AI Presenter
                      </p>
                      {avatarConfig?.avatarUrl ? (
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
                          <div className="flex items-center gap-3 p-3">
                            <AvatarThumbnail
                              avatarKey={avatarConfig.avatarKey ?? ""}
                              accentColor={accentColor}
                              avatarUrl={avatarConfig.avatarUrl}
                              renderer={avatarConfig.renderer ?? "rpm"}
                              size={56}
                              selected
                            />
                            <div className="flex-1 min-w-0">
                              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-1">
                                {rendererLabel(avatarConfig.renderer ?? "rpm")}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {avatarConfig.avatarUrl.split("?")[0].split("/").pop() ?? "avatar"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="h-7 text-[11px] bg-violet-600 hover:bg-violet-500 flex-shrink-0"
                              onClick={() => setCreatorModalOpen(true)}
                              disabled={avatarSaving}
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-muted-foreground">No presenter set. Create a photorealistic avatar from a selfie, or upload a custom VRM.</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Ready Player Me", icon: Camera, color: "blue", desc: "Selfie → avatar" },
                              { label: "Avaturn", icon: Sparkles, color: "rose", desc: "Photo-realistic" },
                              { label: "Upload VRM", icon: Upload, color: "violet", desc: "Custom model" },
                            ].map(({ label, icon: Icon, color, desc }) => (
                              <button
                                key={label}
                                onClick={() => setCreatorModalOpen(true)}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-center"
                              >
                                <Icon className={`h-4 w-4 text-${color}-400`} />
                                <span className="text-[10px] font-medium text-white/70 leading-tight">{label}</span>
                                <span className="text-[9px] text-muted-foreground/60">{desc}</span>
                              </button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                            onClick={() => setCreatorModalOpen(true)}
                          >
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            Create Your AI Presenter
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Background selector */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                        <Tv2 className="h-3.5 w-3.5 text-cyan-400" />
                        Background Scene
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {BACKGROUND_PRESETS.map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => { setSelectedBackground(bg.id); saveAvatar({ backgroundValue: bg.id }); }}
                            className={cn(
                              "relative rounded-lg overflow-hidden border-2 transition-all h-12",
                              selectedBackground === bg.id ? "border-blue-500" : "border-white/10 hover:border-white/25",
                            )}
                          >
                            <div className="absolute inset-0" style={{ background: bg.gradient }} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              <span className="text-sm leading-none">{bg.icon}</span>
                              <span className="text-[8px] text-white/70 font-medium leading-none">{bg.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color + Lighting */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5 text-pink-400" />
                        Accent Color
                      </p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {["#2563eb", "#7c3aed", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#f97316"].map((c) => (
                          <button
                            key={c}
                            onClick={() => { setAccentColor(c); saveAvatar({ accentColor: c }); }}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                              accentColor === c ? "border-white" : "border-transparent",
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Sun className="h-3 w-3" />
                            Lighting Intensity
                          </Label>
                          <span className="text-xs font-mono text-violet-300">{lightingIntensity}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100" step="5"
                          value={lightingIntensity}
                          onChange={(e) => setLightingIntensity(parseInt(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ accentColor: "#8b5cf6", background: "rgba(255,255,255,0.1)" }}
                        />
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Live 3D Preview */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-green-400" />
                        Live Preview
                        <span className="ml-auto flex items-center gap-1 bg-red-600/80 rounded px-1.5 py-0.5">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                          <span className="text-[9px] text-white font-bold">LIVE</span>
                        </span>
                      </p>
                      <AvatarCanvas
                        avatarKey={avatarConfig?.avatarKey ?? "marcus"}
                        accentColor={accentColor}
                        scale={avatarConfig?.scale ?? 1.0}
                        positionY={avatarConfig?.positionY ?? -0.8}
                        lightingPreset={avatarConfig?.lightingPreset ?? "studio"}
                        avatarEnabled={avatarConfig?.avatarEnabled ?? true}
                        avatarUrl={rpmAvatarUrl ?? uploadedVrmUrl ?? avatarConfig?.avatarUrl}
                        onStats={setRendererStats}
                        showFps={false}
                        animationState={animState}
                        mouthOpenAmount={mouthOpen}
                        expressionIntensity={expressionIntensity}
                        backgroundGradient={getBackgroundGradient(selectedBackground)}
                        className="w-full h-[220px] rounded-xl"
                      />
                      <div className="flex items-center justify-between mt-2 px-0.5">
                        <span className="text-[10px] text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          TikTok LIVE Ready
                        </span>
                        {avatarSaving && (
                          <span className="flex items-center gap-1 text-[10px] text-violet-400">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Saving…
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">60fps · WebGL</span>
                      </div>
                    </div>


                    <Separator className="bg-white/5" />

                    {/* Scene Settings */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
                        Scene Settings
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label className="text-[10px] text-muted-foreground">Scale</Label>
                            <span className="text-[10px] font-mono text-violet-300">{(avatarConfig?.scale ?? 1.0).toFixed(1)}×</span>
                          </div>
                          <input
                            type="range" min="0.5" max="2.0" step="0.1"
                            value={avatarConfig?.scale ?? 1.0}
                            onChange={(e) => saveAvatar({ scale: parseFloat(e.target.value) })}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: "#8b5cf6", background: "rgba(255,255,255,0.1)" }}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label className="text-[10px] text-muted-foreground">Position Y</Label>
                            <span className="text-[10px] font-mono text-violet-300">{(avatarConfig?.positionY ?? -0.8).toFixed(1)}</span>
                          </div>
                          <input
                            type="range" min="-2.0" max="1.0" step="0.1"
                            value={avatarConfig?.positionY ?? -0.8}
                            onChange={(e) => saveAvatar({ positionY: parseFloat(e.target.value) })}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: "#8b5cf6", background: "rgba(255,255,255,0.1)" }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Lighting</Label>
                          <Select value={avatarConfig?.lightingPreset ?? "studio"} onValueChange={(v) => saveAvatar({ lightingPreset: v })}>
                            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="studio">🎥 Studio</SelectItem>
                              <SelectItem value="dramatic">🎭 Dramatic</SelectItem>
                              <SelectItem value="soft">☁️ Soft</SelectItem>
                              <SelectItem value="neon">🌆 Neon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">BG Type</Label>
                          <Select value={avatarConfig?.backgroundType ?? "transparent"} onValueChange={(v) => saveAvatar({ backgroundType: v })}>
                            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transparent">⬜ Transparent</SelectItem>
                              <SelectItem value="color">🎨 Solid</SelectItem>
                              <SelectItem value="gradient">🌅 Gradient</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Reactions & Lip Sync */}
                    <div>
                      <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-violet-400" />
                        Reactions & Lip Sync
                        <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400 bg-violet-500/5 ml-1">Live</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-xl leading-none">{ANIMATION_EMOJI[animState]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white">{ANIMATION_LABELS[animState]}</p>
                          {lastReaction && <p className="text-[10px] text-muted-foreground/60 truncate">{lastReaction}</p>}
                        </div>
                        {isSpeaking && (
                          <div className="flex items-center gap-1 text-[9px] text-violet-400 flex-shrink-0">
                            <Mic className="h-2.5 w-2.5 animate-pulse" />
                            <span>lip sync</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {(["gift_reaction", "follow_reaction", "victory", "excited", "happy"] as AnimationState[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => machineRef.current.push(s)}
                            className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-muted-foreground hover:text-violet-300 transition-all"
                          >
                            {ANIMATION_EMOJI[s]} {ANIMATION_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mic className="h-3 w-3" />
                              Lip Sync Sensitivity
                            </Label>
                            <span className="text-xs font-mono text-violet-300">{Math.round(lipSyncSensitivity * 100)}%</span>
                          </div>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={lipSyncSensitivity}
                            onChange={(e) => setLipSyncSensitivity(parseFloat(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: "#8b5cf6", background: "rgba(255,255,255,0.1)" }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Zap className="h-3 w-3" />
                              Expression Intensity
                            </Label>
                            <span className="text-xs font-mono text-violet-300">{Math.round(expressionIntensity * 100)}%</span>
                          </div>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={expressionIntensity}
                            onChange={(e) => setExpressionIntensity(parseFloat(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: "#8b5cf6", background: "rgba(255,255,255,0.1)" }}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* System Status */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-violet-400" />
                        System Status
                      </p>
                      <div className="space-y-1.5">
                        {[
                          { label: "RPM · Avaturn · VRM avatars",    desc: "Photorealistic GLB & VRM 1.0 support" },
                          { label: "Real-time 3D rendering",         desc: "React Three Fiber + WebGL" },
                          { label: "TikTok event reactions",         desc: "Gift · Follow · Like · Share" },
                          { label: "Animation state machine",        desc: "7 states, priority queue" },
                          { label: "AI voice lip sync",              desc: "Web Audio API AnalyserNode" },
                          { label: "Background customiser",          desc: "4 scene presets + custom colour" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-emerald-500/70" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground/80">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground/40">{item.desc}</p>
                            </div>
                            <CheckCircle2 className="h-3 w-3 text-emerald-400/70 flex-shrink-0 mt-0.5" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Renderer Stats */}
                    {rendererStats && (
                      <div>
                        <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-violet-400" />
                          Renderer Stats
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: "FPS", val: rendererStats.fps, color: rendererStats.fps >= 50 ? "text-emerald-400" : rendererStats.fps >= 30 ? "text-yellow-400" : "text-red-400" },
                            { label: "Geo", val: rendererStats.geometries, color: "text-violet-300" },
                            { label: "Tex", val: rendererStats.textures, color: "text-violet-300" },
                            { label: "Calls", val: rendererStats.drawCalls, color: "text-violet-300" },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="text-center p-2 rounded-lg bg-white/5 border border-white/5">
                              <p className={cn("text-[12px] font-mono font-semibold", color)}>{val}</p>
                              <p className="text-[9px] text-muted-foreground/60 mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 mt-1.5">
                          Triangles: {rendererStats.triangles.toLocaleString()} · Quality: {rendererStats.quality}
                        </p>
                      </div>
                    )}

                    {/* Animation presets library */}
                    {avatarPresets && avatarPresets.length > 0 && (
                      <>
                        <Separator className="bg-white/5" />
                        <div>
                          <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-violet-400" />
                            Animation Library
                            <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground ml-1">
                              {avatarPresets.length} clips
                            </Badge>
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {avatarPresets.slice(0, 6).map((preset) => (
                              <div key={preset.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                                <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                  <Play className="h-2.5 w-2.5 text-violet-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium text-foreground/80 truncate">{preset.name}</p>
                                  <p className="text-[10px] text-muted-foreground capitalize">{preset.category}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {avatarPresets.length > 6 && (
                            <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
                              +{avatarPresets.length - 6} more clips · assignable to events
                            </p>
                          )}
                        </div>
                      </>
                    )}

                  </div>
                )}
              </ScrollArea>
            </Card>
          )}

        </div>
      </div>

      {/* Avatar Creator Modal */}
      <AvatarCreatorModal
        open={creatorModalOpen}
        onOpenChange={setCreatorModalOpen}
        onSave={handleCreatorSave}
      />
    </div>
  );
}
