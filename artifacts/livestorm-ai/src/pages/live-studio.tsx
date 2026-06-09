import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMyProfile,
  useConnectTiktok,
  useStartSession,
  useEndSession,
  useGetActiveSession,
  useForceStopSession,
  getGetMyProfileQueryKey,
  getGetActiveSessionQueryKey
} from "@workspace/api-client-react";
import { useLiveSession } from "@/hooks/useLiveSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Video, PlugZap, RefreshCw, StopCircle, PlayCircle, Activity,
  AlertTriangle, Radio, Bot, RotateCcw, Wifi, WifiOff, Terminal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_COLORS: Record<string, string> = {
  gift:            "text-amber-400",
  like:            "text-pink-400",
  comment:         "text-blue-400",
  follow:          "text-green-400",
  share:           "text-cyan-400",
  viewerCount:     "text-violet-400",
  ai_announcement: "text-purple-300",
};

export function LiveStudio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useGetMyProfile();
  const connectTiktok = useConnectTiktok();

  const { data: activeSessionRes } = useGetActiveSession({
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 5000 },
  });
  const startSession = useStartSession();
  const endSession = useEndSession();
  const forceStop = useForceStopSession();

  const activeSessionId = activeSessionRes?.session?.id;
  const sessionMode = (activeSessionRes?.session as any)?.mode ?? null;

  const { events, connected, clearEvents, tiktokMode, tiktokError, tiktokUsername } =
    useLiveSession(activeSessionId, sessionMode);

  const [tiktokUsernameInput, setTiktokUsernameInput] = useState("");
  const isActive = activeSessionRes?.active;
  const effectiveMode = tiktokMode ?? sessionMode;

  const handleConnect = () => {
    if (!tiktokUsernameInput.trim()) return;
    connectTiktok.mutate(
      { data: { tiktokUsername: tiktokUsernameInput } },
      {
        onSuccess: () => {
          toast({ title: "Connected!", description: `TikTok username set to @${tiktokUsernameInput}` });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          setTiktokUsernameInput("");
        },
        onError: () => {
          toast({ title: "Connection Failed", description: "Could not connect TikTok account.", variant: "destructive" });
        },
      },
    );
  };

  const handleStartSession = () => {
    if (!user?.tiktokUsername) {
      toast({ title: "Action Required", description: "Connect a TikTok account first.", variant: "destructive" });
      return;
    }
    clearEvents();
    startSession.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Broadcast Started", description: "Now listening for TikTok events." });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to start", description: String(err), variant: "destructive" });
      },
    });
  };

  const handleEndSession = () => {
    endSession.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Broadcast Ended" });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
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
      },
      onError: () => {
        toast({ title: "Reset Failed", description: "Could not reset session.", variant: "destructive" });
      },
    });
  };

  const modeBadge = () => {
    if (!isActive) return null;
    if (effectiveMode === "real")
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 gap-1.5 text-xs"><Radio className="h-2.5 w-2.5" />Live</Badge>;
    if (effectiveMode === "demo")
      return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 gap-1.5 text-xs"><Bot className="h-2.5 w-2.5" />Demo</Badge>;
    if (effectiveMode === "error")
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 gap-1.5 text-xs"><AlertTriangle className="h-2.5 w-2.5" />Error</Badge>;
    return null;
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Video className="h-6 w-6 text-accent" />
          Live Studio
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your active broadcast and monitor real-time events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Left panel */}
        <div className="space-y-4">

          {/* TikTok Connection */}
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PlugZap className="w-4 h-4 text-primary" />
                TikTok Account
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {!isUserLoading && user?.tiktokUsername ? (
                <div className="relative p-4 rounded-xl bg-primary/8 border border-primary/20 overflow-hidden text-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                  <div className="relative">
                    <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center mb-2">
                      <span className="text-xl font-black text-primary">@</span>
                    </div>
                    <p className="font-bold text-white">@{user.tiktokUsername}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-bold px-2 py-0.5 bg-green-500/10 rounded-full mt-1.5 border border-green-500/20">
                      <span className="w-1 h-1 rounded-full bg-green-500" />
                      Linked
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tiktok-username" className="text-xs">TikTok Username</Label>
                    <Input
                      id="tiktok-username"
                      placeholder="e.g. charlidamelio"
                      value={tiktokUsernameInput}
                      onChange={(e) => setTiktokUsernameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                      className="bg-background border-white/10 text-sm"
                    />
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm"
                    onClick={handleConnect}
                    disabled={connectTiktok.isPending || !tiktokUsernameInput.trim()}
                  >
                    {connectTiktok.isPending ? "Connecting…" : "Connect Account"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Broadcast Control */}
          <Card className={cn(
            "bg-card border-white/5 transition-all duration-300",
            isActive && "border-primary/20 shadow-md shadow-primary/5",
          )}>
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Video className="w-4 h-4 text-accent" />
                Broadcast Control
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">

              {/* Status rows */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
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
                      <WifiOff className="h-3 w-3" />Connecting…
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

                {isActive && tiktokUsername && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Stream</span>
                    <span className="text-xs font-mono text-white">@{tiktokUsername}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* Actions */}
              <div className="space-y-2">
                {isActive ? (
                  <Button
                    variant="destructive"
                    className="w-full font-bold gap-2 text-sm"
                    onClick={handleEndSession}
                    disabled={endSession.isPending}
                  >
                    <StopCircle className="w-4 h-4" />
                    {endSession.isPending ? "Stopping…" : "Stop Broadcast"}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold gap-2 text-sm"
                    onClick={handleStartSession}
                    disabled={startSession.isPending || !user?.tiktokUsername}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {startSession.isPending ? "Starting…" : "Start Live Session"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs text-muted-foreground border-white/10 hover:border-red-500/30 hover:text-red-400"
                  onClick={handleForceStop}
                  disabled={forceStop.isPending}
                  title="Force-clears any stuck session. Use if Start is blocked."
                >
                  <RotateCcw className="w-3 h-3" />
                  {forceStop.isPending ? "Resetting…" : "Force Reset"}
                </Button>
              </div>

              {/* Status hint */}
              <p className="text-[10px] text-muted-foreground/60 text-center leading-snug">
                {isActive
                  ? effectiveMode === "real"
                    ? `Receiving real TikTok LIVE events.`
                    : effectiveMode === "demo"
                    ? "Demo mode: simulated events flowing."
                    : effectiveMode === "error"
                    ? "Connection error — check event feed."
                    : "Waiting for TikTok connection…"
                  : "Start a session to activate event capture, overlays, and automations."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Raw Event Feed */}
        <div className="md:col-span-2">
          <Card className={cn(
            "bg-card flex flex-col transition-all duration-500",
            "min-h-[600px]",
            isActive && connected && effectiveMode === "real"
              ? "border-accent/30 shadow-lg shadow-accent/5"
              : "border-white/5",
          )}>
            <CardHeader className="border-b border-white/5 bg-black/10 flex-none">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  Event Console
                </span>
                <div className="flex items-center gap-2">
                  {modeBadge()}
                  {isActive && connected && effectiveMode !== "error" && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-accent px-2 py-1 bg-accent/10 rounded-full border border-accent/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Listening
                    </span>
                  )}
                  {events.length > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {events.length} events
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0 font-mono text-xs bg-black/30">
              {isActive ? (
                <ScrollArea className="h-full" style={{ height: "100%", minHeight: "540px" }}>
                  <div className="p-4 space-y-1.5">

                    {/* System status line */}
                    {effectiveMode === "error" ? (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 space-y-1"
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-red-300/60">[{format(new Date(), "HH:mm:ss")}]</span>
                          TikTok connection failed
                        </div>
                        {tiktokError && (
                          <p className="text-[10px] text-red-300/70 pl-5 whitespace-pre-wrap leading-relaxed">{tiktokError}</p>
                        )}
                      </motion.div>
                    ) : effectiveMode === "demo" ? (
                      <div className="px-3 py-2 rounded-lg bg-blue-500/8 border border-blue-500/15 text-blue-400 text-[10px]">
                        <span className="text-slate-500 mr-2">[{format(new Date(), "HH:mm:ss")}]</span>
                        <span className="font-bold text-blue-400">[SYSTEM]</span>
                        <span className="text-slate-400 ml-2">Demo mode active — simulated events flowing. Set TIKTOK_MODE=real for live data.</span>
                      </div>
                    ) : effectiveMode === "real" ? (
                      <div className="px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px]">
                        <span className="text-slate-500 mr-2">[{format(new Date(), "HH:mm:ss")}]</span>
                        <span className="font-bold text-emerald-400">[SYSTEM]</span>
                        <span className="text-slate-400 ml-2">Connected to TikTok LIVE{tiktokUsername ? ` · @${tiktokUsername}` : ""}. Receiving events.</span>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-accent/8 border border-accent/15 text-accent text-[10px]">
                        <span className="text-slate-500 mr-2">[{format(new Date(), "HH:mm:ss")}]</span>
                        <span className="font-bold text-accent">[SYSTEM]</span>
                        <span className="text-slate-400 ml-2">Establishing connection…</span>
                      </div>
                    )}

                    {/* Live events */}
                    <AnimatePresence initial={false}>
                      {events.map((event, idx) => {
                        const color = EVENT_COLORS[event.type] ?? "text-muted-foreground";
                        const payload = JSON.stringify(event.data);

                        return (
                          <motion.div
                            key={`${event.timestamp}-${idx}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                            className="group flex items-start gap-0 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors break-all"
                          >
                            <span className="text-slate-600 mr-2 flex-shrink-0 select-none">
                              [{format(new Date(event.timestamp), "HH:mm:ss")}]
                            </span>
                            <span className={cn("font-bold mr-2 flex-shrink-0", color)}>
                              [{event.type.toUpperCase()}]
                            </span>
                            {event.username && (
                              <span className="text-slate-300 font-bold mr-2 flex-shrink-0">
                                {event.username}:
                              </span>
                            )}
                            <span className="text-slate-400 break-all">{payload}</span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-[540px] text-muted-foreground p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center mb-4">
                    <Activity className="w-7 h-7 opacity-20" />
                  </div>
                  <p className="text-sm font-medium text-white/60 mb-1">Console offline</p>
                  <p className="text-xs text-muted-foreground/60 max-w-xs">
                    Start a live session to stream real-time TikTok events into this console.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
