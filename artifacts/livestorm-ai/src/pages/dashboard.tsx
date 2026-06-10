import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useGetActiveSession,
  useStartSession,
  useEndSession,
  useGetSessions,
  useConnectTiktok,
  useForceStopSession,
  getGetActiveSessionQueryKey,
  getGetSessionsQueryKey,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useLiveSession, type LiveEvent } from "@/hooks/useLiveSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, Gift, Heart, UserPlus, MessageSquare, Zap, Activity,
  PlayCircle, Square, Clock, Share, Bot, RefreshCw,
  PlugZap, TrendingUp, Radio, Trophy as TrophyIcon,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatedCounter, PulsingDot, RankBadge, PageHero, StatWidget } from "@/components/ui/premium";

const EVENT_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  gift:            { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",  icon: Gift,          label: "Gift" },
  comment:         { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",   icon: MessageSquare, label: "Chat" },
  follow:          { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20",  icon: UserPlus,      label: "Follow" },
  like:            { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20",   icon: Heart,         label: "Like" },
  share:           { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20",   icon: Share,         label: "Share" },
  viewerCount:     { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20", icon: Users,         label: "Viewers" },
  ai_announcement: { bg: "bg-purple-600/15",  text: "text-purple-300",  border: "border-purple-500/20", icon: Bot,           label: "AI" },
};

function EventRow({ event, idx }: { event: LiveEvent; idx: number }) {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.comment;
  const Icon = cfg.icon;

  let desc = "interacted";
  if (event.type === "gift")           desc = `sent ${event.data.giftName || "a gift"} · ${event.data.coins || 1} coins`;
  if (event.type === "like")           desc = `liked the stream (${event.data.likeCount || 1}×)`;
  if (event.type === "comment")        desc = `"${event.data.text || ""}"`;
  if (event.type === "follow")         desc = "started following";
  if (event.type === "share")          desc = "shared the LIVE";
  if (event.type === "ai_announcement") desc = (event.data.text as string) || "";
  if (event.type === "viewerCount")    return null;

  return (
    <motion.div
      key={`${event.timestamp}-${idx}`}
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
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
          <span className="text-muted-foreground">{desc}</span>
        </p>
        <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 block">
          {format(new Date(event.timestamp), "HH:mm:ss")}
        </span>
      </div>
      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-0 font-medium flex-shrink-0", cfg.text, cfg.bg)}>
        {cfg.label}
      </Badge>
    </motion.div>
  );
}

export function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useGetMyProfile();
  const connectTiktok = useConnectTiktok();
  const [tiktokInput, setTiktokInput] = useState("");

  const { data: activeSessionRes, isLoading: isLoadingSession } = useGetActiveSession({
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 5000 },
  });
  const { data: sessions } = useGetSessions();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const forceStop = useForceStopSession();

  const activeSessionId = activeSessionRes?.session?.id;
  const { events, stats, aiAnnouncements, flaggedComments, connected, clearEvents, setTtsEnabled } =
    useLiveSession(activeSessionId);
  const [ttsOn, setTtsOn] = useState(false);

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

  if (isLoadingSession) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 rounded-2xl bg-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}
        </div>
        <Skeleton className="h-[440px] w-full rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!profile?.tiktokUsername) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/10">
              <PlugZap className="h-10 w-10 text-violet-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Connect Your TikTok</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Enter your TikTok username to start capturing live events.
            </p>
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
        </div>
      </div>
    );
  }

  const isActive = activeSessionRes?.active;

  const statConfig = [
    { title: "Viewers",  value: stats.viewerCount,   icon: <Zap className="h-5 w-5" />,           iconBg: "bg-green-500/15",  iconColor: "text-green-400",  glowColor: isActive ? "shadow-green-500/5" : undefined },
    { title: "Coins",    value: stats.totalGifts,    icon: <Gift className="h-5 w-5" />,          iconBg: "bg-amber-500/15",  iconColor: "text-amber-400",  glowColor: isActive ? "shadow-amber-500/5" : undefined },
    { title: "Likes",    value: stats.totalLikes,    icon: <Heart className="h-5 w-5" />,         iconBg: "bg-pink-500/15",   iconColor: "text-pink-400",   glowColor: isActive ? "shadow-pink-500/5" : undefined },
    { title: "Follows",  value: stats.totalFollows,  icon: <UserPlus className="h-5 w-5" />,      iconBg: "bg-violet-500/15", iconColor: "text-violet-400", glowColor: isActive ? "shadow-violet-500/5" : undefined },
    { title: "Comments", value: stats.totalComments, icon: <MessageSquare className="h-5 w-5" />, iconBg: "bg-blue-500/15",   iconColor: "text-blue-400",   glowColor: isActive ? "shadow-blue-500/5" : undefined },
    { title: "Shares",   value: stats.totalShares,   icon: <Share className="h-5 w-5" />,         iconBg: "bg-cyan-500/15",   iconColor: "text-cyan-400",   glowColor: isActive ? "shadow-cyan-500/5" : undefined },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <PageHero
        gradientFrom={isActive ? "rgba(34,197,94,0.14)" : "rgba(124,58,237,0.14)"}
        gradientTo={isActive ? "rgba(16,185,129,0.06)" : "rgba(14,165,233,0.06)"}
        eyebrow={
          isActive ? (
            <div className="flex items-center gap-2">
              <PulsingDot color={connected ? "bg-green-400" : "bg-amber-400"} />
              <span className={cn("text-xs font-bold uppercase tracking-widest", connected ? "text-green-400" : "text-amber-400")}>
                {connected ? "Live Now" : "Reconnecting"}
              </span>
            </div>
          ) : null
        }
        title={
          isActive ? (
            <span className="tabular-nums">{formatDuration(duration)}</span>
          ) : (
            <span>
              Ready to{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Go Live</span>
            </span>
          )
        }
        subtitle={
          isActive
            ? `Streaming as @${profile.tiktokUsername} · ${events.filter(e => e.type !== "viewerCount").length} events captured`
            : `Connected as @${profile.tiktokUsername} · ${sessions?.length ?? 0} sessions total`
        }
        right={
          <div className="flex items-center gap-2">
            {isActive ? (
              <Button
                variant="destructive"
                onClick={handleEndSession}
                disabled={endSession.isPending}
                className="font-bold gap-2 shadow-lg shadow-red-500/20"
              >
                <Square className="h-4 w-4" fill="currentColor" />
                {endSession.isPending ? "Ending…" : "End Stream"}
              </Button>
            ) : (
              <Button
                onClick={handleStartSession}
                disabled={startSession.isPending}
                className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold gap-2 px-6 shadow-lg shadow-violet-500/25"
              >
                <PlayCircle className="h-4 w-4" />
                {startSession.isPending ? "Starting…" : "Go Live"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceStop}
              disabled={forceStop.isPending}
              className="gap-1.5 text-xs text-muted-foreground border-white/10 hover:border-red-500/30 hover:text-red-400"
              title="Force-clears any stuck session."
            >
              <RefreshCw className="h-3 w-3" />
              {forceStop.isPending ? "…" : "Reset"}
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statConfig.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatWidget
              icon={s.icon}
              label={s.title}
              value={s.value}
              iconBg={s.iconBg}
              iconColor={s.iconColor}
              glowColor={s.glowColor}
              animate={isActive}
            />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Activity Feed */}
        <div className={cn(
          "col-span-1 lg:col-span-2 rounded-2xl border flex flex-col overflow-hidden",
          isActive
            ? "border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] to-transparent shadow-lg shadow-violet-500/5"
            : "border-white/[0.06] bg-white/[0.02]",
        )}>
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "p-2 rounded-lg",
                isActive ? "bg-violet-500/15" : "bg-white/[0.05]",
              )}>
                <Activity className={cn("h-4 w-4", isActive ? "text-violet-400" : "text-muted-foreground")} />
              </div>
              <span className="font-semibold text-white">Live Activity</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums bg-white/[0.04] px-2.5 py-1 rounded-full">
              {events.filter(e => e.type !== "viewerCount").length} events
            </span>
          </div>
          <div className="flex-1 h-[460px]">
            {!isActive && events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Radio className="h-7 w-7 opacity-25" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Waiting for broadcast</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start a live session to see events here</p>
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

        {/* Right Column */}
        <div className="space-y-4">

          {/* Top Supporters */}
          <div className={cn(
            "rounded-2xl border overflow-hidden",
            isActive ? "border-amber-500/20 bg-gradient-to-b from-amber-500/[0.05] to-transparent" : "border-white/[0.06] bg-white/[0.02]",
          )}>
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/15">
                <TrophyIcon className="h-4 w-4 text-amber-400" />
              </div>
              <span className="font-semibold text-white text-sm">Top Supporters</span>
            </div>
            <div className="h-[220px] overflow-y-auto">
              {stats.topSupporters.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <TrophyIcon className="h-8 w-8 opacity-15" />
                  <p className="text-sm">No supporters yet</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <AnimatePresence>
                    {stats.topSupporters.map((s, idx) => (
                      <motion.div
                        key={s.username}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors"
                      >
                        <RankBadge rank={idx + 1} />
                        <span className="flex-1 text-sm font-semibold text-white truncate">{s.username}</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full shrink-0">
                          <Gift className="h-2.5 w-2.5" />
                          {s.coins}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* AI Co-host */}
          {isActive && (
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.06] to-transparent overflow-hidden">
              <div className="px-4 py-3.5 border-b border-violet-500/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/15">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <span className="font-semibold text-white text-sm">AI Co-Host</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-muted-foreground">🔊 TTS</span>
                  <input
                    type="checkbox"
                    checked={ttsOn}
                    onChange={(e) => { setTtsOn(e.target.checked); setTtsEnabled(e.target.checked); }}
                    className="w-4 h-4 accent-violet-500 cursor-pointer"
                  />
                </label>
              </div>
              <div className="h-[170px] overflow-y-auto p-3 space-y-2">
                {aiAnnouncements.length === 0 && flaggedComments.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
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
                          className="text-xs p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-200"
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
                          className="text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300"
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

          {/* Quick links when not live */}
          {!isActive && (
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(14,165,233,0.04) 100%)" }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">Quick Launch</span>
              </div>
              <div className="p-2 space-y-1">
                {[
                  {
                    href: "/ai-assistant",
                    emoji: "🤖",
                    label: "AI Co-Host",
                    desc: "Configure your AI persona",
                    dot: "bg-violet-400",
                    glow: "hover:border-violet-500/25 hover:bg-violet-500/[0.06]",
                  },
                  {
                    href: "/boss-battle",
                    emoji: "⚔️",
                    label: "Boss Battle",
                    desc: "Spawn a boss for viewers",
                    dot: "bg-red-400",
                    glow: "hover:border-red-500/25 hover:bg-red-500/[0.06]",
                  },
                  {
                    href: "/mini-games",
                    emoji: "🎮",
                    label: "Mini-Games",
                    desc: "Spin wheel, draws & more",
                    dot: "bg-cyan-400",
                    glow: "hover:border-cyan-500/25 hover:bg-cyan-500/[0.06]",
                  },
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
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-base flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          {link.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{link.label}</p>
                          <p className="text-[11px] text-muted-foreground/60">{link.desc}</p>
                        </div>
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-violet-400 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
