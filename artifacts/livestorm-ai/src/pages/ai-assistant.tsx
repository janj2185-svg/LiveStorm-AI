import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetAvatarConfig,
  useUpdateAvatarConfig,
  useGetAvatarPresets,
  useStartSession,
  useEndSession,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Boxes, SlidersHorizontal, Monitor, Cpu,
  Shirt, Tv2, Palette, Sun, Square, Activity, Eye, ArrowDown,
  TrendingUp, Trophy, MessageCircle, UserPlus, Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/react";
import { useLiveSessionContext, type TtsMode, type LiveEvent } from "@/contexts/LiveSessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AvatarStage } from "@/components/avatar/AvatarStage";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

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

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  comment:              MessageCircle,
  gift:                 Gift,
  like:                 Heart,
  follow:               UserPlus,
  share:                Share2,
  viewerCount:          Eye,
  ai_announcement:      Sparkles,
  xp_awarded:           Zap,
  achievement_unlocked: Trophy,
  level_up:             TrendingUp,
};

const EVENT_COLORS: Record<string, string> = {
  gift:                "text-amber-400 bg-amber-500/10 border-amber-500/20",
  like:                "text-pink-400 bg-pink-500/10 border-pink-500/20",
  comment:             "text-blue-400 bg-blue-500/10 border-blue-500/20",
  follow:              "text-green-400 bg-green-500/10 border-green-500/20",
  share:               "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  viewerCount:         "text-violet-400 bg-violet-500/10 border-violet-500/20",
  ai_announcement:     "text-purple-300 bg-purple-500/10 border-purple-500/20",
  xp_awarded:          "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  achievement_unlocked: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  level_up:            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeAgo({ ts }: { ts: number }) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return <span className="text-xs text-muted-foreground/50">{diff}s ago</span>;
  if (diff < 3600) return <span className="text-xs text-muted-foreground/50">{Math.floor(diff / 60)}m ago</span>;
  return <span className="text-xs text-muted-foreground/50">{Math.floor(diff / 3600)}h ago</span>;
}

function UserAvatar({ username, size = "sm" }: { username?: string; size?: "sm" | "md" }) {
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
      <UserAvatar username={event.username} />
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
            <span className="text-xs text-muted-foreground/60">↳ @{attrName}</span>
          )}
          <TimeAgo ts={event.timestamp} />
        </div>
        <p className="text-sm text-foreground/90 leading-snug italic">"{text}"</p>
      </div>
    </div>
  );
}

// ── Sidebar section — must be defined OUTSIDE the main component ──────────────
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

// ── Unified Chat Feed (right panel) ──────────────────────────────────────────

