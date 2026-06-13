import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/react";
import { useLiveSessionContext, type LiveEvent } from "@/contexts/LiveSessionContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Video, Activity,
  AlertTriangle, Radio, Bot, Wifi, WifiOff,
  MessageCircle, Gift, Heart, UserPlus, Eye, Gem,
  ArrowDown, Share2, Sparkles, Zap, Trophy, TrendingUp,
  Volume2, VolumeX, ChevronDown, ChevronUp, QrCode,
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { CoHostPanel } from "@/components/CoHostPanel";
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
                    className="flex gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.04] transition-colors"
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

// ── Stats bar (compact) ───────────────────────────────────────────────────────

function StatsBar({ stats, isActive }: { stats: { viewerCount: number; totalLikes: number; totalFollows: number; totalComments: number; totalGifts: number }; isActive: boolean }) {
  const tiles = [
    { label: "Viewers",  value: stats.viewerCount,   icon: Eye,         color: "text-violet-400" },
    { label: "Likes",    value: stats.totalLikes,     icon: Heart,       color: "text-pink-400"   },
    { label: "Follows",  value: stats.totalFollows,   icon: UserPlus,    color: "text-green-400"  },
    { label: "Comments", value: stats.totalComments,  icon: MessageCircle, color: "text-blue-400" },
    { label: "Coins",    value: stats.totalGifts,     icon: Gem,         color: "text-amber-400"  },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/6 flex-wrap">
      {tiles.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-1.5 min-w-fit">
          <Icon className={cn("h-3 w-3", isActive ? color : "text-white/15")} />
          <span className={cn("text-xs font-bold tabular-nums", isActive ? "text-white" : "text-white/20")}>
            {isActive ? value.toLocaleString() : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground/40">{label}</span>
          <span className="w-px h-3 bg-white/[0.06] mx-1 last:hidden" />
        </div>
      ))}
    </div>
  );
}

// ── Event log ─────────────────────────────────────────────────────────────────

type FilterType = "all" | "comment" | "gift" | "follow" | "like" | "share" | "ai_announcement";

