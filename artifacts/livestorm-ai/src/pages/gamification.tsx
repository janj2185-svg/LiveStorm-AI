import { useGetTopStreamers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Medal, Zap, Gift } from "lucide-react";

export function Gamification() {
  const { data: streamers, isLoading } = useGetTopStreamers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Gamification</h2>
        <p className="text-muted-foreground">Your progression and community achievements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* XP Progress */}
          <Card className="bg-card border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.1)] relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 blur-3xl pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                Streamer Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-4xl font-black text-white mr-2">Lv. 12</span>
                  <span className="text-sm text-muted-foreground">Cyber Knight</span>
                </div>
                <span className="text-sm font-medium text-primary">8,450 / 10,000 XP</span>
              </div>
              <Progress value={84.5} className="h-3 bg-background border border-border" />
              <p className="text-xs text-muted-foreground mt-4">Earn XP by streaming consistently and receiving gifts.</p>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="w-5 h-5 text-accent" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "First Blood", desc: "Received your first gift", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
                  { title: "Crowd Pleaser", desc: "Reached 100 concurrent viewers", icon: Trophy, color: "text-primary", bg: "bg-primary/10" },
                  { title: "Marathon", desc: "Streamed for 4 hours straight", icon: Star, color: "text-accent", bg: "bg-accent/10" },
                  { title: "Locked In", desc: "Streamed 3 days in a row", icon: Medal, color: "text-pink-500", bg: "bg-pink-500/10" },
                ].map((ach, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ach.bg}`}>
                      <ach.icon className={`w-5 h-5 ${ach.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{ach.title}</p>
                      <p className="text-xs text-muted-foreground">{ach.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Daily Reward */}
          <Card className="bg-gradient-to-b from-card to-background border-accent/20">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Daily Bonus</CardTitle>
              <CardDescription>Claim your daily streaming resources</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-24 h-24 my-4 rounded-full bg-accent/20 border-2 border-accent border-dashed flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
                <Gift className="w-10 h-10 text-accent" />
              </div>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Claim Reward
              </Button>
            </CardContent>
          </Card>

          {/* Global Leaderboard stub */}
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Global Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : (
                (streamers || []).slice(0, 5).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold w-4 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-white truncate max-w-[100px]">{s.displayName || s.tiktokUsername || `User ${s.id}`}</span>
                    </div>
                    <span className="text-xs font-medium text-primary">{s.totalGiftsReceived} G</span>
                  </div>
                ))
              )}
              {(!streamers || streamers.length === 0) && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">No streamers ranked yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