function UnifiedChatTab({
  events,
  onReply,
  replyingTo,
  sessionId,
  isActive,
}: {
  events: LiveEvent[];
  onReply: (event: LiveEvent) => void;
  replyingTo: Set<number>;
  sessionId: number | null;
  isActive: boolean;
}) {
  const chatEvents = useMemo(
    () => [...events.filter((e) => e.type !== "viewerCount")].reverse(),
    [events],
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const paused = distFromBottom > 80;
    isPausedRef.current = paused;
    setIsPaused(paused);
  }, []);

  useEffect(() => {
    if (isPausedRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatEvents.length]);

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Radio className="h-8 w-8 text-white/10 mb-3" />
        <p className="text-xs text-muted-foreground/60">Start a session to see live chat</p>
        <Link href="/dashboard">
          <span className="text-[11px] text-violet-400 hover:underline cursor-pointer mt-2 inline-block">
            Go to Dashboard →
          </span>
        </Link>
      </div>
    );
  }

  if (chatEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageCircle className="h-8 w-8 text-white/10 mb-3 animate-pulse" />
        <p className="text-xs text-muted-foreground/60">Waiting for chat messages…</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
      >
        <div className="py-2 space-y-0.5">
          <AnimatePresence initial={false}>
            {chatEvents.map((event, idx) => {
              const key = `${event.timestamp}-${idx}`;
              if (event.type === "comment") return (
                <motion.div key={key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  <CommentCard
                    event={event}
                    onReply={onReply}
                    isReplying={replyingTo.has(event.timestamp)}
                    sessionId={sessionId}
                  />
                </motion.div>
              );
              if (event.type === "ai_announcement") return (
                <motion.div key={key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  <AiAnnouncementCard event={event} />
                </motion.div>
              );
              if (event.type === "gift") return (
                <motion.div key={key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  <GiftCard event={event} />
                </motion.div>
              );
              if (event.type === "follow") return (
                <motion.div key={key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  <FollowCard event={event} />
                </motion.div>
              );
              if (event.type === "like") return (
                <motion.div key={key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  <LikeCard event={event} />
                </motion.div>
              );
              if (event.type === "share") return (
                <motion.div key={key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  <ShareCard event={event} />
                </motion.div>
              );
              return null;
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>
      {isPaused && chatEvents.length > 0 && (
        <button
          onClick={() => { isPausedRef.current = false; setIsPaused(false); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-colors z-10"
        >
          <ArrowDown className="h-3 w-3" />
          Jump to latest
        </button>
      )}
    </div>
  );
}

// ── Events Tab ────────────────────────────────────────────────────────────────

type FilterType = "all" | "comment" | "gift" | "follow" | "like" | "share" | "ai_announcement";
const FILTER_BUTTONS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Chat", value: "comment" },
  { label: "Gifts", value: "gift" },
  { label: "Follows", value: "follow" },
  { label: "AI", value: "ai_announcement" },
];

function eventSummary(event: LiveEvent): string {
  switch (event.type) {
    case "comment":              return (event.data.text as string) ?? "";
    case "gift":                 return `${event.data.giftName ?? "Gift"}${(event.data.count as number) > 1 ? ` ×${event.data.count}` : ""} — ${(event.data.coins as number) ?? 0} coins`;
    case "like":                 return `+${(event.data.likeCount as number) ?? 1} likes`;
    case "follow":               return "followed";
    case "share":                return "shared the stream";
    case "viewerCount":          return `${(event.data.count as number) ?? 0} viewers`;
    case "ai_announcement":      return (event.data.text as string) ?? "";
    case "xp_awarded":           return `+${event.data.xp} XP · Lv.${event.data.level}`;
    case "achievement_unlocked": return `🏆 ${(event.data.achievementName as string) ?? "Achievement"}`;
    case "level_up":             return `reached Level ${event.data.newLevel}!`;
    default:                     return JSON.stringify(event.data).slice(0, 60);
  }
}

function EventsTab({ events, isActive }: { events: LiveEvent[]; isActive: boolean }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.type === filter)).filter((e) => e.type !== "viewerCount"),
    [events, filter],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/5 flex flex-wrap gap-1 flex-shrink-0">
        {FILTER_BUTTONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
              filter === value
                ? "bg-white/10 border-white/20 text-white"
                : "border-transparent text-muted-foreground/60 hover:text-white hover:bg-white/5",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {!isActive ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Activity className="h-7 w-7 text-white/10 mb-2" />
            <p className="text-xs text-muted-foreground/60">Start a session to see events</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Activity className="h-7 w-7 text-white/10 mb-2 animate-pulse" />
            <p className="text-xs text-muted-foreground/60">No events yet…</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence initial={false}>
              {filtered.map((event, idx) => {
                const colorClass = EVENT_COLORS[event.type] ?? "text-muted-foreground bg-white/5 border-white/10";
                const Icon = EVENT_ICONS[event.type] ?? Activity;
                return (
                  <motion.div
                    key={`${event.timestamp}-${idx}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                  >
                    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5", colorClass)}>
                      <Icon className="h-2.5 w-2.5" />
                      {event.type.replace("_", " ").toUpperCase()}
                    </span>
                    {event.username && (
                      <span className="text-xs font-semibold text-white/70 flex-shrink-0 truncate max-w-[60px]">
                        @{event.username}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 truncate flex-1 min-w-0">
                      {eventSummary(event)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Activity Tab ───────────────────────────────────────────────────────────

function AiActivityTab({
  events,
  ttsMode,
  isActive,
}: {
  events: LiveEvent[];
  ttsMode: TtsMode;
  isActive: boolean;
}) {
  const aiEvents = useMemo(
    () => events.filter((e) => e.type === "ai_announcement").slice(0, 40),
    [events],
  );

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Sparkles className="h-7 w-7 text-white/10 mb-2" />
        <p className="text-xs text-muted-foreground/60">Start a session to see AI activity</p>
      </div>
    );
  }

  if (aiEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Sparkles className="h-7 w-7 text-purple-400/20 mb-2 animate-pulse" />
        <p className="text-xs text-muted-foreground/60">Waiting for AI to respond…</p>
        <p className="text-[10px] text-muted-foreground/40 mt-1">
          AI replies appear here with full diagnostic info
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      <div className="p-3 space-y-3">
        {aiEvents.map((event, idx) => {
          const text = (event.data.text as string) ?? "";
          const annType = (event.data.announcementType as string) ?? "";
          const isReply = annType === "comment_reply";
          const giftName = (event.data.giftName as string) ?? null;
          return (
            <motion.div
              key={`${event.timestamp}-${idx}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-2"
            >
              {/* Trigger */}
              <div className="flex items-start gap-2">
                <div className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5",
                  isReply ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20",
                )}>
                  {isReply ? "COMMENT" : annType.toUpperCase().replace("_", " ")}
                </div>
                {event.username && (
                  <span className="text-xs font-semibold text-white/70 truncate">@{event.username}</span>
                )}
                <TimeAgo ts={event.timestamp} />
              </div>

              {/* AI reply */}
              <div className="flex items-start gap-2 ml-1">
                <CornerDownRight className="h-3 w-3 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-purple-400/70 font-semibold mb-0.5">AI replied</p>
                  <p className="text-xs text-foreground/80 leading-relaxed italic">"{text}"</p>
                </div>
              </div>

              {/* TTS status */}
              <div className="flex items-center gap-1.5 ml-1">
                <CornerDownRight className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
                {ttsMode === "off" ? (
                  <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                    <VolumeX className="h-2.5 w-2.5" />
                    TTS off
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400/70 flex items-center gap-1">
                    <Volume2 className="h-2.5 w-2.5" />
                    TTS {ttsMode === "openai" ? "OpenAI" : "Browser"} · played
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiAssistant() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { getToken } = useAuth();

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      return apiFetch(path, {
        ...options,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options?.headers ?? {}),
        },
      });
    },
    [getToken],
  );

  // ── Session + Live events ─────────────────────────────────────────────────
  const { events, stats, flaggedComments, connected, setTtsMode, setTtsVoice, setTtsVolume, setTtsSpeed,
    tiktokMode, tiktokError: socketError, tiktokUsername,
    aiAnnouncements, luckyDrops, achievementUnlocks,
    activeSessionRes, isActive: isSessionActive, activeSessionId, sessionMode,
  } = useLiveSessionContext();
  const initialError = (activeSessionRes as any)?.session?.connectionError ?? null;
  const effectiveMode = tiktokMode ?? (isSessionActive ? "demo" : null);
  const effectiveError = socketError ?? initialError;

  // ── Config ────────────────────────────────────────────────────────────────
  const { data: config, isLoading: configLoading } = useQuery<PersonaConfig>({
    queryKey: ["ai-config"],
    queryFn: () => authFetch("/ai/config"),
  });

  const updateConfig = useMutation({
    mutationFn: (updates: Partial<PersonaConfig>) =>
      authFetch("/ai/config", { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-config"] }),
  });

  // ── TTS local state ───────────────────────────────────────────────────────
  const [ttsMode, setTtsModeLocal] = useState<TtsMode>(() => {
    try { return (localStorage.getItem("ttsMode") as TtsMode | null) ?? "off"; } catch { return "off"; }
  });
  const [ttsVoice, setTtsVoiceLocal] = useState("nova");

  useEffect(() => {
    if (config && !configLoading) {
      let mode: TtsMode;
      try { mode = (localStorage.getItem("ttsMode") as TtsMode | null) ?? (config.voiceEnabled ? "openai" : "off"); }
      catch { mode = config.voiceEnabled ? "openai" : "off"; }
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
    if (mode === "openai") updateConfig.mutate({ voiceEnabled: true });
    else if (mode === "off") updateConfig.mutate({ voiceEnabled: false });
  }, [setTtsMode]);

  const handleTtsVoiceChange = useCallback((voice: string) => {
    setTtsVoiceLocal(voice);
    setTtsVoice(voice);
    updateConfig.mutate({ voiceName: voice });
  }, [setTtsVoice]);

  // ── Reply state ───────────────────────────────────────────────────────────
  const [replyingTo, setReplyingTo] = useState<Set<number>>(new Set());

  const handleReply = useCallback(async (event: LiveEvent) => {
    const key = event.timestamp;
    if (replyingTo.has(key)) return;
    setReplyingTo((prev) => new Set([...prev, key]));
    try {
      await authFetch("/ai/reply-to-comment", {
        method: "POST",
        body: JSON.stringify({
          comment: event.data.text ?? "",
          viewerName: event.username ?? "viewer",
          sessionId: activeSessionId,
          language: config?.replyLanguage ?? "auto",
        }),
      });
    } catch {}
    finally {
      setReplyingTo((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  }, [replyingTo, activeSessionId, config?.replyLanguage, authFetch]);

  // ── Debug mode ────────────────────────────────────────────────────────────
  const showAvatarDebug = new URLSearchParams(window.location.search).get("avatarDebug") === "1";

  // ── Avatar config ─────────────────────────────────────────────────────────
  const { data: avatarConfig, isLoading: avatarLoading } = useGetAvatarConfig();
  const { mutate: saveAvatar, isPending: avatarSaving } = useUpdateAvatarConfig({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["avatarConfig"] }) },
  });
  const { data: avatarPresets } = useGetAvatarPresets();
  const builtInAvatars: BuiltInAvatar[] = avatarConfig?.builtInAvatars ?? [];
  const selectedAvatar = builtInAvatars.find((a) => a.key === avatarConfig?.avatarKey) ?? builtInAvatars[0];

  const [uploadedVrmUrl, setUploadedVrmUrl] = useState<string | null>(null);
  const [uploadedVrmName, setUploadedVrmName] = useState<string | null>(null);
  const [rpmAvatarUrl, setRpmAvatarUrl] = useState<string | null>(null);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [rendererStats, setRendererStats] = useState<RendererStats | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string>("studio");
  const [lightingIntensity, setLightingIntensity] = useState<number>(80);

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

  // ── Animation machine + lip sync ─────────────────────────────────────────
  const machineRef = useRef<AvatarAnimationMachine>(new AvatarAnimationMachine());
  const [animState, setAnimState] = useState<AnimationState>("idle");
  const [lipSyncSensitivity, setLipSyncSensitivity] = useState(0.75);
  const [expressionIntensity, setExpressionIntensity] = useState(0.8);

  useEffect(() => {
    const machine = machineRef.current;
    const unsubscribe = machine.subscribe(setAnimState);
    const interval = setInterval(() => machine.tick(), 100);
    return () => { unsubscribe(); clearInterval(interval); };
  }, []);

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
    enabled: (avatarConfig?.avatarEnabled ?? false) && (avatarConfig?.lipSyncEnabled ?? true),
  });

  const { lastReaction } = useAvatarReactions({
    machine: machineRef.current,
    events,
    aiAnnouncements: aiAnnouncements ?? [],
    luckyDrops: luckyDrops ?? [],
    achievementUnlocks: achievementUnlocks ?? [],
  });

  // ── AI private chat ───────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: chatMessages } = useQuery<ChatMessage[]>({
    queryKey: ["ai-messages"],
    queryFn: () => authFetch("/ai/messages"),
    retry: false,
  });
  useEffect(() => setLocalMessages(chatMessages ?? []), [chatMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMessages]);

  const clearMessages = useMutation({
    mutationFn: () => authFetch("/ai/messages", { method: "DELETE" }),
    onSuccess: () => { setLocalMessages([]); queryClient.invalidateQueries({ queryKey: ["ai-messages"] }); },
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
      const data = await authFetch("/ai/chat", { method: "POST", body: JSON.stringify({ message: msg }) });
      setLocalMessages((prev) => prev.map((m) => m.id === tempId + 1 ? { ...m, content: data.reply } : m));
      queryClient.invalidateQueries({ queryKey: ["ai-messages"] });
    } catch {
      setLocalMessages((prev) => prev.map((m) => m.id === tempId + 1 ? { ...m, content: "Sorry, couldn't respond. Try again." } : m));
    } finally {
      setIsChatLoading(false);
      inputRef.current?.focus();
    }
  }, [chatInput, isChatLoading, queryClient, authFetch]);

  // ── Voice preview ─────────────────────────────────────────────────────────
  const [isVoicePreviewing, setIsVoicePreviewing] = useState(false);

  const handleVoicePreview = async () => {
    if (!config || isVoicePreviewing) return;
    setIsVoicePreviewing(true);
    try {
      const token = await getToken();
      const previewText = `Hey! I'm ${config.personaName}, your AI co-host. Let's make this stream absolutely amazing!`;
      const resp = await fetch(`${API_BASE}/ai/voice`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: previewText, voice: config.voiceName ?? "nova", speed: config.voiceSpeed ?? 1.0 }),
      });
      if (!resp.ok) throw new Error("Voice generation failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, config.voiceVolume ?? 1.0));
      window.dispatchEvent(new CustomEvent("tts:audio", { detail: audio }));
      window.dispatchEvent(new CustomEvent("tts:start"));
      audio.onended = () => { URL.revokeObjectURL(url); window.dispatchEvent(new CustomEvent("tts:end")); setIsVoicePreviewing(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); window.dispatchEvent(new CustomEvent("tts:end")); setIsVoicePreviewing(false); };
      await audio.play();
    } catch {
      window.dispatchEvent(new CustomEvent("tts:end"));
      setIsVoicePreviewing(false);
    }
  };

  // ── Translation ───────────────────────────────────────────────────────────
  const [chatTranslateEnabled, setChatTranslateEnabled] = useState(false);
  const [chatTranslateLang, setChatTranslateLang] = useState("en");
  const [translatedComments, setTranslatedComments] = useState<Record<number, string | null>>({});
  const [translatingComments, setTranslatingComments] = useState<Set<number>>(new Set());
  const [accentColor, setAccentColor] = useState("#3b82f6");

  useEffect(() => {
    if (!avatarConfig) return;
    if (avatarConfig.accentColor) setAccentColor(avatarConfig.accentColor);
    if (avatarConfig.backgroundValue) setSelectedBackground(avatarConfig.backgroundValue);
    setLipSyncSensitivity(avatarConfig.lipSyncSensitivity ?? 0.75);
    setExpressionIntensity(avatarConfig.expressionIntensity ?? 0.8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarConfig?.id]);

  // ── Settings sidebar sections ─────────────────────────────────────────────
  // All collapsed by default (secondary tools, not primary focus)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Right panel tab ───────────────────────────────────────────────────────
  const [rightTab, setRightTab] = useState<"chat" | "events" | "ai">("chat");

  // ── Feed events ───────────────────────────────────────────────────────────
  const feedEvents = useMemo(
    () => events.filter((e) => e.type !== "viewerCount").slice(0, 80),
    [events],
  );

  const personaName = config?.personaName ?? "Storm";

  // ── Stream control ────────────────────────────────────────────────────────
  const startSession = useStartSession();
  const endSession = useEndSession();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col gap-2 overflow-hidden">

      {/* ── Connection error banner ── */}
      {isSessionActive && effectiveMode === "error" && effectiveError && (
        <div className="flex items-start gap-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-red-300 mr-2">TikTok connection failed</span>
            <span className="text-xs text-red-300/80 font-mono truncate">{effectiveError}</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          3-COLUMN LAYOUT: Settings | Avatar | Chat
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr_360px] gap-3">

        {/* ═══════════════ LEFT: Settings (25%) ═══════════════ */}
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0 pr-0.5 scrollbar-thin scrollbar-thumb-white/10">

          {/* ── Unified AI Control Panel ── */}
          <div className="flex-shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">

            {/* Header — AI persona */}
            <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/[0.05]">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-lg shadow-purple-500/20">
                AI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{personaName}</p>
                <p className="text-[10px] text-muted-foreground/50">AI Co-Host</p>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                isSessionActive && connected
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : isSessionActive
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-white/10 bg-white/5 text-white/30",
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full",
                  isSessionActive && connected ? "bg-green-400 animate-pulse"
                  : isSessionActive ? "bg-yellow-400 animate-pulse"
                  : "bg-white/20",
                )} />
                {isSessionActive && connected ? "Online" : isSessionActive ? "Connecting" : "Offline"}
              </div>
            </div>

            {/* Mode quick-select */}
            <div className="px-3 pt-2.5 pb-3 border-b border-white/[0.05]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Mode</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => updateConfig.mutate({ operatingMode: "autopilot", tone: "professional" })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-[10px] font-semibold transition-all",
                    config?.tone === "professional"
                      ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                      : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Pro</span>
                </button>
                <button
                  onClick={() => updateConfig.mutate({ operatingMode: "semi-auto", tone: "friendly" })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-[10px] font-semibold transition-all",
                    config?.tone === "friendly"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                  )}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Assistant</span>
                </button>
                <button
                  onClick={() => handleTtsModeChange(ttsMode === "off" ? "browser" : "off")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-[10px] font-semibold transition-all",
                    ttsMode !== "off"
                      ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                      : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white",
                  )}
                >
                  {ttsMode !== "off" ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>Voice</span>
                </button>
              </div>
            </div>

            {/* Stream control — always visible */}
            <div className="px-3 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-bold text-white/80">Stream Control</span>
                </div>
                {isSessionActive && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-red-300 bg-red-500/15 border border-red-500/25 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              {/* Status row */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3">
                {effectiveMode === "real" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                ) : effectiveMode === "error" ? (
                  <WifiOff className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                ) : (
                  <Server className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">
                    {!isSessionActive ? "Ready to go live"
                      : effectiveMode === "real" ? `@${tiktokUsername ?? "connected"}`
                      : "Demo mode active"}
                  </p>
                  {isSessionActive && activeSessionId && (
                    <p className="text-[10px] text-muted-foreground/50">Session #{activeSessionId}</p>
                  )}
                </div>
              </div>

              {/* Go Live / End Stream */}
              {!isSessionActive ? (
                <Button
                  className="w-full h-9 text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
                  disabled={startSession.isPending}
                  onClick={() => startSession.mutate(undefined)}
                >
                  {startSession.isPending
                    ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Starting…</>
                    : <><Play className="h-3.5 w-3.5 mr-2" />Go Live</>}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-9 text-sm font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                  disabled={endSession.isPending}
                  onClick={() => endSession.mutate(undefined)}
                >
                  {endSession.isPending
                    ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Ending…</>
                    : <><Square className="h-3.5 w-3.5 mr-2" />End Stream</>}
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground/35 text-center mt-2">
                Advanced setup in{" "}
                <Link href="/dashboard">
                  <span className="text-violet-400/70 hover:text-violet-400 transition-colors cursor-pointer">Dashboard</span>
                </Link>
              </p>
            </div>
          </div>

          {/* ── Settings sections — all collapsed by default ── */}

          <SidebarSection isOpen={expandedSections.has("persona")} onToggle={() => toggleSection("persona")} title="Persona" icon={<Sparkles className="h-4 w-4 text-purple-400" />}>
            {configLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}</div>
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
                    <SelectTrigger className="bg-background/50 border-white/10 h-8 text-sm"><SelectValue /></SelectTrigger>
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
                      ttsMode === mode ? "bg-blue-600 text-white shadow" : "text-muted-foreground hover:text-white hover:bg-white/5",
                    )}
                  >
                    {mode === "off" && <VolumeX className="h-3 w-3 mx-auto mb-0.5" />}
                    {mode === "browser" && <Radio className="h-3 w-3 mx-auto mb-0.5" />}
                    {mode === "openai" && <Mic className="h-3 w-3 mx-auto mb-0.5" />}
                    {mode}
                  </button>
                ))}
              </div>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10 h-7 text-xs"
                  onClick={handleVoicePreview}
                  disabled={isVoicePreviewing}
                >
                  {isVoicePreviewing
                    ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generating…</>
                    : <><Play className="h-3 w-3 mr-1.5" />Preview Voice</>}
                </Button>
              </div>
            )}
          </SidebarSection>

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
          </SidebarSection>

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
                    <Label className="text-xs text-muted-foreground">Cooldown per viewer (sec)</Label>
                    <Input
                      key={config?.spamCooldownSeconds}
                      type="number"
                      defaultValue={config?.spamCooldownSeconds ?? 30}
                      min={5}
                      max={300}
                      className="bg-background/50 border-white/10 h-8 text-sm"
                      onBlur={(e) => {
                        const val = Math.max(5, Math.min(300, Number(e.target.value)));
                        if (val !== config?.spamCooldownSeconds) updateConfig.mutate({ spamCooldownSeconds: val });
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </SidebarSection>

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

          {/* 3D Avatar settings shortcut */}
          <Card className="bg-card border-white/5 flex-shrink-0">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setAvatarSheetOpen(true)}
            >
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-violet-400" />
                Avatar Settings
              </CardTitle>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </Card>

        </div>

        {/* ═══════════════ CENTER: Avatar (40%) ═══════════════ */}
        <div className="flex flex-col min-h-0 gap-2 pt-3">

          {/* Branding — product signature */}
          <div className="flex items-center justify-center gap-2 flex-shrink-0 pb-1">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="LiveStorm AI"
              className="h-5 w-5 opacity-80"
              style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))" }}
            />
            <span
              className="text-[13px] font-black tracking-tight text-white/75"
              style={{ textShadow: "0 0 16px rgba(139,92,246,0.35)" }}
            >
              ⚡ LiveStorm AI
            </span>
          </div>

          {/* Avatar — fills most of the height */}
          <div className="relative flex-1 min-h-[430px] rounded-2xl overflow-hidden bg-black/20">
            <AvatarStage
              avatarKey={avatarConfig?.avatarKey ?? "marcus"}
              accentColor={accentColor}
              scale={avatarConfig?.scale ?? 1.0}
              positionY={avatarConfig?.positionY ?? -0.8}
              lightingPreset={avatarConfig?.lightingPreset ?? "studio"}
              avatarEnabled={avatarConfig?.avatarEnabled ?? true}
              avatarUrl={rpmAvatarUrl ?? uploadedVrmUrl ?? avatarConfig?.avatarUrl}
              animationState={animState}
              mouthOpenAmount={mouthOpen}
              expressionIntensity={expressionIntensity}
              backgroundGradient={getBackgroundGradient(selectedBackground)}
              isSpeaking={isSpeaking}
              personaName={personaName}
              onOpenSettings={() => setAvatarSheetOpen(true)}
              showDebug={showAvatarDebug}
              className="w-full h-full"
            />

            {/* Top-left: status indicators */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {/* Connection */}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm",
                isSessionActive && connected
                  ? "border-green-500/40 text-green-300 bg-green-500/20"
                  : isSessionActive
                  ? "border-yellow-500/40 text-yellow-300 bg-yellow-500/20 animate-pulse"
                  : "border-white/15 text-white/50 bg-black/30",
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full",
                  isSessionActive && connected ? "bg-green-400 animate-pulse"
                  : isSessionActive ? "bg-yellow-400"
                  : "bg-white/30",
                )} />
                {isSessionActive && connected ? "Connected"
                  : isSessionActive ? "Connecting…"
                  : "Offline"}
              </div>

              {/* Speaking indicator */}
              {isSpeaking && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm border-purple-500/40 text-purple-300 bg-purple-500/20">
                  <Mic className="h-3 w-3 animate-pulse" />
                  Speaking
                </div>
              )}

              {/* Thinking indicator — when last event was comment and no reply yet */}
              {animState === "thinking" && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm border-blue-500/40 text-blue-300 bg-blue-500/20">
                  <span className="flex gap-0.5 items-center">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-1 w-1 rounded-full bg-blue-400" style={{ animation: `bounce 1s ease infinite ${d}ms` }} />
                    ))}
                  </span>
                  Thinking
                </div>
              )}
            </div>

            {/* Top-right: LIVE badge */}
            <div className="absolute top-3 right-3">
              {isSessionActive ? (
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border backdrop-blur-sm",
                  effectiveMode === "real"
                    ? "border-red-500/50 text-red-300 bg-red-600/30"
                    : "border-orange-500/40 text-orange-300 bg-orange-500/20",
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {effectiveMode === "real" ? "LIVE" : "DEMO"}
                </div>
              ) : null}
            </div>

            {/* Bottom-left: persona name + animation state */}
            <div className="absolute bottom-3 left-3">
              <div className="px-2.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
                <p className="text-xs font-bold text-white">{personaName}</p>
                <p className="text-[10px] text-white/50 capitalize">{ANIMATION_LABELS[animState]}</p>
              </div>
            </div>

            {/* Bottom-right: TikTok username */}
            {effectiveMode === "real" && tiktokUsername && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm border border-emerald-500/25">
                <p className="text-[10px] font-semibold text-emerald-300">@{tiktokUsername}</p>
              </div>
            )}
          </div>

          {/* Stats row — below avatar */}
          <div className="grid grid-cols-4 gap-2 flex-shrink-0">
            {[
              { label: "Viewers", value: stats.viewerCount, icon: Eye, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", glow: "shadow-violet-500/10" },
              { label: "Gifts", value: stats.totalGifts, icon: Gift, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", glow: "shadow-amber-500/10" },
              { label: "Followers", value: stats.totalFollows, icon: Users, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", glow: "shadow-green-500/10" },
              { label: "Replies", value: aiAnnouncements?.length ?? 0, icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", glow: "shadow-purple-500/10" },
            ].map(({ label, value, icon: Icon, color, bg, glow }) => (
              <div key={label} className={cn("rounded-2xl border p-4 flex flex-col items-center gap-1.5 transition-all duration-300 shadow-lg", bg, glow)}>
                <Icon className={cn("h-4 w-4", color)} />
                <span className={cn("text-2xl font-black tabular-nums leading-none", isSessionActive ? "text-white" : "text-muted-foreground/30")}>
                  {isSessionActive ? value.toLocaleString() : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground/60 font-semibold">{label}</span>
              </div>
            ))}
          </div>

        </div>

        {/* ═══════════════ RIGHT: Unified Chat (35%) ═══════════════ */}
        <div className="flex flex-col min-h-0">

          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-2 flex-shrink-0">
            {[
              { key: "chat" as const, label: "Chat", icon: <MessageCircle className="h-3.5 w-3.5" />, badge: isSessionActive ? feedEvents.filter((e) => e.type === "comment").length : null },
              { key: "events" as const, label: "Events", icon: <Activity className="h-3.5 w-3.5" />, badge: null },
              { key: "ai" as const, label: "AI Activity", icon: <Sparkles className="h-3.5 w-3.5" />, badge: isSessionActive && (aiAnnouncements?.length ?? 0) > 0 ? aiAnnouncements?.length : null },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRightTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-lg transition-all relative",
                  rightTab === tab.key
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white hover:bg-white/5",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== null && (tab.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 text-[9px] font-bold flex items-center justify-center text-white">
                    {(tab.badge ?? 0) > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content — fills remaining height */}
          <div className="flex-1 min-h-0 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">

            {/* ── CHAT TAB ── */}
            {rightTab === "chat" && (
              <div className="h-full flex flex-col">
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-sm font-medium">Live Chat</span>
                    {feedEvents.length > 0 && (
                      <span className="text-xs text-muted-foreground/50">{feedEvents.filter((e) => e.type === "comment").length} comments</span>
                    )}
                  </div>
                  {isSessionActive && effectiveMode === "real" && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Real TikTok
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <UnifiedChatTab
                    events={feedEvents}
                    onReply={handleReply}
                    replyingTo={replyingTo}
                    sessionId={activeSessionId ?? null}
                    isActive={isSessionActive}
                  />
                </div>
              </div>
            )}

            {/* ── EVENTS TAB ── */}
            {rightTab === "events" && (
              <div className="h-full flex flex-col">
                <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    Event Log
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <EventsTab events={feedEvents} isActive={isSessionActive} />
                </div>
              </div>
            )}

            {/* ── AI ACTIVITY TAB ── */}
            {rightTab === "ai" && (
              <div className="h-full flex flex-col">
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    AI Responses
                  </span>
                  <div className="flex items-center gap-2">
                    {ttsMode !== "off" && (
                      <span className="text-[10px] text-blue-400 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                        <Volume2 className="h-2.5 w-2.5" />
                        Voice on
                      </span>
                    )}
                    {config?.autoReplyEnabled && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Auto-reply
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <AiActivityTab
                    events={feedEvents}
                    ttsMode={ttsMode}
                    isActive={isSessionActive}
                  />
                </div>
              </div>
            )}

          </div>

          {/* AI Strategy chat — compact input below */}
          <div className="flex-shrink-0 mt-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-muted-foreground/40 mb-1.5 flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Ask {personaName} for stream advice
            </p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder={`Ask ${personaName}…`}
                className="bg-background/50 border-white/10 flex-1 h-8 text-xs"
                disabled={isChatLoading}
              />
              <Button
                onClick={handleChatSend}
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 h-8 w-8 p-0"
                size="sm"
              >
                {isChatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {localMessages.length > 0 && (
              <div className="mt-2 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-1.5">
                {localMessages.slice(-4).map((msg) => (
                  <div key={msg.id} className={cn("flex gap-2 text-xs", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed",
                      msg.role === "user" ? "bg-purple-600 text-white" : "bg-white/5 text-foreground",
                    )}>
                      {msg.content === "..." ? (
                        <span className="flex gap-1 items-center h-4">
                          {[0, 150, 300].map((d) => (
                            <span key={d} className="h-1 w-1 rounded-full bg-purple-400" style={{ animation: `bounce 1s ease infinite ${d}ms` }} />
                          ))}
                        </span>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Avatar Configuration Sheet ── */}
      <Sheet open={avatarSheetOpen} onOpenChange={setAvatarSheetOpen}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] p-0 flex flex-col" aria-describedby={undefined}>
          <SheetHeader className="px-5 py-4 border-b border-white/10 flex-shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base font-bold">
              <Boxes className="h-4 w-4 text-violet-400" />
              Configure Avatar
            </SheetTitle>
          </SheetHeader>

          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
            <div>
              <p className="text-sm font-medium">3D Co-Host</p>
              <p className="text-xs text-muted-foreground">Show avatar on stream</p>
            </div>
            <Switch
              checked={avatarConfig?.avatarEnabled ?? false}
              onCheckedChange={(v) => saveAvatar({ avatarEnabled: v })}
              disabled={avatarSaving || avatarLoading}
              className="data-[state=checked]:bg-violet-600"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 px-5 py-2.5 border-b border-white/5 flex-shrink-0">
            {["RPM · Avaturn · VRM", "ARKit Lip Sync", "Expressions · Reactions", "TikTok LIVE Ready"].map((b) => (
              <Badge key={b} variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 bg-blue-500/5">{b}</Badge>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {avatarLoading ? (
              <div className="p-6 space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : (
              <div className="p-5 space-y-5">

                <div>
                  <div className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    Your AI Presenter
                  </div>
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
                      <p className="text-[11px] text-muted-foreground">No presenter set. Choose Ready Player Me, Avaturn, or upload a custom VRM.</p>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-500"
                        onClick={() => setCreatorModalOpen(true)}
                      >
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Create Your AI Presenter
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                    <Tv2 className="h-3.5 w-3.5 text-cyan-400" />
                    Background Scene
                  </div>
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

                <div>
                  <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-pink-400" />
                    Accent Color
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {["#2563eb", "#7c3aed", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#f97316"].map((c) => (
                      <button
                        key={c}
                        onClick={() => { setAccentColor(c); saveAvatar({ accentColor: c }); }}
                        className={cn("w-6 h-6 rounded-full border-2 transition-all hover:scale-110", accentColor === c ? "border-white" : "border-transparent")}
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
                </div>

                <Separator className="bg-white/5" />

                <div>
                  <div className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
                    Scene Settings
                  </div>
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
                    {(["gift_reaction", "follow_reaction", "victory", "excited", "happy", "surprised", "thinking", "listening"] as AnimationState[]).map((s) => (
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
                        onChange={(e) => { const v = parseFloat(e.target.value); setLipSyncSensitivity(v); saveAvatar({ lipSyncSensitivity: v }); }}
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
                        onChange={(e) => { const v = parseFloat(e.target.value); setExpressionIntensity(v); saveAvatar({ expressionIntensity: v }); }}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: "#8b5cf6", background: "rgba(255,255,255,0.1)" }}
                      />
                    </div>
                  </div>
                </div>

                {rendererStats && (
                  <>
                    <Separator className="bg-white/5" />
                    <div>
                      <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-violet-400" />
                        Renderer Stats
                      </div>
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
                    </div>
                  </>
                )}

                {showAvatarDebug && rendererStats && (
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-muted-foreground/60 space-y-0.5">
                    <p>debug: avatarUrl={avatarConfig?.avatarUrl?.slice(0, 40)}…</p>
                    <p>renderer={avatarConfig?.renderer} · key={avatarConfig?.avatarKey}</p>
                    <p>tris={rendererStats.triangles} · calls={rendererStats.drawCalls} · q={rendererStats.quality}</p>
                  </div>
                )}

              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Avatar Creator Modal */}
      <AvatarCreatorModal
        open={creatorModalOpen}
        onOpenChange={setCreatorModalOpen}
        onSave={handleCreatorSave}
      />
    </div>
  );
}
