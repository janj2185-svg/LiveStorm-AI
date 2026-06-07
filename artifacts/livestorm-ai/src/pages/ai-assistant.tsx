import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetActiveSession, getGetActiveSessionQueryKey } from "@workspace/api-client-react";
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
  Bot, Send, Trash2, Sparkles, Zap, Shield, Trophy, RefreshCw,
  Wand2, Target, Star, MessageSquare, Mic, Volume2, VolumeX,
  Globe, Gift, Users, Heart, Share2, Loader2, Radio, Play,
  ChevronDown, ChevronRight, CornerDownRight, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveSession, type TtsMode, type LiveEvent } from "@/hooks/useLiveSession";

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
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type Quest = {
  id: number;
  questText: string;
  metric: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
};

type GeneratedEvent = { title: string; description: string; duration: string; mechanic: string };

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
  { value: "ru", label: "Русский", flag: "🇷🇺" },
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

  // ── Session ──────────────────────────────────────────────────────────────────
  const { data: activeSessionRes } = useGetActiveSession({
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 15000 },
  });
  const activeSessionId = (activeSessionRes as any)?.session?.id ?? null;
  const isSessionActive = (activeSessionRes as any)?.active ?? false;

  // ── Live events (socket) ──────────────────────────────────────────────────────
  const { events, stats, flaggedComments, connected, setTtsMode, setTtsVoice } =
    useLiveSession(activeSessionId);

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
  const [ttsMode, setTtsModeLocal] = useState<TtsMode>("off");
  const [ttsVoice, setTtsVoiceLocal] = useState("nova");

  useEffect(() => {
    if (config && !configLoading) {
      const mode: TtsMode = config.voiceEnabled ? "openai" : "off";
      setTtsModeLocal(mode);
      setTtsMode(mode);
      setTtsVoiceLocal(config.voiceName ?? "nova");
      setTtsVoice(config.voiceName ?? "nova");
    }
  }, [config?.voiceEnabled, config?.voiceName]);

  const handleTtsModeChange = useCallback((mode: TtsMode) => {
    setTtsModeLocal(mode);
    setTtsMode(mode);
    updateConfig.mutate({ voiceEnabled: mode === "openai" });
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
  const [activeTab, setActiveTab] = useState<"live" | "chat" | "quests" | "moderation">("live");

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

  // ── Quests ────────────────────────────────────────────────────────────────────
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
  const [generatedEvent, setGeneratedEvent] = useState<GeneratedEvent | null>(null);
  const [isGeneratingEvent, setIsGeneratingEvent] = useState(false);

  const handleGenerateQuests = async () => {
    if (!activeSessionId) return;
    setIsGeneratingQuests(true);
    try {
      const data = await apiFetch("/ai/generate-quests", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSessionId,
          viewerCount: stats.viewerCount,
          sessionStats: {
            gifts: stats.totalGifts,
            comments: stats.totalComments,
            likes: stats.totalLikes,
            followers: stats.totalFollows,
          },
        }),
      });
      setQuests(data);
    } catch { /* ignore */ } finally {
      setIsGeneratingQuests(false);
    }
  };

  const handleGenerateEvent = async () => {
    setIsGeneratingEvent(true);
    try {
      const data = await apiFetch("/ai/generate-event", {
        method: "POST",
        body: JSON.stringify({ currentViewers: stats.viewerCount }),
      });
      setGeneratedEvent(data);
    } catch { /* ignore */ } finally {
      setIsGeneratingEvent(false);
    }
  };

  // ── Filtered event feed ───────────────────────────────────────────────────────
  const feedEvents = useMemo(
    () => events.filter((e) => e.type !== "viewerCount").slice(0, 80),
    [events],
  );

  const personaName = config?.personaName ?? "Storm";

  // ── Settings sidebar sections (collapsible on mobile) ─────────────────────────
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["persona", "voice", "language", "autoreply"]),
  );
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
          {/* Connection badge */}
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
          {/* Persona badge */}
          <Badge variant="outline" className="border-purple-500/50 text-purple-300 bg-purple-500/10 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-purple-400 mr-2 animate-pulse" />
            {personaName}
          </Badge>
        </div>
      </div>

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
              </>
            )}
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

        </div>

        {/* ── RIGHT: Tab content ── */}
        <div className="flex flex-col min-h-0">

          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-3 flex-shrink-0">
            {[
              { key: "live", label: "Live Feed", icon: <Radio className="h-3.5 w-3.5" />, badge: feedEvents.length > 0 ? feedEvents.filter(e => e.type === "comment").length : null },
              { key: "chat", label: "AI Chat", icon: <Bot className="h-3.5 w-3.5" />, badge: null },
              { key: "quests", label: "Quests", icon: <Trophy className="h-3.5 w-3.5" />, badge: quests.length > 0 ? quests.length : null },
              { key: "moderation", label: "Flagged", icon: <Shield className="h-3.5 w-3.5" />, badge: flaggedComments.length > 0 ? flaggedComments.length : null },
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
                      return (
                        <CommentCard
                          key={event.timestamp}
                          event={event}
                          onReply={handleReply}
                          isReplying={replyingTo.has(event.timestamp)}
                          sessionId={activeSessionId}
                        />
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

          {/* ── QUESTS TAB ── */}
          {activeTab === "quests" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <div className="px-4 py-2.5 flex-shrink-0 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">AI Quests</p>
                    <p className="text-xs text-muted-foreground">Generate viewer challenges to boost engagement</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8"
                      onClick={handleGenerateEvent}
                      disabled={isGeneratingEvent}
                    >
                      {isGeneratingEvent ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                      Event Idea
                    </Button>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 h-8"
                      onClick={handleGenerateQuests}
                      disabled={isGeneratingQuests || !isSessionActive}
                    >
                      {isGeneratingQuests ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                      Generate Quests
                    </Button>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {!isSessionActive && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Start a session to generate quests
                    </div>
                  )}
                  {generatedEvent && (
                    <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4 space-y-2">
                      <div className="font-semibold text-orange-300">{generatedEvent.title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{generatedEvent.description}</p>
                      <div className="text-xs text-muted-foreground">⏱️ {generatedEvent.duration}</div>
                      <div className="text-xs bg-background/40 rounded p-2">
                        <span className="text-muted-foreground font-medium">Mechanic: </span>{generatedEvent.mechanic}
                      </div>
                    </div>
                  )}
                  {quests.length === 0 && isSessionActive && (
                    <div className="text-center py-8">
                      <Trophy className="h-8 w-8 text-yellow-400/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No quests yet. Generate some to engage your viewers!</p>
                    </div>
                  )}
                  {quests.map((quest) => {
                    const progress = Math.min(100, Math.round((quest.current / quest.target) * 100));
                    const METRIC_ICONS: Record<string, React.ReactNode> = {
                      gifts: <Gift className="h-3.5 w-3.5 text-amber-400" />,
                      comments: <MessageSquare className="h-3.5 w-3.5 text-blue-400" />,
                      likes: <Heart className="h-3.5 w-3.5 text-pink-400" />,
                      followers: <Users className="h-3.5 w-3.5 text-green-400" />,
                      shares: <Share2 className="h-3.5 w-3.5 text-cyan-400" />,
                    };
                    return (
                      <div key={quest.id} className={cn("rounded-lg border p-4 space-y-3", quest.completed ? "border-green-500/30 bg-green-500/5" : "border-white/5 bg-white/3")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {METRIC_ICONS[quest.metric] ?? <Target className="h-3.5 w-3.5" />}
                            <span className="text-sm font-medium">{quest.questText}</span>
                          </div>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs flex-shrink-0">
                            +{quest.xpReward} XP
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{quest.current} / {quest.target}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", quest.completed ? "bg-green-500" : "bg-purple-500")}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        {quest.completed && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">✓ Completed!</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
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

        </div>
      </div>
    </div>
  );
}