const FILTER_BUTTONS: { label: string; value: FilterType; color: string }[] = [
  { label: "All",      value: "all",            color: "text-white"    },
  { label: "Comments", value: "comment",         color: "text-blue-400" },
  { label: "Gifts",    value: "gift",            color: "text-amber-400"},
  { label: "Follows",  value: "follow",          color: "text-green-400"},
  { label: "Likes",    value: "like",            color: "text-pink-400" },
  { label: "AI",       value: "ai_announcement", color: "text-purple-400"},
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
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div>
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 flex-wrap">
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

// ── Main component ────────────────────────────────────────────────────────────

export function LiveStudio() {
  const {
    events, translations, stats, connected, tiktokMode, tiktokError, tiktokUsername,
    isActive, sessionMode,
    aiAnnouncements, sendStreamerSpeech, activeSessionId, lastMicEmit, lastMicBackendAck,
    activeVoiceName, ttsQueueLen,
    ttsModeLive, openaiTtsOk,
    isAudioUnlocked, unlockAudio, replayTts, coHostLatency,
    viewerRecognitionEvents,
  } = useLiveSessionContext();
  const effectiveMode = tiktokMode ?? sessionMode;
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const [mobileTab,    setMobileTab]    = useState<"cohost" | "comments">("cohost");
  const { getToken }                    = useAuth();
  const [qrActive,     setQrActive]     = useState(false);
  const [qrCountdown,  setQrCountdown]  = useState(0);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* ── Stage Hero Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/22 shadow-lg shadow-cyan-500/[0.08] h-[88px]">
        <StageBackground variant="studio" showRing={false} showScan showGrid showCorners />
        <div className="relative h-full flex items-center gap-4 px-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 shadow shadow-cyan-500/20">
            <Video className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Live Studio</h1>
            <p className="text-[11px] text-cyan-300/70 font-medium">
              {tiktokUsername ? `@${tiktokUsername}` : "No active session"}
              {effectiveMode === "real" ? " · Real LIVE" : effectiveMode === "demo" ? " · Demo" : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isActive ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 shadow shadow-emerald-500/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] font-black text-emerald-300 tracking-widest">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <Radio className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-[11px] font-semibold text-muted-foreground/60">OFFLINE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Connection bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <ConnectionBadge connected={connected} isActive={!!isActive} effectiveMode={effectiveMode} tiktokError={tiktokError} />
        {isActive && (
          <button
            onClick={showQr}
            title={qrActive ? "Hide QR" : "Show Storm Pass QR on stream"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
              qrActive
                ? "bg-violet-500/20 border-violet-500/50 text-violet-300 animate-pulse"
                : "bg-white/5 border-white/10 text-muted-foreground hover:border-violet-500/40 hover:text-white/70",
            )}
          >
            <QrCode className="h-3 w-3" />
            {qrActive ? `QR ${qrCountdown}s` : "QR Pass"}
          </button>
        )}
        {!isActive && (
          <Link href="/dashboard">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
              <Radio className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground">Go Live →</span>
            </div>
          </Link>
        )}
      </div>

      {/* ── ENABLE VOICE — cannot-miss banner ───────────────────────────── */}
      {ttsModeLive === "openai" && !isAudioUnlocked && (
        <motion.button
          onClick={unlockAudio}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center gap-4 py-4 px-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/18 hover:border-amber-500/60 active:scale-[0.995] transition-all group text-left"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Volume2 className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-300">Click here to enable Storm's voice</p>
            <p className="text-[11px] text-amber-400/70 mt-0.5">Browsers block audio until you interact — tap once to unlock. Required each session.</p>
          </div>
          <span className="flex-shrink-0 text-[11px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full animate-pulse">
            TAP TO UNLOCK
          </span>
        </motion.button>
      )}

      {/* ── Voice is off warning ──────────────────────────────────────────── */}
      {ttsModeLive === "off" && isActive && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8">
          <VolumeX className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          <p className="text-xs text-muted-foreground/70 flex-1">
            Storm's voice is disabled — AI can hear you but won't speak back.
          </p>
          <Link href="/ai-assistant">
            <span className="text-xs font-semibold text-primary/80 hover:text-primary cursor-pointer whitespace-nowrap">
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

      {/* ── Mobile tab switcher ──────────────────────────────────────────── */}
      <div className="flex lg:hidden gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07]">
        <button
          onClick={() => setMobileTab("cohost")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all",
            mobileTab === "cohost" ? "bg-cyan-600 text-white" : "text-muted-foreground/50 hover:text-white/70",
          )}
        >
          <Bot className="h-3.5 w-3.5" />Co-Host
        </button>
        <button
          onClick={() => setMobileTab("comments")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all",
            mobileTab === "comments" ? "bg-cyan-600 text-white" : "text-muted-foreground/50 hover:text-white/70",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />Comments
          {events.filter(e => e.type === "comment").length > 0 && (
            <span className="ml-0.5 text-[9px] bg-white/15 rounded-full px-1.5 tabular-nums">
              {events.filter(e => e.type === "comment").length}
            </span>
          )}
        </button>
      </div>

      {/* ── Main grid: Co-Host + Comments ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Co-Host Voice Panel */}
        <div className={cn(mobileTab !== "cohost" && "hidden lg:block")}>
          <CoHostPanel
            sendStreamerSpeech={sendStreamerSpeech}
            sessionId={activeSessionId}
            isSessionActive={!!isActive}
            aiAnnouncements={aiAnnouncements}
            viewerRecognitionEvents={viewerRecognitionEvents ?? []}
            ttsModeLive={ttsModeLive}
            activeVoiceName={activeVoiceName ?? null}
            isAudioUnlocked={isAudioUnlocked}
            unlockAudio={unlockAudio}
            replayTts={replayTts}
            coHostLatency={coHostLatency}
            openaiTtsOk={openaiTtsOk}
            lastMicEmit={lastMicEmit}
            lastMicBackendAck={lastMicBackendAck}
          />
        </div>

        {/* Comment Feed */}
        <div className={cn("h-[480px] lg:h-[520px] flex flex-col min-h-0", mobileTab !== "comments" && "hidden lg:flex")}>
          <CommentFeed events={events} isActive={!!isActive} translations={translations} />
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <StatsBar stats={{ ...stats, totalGifts: stats.totalGifts ?? 0 }} isActive={!!isActive} />

      {/* ── Event log (collapsible) ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <button
          onClick={() => setEventLogOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
        >
          <Activity className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-sm font-semibold text-white/70">Event Log</span>
          {events.length > 0 && (
            <span className="text-[10px] text-muted-foreground/40">{events.length} events</span>
          )}
          <span className="ml-auto text-muted-foreground/40">
            {eventLogOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {eventLogOpen && <EventLog events={events} isActive={!!isActive} />}
      </div>

    </div>
  );
}
