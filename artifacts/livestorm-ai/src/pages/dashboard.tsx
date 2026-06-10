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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, Gift, Heart, UserPlus, MessageSquare, Zap, Activity,
  PlayCircle, Square, Clock, Share, Bot, ShieldAlert, RefreshCw,
  PlugZap, TrendingUp, Radio, Trophy as TrophyIcon,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const EVENT_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  gift:        { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",  icon: Gift,          label: "Gift" },
  comment:     { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",   icon: MessageSquare, label: "Chat" },
  follow:      { bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20",  icon: UserPlus,      label: "Follow" },
  like:        { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20",   icon: Heart,         label: "Like" },
  share:       { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20",   icon: Share,         label: "Share" },
  viewerCount: { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20", icon: Users,         label: "Viewers" },
  ai_announcement: { bg: "bg-purple-600/15", text: "text-purple-300", border: "border-purple-500/20", icon: Bot, label: "AI" },
};

function StatCard({
  title, value, icon: Icon, color, active,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  active?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    green:   { bg: "bg-green-500/10",   text: "text-green-400",   glow: "shadow-green-500/10" },
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   glow: "shadow-amber-500/10" },
    pink:    { bg: "bg-pink-500/10",    text: "text-pink-400",    glow: "shadow-pink-500/10" },
    primary: { bg: "bg-primary/10",     text: "text-primary",     glow: "shadow-primary/10" },
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-400",    glow: "shadow-blue-500/10" },
    cyan:    { bg: "bg-cyan-500/10",    text: "text-cyan-400",    glow: "shadow-cyan-500/10" },
  };
  const c = colorMap[color] ?? colorMap.primary;

  return (
    <Card className={cn(
      "bg-card border-white/5 transition-all duration-500",
      active && "shadow-lg " + c.glow,
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-lg", c.bg)}>
            <Icon className={cn("h-4 w-4", c.text)} />
          </div>
          {active && value > 0 && (
            <TrendingUp className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
        <p className="text-2xl font-bold text-white tabular-nums">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      </CardContent>
    </Card>
  );
}

function EventRow({ event, idx }: { event: LiveEvent; idx: number }) {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.comment;
  const Icon = cfg.icon;

  let desc = "interacted";
  if (event.type === "gift")    desc = `sent ${event.data.giftName || "a gift"} · ${event.data.coins || 1} coins`;
  if (event.type === "like")    desc = `liked the stream (${event.data.likeCount || 1}×)`;
  if (event.type === "comment") desc = `"${event.data.text || ""}"`;
  if (event.type === "follow")  desc = "started following";
  if (event.type === "share")   desc = "shared the LIVE";
  if (event.type === "ai_announcement") desc = (event.data.text as string) || "";

  if (event.type === "viewerCount") return null;

  return (
    <motion.div
      key={`${event.timestamp}-${idx}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        "bg-white/[0.02] hover:bg-white/[0.04] transition-colors",
        cfg.border,
      )}
    >
      <div className={cn("p-1.5 rounded-md mt-0.5 flex-shrink-0", cfg.bg)}>
        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-white">{event.username || "System"}</span>
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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoadingSession) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  // ── No TikTok username ───────────────────────────────────────────────────────
  if (!profile?.tiktokUsername) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-card border-white/8 shadow-2xl w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center mb-4 border border-primary/20">
              <PlugZap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">Connect Your TikTok</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Enter your TikTok username to start capturing live events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tiktok-dash-input">TikTok Username</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">@</span>
                  <Input
                    id="tiktok-dash-input"
                    className="pl-7 bg-background border-border"
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
                  className="bg-primary hover:bg-primary/90 text-white font-bold shrink-0"
                >
                  {connectTiktok.isPending ? "Saving…" : "Connect"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Change this any time in{" "}
                <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = activeSessionRes?.active;

  // ── Main Dashboard ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
            {isActive && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 px-2.5 py-1 text-xs font-semibold",
                  connected
                    ? "border-green-500/40 text-green-400 bg-green-500/10"
                    : "border-amber-500/40 text-amber-400 bg-amber-500/10",
                )}
              >
                <span className={cn("relative flex h-1.5 w-1.5")}>
                  <span className={cn(
                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                    connected ? "animate-ping bg-green-400" : "bg-amber-400",
                  )} />
                  <span className={cn(
                    "relative inline-flex rounded-full h-1.5 w-1.5",
                    connected ? "bg-green-500" : "bg-amber-500",
                  )} />
                </span>
                {connected ? "LIVE" : "RECONNECTING"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isActive
              ? `Session active · ${formatDuration(duration)}`
              : "Start a session to capture live events."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <Button
              variant="destructive"
              onClick={handleEndSession}
              disabled={endSession.isPending}
              className="font-bold gap-2"
            >
              <Square className="h-4 w-4" fill="currentColor" />
              {endSession.isPending ? "Ending…" : "End Stream"}
            </Button>
          ) : (
            <Button
              onClick={handleStartSession}
              disabled={startSession.isPending || !profile?.tiktokUsername}
              className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-6"
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
            title="Force-clears any stuck session. Use if Go Live is blocked."
          >
            <RefreshCw className="h-3 w-3" />
            {forceStop.isPending ? "Resetting…" : "Reset"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Viewers"   value={stats.viewerCount}   icon={Zap}           color="green"   active={isActive} />
        <StatCard title="Coins"     value={stats.totalGifts}    icon={Gift}          color="amber"   active={isActive} />
        <StatCard title="Likes"     value={stats.totalLikes}    icon={Heart}         color="pink"    active={isActive} />
        <StatCard title="Follows"   value={stats.totalFollows}  icon={UserPlus}      color="primary" active={isActive} />
        <StatCard title="Comments"  value={stats.totalComments} icon={MessageSquare} color="blue"    active={isActive} />
        <StatCard title="Shares"    value={stats.totalShares}   icon={Share}         color="cyan"    active={isActive} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Activity Feed */}
        <Card className={cn(
          "col-span-1 lg:col-span-2 bg-card border-white/5 flex flex-col",
          isActive && "border-primary/20 shadow-lg shadow-primary/5",
        )}>
          <CardHeader className="pb-3 border-b border-border/50 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Live Activity
            </CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              {events.filter(e => e.type !== "viewerCount").length} events
            </span>
          </CardHeader>
          <CardContent className="flex-1 p-0 h-[480px]">
            {!isActive && events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Radio className="h-5 w-5 opacity-30" />
                </div>
                <p className="text-sm">Waiting for broadcast…</p>
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
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-5">

          {/* Top Supporters */}
          <Card className={cn("bg-card border-white/5", isActive && "border-primary/20")}>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrophyIcon className="h-4 w-4 text-amber-400" />
                Top Supporters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[220px] overflow-y-auto">
                {stats.topSupporters.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No supporters yet this session
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
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <span className={cn(
                            "font-bold text-sm w-5 text-center flex-shrink-0",
                            idx === 0 ? "text-amber-400" :
                            idx === 1 ? "text-slate-300" :
                            idx === 2 ? "text-amber-700" : "text-muted-foreground",
                          )}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium text-white truncate">
                            {s.username}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                            <Gift className="h-2.5 w-2.5" />
                            {s.coins}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Co-host */}
          {isActive && (
            <Card className={cn("bg-card border-white/5", isActive && "border-primary/20")}>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-400" />
                    AI Co-host
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-normal text-muted-foreground">🔊 TTS</span>
                    <input
                      type="checkbox"
                      checked={ttsOn}
                      onChange={(e) => { setTtsOn(e.target.checked); setTtsEnabled(e.target.checked); }}
                      className="w-4 h-4 accent-purple-500 cursor-pointer"
                    />
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[160px] overflow-y-auto p-3 space-y-2">
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
                            className="text-xs p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200"
                          >
                            <span className="font-bold text-purple-400 mr-1">
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
                            className="text-xs p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                          >
                            <div className="flex items-center gap-1 text-red-400 font-bold mb-0.5">
                              <ShieldAlert className="h-3 w-3" />
                              Flagged · {f.viewerName}
                            </div>
                            <span className="text-muted-foreground truncate block">{f.comment}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session History */}
          {!isActive && sessions && sessions.length > 0 && (
            <Card className="bg-card border-white/5">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {format(new Date(session.startedAt), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Peak {session.peakViewers} viewers · {session.totalGifts} coins
                        </p>
                      </div>
                      {session.endedAt && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {(() => {
                            const s = Math.floor(
                              (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
                            );
                            const h = Math.floor(s / 3600);
                            const m = Math.floor((s % 3600) / 60);
                            const ss = s % 60;
                            return h > 0
                              ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
                              : `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
                          })()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

