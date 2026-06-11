import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveSessionContext, type LiveEvent } from "@/contexts/LiveSessionContext";
import type { EmotionalState } from "@/hooks/useLiveSession";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Video, Activity,
  AlertTriangle, Radio, Bot, Wifi, WifiOff,
  MessageCircle, Gift, Heart, UserPlus, Eye, Gem,
  ArrowDown, Share2, Sparkles, Zap, Trophy, TrendingUp,
  Brain,
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHero, GradientText } from "@/components/ui/premium";
import { CoHostPanel } from "@/components/CoHostPanel";

// ── Comment feed ──────────────────────────────────────────────────────────────

function CommentFeed({ events, isActive, translations }: { events: LiveEvent[]; isActive: boolean; translations: Record<string, string> }) {
  // useLiveSession prepends events ([newest, ...older]), so reverse to get oldest→newest
  // for correct bottom-scroll: bottomRef sits below newest comment
  const comments = [...events.filter((e) => e.type === "comment")].reverse();
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
  }, [comments.length]);

  const scrollToBottom = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-none">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          Comments
        </span>
        {isActive && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{comments.length}</span>
        )}
      </div>

      <div className="flex-1 relative min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
        >
          {!isActive ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-8 w-8 text-white/10 mb-3" />
              <p className="text-xs text-muted-foreground/60">Start a session to see comments</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-8 w-8 text-white/10 mb-3 animate-pulse" />
              <p className="text-xs text-muted-foreground/60">Waiting for comments…</p>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              <AnimatePresence initial={false}>
                {comments.map((e, idx) => (
                  <motion.div
                    key={`${e.timestamp}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.04] transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/25 flex-shrink-0 flex items-center justify-center overflow-hidden mt-0.5">
                      {e.avatarUrl ? (
                        <img src={e.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-blue-300">
                          {(e.username ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-blue-300 truncate">
                          {e.username ?? "Unknown"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                          {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed mt-0.5 break-words">
                        {(e.data.text as string) ?? ""}
                      </p>
                      {(() => {
                        const msgId = String(e.data.msgId ?? e.timestamp);
                        const translation = translations[msgId];
                        return translation ? (
                          <p className="text-[11px] text-yellow-200/65 leading-relaxed mt-1 pt-1 border-t border-white/[0.06] break-words">
                            🇺🇦 {translation}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {isPaused && comments.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-colors z-10"
          >
            <ArrowDown className="h-3 w-3" />
            Jump to latest
          </button>
        )}
      </div>
    </div>
  );
}

// ── Gift feed ─────────────────────────────────────────────────────────────────

function GiftFeed({ events, totalCoins, isActive }: { events: LiveEvent[]; totalCoins: number; isActive: boolean }) {
  const gifts = events.filter((e) => e.type === "gift").slice(0, 20);

  return (
    <div className="flex flex-col rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-none">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Gift className="h-4 w-4 text-amber-400" />
          Gifts
        </span>
        {totalCoins > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
            <Gem className="h-2.5 w-2.5" />
            {totalCoins.toLocaleString()}
          </span>
        )}
      </div>

      <div className="overflow-y-auto max-h-[280px] scrollbar-thin scrollbar-thumb-white/10">
        {!isActive ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Gift className="h-6 w-6 text-white/10 mb-2" />
            <p className="text-xs text-muted-foreground/60">Start a session to see gifts</p>
          </div>
        ) : gifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Gift className="h-6 w-6 text-white/10 mb-2 animate-pulse" />
            <p className="text-xs text-muted-foreground/60">Waiting for gifts…</p>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {gifts.map((e, idx) => (
                <motion.div
                  key={`${e.timestamp}-${idx}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/8 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/25 flex-shrink-0 flex items-center justify-center">
                    <Gift className="h-3.5 w-3.5 text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-amber-200 truncate">
                        {e.username ?? "Unknown"}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 flex-shrink-0">
                        <Gem className="h-2.5 w-2.5" />
                        {((e.data.coins as number) ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-300/60 truncate mt-0.5">
                      {(e.data.giftName as string) ?? "Gift"}
                      {(e.data.count as number) > 1 && ` ×${e.data.count}`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats, isActive }: { stats: { viewerCount: number; totalLikes: number; totalFollows: number; totalComments: number; totalShares: number }; isActive: boolean }) {
  const tiles = [
    { label: "Viewers", value: stats.viewerCount, icon: Eye, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { label: "Likes", value: stats.totalLikes, icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { label: "Follows", value: stats.totalFollows, icon: UserPlus, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    { label: "Comments", value: stats.totalComments, icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {tiles.map(({ label, value, icon: Icon, color, bg, border }) => (
        <div key={label} className={cn("rounded-xl border p-3 flex flex-col items-center gap-1 transition-all duration-300", bg, border)}>
          <Icon className={cn("h-4 w-4", color)} />
          <span className={cn("text-lg font-black tabular-nums leading-none", isActive ? "text-white" : "text-muted-foreground/40")}>
            {isActive ? value.toLocaleString() : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground/60 font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Filterable event log ──────────────────────────────────────────────────────

type FilterType = "all" | "comment" | "gift" | "follow" | "like" | "share" | "ai_announcement";

const FILTER_BUTTONS: { label: string; value: FilterType; color: string }[] = [
  { label: "All", value: "all", color: "text-white" },
  { label: "Comments", value: "comment", color: "text-blue-400" },
  { label: "Gifts", value: "gift", color: "text-amber-400" },
  { label: "Follows", value: "follow", color: "text-green-400" },
  { label: "Likes", value: "like", color: "text-pink-400" },
  { label: "AI", value: "ai_announcement", color: "text-purple-400" },
];

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  comment:             MessageCircle,
  gift:                Gift,
  like:                Heart,
  follow:              UserPlus,
  share:               Share2,
  viewerCount:         Eye,
  ai_announcement:     Sparkles,
  xp_awarded:          Zap,
  achievement_unlocked: Trophy,
  level_up:            TrendingUp,
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

function eventSummary(event: LiveEvent): string {
  switch (event.type) {
    case "comment":              return (event.data.text as string) ?? "";
    case "gift":                 return `${event.data.giftName ?? "Gift"}${(event.data.count as number) > 1 ? ` ×${event.data.count}` : ""} — ${(event.data.coins as number) ?? 0} coins`;
    case "like":                 return `+${(event.data.likeCount as number) ?? 1} likes`;
    case "follow":               return "followed";
    case "share":                return "shared the stream";
    case "viewerCount":          return `${(event.data.count as number) ?? 0} viewers`;
    case "ai_announcement":      return (event.data.text as string) ?? "";
    case "xp_awarded":           return `+${event.data.xp} XP · Lv.${event.data.level} · ${event.data.eventType}`;
    case "achievement_unlocked": return `🏆 ${(event.data.achievementName as string) ?? "Achievement"} (+${event.data.xpReward ?? 0} XP)`;
    case "level_up":             return `reached Level ${event.data.newLevel}!`;
    default:                     return JSON.stringify(event.data).slice(0, 60);
  }
}

function EventLog({ events, isActive }: { events: LiveEvent[]; isActive: boolean }) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all"
    ? events
    : events.filter((e) => e.type === filter);

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Event Log
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_BUTTONS.map(({ label, value, color }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                filter === value
                  ? `bg-white/10 border-white/20 text-white ${color}`
                  : "border-transparent text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea style={{ height: 220 }}>
        {!isActive ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center px-4">
            <Activity className="h-7 w-7 text-white/10 mb-2" />
            <p className="text-xs text-muted-foreground/60">Start a session to see events</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center px-4">
            <Activity className="h-7 w-7 text-white/10 mb-2 animate-pulse" />
            <p className="text-xs text-muted-foreground/60">
              {filter === "all" ? "Waiting for events…" : `No ${filter} events yet`}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-1">
            <AnimatePresence initial={false}>
              {filtered.map((event, idx) => {
                const colorClass = EVENT_COLORS[event.type] ?? "text-muted-foreground bg-white/5 border-white/10";
                const Icon = EVENT_ICONS[event.type] ?? Activity;
                return (
                  <motion.div
                    key={`${event.timestamp}-${idx}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-start gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-[10px] text-slate-600 flex-shrink-0 tabular-nums pt-0.5">
                      {format(new Date(event.timestamp), "HH:mm:ss")}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0", colorClass)}>
                      <Icon className="h-2.5 w-2.5" />
                      {event.type.replace("_", " ").toUpperCase()}
                    </span>
                    {event.username && (
                      <span className="text-xs font-semibold text-white/70 flex-shrink-0 truncate max-w-[80px]">
                        {event.username}
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
      </ScrollArea>
    </div>
  );
}

// ── Emotion Widget ────────────────────────────────────────────────────────────

const INTENSITY_COLORS: Record<string, string> = {
  happy:       "bg-green-400",
  excited:     "bg-orange-400",
  confident:   "bg-indigo-400",
  curious:     "bg-cyan-400",
  playful:     "bg-pink-400",
  competitive: "bg-red-400",
  grateful:    "bg-amber-400",
  frustrated:  "bg-lime-400",
  surprised:   "bg-purple-400",
};

function EmotionWidget({ emotionState, isActive }: { emotionState: EmotionalState | null; isActive: boolean }) {
  const pipCount = 5;

  if (!isActive) {
    return (
      <div className="rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground/40" />
          <span className="text-sm font-semibold text-white/30">AI Mood</span>
        </div>
        <div className="px-4 py-5 flex flex-col items-center gap-2">
          <span className="text-2xl opacity-20">😶</span>
          <p className="text-[10px] text-muted-foreground/40 text-center">Start a session to see AI emotional state</p>
        </div>
      </div>
    );
  }

  const state = emotionState ?? {
    primary: "happy" as const,
    intensity: 3,
    secondary: null,
    secondaryIntensity: 0,
    lastTrigger: "stream started",
    emoji: "😊",
    label: "Happy",
    history: [],
  };

  const pipColor = INTENSITY_COLORS[state.primary] ?? "bg-white/40";
  const filledPips = Math.round((state.intensity / 10) * pipCount);

  const recentHistory = state.history?.slice(0, 3) ?? [];

  return (
    <motion.div
      key={state.primary}
      className="rounded-2xl bg-white/[0.04] border border-white/8 overflow-hidden"
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Brain className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">AI Mood</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50">Emotion Engine</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Primary emotion */}
        <div className="flex items-center gap-3">
          <motion.span
            key={state.primary}
            className="text-3xl leading-none"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            {state.emoji ?? "😊"}
          </motion.span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white">{state.label ?? "Happy"}</span>
              <span className="text-[10px] text-muted-foreground/60">{state.intensity}/10</span>
            </div>
            {/* Intensity pips */}
            <div className="flex gap-1 mt-1">
              {Array.from({ length: pipCount }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i < filledPips ? pipColor : "bg-white/10",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Trigger */}
        {state.lastTrigger && (
          <p className="text-[10px] text-muted-foreground/60 truncate">
            ↳ {state.lastTrigger}
          </p>
        )}

        {/* Secondary emotion */}
        {state.secondary && state.secondaryIntensity >= 3 && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-xs text-muted-foreground/50">Also:</span>
            <span className="text-xs font-medium text-white/70 capitalize">{state.secondary}</span>
            <div className="flex gap-0.5 ml-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 w-3 rounded-full transition-all",
                    i < Math.round((state.secondaryIntensity / 10) * 3)
                      ? (INTENSITY_COLORS[state.secondary!] ?? "bg-white/40")
                      : "bg-white/10",
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {recentHistory.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-white/[0.05]">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">History</p>
            {recentHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                <span className="capitalize text-white/40">{entry.emotion}</span>
                <span className="text-white/20">·</span>
                <span className="truncate">{entry.trigger}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Connection status badge ───────────────────────────────────────────────────

function ConnectionBadge({
  connected,
  isActive,
  effectiveMode,
  tiktokError,
}: {
  connected: boolean;
  isActive: boolean;
  effectiveMode: string | null;
  tiktokError: string | null;
}) {
  const [reconnectSeconds, setReconnectSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!connected && isActive) {
      setReconnectSeconds(0);
      timerRef.current = setInterval(() => setReconnectSeconds((s) => s + 1), 1000);
    } else {
      setReconnectSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected, isActive]);

  if (!isActive) return null;

  if (effectiveMode === "real" && connected) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 gap-1.5 text-xs">
        <Radio className="h-2.5 w-2.5 animate-pulse" />Live
      </Badge>
    );
  }
  if (effectiveMode === "demo" && connected) {
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 gap-1.5 text-xs">
        <Bot className="h-2.5 w-2.5" />Demo
      </Badge>
    );
  }
  if (effectiveMode === "error") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/25 gap-1.5 text-xs">
        <AlertTriangle className="h-2.5 w-2.5" />Error
      </Badge>
    );
  }
  if (!connected && isActive) {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1.5 text-xs animate-pulse">
        <WifiOff className="h-2.5 w-2.5" />
        Reconnecting{reconnectSeconds > 0 ? ` (${reconnectSeconds}s)` : "…"}
      </Badge>
    );
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function LiveStudio() {
  const {
    events, translations, stats, connected, tiktokMode, tiktokError, tiktokUsername,
    isActive, sessionMode, emotionState,
    aiAnnouncements, sendStreamerSpeech, activeSessionId,
  } = useLiveSessionContext();
  const effectiveMode = tiktokMode ?? sessionMode;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <PageHero
        gradientFrom="rgba(14,165,233,0.14)"
        gradientTo="rgba(124,58,237,0.08)"
        icon={
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
            <Video className="h-8 w-8 text-cyan-400" />
          </div>
        }
        title={
          <span>
            Live{" "}
            <GradientText from="from-cyan-400" to="to-violet-400">Studio</GradientText>
          </span>
        }
        subtitle="Manage your active broadcast and monitor real-time events."
        right={
          isActive ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-bold text-emerald-300">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-xs font-semibold text-muted-foreground">OFFLINE</span>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

        {/* ── Left sidebar: session status (read-only) ─────────────────── */}
        <div className="space-y-4">
          <div className={cn(
            "rounded-2xl bg-white/[0.04] backdrop-blur-sm border overflow-hidden transition-all duration-300",
            isActive ? "border-primary/25 shadow-lg shadow-primary/8" : "border-white/8",
          )}>
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <Video className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-white">Session Status</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Session</span>
                {isActive ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    LIVE
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">OFFLINE</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">WebSocket</span>
                {connected ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                    <Wifi className="h-3 w-3" />Connected
                  </span>
                ) : isActive ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 animate-pulse">
                    <WifiOff className="h-3 w-3" />Reconnecting…
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <WifiOff className="h-3 w-3" />Idle
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Mode</span>
                <span className="text-xs font-semibold">
                  {effectiveMode === "real"  && <span className="text-emerald-400">Real LIVE</span>}
                  {effectiveMode === "demo"  && <span className="text-blue-400">Demo</span>}
                  {effectiveMode === "error" && <span className="text-red-400">Error</span>}
                  {!effectiveMode            && <span className="text-muted-foreground">—</span>}
                </span>
              </div>

              {tiktokUsername && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Stream</span>
                  <span className="text-xs font-mono text-white">@{tiktokUsername}</span>
                </div>
              )}

              <div className="border-t border-white/5 pt-3">
                {isActive ? (
                  <p className="text-[10px] text-muted-foreground/60 text-center leading-snug">
                    {effectiveMode === "real"
                      ? "Receiving real TikTok LIVE events."
                      : effectiveMode === "demo"
                      ? "Demo mode: simulated events flowing."
                      : effectiveMode === "error"
                      ? "Connection error — check event feed."
                      : "Waiting for TikTok connection…"}
                  </p>
                ) : (
                  <Link href="/dashboard">
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                      <Radio className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">Go Live from Dashboard</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Emotion Widget ─────────────────────────────────────────── */}
          <EmotionWidget emotionState={emotionState ?? null} isActive={!!isActive} />

          {/* ── Co-Host Mic ────────────────────────────────────────────── */}
          <CoHostPanel
            sendStreamerSpeech={sendStreamerSpeech}
            sessionId={activeSessionId}
            isSessionActive={!!isActive}
            aiAnnouncements={aiAnnouncements}
          />
        </div>

        {/* ── Right panel: feeds ───────────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">

          {/* Connection status + stats */}
          <div className="flex items-center justify-between gap-3">
            <ConnectionBadge
              connected={connected}
              isActive={!!isActive}
              effectiveMode={effectiveMode}
              tiktokError={tiktokError}
            />
            {isActive && tiktokError && effectiveMode === "error" && (
              <p className="text-[10px] text-red-400/80 flex items-center gap-1 truncate">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {tiktokError.slice(0, 90)}
              </p>
            )}
          </div>

          {/* Stats bar */}
          <StatsBar stats={stats} isActive={!!isActive} />

          {/* Comment + Gift feeds side by side */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
            <div className="h-[320px] flex flex-col min-h-0">
              <CommentFeed events={events} isActive={!!isActive} translations={translations} />
            </div>
            <GiftFeed events={events} totalCoins={stats.totalGifts} isActive={!!isActive} />
          </div>

          {/* Event log with filter tabs */}
          <EventLog events={events} isActive={!!isActive} />
        </div>
      </div>
    </div>
  );
}
