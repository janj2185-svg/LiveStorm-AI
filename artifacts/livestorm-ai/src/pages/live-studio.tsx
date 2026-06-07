import { useState } from "react";
import { motion } from "framer-motion";
import { useGetMyProfile, useConnectTiktok } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, PlugZap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";

export function LiveStudio() {
  const { data: user, isLoading } = useGetMyProfile();
  const connectTiktok = useConnectTiktok();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);

  const handleConnect = () => {
    if (!tiktokUsername.trim()) return;
    connectTiktok.mutate(
      { data: { tiktokUsername } },
      {
        onSuccess: () => {
          toast({
            title: "Connected!",
            description: `TikTok username set to @${tiktokUsername}`,
          });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          setTiktokUsername("");
        },
        onError: () => {
          toast({
            title: "Connection Failed",
            description: "Could not connect TikTok account.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Live Studio</h2>
        <p className="text-muted-foreground">Manage your active broadcast and connection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlugZap className="w-5 h-5 text-primary" />
                TikTok Connection
              </CardTitle>
              <CardDescription>Link your TikTok account to listen for live events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLoading && user?.tiktokUsername ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <span className="text-xl font-bold text-primary">@</span>
                  </div>
                  <h3 className="font-bold text-white">@{user.tiktokUsername}</h3>
                  <span className="text-xs text-green-400 font-medium px-2 py-1 bg-green-500/10 rounded-full">Connected</span>
                  
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setTiktokUsername("")}>
                    Change Account
                  </Button>
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
                      className="bg-background"
                    />
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90" 
                    onClick={handleConnect}
                    disabled={connectTiktok.isPending || !tiktokUsername.trim()}
                  >
                    {connectTiktok.isPending ? "Connecting..." : "Connect Account"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-accent" />
                Broadcast Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant={isSimulatingLive ? "destructive" : "default"} 
                className={`w-full ${!isSimulatingLive ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
                onClick={() => setIsSimulatingLive(!isSimulatingLive)}
              >
                {isSimulatingLive ? "Stop Broadcast" : "Start Live Session"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {isSimulatingLive ? "Listening for TikTok events..." : "Start session to activate overlays"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-card border-white/5 h-full min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Event Feed</span>
                {isSimulatingLive && (
                  <span className="flex items-center gap-2 text-xs font-medium text-accent">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Listening
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-black/20 flex flex-col">
              {isSimulatingLive ? (
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-3 rounded bg-primary/10 border border-primary/20 text-sm">
                    <span className="font-bold text-primary">System:</span> Connected to TikTok LIVE stream.
                  </motion.div>
                  {/* Fake events for preview */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="p-3 rounded bg-white/5 border border-white/10 text-sm">
                    <span className="font-bold text-accent">user_123</span> liked the live! (x15)
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.5 }} className="p-3 rounded bg-white/5 border border-white/10 text-sm">
                    <span className="font-bold text-accent">gamer_girl</span> joined the room.
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 4 }} className="p-3 rounded bg-pink-500/10 border border-pink-500/20 text-sm">
                    <span className="font-bold text-pink-400">big_whale</span> sent <span className="font-bold">Rose x1</span> 🌹
                  </motion.div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <Video className="w-12 h-12 mb-4 opacity-20" />
                  <p>Broadcast is offline.</p>
                  <p className="text-sm mt-1">Start a session to see real-time events appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
