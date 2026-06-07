import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useGetMyProfile, 
  useConnectTiktok,
  useStartSession,
  useEndSession,
  useGetActiveSession,
  getGetMyProfileQueryKey,
  getGetActiveSessionQueryKey
} from "@workspace/api-client-react";
import { useLiveSession } from "@/hooks/useLiveSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, PlugZap, RefreshCw, StopCircle, PlayCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export function LiveStudio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isUserLoading } = useGetMyProfile();
  const connectTiktok = useConnectTiktok();
  
  const { data: activeSessionRes } = useGetActiveSession({ query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 5000 } });
  const startSession = useStartSession();
  const endSession = useEndSession();
  
  const activeSessionId = activeSessionRes?.session?.id;
  const { events, connected, clearEvents } = useLiveSession(activeSessionId);

  const [tiktokUsername, setTiktokUsername] = useState("");

  const isActive = activeSessionRes?.active;

  const handleConnect = () => {
    if (!tiktokUsername.trim()) return;
    connectTiktok.mutate(
      { data: { tiktokUsername } },
      {
        onSuccess: () => {
          toast({ title: "Connected!", description: `TikTok username set to @${tiktokUsername}` });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          setTiktokUsername("");
        },
        onError: () => {
          toast({ title: "Connection Failed", description: "Could not connect TikTok account.", variant: "destructive" });
        }
      }
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
      }
    });
  };

  const handleEndSession = () => {
    endSession.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Broadcast Ended" });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Video className="h-8 w-8 text-accent" />
          Live Studio
        </h2>
        <p className="text-muted-foreground mt-1">Manage your active broadcast and connection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card border-white/5 shadow-lg">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <PlugZap className="w-5 h-5 text-primary" />
                TikTok Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {!isUserLoading && user?.tiktokUsername ? (
                <div className="p-4 rounded-lg bg-black/20 border border-primary/20 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3 ring-4 ring-background">
                      <span className="text-3xl font-black text-primary">@</span>
                    </div>
                    <h3 className="font-bold text-white text-lg">@{user.tiktokUsername}</h3>
                    <div className="inline-flex items-center gap-1 text-xs text-green-400 font-bold px-2 py-1 bg-green-500/10 rounded-full mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Account Linked
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-username">TikTok Username</Label>
                    <Input 
                      id="tiktok-username" 
                      placeholder="e.g. charlidamelio" 
                      value={tiktokUsername}
                      onChange={(e) => setTiktokUsername(e.target.value)}
                      className="bg-background border-white/10"
                    />
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold" 
                    onClick={handleConnect}
                    disabled={connectTiktok.isPending || !tiktokUsername.trim()}
                  >
                    {connectTiktok.isPending ? "Connecting..." : "Connect Account"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5 shadow-lg">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-accent" />
                Broadcast Control
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status:</span>
                {isActive ? (
                  <span className="font-bold text-green-400 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE
                  </span>
                ) : (
                  <span className="font-bold text-muted-foreground">OFFLINE</span>
                )}
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Websocket:</span>
                {connected ? (
                  <span className="font-bold text-green-400">Connected</span>
                ) : isActive ? (
                  <span className="font-bold text-amber-500 animate-pulse">Connecting...</span>
                ) : (
                  <span className="font-bold text-muted-foreground">Disconnected</span>
                )}
              </div>

              {isActive ? (
                <Button 
                  variant="destructive"
                  className="w-full font-bold gap-2"
                  onClick={handleEndSession}
                  disabled={endSession.isPending}
                >
                  <StopCircle className="w-5 h-5" />
                  {endSession.isPending ? "Stopping..." : "Stop Broadcast"}
                </Button>
              ) : (
                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold gap-2"
                  onClick={handleStartSession}
                  disabled={startSession.isPending || !user?.tiktokUsername}
                >
                  <PlayCircle className="w-5 h-5" />
                  {startSession.isPending ? "Starting..." : "Start Live Session"}
                </Button>
              )}
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                {isActive ? "Listening for real TikTok events..." : "Start session to activate overlays and automations"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className={`bg-card h-full min-h-[600px] flex flex-col transition-all duration-500 ${isActive ? 'border-accent shadow-[0_0_20px_rgba(192,232,249,0.1)]' : 'border-white/5'}`}>
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" />
                  Raw Event Feed
                </span>
                {isActive && connected && (
                  <span className="flex items-center gap-2 text-xs font-bold text-accent px-3 py-1 bg-accent/10 rounded-full border border-accent/20">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Listening
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-black/40 font-mono text-sm">
              {isActive ? (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-2 rounded bg-accent/10 border border-accent/20 text-accent">
                      [{format(new Date(), 'HH:mm:ss')}] System: Connected to TikTok LIVE stream.
                    </motion.div>
                    
                    <AnimatePresence initial={false}>
                      {events.map((event, idx) => {
                        let content = JSON.stringify(event.data);
                        let colorClass = "text-muted-foreground";
                        
                        if (event.type === 'gift') colorClass = "text-amber-400";
                        if (event.type === 'like') colorClass = "text-pink-400";
                        if (event.type === 'comment') colorClass = "text-blue-400";
                        if (event.type === 'follow') colorClass = "text-green-400";
                        if (event.type === 'viewerCount') colorClass = "text-purple-400";

                        return (
                          <motion.div 
                            key={`${event.timestamp}-${idx}`}
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="p-2 rounded bg-white/5 border border-white/5 break-words"
                          >
                            <span className="text-slate-500 mr-2">[{format(new Date(event.timestamp), 'HH:mm:ss')}]</span>
                            <span className={`font-bold mr-2 ${colorClass}`}>[{event.type.toUpperCase()}]</span>
                            {event.username && <span className="text-white font-bold mr-2">{event.username}:</span>}
                            <span className="text-slate-300">{content}</span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <Video className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-lg font-medium text-white mb-2">Broadcast is offline</p>
                  <p className="text-sm max-w-sm">Start a session to see raw real-time events appear in this console.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
