import { useState } from "react";
import {
  useGetGamificationLeaderboard,
  useGetAchievements,
  useGetDailyClaimStatus,
  useClaimDailyReward,
  useGetMyStreamer,
  useGetMyGamificationStats,
  useGetStreamerLeaderboard,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy, Star, Medal, Zap, Gift, Heart, Shield, Sword, Target,
  TrendingUp, Users, MessageCircle, Map, Brain, Circle, Flame, Home,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy, star: Star, medal: Medal, zap: Zap, gift: Gift,
  heart: Heart, shield: Shield, sword: Sword, target: Target,
  trending: TrendingUp, users: Users, chat: MessageCircle, map: Map,
  brain: Brain, circle: Circle, flame: Flame, home: Home,
  castle: Shield, axe: Sword, swords: Sword,
};

function xpToLevel(xp: number) {
  return Math.min(100, Math.floor(Math.sqrt(xp / 50)) + 1);
}

function xpForLevel(level: number) {
  return (level - 1) * (level - 1) * 50;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Recruit", 2: "Scout", 3: "Apprentice", 5: "Warrior", 8: "Knight",
  10: "Cyber Knight", 15: "Champion", 20: "Hero", 25: "Elite Warrior",
  30: "Legend", 50: "Master", 75: "Grandmaster", 100: "Immortal",
};

function getLevelTitle(level: number): string {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_TITLES[k];
  }
  return "Recruit";
}

type LeaderboardTab = "viewers" | "streamers";

