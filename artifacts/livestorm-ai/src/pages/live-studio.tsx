import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLiveSessionContext, type LiveEvent } from "@/contexts/LiveSessionContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Video, Activity,
  AlertTriangle, Radio, Bot, Wifi, WifiOff,
  MessageCircle, Gift, Heart, UserPlus, Eye, Gem,
  ArrowDown, Share2, Sparkles, Zap, Trophy, TrendingUp,
  Volume2, VolumeX, ChevronDown, ChevronUp, QrCode,
  Crown, Flame, Monitor, Waves, CircleDot,
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { StageBackground } from "@/components/StageBackground";

const LS_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Comment feed ──────────────────────────────────────────────────────────────

function CommentFeed({ events, isActive, translations }: { events: LiveEvent[]; isActive: boolean; translations: Record<string, string> }) {
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
        <span className="flex items-center gap-2 ls-section">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          Comments
        </span>
        {isActive && (
          <span className="text-xs text-white/78 tabular-nums">{comments.length}</span>
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
              <p className="text-sm text-white/78">{translations["ls_start_session_comments"] ?? "Start a session to see comments"}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageCircle className="h-8 w-8 text-white/10 mb-3 animate-pulse" />
              <p className="text-sm text-white/78">{translations["ls_waiting_comments"] ?? "Waiting for comments…"}</p>
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
                    className="flex gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.04] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/25 flex-shrink-0 flex items-center justify-center overflow-hidden mt-0.5">
                      {e.avatarUrl ? (
                        <img src={e.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-blue-300">
                          {(e.username ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-blue-300 truncate">
                          {e.username ?? "Unknown"}
                        </span>
                        <span className="text-xs text-white/62 flex-shrink-0">
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
                          <p className="text-xs text-yellow-200/88 leading-relaxed mt-1 pt-1 border-t border-white/[0.06] break-words">
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
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-colors z-10"
          >
            <ArrowDown className="h-3 w-3" />
            Jump to latest
          </button>
        )}
      </div>
    </div>
  );
}

// ── Stats bar (compact) ───────────────────────────────────────────────────────

function StatsBar({ stats, isActive }: { stats: { viewerCount: number; totalLikes: number; totalFollows: number; totalComments: number; totalGifts: number }; isActive: boolean }) {
  const { t } = useLanguage();
  const tiles = [
    { label: t("ls_stat_viewers"),  value: stats.viewerCount,   icon: Eye,          color: "text-violet-400" },
    { label: t("ls_stat_likes"),    value: stats.totalLikes,    icon: Heart,        color: "text-pink-400"   },
    { label: t("ls_stat_follows"),  value: stats.totalFollows,  icon: UserPlus,     color: "text-green-400"  },
    { label: t("ls_stat_comments"), value: stats.totalComments, icon: MessageCircle, color: "text-blue-400"  },
    { label: t("ls_stat_coins"),    value: stats.totalGifts,    icon: Gem,          color: "text-amber-400"  },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/6 flex-wrap">
      {tiles.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-1.5 min-w-fit">
          <Icon className={cn("h-3 w-3", isActive ? color : "text-white/30")} />
          <span className={cn("text-xs font-bold tabular-nums", isActive ? "text-white" : "text-white/65")}>
            {isActive ? value.toLocaleString() : "—"}
          </span>
          <span className="text-xs text-white/75">{label}</span>
          <span className="w-px h-3 bg-white/[0.06] mx-1 last:hidden" />
        </div>
      ))}
    </div>
  );
}

// ── Event log ─────────────────────────────────────────────────────────────────

type FilterType = "all" | "comment" | "gift" | "follow" | "like" | "share" | "ai_announcement";

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
  gift:                 "text-amber-400 bg-amber-500/10 border-amber-500/20",
  like:                 "text-pink-400 bg-pink-500/10 border-pink-500/20",
  comment:              "text-blue-400 bg-blue-500/10 border-blue-500/20",
  follow:               "text-green-400 bg-green-500/10 border-green-500/20",
  share:                "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  viewerCount:          "text-violet-400 bg-violet-500/10 border-violet-500/20",
  ai_announcement:      "text-purple-300 bg-purple-500/10 border-purple-500/20",
  xp_awarded:           "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  achievement_unlocked: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  level_up:             "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
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
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  const filterButtons: { label: string; value: FilterType; color: string }[] = [
    { label: t("ls_filter_all"),      value: "all",            color: "text-white"     },
    { label: t("ls_filter_comments"), value: "comment",        color: "text-blue-400"  },
    { label: t("ls_filter_gifts"),    value: "gift",           color: "text-amber-400" },
    { label: t("ls_filter_follows"),  value: "follow",         color: "text-green-400" },
    { label: t("ls_filter_likes"),    value: "like",           color: "text-pink-400"  },
    { label: "AI",                    value: "ai_announcement", color: "text-purple-400"},
  ];

  return (
    <div>
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterButtons.map(({ label, value, color }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                filter === value
                  ? `bg-white/10 border-white/20 text-white ${color}`
                  : "border-transparent text-white/60 hover:text-white/90 hover:bg-white/5",
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
            <p className="text-sm text-white/78">{t("ls_start_session_events")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center px-4">
            <Activity className="h-7 w-7 text-white/10 mb-2 animate-pulse" />
            <p className="text-sm text-white/78">
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
                    <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums pt-0.5">
                      {format(new Date(event.timestamp), "HH:mm:ss")}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded border flex-shrink-0", colorClass)}>
                      <Icon className="h-2.5 w-2.5" />
                      {event.type.replace("_", " ").toUpperCase()}
                    </span>
                    {event.username && (
                      <span className="text-xs font-semibold text-white/85 flex-shrink-0 truncate max-w-[80px]">
                        {event.username}
                      </span>
                    )}
                    <span className="text-xs text-slate-300 truncate flex-1 min-w-0">
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

// ── Connection badge ──────────────────────────────────────────────────────────

function ConnectionBadge({
  connected, isActive, effectiveMode, tiktokError,
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

  if (effectiveMode === "real" && connected)
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 gap-1.5 text-xs"><Radio className="h-2.5 w-2.5 animate-pulse" />Live</Badge>;
  if (effectiveMode === "demo" && connected)
    return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 gap-1.5 text-xs"><Bot className="h-2.5 w-2.5" />Demo</Badge>;
  if (effectiveMode === "error")
    return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 gap-1.5 text-xs"><AlertTriangle className="h-2.5 w-2.5" />Error</Badge>;
  if (!connected && isActive)
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1.5 text-xs animate-pulse">
        <WifiOff className="h-2.5 w-2.5" />
        Reconnecting{reconnectSeconds > 0 ? ` (${reconnectSeconds}s)` : "…"}
      </Badge>
    );
  return null;
}

// ── Storm Companion Composer ─────────────────────────────────────────────────

const DEMO_CHAT = [
  { user: "Mila", text: "GIFT COMBO x12! Angie, call it out!", tone: "rose" },
  { user: "Viktor", text: "VIP Queen_Nova just arrived 🔥", tone: "gold" },
  { user: "Nadia", text: "Community goal is almost done!", tone: "emerald" },
  { user: "Leo", text: "Battle energy is spiking — push!", tone: "orange" },
];

const COMPANION_STATES = [
  { label: "Listening", detail: "reading chat intent", icon: Waves, color: "text-sky-500", bg: "bg-sky-100/80 border-sky-200/80" },
  { label: "Thinking", detail: "composing reply", icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-100/80 border-indigo-200/80" },
  { label: "Speaking", detail: "voice aura active", icon: Volume2, color: "text-amber-500", bg: "bg-amber-100/85 border-amber-200/90" },
];

const MOMENT_CUES = [
  { label: "Gift Reaction", value: "+12 roses", icon: Gift, className: "left-[7%] top-[20%] bg-rose-50/85 border-rose-200/90 text-rose-600" },
  { label: "VIP Arrival", value: "Queen_Nova", icon: Crown, className: "right-[8%] top-[18%] bg-amber-50/90 border-amber-200 text-amber-700" },
  { label: "Goal Completed", value: "100%", icon: Trophy, className: "left-[10%] bottom-[19%] bg-emerald-50/85 border-emerald-200 text-emerald-700" },
  { label: "Battle Mode", value: "duel ready", icon: Flame, className: "right-[8%] bottom-[22%] bg-orange-50/85 border-orange-200 text-orange-700" },
];

const LIGHT_PARTICLES = [
  { left: "9%", top: "13%", size: 7, delay: 0.1, color: "rgba(125, 211, 252, .72)" },
  { left: "21%", top: "63%", size: 5, delay: 1.1, color: "rgba(251, 191, 36, .55)" },
  { left: "34%", top: "22%", size: 4, delay: 2.3, color: "rgba(255, 255, 255, .9)" },
  { left: "58%", top: "12%", size: 6, delay: 1.7, color: "rgba(147, 197, 253, .75)" },
  { left: "72%", top: "69%", size: 5, delay: 0.6, color: "rgba(252, 211, 77, .65)" },
  { left: "88%", top: "34%", size: 8, delay: 2.8, color: "rgba(255, 255, 255, .78)" },
];

const FLYING_GIFTS = [
  { gift: "rose", emoji: "✦", fromX: "-18%", fromY: "72%", toX: "43%", toY: "47%", delay: 0.0, color: "rgba(244,63,94,.92)" },
  { gift: "gold", emoji: "◆", fromX: "112%", fromY: "18%", toX: "56%", toY: "43%", delay: 0.8, color: "rgba(245,158,11,.92)" },
  { gift: "star", emoji: "✶", fromX: "4%", fromY: "12%", toX: "48%", toY: "40%", delay: 1.5, color: "rgba(14,165,233,.9)" },
  { gift: "gem", emoji: "◇", fromX: "108%", fromY: "78%", toX: "54%", toY: "50%", delay: 2.1, color: "rgba(168,85,247,.86)" },
];

const COMMUNITY_GOALS = [
  { label: "Unlock AI dance callout", current: 842, target: 1000, icon: Trophy, color: "from-emerald-400 to-sky-400" },
  { label: "Send 300 roses streak", current: 236, target: 300, icon: Gift, color: "from-rose-400 to-amber-300" },
];

const CHAT_REACTIONS = [
  { label: "W", count: 148, className: "left-[6%] top-[42%] text-sky-700 bg-sky-50/90 border-sky-200" },
  { label: "OMG", count: 92, className: "right-[7%] top-[43%] text-rose-700 bg-rose-50/90 border-rose-200" },
  { label: "GOAL!", count: 61, className: "left-[22%] bottom-[35%] text-emerald-700 bg-emerald-50/90 border-emerald-200" },
  { label: "VIP", count: 37, className: "right-[26%] bottom-[34%] text-amber-700 bg-amber-50/90 border-amber-200" },
];

const VIEWER_CELEBRATIONS = [
  { name: "Queen_Nova", label: "VIP spotlight", icon: Crown, color: "text-amber-700 bg-amber-50/90 border-amber-200" },
  { name: "Mila", label: "top gifter streak", icon: Gift, color: "text-rose-700 bg-rose-50/90 border-rose-200" },
  { name: "Leo", label: "battle booster", icon: Flame, color: "text-orange-700 bg-orange-50/90 border-orange-200" },
];

function getComposerStatus({
  isActive,
  activeVoiceName,
  ttsQueueLen,
}: {
  isActive: boolean;
  activeVoiceName?: string | null;
  ttsQueueLen?: number;
}) {
  if (activeVoiceName) return "speaking";
  if ((ttsQueueLen ?? 0) > 0) return "thinking";
  if (isActive) return "listening";
  return "speaking";
}

function ComposerChatPanel({
  events,
  isActive,
  translations,
}: {
  events: LiveEvent[];
  isActive: boolean;
  translations: Record<string, string>;
}) {
  const comments = [...events.filter((e) => e.type === "comment")].reverse().slice(-8);
  const visible = comments.length > 0 ? comments : DEMO_CHAT;

  return (
    <div className="h-full min-h-[560px] rounded-[2rem] border border-white/70 bg-white/62 shadow-[0_24px_80px_rgba(56,119,182,.16)] backdrop-blur-2xl overflow-hidden">
      <div className="px-4 py-4 border-b border-sky-100/80 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-500">Live Chat</p>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Audience Pulse</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-600">
          <CircleDot className="h-3 w-3 animate-pulse" />{isActive ? "Live" : "Preview"}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        {visible.map((item, idx) => {
          const isEvent = "data" in item;
          const username = isEvent ? item.username ?? "Viewer" : item.user;
          const text = isEvent ? String(item.data.text ?? "") : item.text;
          const translation = isEvent ? translations[String(item.data.msgId ?? item.timestamp)] : null;
          return (
            <motion.div
              key={isEvent ? `${item.timestamp}-${idx}` : `${item.user}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03 }}
              className="group rounded-2xl border border-white/80 bg-white/70 p-3 shadow-[0_12px_36px_rgba(59,130,246,.08)]"
            >
              <div className="flex items-start gap-2.5">
                <div className="grid h-9 w-9 flex-none place-items-center rounded-2xl bg-gradient-to-br from-sky-100 via-white to-amber-100 text-sm font-black text-sky-700 shadow-inner">
                  {username[0]?.toUpperCase() ?? "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-black text-slate-900">{username}</span>
                    <span className="h-1 w-1 rounded-full bg-amber-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isEvent ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : "now"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-slate-600">{text}</p>
                  {translation && (
                    <p className="mt-2 rounded-xl bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700">
                      UA {translation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CompanionStateRail({ activeState }: { activeState: string }) {
  return (
    <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 gap-2 rounded-full border border-white/70 bg-white/58 p-1.5 shadow-[0_16px_45px_rgba(56,119,182,.16)] backdrop-blur-2xl">
      {COMPANION_STATES.map(({ label, detail, icon: Icon, color, bg }) => {
        const active = activeState === label.toLowerCase();
        return (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-2 transition-all",
              active ? bg : "border-transparent bg-transparent text-slate-400",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", active ? color : "text-slate-300")} />
            <div className="hidden min-w-[86px] leading-none sm:block">
              <p className={cn("text-[11px] font-black uppercase tracking-[0.14em]", active ? "text-slate-900" : "text-slate-400")}>{label}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">{detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AngieAvatar({ activeState }: { activeState: string }) {
  const speaking = activeState === "speaking";
  return (
    <motion.div
      className="relative z-20 mx-auto flex h-[56vh] min-h-[420px] w-[min(58vw,620px)] max-w-full items-center justify-center"
      animate={{ y: [0, -8, 0], rotate: [0, 0.45, 0, -0.45, 0] }}
      transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute h-[78%] w-[72%] rounded-full border border-sky-200/60"
        animate={{ rotate: 360, scale: [1, 1.025, 1] }}
        transition={{ rotate: { duration: 28, repeat: Infinity, ease: "linear" }, scale: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        style={{ boxShadow: "0 0 80px rgba(125,211,252,.22), inset 0 0 70px rgba(255,255,255,.75)" }}
      />
      <motion.div
        className="absolute h-[63%] w-[89%] rounded-full border border-amber-200/60"
        animate={{ rotate: -360, opacity: [0.42, 0.82, 0.42] }}
        transition={{ rotate: { duration: 34, repeat: Infinity, ease: "linear" }, opacity: { duration: 4.8, repeat: Infinity } }}
      />
      {speaking && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-sky-300/50"
              initial={{ width: "38%", height: "20%", opacity: 0.45 }}
              animate={{ width: ["38%", "82%"], height: ["20%", "42%"], opacity: [0.45, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.58, ease: "easeOut" }}
              style={{ bottom: "18%" }}
            />
          ))}
        </>
      )}

      <motion.div
        className="absolute h-[68%] w-[55%] rounded-[46%] bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,.96),rgba(219,234,254,.82)_42%,rgba(125,211,252,.32)_74%,transparent_100%)] blur-xl"
        animate={{ opacity: speaking ? [0.65, 1, 0.65] : [0.42, 0.68, 0.42], scale: speaking ? [1, 1.08, 1] : [1, 1.035, 1] }}
        transition={{ duration: speaking ? 1.35 : 4.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative h-[82%] w-[44%] min-w-[250px]">
        <div className="absolute left-1/2 top-[8%] h-[38%] w-[78%] -translate-x-1/2 rounded-[48%_48%_42%_42%] bg-[linear-gradient(145deg,#ffffff_0%,#e0f2fe_52%,#bfdbfe_100%)] shadow-[0_28px_80px_rgba(56,119,182,.24)]">
          <div className="absolute inset-x-[18%] top-[34%] flex justify-between">
            <motion.span className="h-3 w-8 rounded-full bg-slate-800/80" animate={{ scaleY: [1, 0.22, 1] }} transition={{ duration: 4.8, repeat: Infinity, repeatDelay: 1.4 }} />
            <motion.span className="h-3 w-8 rounded-full bg-slate-800/80" animate={{ scaleY: [1, 0.22, 1] }} transition={{ duration: 4.8, repeat: Infinity, repeatDelay: 1.4 }} />
          </div>
          <motion.div
            className="absolute left-1/2 top-[58%] h-2.5 w-12 -translate-x-1/2 rounded-full bg-rose-400/80"
            animate={{ width: speaking ? [26, 54, 34, 48] : [42, 48, 42], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: speaking ? 0.52 : 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute -left-8 top-[6%] h-[78%] w-[42%] rounded-full bg-[linear-gradient(120deg,#dbeafe,#93c5fd_60%,#fef3c7)] opacity-95 blur-[1px]" />
          <div className="absolute -right-8 top-[6%] h-[78%] w-[42%] rounded-full bg-[linear-gradient(240deg,#dbeafe,#93c5fd_60%,#fef3c7)] opacity-95 blur-[1px]" />
        </div>

        <div className="absolute left-1/2 top-[39%] h-[44%] w-[88%] -translate-x-1/2 rounded-[40%_40%_28%_28%] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,.88),rgba(186,230,253,.42)_48%,rgba(251,191,36,.22))] shadow-[0_30px_90px_rgba(56,119,182,.22)] backdrop-blur-2xl">
          <div className="absolute left-1/2 top-8 h-24 w-32 -translate-x-1/2 rounded-full bg-sky-200/35 blur-2xl" />
          <div className="absolute inset-x-10 top-8 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>

        <div className="absolute bottom-[4%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 shadow-[0_16px_48px_rgba(56,119,182,.15)] backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,.9)]" />
          <span className="text-sm font-black text-slate-900">Angie</span>
          <span className="text-xs font-bold text-slate-400">Storm Companion</span>
        </div>
      </div>
    </motion.div>
  );
}

function LiveShowCounter({
  stats,
}: {
  stats: { viewerCount: number; totalLikes: number; totalFollows: number; totalComments: number; totalGifts?: number };
}) {
  const giftTotal = stats.totalGifts || 1847;
  return (
    <motion.div
      className="absolute left-5 top-5 z-40 w-[210px] rounded-[1.5rem] border border-amber-200/90 bg-white/76 p-3 shadow-[0_22px_60px_rgba(245,158,11,.22)] backdrop-blur-2xl"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">Live Gift Counter</p>
          <div className="mt-1 flex items-end gap-2">
            <motion.span
              className="text-3xl font-black leading-none text-slate-950"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
            >
              {giftTotal.toLocaleString()}
            </motion.span>
            <span className="pb-0.5 text-xs font-black text-amber-600">coins</span>
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
          <Gift className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-2 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-rose-400">Combo</p>
          <motion.p
            className="text-lg font-black leading-none text-rose-700"
            animate={{ scale: [1, 1.22, 1], color: ["#be123c", "#f97316", "#be123c"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          >
            x12
          </motion.p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-2 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-sky-400">Streak</p>
          <p className="text-lg font-black leading-none text-sky-700">0:18</p>
        </div>
      </div>
      <motion.div
        className="mt-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-amber-700"
        animate={{ opacity: [0.65, 1, 0.65], y: [0, -2, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        live gifts +24 / sec
      </motion.div>
    </motion.div>
  );
}

function GiftTrajectoryRails() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <motion.div
        className="absolute left-[11%] top-[58%] h-1 w-[36%] origin-right rounded-full bg-gradient-to-r from-rose-300/0 via-rose-300/75 to-amber-300/0"
        animate={{ opacity: [0.18, 0.78, 0.18], scaleX: [0.55, 1, 0.55] }}
        transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
        style={{ transform: "rotate(-13deg)", boxShadow: "0 0 28px rgba(251,113,133,.42)" }}
      />
      <motion.div
        className="absolute right-[10%] top-[34%] h-1 w-[32%] origin-left rounded-full bg-gradient-to-r from-sky-300/0 via-sky-300/80 to-amber-300/0"
        animate={{ opacity: [0.16, 0.72, 0.16], scaleX: [0.5, 1, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
        style={{ transform: "rotate(16deg)", boxShadow: "0 0 28px rgba(125,211,252,.42)" }}
      />
    </div>
  );
}

function FlyingGiftLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <motion.div
        className="absolute left-[18%] top-[31%] rounded-full border border-rose-200 bg-white/88 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700 shadow-[0_16px_42px_rgba(244,63,94,.20)] backdrop-blur-2xl"
        animate={{ x: [0, 18, 0], opacity: [0.78, 1, 0.78] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        gifts flying to Angie
      </motion.div>
      {FLYING_GIFTS.map(({ gift, emoji, fromX, fromY, toX, toY, delay, color }, idx) => (
        <motion.div
          key={gift}
          className="absolute flex h-14 min-w-14 items-center justify-center gap-1.5 rounded-2xl border border-white/90 bg-white/90 px-2 text-lg font-black shadow-[0_18px_44px_rgba(56,119,182,.22)] backdrop-blur-xl"
          initial={{ left: fromX, top: fromY, scale: 0.78, opacity: 0, rotate: -18 }}
          animate={{
            left: [fromX, "32%", toX],
            top: [fromY, idx % 2 ? "34%" : "58%", toY],
            scale: [0.78, 1.25, 0.42],
            opacity: [0.42, 1, 1, 0.42],
            rotate: [-18, 16, 38],
          }}
          transition={{ duration: 3.4, delay, repeat: Infinity, repeatDelay: 0.65, ease: "easeInOut" }}
          style={{ color, boxShadow: `0 18px 44px rgba(56,119,182,.18), 0 0 28px ${color}` }}
        >
          <Gift className="h-4 w-4" />
          <span>{emoji}</span>
          <span className="text-[9px] uppercase tracking-widest opacity-70">to Angie</span>
        </motion.div>
      ))}
      {[
        { left: "19%", top: "54%", label: "rose x8", tone: "text-rose-700 bg-rose-50 border-rose-200" },
        { left: "31%", top: "49%", label: "star x3", tone: "text-sky-700 bg-sky-50 border-sky-200" },
        { left: "43%", top: "45%", label: "gold x1", tone: "text-amber-700 bg-amber-50 border-amber-200" },
      ].map(({ left, top, label, tone }, idx) => (
        <motion.div
          key={label}
          className={cn("absolute rounded-full border px-3 py-1.5 text-xs font-black shadow-[0_12px_32px_rgba(56,119,182,.14)] backdrop-blur-xl", tone)}
          style={{ left, top }}
          animate={{ y: [0, -8, 0], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 1.2, delay: idx * 0.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Gift className="mr-1 inline h-3.5 w-3.5" />{label}
        </motion.div>
      ))}
    </div>
  );
}

function GiftReactionWave() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-[50%] rounded-full border-2 border-amber-300/65"
          initial={{ width: 120, height: 120, x: "-50%", y: "-50%", opacity: 0 }}
          animate={{ width: [120, 620], height: [120, 370], opacity: [0, 0.66, 0] }}
          transition={{ duration: 2.2, delay: i * 0.45, repeat: Infinity, repeatDelay: 0.45, ease: "easeOut" }}
          style={{ boxShadow: "0 0 58px rgba(245,158,11,.30)" }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-[64%] -translate-x-1/2 rounded-full border-2 border-amber-200 bg-amber-50/95 px-5 py-2.5 text-sm font-black uppercase tracking-[0.18em] text-amber-700 shadow-[0_18px_48px_rgba(245,158,11,.28)]"
        animate={{ y: [0, -12, 0], opacity: [0.45, 1, 0.45], scale: [0.94, 1.08, 0.94] }}
        transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }}
      >
        reaction wave live +384
      </motion.div>
    </div>
  );
}

function CommunityGoalStack() {
  return (
    <div className="absolute bottom-5 left-5 z-40 w-[255px] space-y-2">
      <div className="rounded-[1.35rem] border border-emerald-200/80 bg-white/76 p-3 shadow-[0_20px_56px_rgba(16,185,129,.16)] backdrop-blur-2xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">Community Goals</p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">active</span>
        </div>
        <div className="space-y-2.5">
          {COMMUNITY_GOALS.map(({ label, current, target, icon: Icon, color }) => {
            const pct = Math.min(100, Math.round((current / target) * 100));
            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-black text-slate-700">
                    <Icon className="h-3.5 w-3.5 flex-none text-emerald-500" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="text-xs font-black tabular-nums text-slate-500">{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", color)}
                    initial={{ width: "18%" }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BattleEnergyPanel() {
  return (
    <motion.div
      className="absolute bottom-5 right-5 z-40 w-[240px] rounded-[1.35rem] border border-orange-200/90 bg-white/76 p-3 shadow-[0_20px_56px_rgba(249,115,22,.18)] backdrop-blur-2xl"
      animate={{ boxShadow: ["0 20px 56px rgba(249,115,22,.16)", "0 26px 72px rgba(249,115,22,.30)", "0 20px 56px rgba(249,115,22,.16)"] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
          <Flame className="h-3.5 w-3.5" />Battle Mode
        </span>
        <span className="text-xs font-black text-orange-700">82%</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-500">Team Sky</p>
          <div className="mt-1 h-2 rounded-full bg-sky-100">
            <motion.div className="h-full rounded-full bg-sky-400" animate={{ width: ["62%", "72%", "62%"] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
        </div>
        <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black text-orange-700">VS</span>
        <div>
          <p className="text-right text-[10px] font-black uppercase tracking-wider text-rose-500">Team Gold</p>
          <div className="mt-1 h-2 rounded-full bg-rose-100">
            <motion.div className="ml-auto h-full rounded-full bg-amber-400" animate={{ width: ["54%", "68%", "54%"] }} transition={{ duration: 2.4, repeat: Infinity }} />
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-bold text-slate-500">AI Host prompt: call the next gift combo.</p>
    </motion.div>
  );
}

function ChatReactionBursts() {
  return (
    <>
      {CHAT_REACTIONS.map(({ label, count, className }, idx) => (
        <motion.div
          key={label}
          className={cn("absolute z-40 rounded-full border px-4 py-2 shadow-[0_12px_32px_rgba(56,119,182,.18)] backdrop-blur-xl", className)}
          animate={{ y: [0, -22, 0], opacity: [0.58, 1, 0.58], scale: [0.92, 1.16, 0.92] }}
          transition={{ duration: 1.7 + idx * 0.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-base font-black">{label}</span>
          <motion.span
            className="ml-1.5 text-[11px] font-black opacity-70"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            +{count}
          </motion.span>
        </motion.div>
      ))}
    </>
  );
}

function ViewerCelebrationRibbon() {
  return (
    <div className="absolute left-1/2 top-[13%] z-40 flex -translate-x-1/2 gap-2">
      {VIEWER_CELEBRATIONS.map(({ name, label, icon: Icon, color }, idx) => (
        <motion.div
          key={name}
          className={cn("flex items-center gap-2 rounded-full border px-3 py-2 shadow-[0_14px_36px_rgba(56,119,182,.16)] backdrop-blur-2xl", color)}
          animate={{ opacity: [0.74, 1, 0.74], y: [0, -7, 0], scale: [0.96, 1.05, 0.96] }}
          transition={{ duration: 2.1, delay: idx * 0.35, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-3.5 w-3.5" />
          <div className="leading-none">
            <p className="text-[10px] font-black uppercase tracking-[0.13em]">{label}</p>
            <p className="mt-1 text-xs font-black">{name}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ComposerStage({
  activeState,
  stats,
}: {
  activeState: string;
  stats: { viewerCount: number; totalLikes: number; totalFollows: number; totalComments: number; totalGifts?: number };
}) {
  return (
    <div className="relative min-h-[650px] overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,.92),rgba(224,242,254,.72)_46%,rgba(254,243,199,.58)_100%)] shadow-[0_35px_120px_rgba(56,119,182,.22)]">
      <div className="absolute inset-0 opacity-55">
        <StageBackground variant="studio" showRing showScan showGrid={false} showCorners={false} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,.86),rgba(224,242,254,.34)_44%,rgba(255,255,255,.05)_72%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.18)_46%,rgba(255,255,255,.78))]" />

      {LIGHT_PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, background: p.color, boxShadow: `0 0 ${p.size * 5}px ${p.color}` }}
          animate={{ y: [0, -16, 0], x: [0, i % 2 ? 8 : -8, 0], opacity: [0.42, 1, 0.42] }}
          transition={{ duration: 4.8 + i * 0.4, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <CompanionStateRail activeState={activeState} />
      <LiveShowCounter stats={stats} />
      <GiftTrajectoryRails />
      <FlyingGiftLayer />
      <GiftReactionWave />
      <CommunityGoalStack />
      <BattleEnergyPanel />
      <ChatReactionBursts />
      <ViewerCelebrationRibbon />

      {MOMENT_CUES.map(({ label, value, icon: Icon, className }, idx) => (
        <motion.div
          key={label}
          className={cn("absolute z-30 rounded-2xl border px-3 py-2 shadow-[0_18px_48px_rgba(56,119,182,.16)] backdrop-blur-2xl", className)}
          animate={{ y: [0, -8, 0], rotate: [0, idx % 2 ? -1.2 : 1.2, 0] }}
          transition={{ duration: 4.5 + idx * 0.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em]">{label}</p>
              <p className="text-xs font-bold opacity-70">{value}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <AngieAvatar activeState={activeState} />
    </div>
  );
}

function ObsOverlayPanel({
  activeState,
  connected,
  stats,
  activeVoiceName,
}: {
  activeState: string;
  connected: boolean;
  stats: { viewerCount: number; totalLikes: number; totalFollows: number; totalComments: number; totalGifts?: number };
  activeVoiceName?: string | null;
}) {
  return (
    <div className="h-full min-h-[560px] rounded-[2rem] border border-white/70 bg-white/60 p-4 shadow-[0_24px_80px_rgba(56,119,182,.16)] backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500">OBS Avatar Overlay</p>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Scene Composer</h2>
        </div>
        <Monitor className="h-5 w-5 text-sky-500" />
      </div>

      <div className="relative mb-4 overflow-hidden rounded-[1.5rem] border border-sky-100 bg-slate-950 p-3 shadow-inner">
        <div className="aspect-video overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(125,211,252,.38),rgba(15,23,42,.98)_66%)]">
          <div className="absolute inset-5 rounded-2xl border border-sky-300/30" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/20 blur-2xl" />
          <div className="absolute bottom-5 left-1/2 h-28 w-20 -translate-x-1/2 rounded-t-full bg-gradient-to-b from-white via-sky-100 to-amber-100 shadow-[0_0_42px_rgba(125,211,252,.55)]" />
          <div className="absolute bottom-4 left-4 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
            {connected ? "Output Live" : "Preview"}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {[
          { label: "Companion State", value: activeState, icon: Sparkles, tone: "text-sky-600 bg-sky-50 border-sky-100" },
          { label: "Voice Aura", value: activeVoiceName ?? "premium pulse", icon: Volume2, tone: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Gift Magic", value: `${(stats.totalGifts ?? 427).toLocaleString()} coins`, icon: Gift, tone: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "VIP Spotlight", value: "armed", icon: Crown, tone: "text-yellow-700 bg-yellow-50 border-yellow-100" },
          { label: "Battle Layer", value: "cinematic depth", icon: Flame, tone: "text-orange-600 bg-orange-50 border-orange-100" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={cn("flex items-center gap-3 rounded-2xl border px-3 py-2.5", tone)}>
            <Icon className="h-4 w-4 flex-none" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">{label}</p>
              <p className="truncate text-sm font-black capitalize">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LiveStudio() {
  const { t } = useLanguage();
  const {
    events, translations, stats, connected, tiktokMode, tiktokError, tiktokUsername,
    isActive, sessionMode,
    activeVoiceName, ttsQueueLen,
    ttsModeLive,
    isAudioUnlocked, unlockAudio,
  } = useLiveSessionContext();
  const effectiveMode = tiktokMode ?? sessionMode;
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const { getToken }                    = useAuth();
  const [qrActive,     setQrActive]     = useState(false);
  const [qrCountdown,  setQrCountdown]  = useState(0);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const composerStatus = getComposerStatus({ isActive: !!isActive, activeVoiceName, ttsQueueLen });

  async function showQr() {
    if (qrActive) {
      const tok = await getToken();
      fetch(`${LS_BASE}/api/stormpass/qr/hide`, {
        method: "POST", headers: { Authorization: `Bearer ${tok ?? ""}` },
      }).catch(() => {});
      if (qrTimerRef.current) { clearInterval(qrTimerRef.current); qrTimerRef.current = null; }
      setQrActive(false); setQrCountdown(0);
      return;
    }
    try {
      const tok = await getToken();
      const r = await fetch(`${LS_BASE}/api/stormpass/qr/show`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok ?? ""}` },
        body:    JSON.stringify({ duration: 20 }),
      });
      if (!r.ok) return;
      setQrActive(true); setQrCountdown(20);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      let rem = 20;
      qrTimerRef.current = setInterval(() => {
        rem -= 1; setQrCountdown(rem);
        if (rem <= 0) { clearInterval(qrTimerRef.current!); qrTimerRef.current = null; setQrActive(false); }
      }, 1000);
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-10%,#e0f2fe_0%,#f8fafc_38%,#fff7ed_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-[-12%] top-[-18%] h-[420px] w-[420px] rounded-full bg-sky-200/70 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[360px] w-[360px] rounded-full bg-amber-100/80 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[24%] h-[460px] w-[460px] rounded-full bg-white blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-[1680px] space-y-4 px-4 py-4 sm:px-6 lg:px-8">

      {/* ── Stage Hero Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/58 shadow-[0_20px_80px_rgba(56,119,182,.16)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,.86),rgba(224,242,254,.54),rgba(254,243,199,.48))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent" />
        <div className="relative flex min-h-[104px] items-center gap-4 px-5 py-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-sky-200 bg-white/72 shadow-[0_16px_40px_rgba(56,189,248,.18)]">
            <Video className="h-6 w-6 text-sky-500" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-500">Storm Companion Composer</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Angie Live + OBS Composer</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {tiktokUsername ? `@${tiktokUsername}` : "Premium studio preview"}
              {effectiveMode === "real" ? " · Real LIVE" : effectiveMode === "demo" ? " · Demo" : " · Pearl white / sky blue / soft gold"}
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <ConnectionBadge connected={connected} isActive={!!isActive} effectiveMode={effectiveMode} tiktokError={tiktokError} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />Premium Motion
            </span>
            {isActive && (
              <button
                onClick={showQr}
                title={qrActive ? "Hide QR" : "Show Storm Pass QR on stream"}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition-all",
                  qrActive
                    ? "border-indigo-200 bg-indigo-100 text-indigo-600"
                    : "border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100",
                )}
              >
                <QrCode className="h-3.5 w-3.5" />
                {qrActive ? `QR ${qrCountdown}s` : "QR Pass"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ENABLE VOICE — cannot-miss banner ───────────────────────────── */}
      {ttsModeLive === "openai" && !isAudioUnlocked && (
        <motion.button
          onClick={unlockAudio}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center gap-4 py-4 px-5 rounded-2xl border-2 border-amber-200 bg-amber-50/80 hover:bg-amber-100/80 hover:border-amber-300 active:scale-[0.995] transition-all group text-left shadow-[0_18px_48px_rgba(251,191,36,.14)]"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Volume2 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700">{t("ls_unlock_voice_title")}</p>
            <p className="text-xs text-amber-600/88 mt-0.5">{t("ls_unlock_voice_desc")}</p>
          </div>
          <span className="flex-shrink-0 text-xs font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full animate-pulse">
            TAP TO UNLOCK
          </span>
        </motion.button>
      )}

      {/* ── Voice is off warning ──────────────────────────────────────────── */}
      {ttsModeLive === "off" && isActive && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/60 border border-white/70 shadow-sm">
          <VolumeX className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-600 flex-1">
            Storm's voice is disabled — AI can hear you but won't speak back.
          </p>
          <Link href="/ai-assistant">
            <span className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer whitespace-nowrap">
              Enable in AI Settings →
            </span>
          </Link>
        </div>
      )}

      {/* ── TikTok error ─────────────────────────────────────────────────── */}
      {isActive && tiktokError && effectiveMode === "error" && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400/80 truncate">{tiktokError.slice(0, 120)}</p>
        </div>
      )}

      {/* ── Main Composer: Chat + Angie + OBS ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[310px_minmax(0,1fr)_320px]">
        <ComposerChatPanel events={events} isActive={!!isActive} translations={translations} />
        <ComposerStage activeState={composerStatus} stats={{ ...stats, totalGifts: stats.totalGifts ?? 0 }} />
        <ObsOverlayPanel
          activeState={composerStatus}
          connected={!!connected}
          stats={{ ...stats, totalGifts: stats.totalGifts ?? 0 }}
          activeVoiceName={activeVoiceName}
        />
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <StatsBar stats={{ ...stats, totalGifts: stats.totalGifts ?? 0 }} isActive={!!isActive} />

      {/* ── Event log (collapsible) ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/70 bg-white/58 shadow-[0_16px_48px_rgba(56,119,182,.10)] backdrop-blur-2xl overflow-hidden">
        <button
          onClick={() => setEventLogOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/70 transition-colors"
        >
          <Activity className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-semibold text-slate-600">Event Log</span>
          {events.length > 0 && (
            <span className="text-xs text-slate-500">{events.length} events</span>
          )}
          <span className="ml-auto text-slate-400">
            {eventLogOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {eventLogOpen && <EventLog events={events} isActive={!!isActive} />}
      </div>

      </div>
    </div>
  );
}
