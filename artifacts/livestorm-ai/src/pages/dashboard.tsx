import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useStartSession,
  useEndSession,
  useGetSessions,
  useConnectTiktok,
  useForceStopSession,
  getGetActiveSessionQueryKey,
  getGetSessionsQueryKey,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useLiveSessionContext, type LiveEvent } from "@/contexts/LiveSessionContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, Gift, Heart, UserPlus, MessageSquare, Zap, Activity,
  PlayCircle, Square, Clock, Share, Bot, RefreshCw, Radio,
  PlugZap, TrendingUp, Trophy as TrophyIcon,
  KeyRound, Wifi, WifiOff, Eye, ChevronRight, Youtube, Unlink, ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatedCounter, PulsingDot, RankBadge, GradientText } from "@/components/ui/premium";
import { useLanguage } from "@/contexts/LanguageContext";
import { StageBackground } from "@/components/StageBackground";
import { LiveStormStage } from "@/components/LiveStormStage";

// ─── Event config ─────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  gift:                 { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",  icon: Gift,          label: "Gift" },
  comment:              { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",   icon: MessageSquare, label: "Chat" },
  follow:               { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20",  icon: UserPlus,      label: "Follow" },
  like:                 { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20",   icon: Heart,         label: "Like" },
  share:                { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20",   icon: Share,         label: "Share" },
  viewerCount:          { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20", icon: Users,         label: "Viewers" },
  ai_announcement:      { bg: "bg-purple-600/15",  text: "text-purple-300",  border: "border-purple-500/20", icon: Bot,           label: "AI" },
  xp_awarded:           { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20", icon: Zap,           label: "XP" },
  achievement_unlocked: { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20", icon: TrophyIcon,    label: "Achievement" },
  level_up:             { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20",icon: TrendingUp,    label: "Level Up" },
  lucky_drop:           { bg: "bg-yellow-500/10",  text: "text-yellow-300",  border: "border-yellow-500/20", icon: Gift,          label: "Lucky Drop" },
  boss_reward:          { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",    icon: TrophyIcon,    label: "Boss Reward" },
  quiz_win:             { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/20",    icon: Zap,           label: "Quiz Win" },
  treasure_hunt_win:    { bg: "bg-amber-600/10",   text: "text-amber-300",   border: "border-amber-600/20",  icon: TrophyIcon,    label: "Treasure" },
  kingdom_upgrade:      { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20", icon: TrendingUp,    label: "Kingdom" },
};

function EventRow({ event, idx }: { event: LiveEvent; idx: number }) {
  const { t } = useLanguage();
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.comment;
  const Icon = cfg.icon;
  const eventLabel: Record<string, string> = {
    gift: t("event_gift"), comment: t("event_chat"), follow: t("event_follow"),
    like: t("event_like"), share: t("event_share"), viewerCount: t("event_viewers"),
    ai_announcement: t("event_ai"), xp_awarded: t("event_xp"),
    achievement_unlocked: t("event_achievement"), level_up: t("event_level_up"),
    lucky_drop: t("event_lucky_drop"), boss_reward: t("event_boss_reward"),
    quiz_win: t("event_quiz_win"), treasure_hunt_win: t("event_treasure"),
    kingdom_upgrade: t("event_kingdom"),
  };

  let desc = "interacted";
  if (event.type === "gift")                desc = `sent ${event.data.giftName || "a gift"} · ${event.data.coins || 1} coins`;
  if (event.type === "like")                desc = `liked the stream (${event.data.likeCount || 1}×)`;
  if (event.type === "comment")             desc = `"${event.data.text || ""}"`;
  if (event.type === "follow")              desc = "started following";
  if (event.type === "share")               desc = "shared the LIVE";
  if (event.type === "ai_announcement")     desc = (event.data.text as string) || "";
  if (event.type === "xp_awarded")          desc = `+${event.data.xp} XP · Lv.${event.data.level}`;
  if (event.type === "achievement_unlocked") desc = `unlocked: ${event.data.achievementName || "Achievement"}`;
  if (event.type === "level_up")            desc = `reached Level ${event.data.newLevel}!`;
  if (event.type === "lucky_drop")          desc = `won a lucky drop: ${event.data.prize || "prize"}`;
  if (event.type === "boss_reward")         desc = `earned boss reward: +${event.data.xp || 0} XP`;
  if (event.type === "quiz_win")            desc = `answered correctly and won!`;
  if (event.type === "treasure_hunt_win")   desc = `found the treasure!`;
  if (event.type === "kingdom_upgrade")     desc = `upgraded ${event.data.building || "building"} to Lv.${event.data.level || 1}`;
  if (event.type === "viewerCount")         return null;

  return (
    <motion.div
      key={`${event.timestamp}-${idx}`}
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-colors",
        "bg-white/[0.02] hover:bg-white/[0.04]",
        cfg.border,
      )}
    >
      <div className={cn("p-1.5 rounded-lg mt-0.5 flex-shrink-0", cfg.bg)}>
        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-foreground">{event.username || "System"}</span>
          {" "}
          <span className="text-muted-foreground/80">{desc}</span>
        </p>
        <span className="text-[10px] text-muted-foreground/50 font-mono mt-0.5 block">
          {format(new Date(event.timestamp), "HH:mm:ss")}
        </span>
      </div>
      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-0 font-semibold flex-shrink-0", cfg.text, cfg.bg)}>
        {eventLabel[event.type] ?? cfg.label}
      </Badge>
    </motion.div>
  );
}

// ─── Premium Stat Card ────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconBg, iconColor, accent, isActive, animate: doAnimate,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accent: string;
  isActive: boolean;
  animate: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={cn(
      "relative rounded-2xl border overflow-hidden group",
      "bg-gradient-to-br from-white/[0.04] to-white/[0.01]",
      "transition-all duration-300",
      isActive ? `${accent} shadow-[0_0_20px_rgba(0,0,0,0.3)]` : "border-white/[0.07]",
    )}>
      {/* Top accent line */}
      {isActive && (
        <div className={cn("absolute top-0 inset-x-0 h-[2px]", iconBg.replace("/15", "/60").replace("/10", "/50"))} />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-xl border", iconBg, accent.replace("border-", "border-"))}>
            <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
          </div>
          {isActive && value > 0 && (
            <span className={cn("flex items-center gap-0.5 text-[10px] font-bold", iconColor)}>
              <TrendingUp className="h-2.5 w-2.5" />
              {t("dash_live_badge")}
            </span>
          )}
        </div>
        <div className="text-[26px] font-black text-white tabular-nums leading-none mb-1.5">
          {doAnimate ? <AnimatedCounter target={value} /> : value.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground/60 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Command Strip ────────────────────────────────────────────────────────────

function CommandStrip({
  isActive, connected, username, duration, formatDuration,
  onStart, onEnd, onReset, startPending, endPending, resetPending,
  isOwner, eventCount,
}: {
  isActive: boolean;
  connected: boolean;
  username: string;
  duration: number;
  formatDuration: (s: number) => string;
  onStart: () => void;
  onEnd: () => void;
  onReset: () => void;
  startPending: boolean;
  endPending: boolean;
  resetPending: boolean;
  isOwner: boolean;
  eventCount: number;
}) {
  const { t } = useLanguage();
  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isActive
        ? "border-green-500/20 shadow-lg shadow-green-500/[0.07]"
        : "border-violet-500/15 shadow-lg shadow-violet-500/[0.05]",
    )}
      style={{
        background: isActive
          ? "linear-gradient(135deg, rgba(34,197,94,0.09) 0%, rgba(16,185,129,0.04) 50%, rgba(6,182,212,0.03) 100%)"
          : "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(14,165,233,0.05) 100%)",
      }}
    >
      <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        {/* Left: Status + Info */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-lg",
            isActive
              ? "bg-green-500/15 border-green-500/25 shadow-green-500/20"
              : "bg-violet-500/10 border-violet-500/20 shadow-violet-500/10",
          )}>
            {isActive
              ? <Radio className="h-5 w-5 text-green-400" />
              : <PlugZap className="h-5 w-5 text-violet-400" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {isActive ? (
                <>
                  <PulsingDot color={connected ? "bg-green-400" : "bg-amber-400"} />
                  <span className={cn("text-xs font-bold uppercase tracking-widest", connected ? "text-green-400" : "text-amber-400")}>
                    {connected ? "Live Now" : "Reconnecting…"}
                  </span>
                  <span className="text-xs text-muted-foreground/40 font-mono tabular-nums">
                    {formatDuration(duration)}
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-500 inline-block flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Offline</span>
                </>
              )}
            </div>
            <p className="font-bold text-white text-base leading-tight truncate">
              {isActive ? `@${username}` : (
                <span>Ready to <GradientText from="from-violet-400" to="to-cyan-400">Go Live</GradientText></span>
              )}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-0.5 truncate">
              {isActive ? `${eventCount} events captured` : `@${username} · Start a session to begin`}
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isOwner && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-500/35">
              <KeyRound className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-xs font-bold text-amber-200">Owner</span>
            </div>
          )}
          {connected ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400">
              <Wifi className="h-3 w-3" /> Connected
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400">
              <WifiOff className="h-3 w-3" /> Disconnected
            </div>
          )}
          {isActive ? (
            <Button
              variant="destructive"
              onClick={onEnd}
              disabled={endPending}
              className="font-bold gap-2 shadow-lg shadow-red-500/20 h-10 flex-1 sm:flex-none"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
              {endPending ? "Ending…" : "End Stream"}
            </Button>
          ) : (
            <Button
              onClick={onStart}
              disabled={startPending}
              className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold gap-2 px-5 shadow-lg shadow-violet-500/25 h-10 flex-1 sm:flex-none"
            >
              <PlayCircle className="h-4 w-4" />
              {startPending ? "Starting…" : "Go Live"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={resetPending}
            className="gap-1.5 text-xs text-muted-foreground/60 border-white/10 hover:border-red-500/30 hover:text-red-400 h-10 px-3"
            title="Force-clears any stuck session."
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{resetPending ? "…" : "Reset"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useGetMyProfile();
  const connectTiktok = useConnectTiktok();
  const [tiktokInput, setTiktokInput] = useState("");

  const { events, stats, aiAnnouncements, flaggedComments, connected, clearEvents, setTtsMode,
    activeSessionRes, isLoadingSession } = useLiveSessionContext();
  const { data: sessions } = useGetSessions();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const forceStop = useForceStopSession();
  const [ttsOn, setTtsOn] = useState(() => {
    try { return (localStorage.getItem("ttsMode") ?? "off") !== "off"; } catch { return false; }
  });

  // ── YouTube state ──────────────────────────────────────────────────────────
  const [ytStatus, setYtStatus] = useState<{
    configured: boolean;
    connected: boolean;
    channelName: string | null;
    channelId: string | null;
    connector: { active: boolean; liveChatId: string | null; viewerCount: number | null } | null;
  } | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  const fetchYtStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/status", { credentials: "include" });
      if (res.ok) setYtStatus(await res.json());
    } catch {}
  }, []);

  useEffect(() => { void fetchYtStatus(); }, [fetchYtStatus]);

  // Handle OAuth return params (?youtube_connected=1 or ?youtube_error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("youtube_connected") === "1") {
      toast({ title: "YouTube Connected!", description: "Your channel is now linked to LiveStorm AI." });
      void fetchYtStatus();
      window.history.replaceState({}, "", "/");
    } else if (params.get("youtube_error")) {
      toast({ title: "YouTube Error", description: params.get("youtube_error")!, variant: "destructive" });
      window.history.replaceState({}, "", "/");
    }
  }, [fetchYtStatus, toast]);

  const handleConnectYoutube = async () => {
    setYtLoading(true);
    try {
      const res = await fetch("/api/youtube/auth-url", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "YouTube Setup Required", description: data.error, variant: "destructive" });
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setYtLoading(false);
    }
  };

  const handleDisconnectYoutube = async () => {
    setYtLoading(true);
    try {
      await fetch("/api/youtube/disconnect", { method: "POST", credentials: "include" });
      toast({ title: "YouTube Disconnected" });
      void fetchYtStatus();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setYtLoading(false);
    }
  };

  const handleStartYoutube = async () => {
    setYtLoading(true);
    try {
      const res = await fetch("/api/youtube/start-session", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "YouTube Live Started", description: "Polling for live chat events." });
        void fetchYtStatus();
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setYtLoading(false);
    }
  };

  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!activeSessionRes?.session?.startedAt) return;
    const start = new Date(activeSessionRes.session.startedAt).getTime();
    const iv = setInterval(() => setDuration(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [activeSessionRes?.session?.startedAt]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleConnectTiktok = () => {
    const username = tiktokInput.replace(/^@/, "").trim();
    if (!username) return;
    connectTiktok.mutate(
      { data: { tiktokUsername: username } },
      {
        onSuccess: () => {
          toast({ title: "TikTok account connected!", description: `@${username} is ready to go live.` });
          setTiktokInput("");
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: () => {
          toast({ title: "Connection failed", description: "Could not save TikTok username.", variant: "destructive" });
        },
      },
    );
  };

  const handleStartSession = () => {
    if (!profile?.tiktokUsername) {
      toast({ title: "TikTok Account Required", description: "Please connect your TikTok account first.", variant: "destructive" });
      return;
    }
    clearEvents();
    startSession.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Live Session Started" });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to start session", description: String(err), variant: "destructive" });
      },
    });
  };

  const handleEndSession = () => {
    endSession.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Live Session Ended" });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
      },
    });
  };

  const handleForceStop = () => {
    forceStop.mutate(undefined, {
      onSuccess: (data: any) => {
        toast({
          title: "Session Reset",
          description: data.clearedSessionId
            ? `Cleared session #${data.clearedSessionId}. Ready to start fresh.`
            : "No active session — state cleared.",
        });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
      },
      onError: () => {
        toast({ title: "Reset Failed", description: "Could not reset session.", variant: "destructive" });
      },
    });
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoadingSession) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-2xl bg-white/[0.04]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-2xl bg-white/[0.04]" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl bg-white/[0.04]" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  // ── Setup screen (no TikTok username) ────────────────────────────────────
  if (!profile?.tiktokUsername) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] to-cyan-500/[0.03] p-8 shadow-2xl shadow-violet-500/10"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/25 to-cyan-500/20 border border-violet-500/25 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/15">
              <PlugZap className="h-10 w-10 text-violet-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Connect Your TikTok</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">Enter your TikTok username to start capturing live events.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tiktok-dash-input" className="text-sm font-medium">TikTok Username</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">@</span>
                  <Input
                    id="tiktok-dash-input"
                    className="pl-7 bg-white/[0.04] border-white/10 focus:border-violet-500/50"
                    placeholder="yourhandle"
                    value={tiktokInput}
                    onChange={(e) => setTiktokInput(e.target.value.replace(/^@/, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleConnectTiktok()}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleConnectTiktok}
                  disabled={connectTiktok.isPending || !tiktokInput.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold shrink-0 shadow-lg shadow-violet-500/20"
                >
                  {connectTiktok.isPending ? "Saving…" : "Connect"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Change this any time in{" "}
                <Link href="/settings" className="text-violet-400 hover:underline">Settings</Link>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const isActive = activeSessionRes?.active;
  const eventCount = events.filter((e) => e.type !== "viewerCount").length;

  const isOwner = profile?.role === "owner";

  const primaryStats = [
    { label: "Viewers",  value: stats.viewerCount,   icon: Eye,          iconBg: "bg-green-500/15",  iconColor: "text-green-400",  accent: "border-green-500/20" },
    { label: "Likes",    value: stats.totalLikes,    icon: Heart,        iconBg: "bg-pink-500/15",   iconColor: "text-pink-400",   accent: "border-pink-500/20" },
    { label: "Gifts",    value: stats.totalGifts,    icon: Gift,         iconBg: "bg-amber-500/15",  iconColor: "text-amber-400",  accent: "border-amber-500/20" },
    { label: "Follows",  value: stats.totalFollows,  icon: UserPlus,     iconBg: "bg-violet-500/15", iconColor: "text-violet-400", accent: "border-violet-500/20" },
  ];

  const secondaryStats = [
    { label: "Comments", value: stats.totalComments, icon: MessageSquare, iconBg: "bg-blue-500/15",  iconColor: "text-blue-400",  accent: "border-blue-500/20" },
    { label: "Shares",   value: stats.totalShares,   icon: Share,         iconBg: "bg-cyan-500/15",  iconColor: "text-cyan-400",  accent: "border-cyan-500/20" },
  ];

  return (
    <div className="space-y-4 max-w-[1400px]">

      {/* ── Hero / Storm AI Banner ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border",
            isActive
              ? "border-green-500/30 shadow-2xl shadow-green-500/[0.15]"
              : "border-violet-500/30 shadow-2xl shadow-violet-500/[0.15]",
          )}
          style={{
            background: "linear-gradient(135deg, rgba(15,5,40,1) 0%, rgba(30,10,70,0.95) 40%, rgba(10,5,50,0.98) 100%)",
            minHeight: 320,
          }}
        >
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          {/* Purple radial glow */}
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 100% at 65% 50%, rgba(139,92,246,0.22) 0%, transparent 70%)" }} />

          {/* Live badge top-right */}
          {isActive && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-sm border border-red-400/30 shadow-lg shadow-red-500/30 z-10">
              <PulsingDot color={connected ? "bg-white" : "bg-amber-300"} />
              <span className="text-xs font-black tracking-widest text-white uppercase">Live</span>
              <span className="text-xs font-mono text-white/80 tabular-nums">{formatDuration(duration)}</span>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between" style={{ minHeight: 320 }}>

            {/* Top stats row — visible during live */}
            {isActive && (
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {[
                  { label: "Viewers",  icon: Eye,          value: stats.viewerCount,   color: "text-green-300" },
                  { label: "Gifts",    icon: Gift,         value: stats.totalGifts,    color: "text-amber-300" },
                  { label: "Likes",    icon: Heart,        value: stats.totalLikes,    color: "text-pink-300" },
                  { label: "Follows",  icon: UserPlus,     value: stats.totalFollows,  color: "text-violet-300" },
                  { label: "Comments", icon: MessageSquare,value: stats.totalComments, color: "text-blue-300" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
                      <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", s.color)} />
                      <span className={cn("text-sm font-black tabular-nums", s.color)}>
                        <AnimatedCounter target={s.value} />
                      </span>
                      <span className="text-[10px] text-white/40 uppercase tracking-wide">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main content: greeting + CTA */}
            <div className="flex-1 flex flex-col justify-end pb-2">
              {/* Status chip */}
              <div className="flex items-center gap-2 mb-3">
                {isActive ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm">
                    <PulsingDot color={connected ? "bg-green-400" : "bg-amber-400"} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", connected ? "text-green-300" : "text-amber-300")}>
                      {connected ? "З'єднано" : "Перепідключення…"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 border border-white/12 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Офлайн</span>
                  </div>
                )}
                {isOwner && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm text-xs font-bold text-amber-200">
                    <KeyRound className="h-3 w-3" /> Owner
                  </div>
                )}
              </div>

              {/* CTA buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {isActive ? (
                  <Button
                    variant="destructive"
                    onClick={handleEndSession}
                    disabled={endSession.isPending}
                    className="font-black gap-2 px-7 h-12 text-base shadow-xl shadow-red-500/30 rounded-xl"
                  >
                    <Square className="h-4 w-4" fill="currentColor" />
                    {endSession.isPending ? "Завершуємо…" : "Завершити стрім"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartSession}
                    disabled={startSession.isPending}
                    className="font-black gap-2 px-8 h-12 text-base rounded-xl shadow-xl shadow-violet-500/40"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    {startSession.isPending ? "Запускаємо…" : "⚡ Почати стрім"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleForceStop}
                  disabled={forceStop.isPending}
                  className="gap-2 h-12 px-5 text-sm font-semibold border-white/20 bg-white/8 hover:bg-white/12 hover:border-white/30 text-white/70 backdrop-blur-sm rounded-xl"
                  title="Force-clears any stuck session."
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {forceStop.isPending ? "…" : "Тест стріму"}
                </Button>
                {connected
                  ? <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/12 border border-green-500/20 text-xs font-medium text-green-300 backdrop-blur-sm"><Wifi className="h-3 w-3" /> Підключено</div>
                  : <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/12 border border-red-500/20 text-xs font-medium text-red-300 backdrop-blur-sm"><WifiOff className="h-3 w-3" /> Відключено</div>
                }
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {primaryStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatCard
              label={s.label}
              value={s.value}
              icon={s.icon}
              iconBg={s.iconBg}
              iconColor={s.iconColor}
              accent={s.accent}
              isActive={!!isActive}
              animate={!!isActive}
            />
          </motion.div>
        ))}
      </div>

      {/* Secondary stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {secondaryStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.28 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={cn(
              "relative rounded-2xl border overflow-hidden",
              "bg-gradient-to-br from-white/[0.03] to-white/[0.01] transition-all duration-300",
              isActive ? s.accent : "border-white/[0.06]",
            )}>
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className={cn("p-2 rounded-xl border", s.iconBg, s.accent.replace("border-", "border-"))}>
                  <s.icon className={cn("h-4 w-4", s.iconColor)} />
                </div>
                <div>
                  <div className="text-xl font-black text-white tabular-nums">
                    {isActive ? <AnimatedCounter target={s.value} /> : s.value.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">{s.label}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Activity Feed — 2/3 */}
        <motion.div
          className="col-span-1 lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className={cn(
            "rounded-2xl border flex flex-col overflow-hidden h-full",
            isActive
              ? "border-violet-500/20 shadow-lg shadow-violet-500/[0.05]"
              : "border-white/[0.06]",
          )}
            style={{
              background: isActive
                ? "linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(0,0,0,0) 100%)"
                : "rgba(255,255,255,0.01)",
            }}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", isActive ? "bg-violet-500/15" : "bg-white/[0.05]")}>
                  <Activity className={cn("h-4 w-4", isActive ? "text-violet-400" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Live Activity</p>
                  <p className="text-[10px] text-muted-foreground/50">{isActive ? "Real-time events" : "Session not started"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <div className="flex items-center gap-1.5">
                    <PulsingDot color="bg-violet-400" size="h-1.5 w-1.5" />
                    <span className="text-[10px] text-violet-400 font-semibold">Live</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground/50 tabular-nums bg-white/[0.04] px-2.5 py-1 rounded-full">
                  {eventCount} events
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-[440px]">
              {!isActive && events.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Radio className="h-7 w-7 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Waiting for broadcast</p>
                    <p className="text-xs text-muted-foreground/50 mt-1.5">Start a live session to see events here</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    <AnimatePresence initial={false}>
                      {events.map((event, idx) => (
                        <EventRow key={`${event.timestamp}-${idx}`} event={event} idx={idx} />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right column */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
        >

          {/* Top Supporters */}
          <div className={cn(
            "rounded-2xl border overflow-hidden",
            isActive ? "border-amber-500/20" : "border-white/[0.06]",
          )}
            style={{ background: isActive ? "linear-gradient(180deg, rgba(245,158,11,0.05) 0%, rgba(0,0,0,0) 100%)" : "rgba(255,255,255,0.01)" }}
          >
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15">
                <TrophyIcon className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Top Supporters</p>
                <p className="text-[10px] text-muted-foreground/50">Gift leaderboard</p>
              </div>
            </div>
            <div className="h-[200px] overflow-y-auto">
              {stats.topSupporters.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <TrophyIcon className="h-8 w-8 opacity-10" />
                  <p className="text-xs">No supporters yet</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  <AnimatePresence>
                    {stats.topSupporters.map((s, idx) => (
                      <motion.div
                        key={s.username}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                      >
                        <RankBadge rank={idx + 1} />
                        <span className="flex-1 text-sm font-semibold text-white truncate">{s.username}</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0">
                          <Gift className="h-2.5 w-2.5" />{s.coins}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* AI Co-Host panel (when live) */}
          {isActive && (
            <div className="rounded-2xl border border-violet-500/20 overflow-hidden"
              style={{ background: "linear-gradient(180deg, rgba(124,58,237,0.07) 0%, rgba(0,0,0,0) 100%)" }}
            >
              <div className="px-4 py-3.5 border-b border-violet-500/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/15">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">AI Assistant</p>
                    <p className="text-[10px] text-muted-foreground/50">Active announcements</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-muted-foreground/60">🔊 TTS</span>
                  <input
                    type="checkbox"
                    checked={ttsOn}
                    onChange={(e) => {
                      const on = e.target.checked;
                      const mode = on ? "openai" : "off" as const;
                      setTtsOn(on);
                      setTtsMode(mode);
                      try { localStorage.setItem("ttsMode", mode); } catch {}
                    }}
                    className="w-4 h-4 accent-violet-500 cursor-pointer"
                  />
                </label>
              </div>
              <div className="h-[170px] overflow-y-auto p-3 space-y-2">
                {aiAnnouncements.length === 0 && flaggedComments.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">
                    AI announcements will appear here
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {aiAnnouncements.slice(0, 5).map((a, i) => (
                        <motion.div
                          key={`ann-${a.timestamp}-${i}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200"
                        >
                          <span className="font-bold text-violet-400 mr-1">
                            {a.type === "boss_defeated" ? "⚔️" : a.type === "level_up" ? "⬆️" : "🎁"}
                          </span>
                          {a.text}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <AnimatePresence initial={false}>
                      {flaggedComments.slice(0, 3).map((f, i) => (
                        <motion.div
                          key={`flag-${f.timestamp}-${i}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300"
                        >
                          <span className="font-bold text-red-400 mr-1">⚠️</span>
                          {f.comment}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Quick Launch (when offline) */}
          {!isActive && (
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(14,165,233,0.03) 100%)" }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Quick Launch</span>
              </div>
              <div className="p-2 space-y-1">
                {[
                  { href: "/ai-assistant",  emoji: "🤖", label: "AI Assistant", desc: "Configure your AI persona",   glow: "hover:border-violet-500/20 hover:bg-violet-500/[0.05]" },
                  { href: "/games",         emoji: "🎮", label: "Games Hub",    desc: "Boss battles, XP & mini-games", glow: "hover:border-cyan-500/20 hover:bg-cyan-500/[0.05]" },
                  { href: "/live-control",  emoji: "📡", label: "Live Control", desc: "TikTok connection & event feed", glow: "hover:border-green-500/20 hover:bg-green-500/[0.05]" },
                ].map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.07 }}
                  >
                    <Link href={link.href}>
                      <div className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all duration-200 cursor-pointer group",
                        link.glow,
                      )}>
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-base flex-shrink-0 group-hover:scale-110 transition-transform">
                          {link.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white/90 group-hover:text-white">{link.label}</p>
                          <p className="text-[11px] text-muted-foreground/55">{link.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* YouTube Live card */}
          {ytStatus !== null && (
            <div className={cn(
              "rounded-2xl border overflow-hidden transition-all duration-300",
              ytStatus.connector?.active
                ? "border-red-500/25 shadow-lg shadow-red-500/[0.06]"
                : ytStatus.connected
                ? "border-red-500/15"
                : "border-white/[0.07]",
            )}
              style={{
                background: ytStatus.connector?.active
                  ? "linear-gradient(135deg, rgba(239,68,68,0.09) 0%, rgba(220,38,38,0.04) 100%)"
                  : "rgba(255,255,255,0.01)",
              }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className={cn("p-1.5 rounded-lg", ytStatus.connected ? "bg-red-500/15" : "bg-white/[0.05]")}>
                  <Youtube className={cn("h-3.5 w-3.5", ytStatus.connected ? "text-red-400" : "text-muted-foreground/50")} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white/80">YouTube Live</span>
                  {ytStatus.connected && ytStatus.channelName && (
                    <p className="text-[10px] text-muted-foreground/50 truncate">{ytStatus.channelName}</p>
                  )}
                </div>
                {ytStatus.connector?.active && (
                  <div className="flex items-center gap-1">
                    <PulsingDot color="bg-red-400" size="h-1.5 w-1.5" />
                    <span className="text-[9px] font-bold text-red-400 uppercase">Live</span>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                {!ytStatus.configured ? (
                  <div className="text-center py-2">
                    <p className="text-[11px] text-muted-foreground/60 mb-2">
                      Set <code className="text-violet-400 text-[10px]">GOOGLE_CLIENT_ID</code>,{" "}
                      <code className="text-violet-400 text-[10px]">GOOGLE_CLIENT_SECRET</code> &amp;{" "}
                      <code className="text-violet-400 text-[10px]">YOUTUBE_REDIRECT_URI</code> to enable.
                    </p>
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Google Cloud Console
                    </a>
                  </div>
                ) : ytStatus.connected ? (
                  <>
                    {ytStatus.connector?.liveChatId ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-[11px] text-red-300 font-medium flex-1 truncate">
                            Chat connected
                          </span>
                          {ytStatus.connector.viewerCount != null && (
                            <span className="flex items-center gap-1 text-[10px] text-red-300/70 font-semibold">
                              <Eye className="h-2.5 w-2.5" />
                              {ytStatus.connector.viewerCount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs gap-1.5 border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={handleStartYoutube}
                        disabled={ytLoading}
                      >
                        <Youtube className="h-3 w-3" />
                        {ytLoading ? "Connecting…" : "Connect YouTube Chat"}
                      </Button>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 text-center py-1">
                        Start a live session to connect YouTube chat
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-7 text-[11px] gap-1.5 text-muted-foreground/50 hover:text-red-400"
                      onClick={handleDisconnectYoutube}
                      disabled={ytLoading}
                    >
                      <Unlink className="h-3 w-3" /> Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="w-full h-9 text-xs gap-2 bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-500/20"
                    onClick={handleConnectYoutube}
                    disabled={ytLoading}
                  >
                    <Youtube className="h-3.5 w-3.5" />
                    {ytLoading ? "Opening…" : "Connect YouTube"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Sessions history */}
          {sessions && sessions.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-bold text-white/80">Recent Sessions</span>
                <span className="ml-auto text-[10px] text-muted-foreground/40">{sessions.length} total</span>
              </div>
              <div className="p-2 space-y-1">
                {sessions.slice(0, 3).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500/60 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground/70 flex-1">
                      {formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}
                    </span>
                    {s.endedAt && (
                      <span className="text-[10px] text-muted-foreground/40 font-mono">
                        {Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)}m
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