export function Gamification() {
  const { data: streamer } = useGetMyStreamer();
  const streamerId = streamer?.id;

  // Current user's personal progression
  const { data: myStats, isLoading: loadingMe } = useGetMyGamificationStats();

  // Viewer leaderboard (for the current streamer's stream)
  const { data: leaderboard, isLoading: loadingLb } = useGetGamificationLeaderboard(
    streamerId ? { streamerId } : undefined
  );

  // Streamer leaderboard (global, ranked by XP awarded)
  const { data: streamerLb, isLoading: loadingSlb } = useGetStreamerLeaderboard();

  const { data: achievements, isLoading: loadingAch } = useGetAchievements();
  const { data: claimStatus, refetch: refetchStatus } = useGetDailyClaimStatus();
  const claimMutation = useClaimDailyReward();
  const { toast } = useToast();

  const [achFilter, setAchFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [lbTab, setLbTab] = useState<LeaderboardTab>("viewers");

  // Use dedicated /gamification/me for the progression panel
  const myXp = myStats?.totalXp ?? 0;
  const myLevel = myStats?.level ?? xpToLevel(myXp);
  const myRank = myStats?.rank ?? null;
  const nextLevelXp = xpForLevel(myLevel + 1);
  const currentLevelXp = xpForLevel(myLevel);
  const xpProgress = nextLevelXp > currentLevelXp
    ? Math.round(((myXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
    : 100;

  const filteredAch = (achievements ?? []).filter((a) => {
    if (achFilter === "unlocked") return a.unlocked;
    if (achFilter === "locked") return !a.unlocked;
    return true;
  });

  async function handleClaim() {
    try {
      const result = await claimMutation.mutateAsync();
      if (result.alreadyClaimed) {
        toast({ title: "Already claimed", description: "Come back tomorrow for your next reward!" });
      } else {
        toast({ title: `+${result.coinsAwarded} Coins!`, description: "Daily reward claimed successfully." });
        refetchStatus();
      }
    } catch {
      toast({ title: "Error", description: "Could not claim reward.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Gamification</h2>
        <p className="text-muted-foreground">Track your progression and community achievements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Your Progression — uses /gamification/me for accurate personal data */}
          <Card className="bg-card border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.1)] relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 blur-3xl pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                Your Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMe ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <span className="text-4xl font-black text-white mr-2">Lv. {myLevel}</span>
                      <span className="text-sm text-muted-foreground">{getLevelTitle(myLevel)}</span>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {myXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
                    </span>
                  </div>
                  <Progress value={xpProgress} className="h-3 bg-background border border-border" />
                  <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                    <span>🪙 {(myStats?.totalCoins ?? 0).toLocaleString()} Coins</span>
                    <span>🎁 {(myStats?.totalGifts ?? 0)} Gifts</span>
                    <span>🏆 Rank #{myRank ?? "—"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-card border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Medal className="w-5 h-5 text-accent" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  {achievements
                    ? `${achievements.filter(a => a.unlocked).length} / ${achievements.length} unlocked`
                    : "Loading..."}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                {(["all", "unlocked", "locked"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={achFilter === f ? "default" : "outline"}
                    onClick={() => setAchFilter(f)}
                    className="capitalize text-xs h-7"
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingAch ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {filteredAch.map((ach) => {
                    const Icon = ICON_MAP[ach.iconType] ?? Trophy;
                    return (
                      <div
                        key={ach.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          ach.unlocked
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border opacity-50 grayscale"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          ach.unlocked ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Icon className={`w-5 h-5 ${ach.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-bold text-white truncate">{ach.name}</p>
                            {ach.unlocked && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/50 text-primary shrink-0">✓</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{ach.description}</p>
                          <p className="text-xs text-yellow-500 mt-0.5">+{ach.xpReward} XP · +{ach.coinReward} coins</p>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAch.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8">
                      No achievements in this category yet.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Daily Reward */}
          <Card className="bg-gradient-to-b from-card to-background border-accent/20">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Daily Bonus</CardTitle>
              <CardDescription>Claim 100 coins every day</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className={`w-24 h-24 my-4 rounded-full border-2 border-dashed flex items-center justify-center ${
                claimStatus?.alreadyClaimed
                  ? "bg-muted border-muted-foreground"
                  : "bg-accent/20 border-accent animate-[pulse_3s_ease-in-out_infinite]"
              }`}>
                <Gift className={`w-10 h-10 ${claimStatus?.alreadyClaimed ? "text-muted-foreground" : "text-accent"}`} />
              </div>
              <Button
                className="w-full"
                onClick={handleClaim}
                disabled={claimStatus?.alreadyClaimed || claimMutation.isPending}
                variant={claimStatus?.alreadyClaimed ? "outline" : "default"}
              >
                {claimStatus?.alreadyClaimed
                  ? "✓ Claimed Today"
                  : claimMutation.isPending
                  ? "Claiming..."
                  : "Claim +100 Coins"}
              </Button>
              {claimStatus?.alreadyClaimed && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Resets at midnight UTC</p>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard — tabbed: Viewer | Streamer */}
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Leaderboard
              </CardTitle>
              <div className="flex gap-1 mt-1">
                <Button
                  size="sm"
                  variant={lbTab === "viewers" ? "default" : "outline"}
                  onClick={() => setLbTab("viewers")}
                  className="text-xs h-6 px-2"
                >
                  Viewers
                </Button>
                <Button
                  size="sm"
                  variant={lbTab === "streamers" ? "default" : "outline"}
                  onClick={() => setLbTab("streamers")}
                  className="text-xs h-6 px-2"
                >
                  Streamers
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {lbTab === "viewers" ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">Top viewers by XP earned in your stream</p>
                  {loadingLb
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                    : (leaderboard ?? []).slice(0, 8).map((entry) => (
                        <div key={entry.tiktokViewerId} className="flex items-center gap-2 p-2 rounded bg-background border border-border">
                          <span className={`font-black text-sm w-5 text-center ${
                            entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-slate-300" : entry.rank === 3 ? "text-amber-600" : "text-muted-foreground"
                          }`}>{entry.rank}</span>
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {entry.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{entry.viewerName}</p>
                          </div>
                          <span className="text-xs font-medium text-primary shrink-0">{entry.totalXp.toLocaleString()} XP</span>
                        </div>
                      ))}
                  {(!leaderboard || leaderboard.length === 0) && !loadingLb && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {streamerId ? "No viewers ranked yet. Go live to earn XP!" : "Start streaming to see viewer rankings."}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">Top streamers by engagement</p>
                  {loadingSlb
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                    : (streamerLb ?? []).slice(0, 8).map((entry) => (
                        <div key={entry.streamerId} className="flex items-center gap-2 p-2 rounded bg-background border border-border">
                          <span className={`font-black text-sm w-5 text-center ${
                            entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-slate-300" : entry.rank === 3 ? "text-amber-600" : "text-muted-foreground"
                          }`}>{entry.rank}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{entry.streamerName}</p>
                            <p className="text-xs text-muted-foreground">{entry.uniqueViewers} viewers · {entry.totalGiftsReceived} gifts</p>
                          </div>
                          <span className="text-xs font-medium text-accent shrink-0">{entry.totalXpAwarded.toLocaleString()} XP</span>
                        </div>
                      ))}
                  {(!streamerLb || streamerLb.length === 0) && !loadingSlb && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No streamers ranked yet.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
