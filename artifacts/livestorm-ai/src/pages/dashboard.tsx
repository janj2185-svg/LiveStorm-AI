import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useGetActiveSession,
  useStartSession,
  useEndSession,
  useGetSessions,
  getGetActiveSessionQueryKey,
  getGetSessionsQueryKey
} from "@workspace/api-client-react";
import { useLiveSession, type LiveEvent } from "@/hooks/useLiveSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Gift, Heart, UserPlus, MessageSquare, Zap, Activity,
  PlayCircle, Square, Clock, Share, Bot, ShieldAlert, Swords, RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const EVENT_COLORS: Record<string, { bg: string, text: string, icon: any }> = {
  gift: { bg: "bg-amber-500/10", text: "text-amber-500", icon: Gift },
  comment: { bg: "bg-blue-500/10", text: "text-blue-500", icon: MessageSquare },
  follow: { bg: "bg-green-500/10", text: "text-green-500", icon: UserPlus },
  like: { bg: "bg-pink-500/10", text: "text-pink-500", icon: Heart },
  share: { bg: "bg-cyan-500/10", text: "text-cyan-500", icon: Share },
  viewerCount: { bg: "bg-purple-500/10", text: "text-purple-500", icon: Users },
};

export function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useGetMyProfile();
  
  const { data: activeSessionRes, isLoading: isLoadingSession } = useGetActiveSession({ 
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 5000 } 
  });
  const { data: sessions } = useGetSessions();
  const startSession = useStartSession();
  const endSession = useEndSession();
  
  const activeSessionId = activeSessionRes?.session?.id;
  const { events, stats, aiAnnouncements, flaggedComments, connected, clearEvents } = useLiveSession(activeSessionId);

  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!activeSessionRes?.session?.startedAt) return;
    
    const start = new Date(activeSessionRes.session.startedAt).getTime();
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSessionRes?.session?.startedAt]);

  const handleStartSession = () => {
    if (!profile?.tiktokUsername) {
      toast({
        title: "TikTok Account Required",
        description: "Please connect your TikTok account in Settings first.",
        variant: "destructive"
      });
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
      }
    });
  };

  const handleEndSession = () => {
    endSession.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Live Session Ended" });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
      }
    });
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoadingSession) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-xl bg-card border-white/5" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl bg-card border-white/5" />
      </div>
    );
  }

  const isActive = activeSessionRes?.active;
  const cardGlow = isActive ? "border-primary/50 shadow-[0_0_15px_rgba(124,58,237,0.15)]" : "border-white/5";

  return (
    <div className="space-y-6">
      {/* Missing TikTok Banner */}
      {!profile?.tiktokUsername && (
        <Card className="bg-red-500/10 border-red-500/20 text-red-400">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">Connect your TikTok username in Settings to go live.</span>
            <Button variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-500/20" asChild>
              <Link href="/settings">Settings</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header controls & stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Dashboard
            {isActive && (
              <Badge variant="outline" className={`ml-2 border-green-500 text-green-400 bg-green-500/10 gap-2 px-3 py-1 ${connected ? '' : 'opacity-50'}`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${connected ? '' : 'hidden'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-green-500' : 'bg-green-500/50'}`}></span>
                </span>
                {connected ? "LIVE CONNECTED" : "RECONNECTING..."}
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isActive ? `Session active for ${formatDuration(duration)}` : "Start a session to capture live events."}
          </p>
        </div>
        <div>
          {isActive ? (
            <Button variant="destructive" onClick={handleEndSession} disabled={endSession.isPending} className="font-bold gap-2">
              <Square className="h-4 w-4" fill="currentColor" /> 
              {endSession.isPending ? "Ending..." : "End Stream"}
            </Button>
          ) : (
            <Button onClick={handleStartSession} disabled={startSession.isPending || !profile?.tiktokUsername} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-8">
              <PlayCircle className="h-5 w-5" />
              {startSession.isPending ? "Starting..." : "Go Live"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Viewers" value={stats.viewerCount} icon={Zap} glow={isActive} glowColor="green" isLive={isActive} />
        <StatCard title="Coins" value={stats.totalGifts} icon={Gift} glow={isActive} glowColor="amber" />
        <StatCard title="Likes" value={stats.totalLikes} icon={Heart} glow={isActive} glowColor="pink" />
        <StatCard title="Followers" value={stats.totalFollows} icon={UserPlus} glow={isActive} glowColor="primary" />
        <StatCard title="Comments" value={stats.totalComments} icon={MessageSquare} glow={isActive} glowColor="blue" />
        <StatCard title="Shares" value={stats.totalShares} icon={Share} glow={isActive} glowColor="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity Feed */}
        <Card className={`col-span-1 lg:col-span-2 bg-card ${cardGlow} transition-colors duration-500 flex flex-col`}>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Live Activity</span>
              <span className="text-xs font-normal text-muted-foreground">
                {events.length} events
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative h-[500px] bg-black/20">
            {!isActive && events.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p>Waiting for broadcast...</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {events.map((event, idx) => {
                      const color = EVENT_COLORS[event.type] || EVENT_COLORS.comment;
                      const Icon = color.icon;
                      
                      let desc = "interacted";
                      if (event.type === 'gift') desc = `sent ${event.data.giftName || 'a gift'} (${event.data.coins || 1} coins)`;
                      if (event.type === 'like') desc = `liked the LIVE (${event.data.likeCount || 1}x)`;
                      if (event.type === 'comment') desc = `said: "${event.data.text || ''}"`;
                      if (event.type === 'follow') desc = `started following you`;
                      if (event.type === 'share') desc = `shared the LIVE`;

                      if (event.type === 'viewerCount') return null; // skip viewer count updates from feed

                      return (
                        <motion.div
                          key={`${event.timestamp}-${idx}`}
                          initial={{ opacity: 0, x: -20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: "auto" }}
                          className={`flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-card/50 backdrop-blur-sm`}
                        >
                          <div className={`p-2 rounded-md ${color.bg} ${color.text} shrink-0`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">
                              <span className="font-bold text-white mr-2">{event.username || 'System'}</span>
                              <span className="text-muted-foreground">{desc}</span>
                            </p>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(event.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right: Top Supporters */}
        <div className="space-y-6">
          <Card className={`bg-card ${cardGlow} transition-colors duration-500`}>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrophyIcon className="h-5 w-5 text-amber-500" />
                Top Supporters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[250px] overflow-y-auto p-4">
                {stats.topSupporters.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No supporters yet this session
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {stats.topSupporters.map((supporter, idx) => (
                        <motion.div
                          key={supporter.username}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg w-6 text-center ${
                              idx === 0 ? "text-amber-500" : 
                              idx === 1 ? "text-slate-300" : 
                              idx === 2 ? "text-amber-700" : "text-muted-foreground"
                            }`}>
                              #{idx + 1}
                            </span>
                            <span className="font-medium text-sm truncate max-w-[120px]">
                              {supporter.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                            <Gift className="h-3 w-3" />
                            {supporter.coins}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Quests Widget */}
          {isActive && activeSessionId && (
            <AiQuestsWidget sessionId={activeSessionId} cardGlow={cardGlow} />
          )}

          {/* AI Announcements + Moderation */}
          {isActive && (
            <Card className={`bg-card ${cardGlow} transition-colors duration-500`}>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-400" />
                  AI Co-host
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[180px] overflow-y-auto p-3 space-y-2">
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
                            initial={{ opacity: 0, y: -8 }}
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
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                          >
                            <div className="flex items-center gap-1 text-red-400 font-bold mb-1">
                              <ShieldAlert className="h-3 w-3" />
                              Flagged: {f.viewerName}
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {sessions.slice(0, 5).map(session => (
                    <div key={session.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {format(new Date(session.startedAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Peak: {session.peakViewers} • Coins: {session.totalGifts}
                        </p>
                      </div>
                      {session.endedAt && (
                        <div className="text-xs font-mono text-muted-foreground">
                          {formatDuration(
                            Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
                          )}
                        </div>
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

interface AiQuestData {
  id: number;
  questText: string;
  metric: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

function AiQuestsWidget({ sessionId, cardGlow }: { sessionId: number; cardGlow: string }) {
  const [quests, setQuests] = useState<AiQuestData[]>([]);
  const [generating, setGenerating] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchQuests = async () => {
    try {
      const res = await fetch(`${BASE}/api/ai/quests?sessionId=${sessionId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchQuests();
  }, [sessionId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${BASE}/api/ai/generate-quests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch {} finally {
      setGenerating(false);
    }
  };

  return (
    <Card className={`bg-card ${cardGlow} transition-colors duration-500`}>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-purple-400" />
            AI Quests
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-purple-400 hover:text-purple-300 px-2"
            onClick={handleGenerate}
            disabled={generating}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${generating ? "animate-spin" : ""}`} />
            {quests.length === 0 ? "Generate" : "Refresh"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {quests.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-3">
            No quests yet — click Generate to create AI-crafted challenges
          </div>
        ) : (
          quests.slice(0, 3).map((q) => {
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));
            return (
              <div key={q.id} className={`p-2 rounded-lg border ${q.completed ? "bg-green-500/10 border-green-500/20" : "bg-white/5 border-white/5"}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs text-white font-medium leading-tight flex-1">{q.questText}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0 border-purple-500/30 text-purple-400 px-1">
                    +{q.xpReward} XP
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/10 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${q.completed ? "bg-green-400" : "bg-purple-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {q.current}/{q.target}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, icon: Icon, glow, glowColor, isLive }: any) {
  return (
    <Card className={`bg-card overflow-hidden relative transition-all duration-500 ${glow ? `border-${glowColor}-500/50 shadow-[0_0_15px_rgba(124,58,237,0.1)]` : 'border-white/5'}`}>
      {glow && (
        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${glowColor}-500/20 rounded-full blur-2xl pointer-events-none transition-opacity duration-1000`} />
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${glowColor}-500 ${isLive && glowColor === 'green' ? 'animate-pulse' : ''}`} />
      </CardHeader>
      <CardContent className="relative z-10">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="text-2xl font-bold text-white tabular-nums"
          >
            {value.toLocaleString()}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function TrophyIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
}
