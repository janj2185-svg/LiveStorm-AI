import { useState, useEffect, useRef } from "react";
import {
  useGetGamificationLeaderboard,
  useGetAchievements,
  useGetDailyClaimStatus,
  useClaimDailyReward,
  useGetMyStreamer,
  useGetMyGamificationStats,
  useGetStreamerLeaderboard,
  useGetActiveSession,
  useGetLuckyDropHistory,
  useTriggerLuckyDrop,
  useGetViewerProfile,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLiveSession } from "@/hooks/useLiveSession";
import {
  Trophy, Star, Medal, Zap, Gift, Heart, Shield, Sword, Target,
  TrendingUp, Users, MessageCircle, Map, Brain, Circle, Flame, Home,
  X, Sparkles, Crown, ChevronRight, Clock,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy, star: Star, medal: Medal, zap: Zap, gift: Gift,
  heart: Heart, shield: Shield, sword: Sword, target: Target,
  trending: TrendingUp, users: Users, chat: MessageCircle, map: Map,
  brain: Brain, circle: Circle, flame: Flame, home: Home,
  castle: Shield, axe: Sword, swords: Sword, message: MessageCircle,
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  gift: "🎁 Gift",
  like: "❤️ Like",
  comment: "💬 Comment",
  follow: "➕ Follow",
  share: "🔗 Share",
  boss_reward: "⚔️ Boss",
  lucky_drop: "🎰 Lucky Drop",
  quiz_win: "🧠 Quiz",
  treasure_win: "🗺️ Treasure",
};

const DROP_TIER_COLORS: Record<string, string> = {
  "Common": "from-slate-500 to-slate-600",
  "Rare": "from-blue-500 to-cyan-500",
  "Epic": "from-purple-500 to-violet-600",
  "Legendary": "from-yellow-500 to-amber-600",
};

function getDropColor(dropName: string): string {
  for (const [tier, color] of Object.entries(DROP_TIER_COLORS)) {
    if (dropName.includes(tier)) return color;
  }
  return "from-slate-500 to-slate-600";
}

type LbPeriod = "daily" | "weekly" | "all-time";
type LbTab = "viewers" | "streamers";

// ---------------------------------------------------------------------------
// Lucky Drop Overlay
// ---------------------------------------------------------------------------

interface LuckyDropOverlayProps {
  dropName: string;
  prizeDescription: string;
  xpReward: number;
  coinReward: number;
  winnerName: string;
  onDismiss: () => void;
}

function LuckyDropOverlay({ dropName, prizeDescription, xpReward, coinReward, winnerName, onDismiss }: LuckyDropOverlayProps) {
  const gradientClass = getDropColor(dropName);

  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative max-w-sm w-full animate-[bounceIn_0.5s_ease-out]">
        <div className={`bg-gradient-to-b ${gradientClass} p-[2px] rounded-2xl shadow-[0_0_60px_rgba(124,58,237,0.5)]`}>
          <div className="bg-card rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-[twinkle_1s_ease-in-out_infinite]"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-5xl mb-3">🎰</div>
            <div className={`text-xs font-bold uppercase tracking-widest bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent mb-1`}>
              {dropName}
            </div>
            <div className="text-2xl font-black text-white mb-1">{winnerName}</div>
            <div className="text-sm text-muted-foreground mb-4">{prizeDescription}</div>
            <div className="flex justify-center gap-4">
              <div className="bg-primary/20 rounded-lg px-3 py-2">
                <div className="text-xl font-black text-primary">+{xpReward}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg px-3 py-2">
                <div className="text-xl font-black text-yellow-400">+{coinReward}</div>
                <div className="text-xs text-muted-foreground">Coins</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Auto-dismisses in 8s</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fan Profile Modal
// ---------------------------------------------------------------------------

interface FanProfileModalProps {
  tiktokViewerId: string;
  viewerName: string;
  streamerId?: number;
  onClose: () => void;
}

function FanProfileModal({ tiktokViewerId, viewerName, streamerId, onClose }: FanProfileModalProps) {
  const { data: profile, isLoading } = useGetViewerProfile(
    tiktokViewerId,
    streamerId ? { streamerId } : undefined
  );

  const level = profile?.level ?? xpToLevel(profile?.totalXp ?? 0);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const xp = profile?.totalXp ?? 0;
  const xpProgress = nextLevelXp > currentLevelXp
    ? Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <Card className="bg-card border-primary/20 shadow-[0_0_40px_rgba(124,58,237,0.2)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg text-white">{viewerName}</CardTitle>
              <CardDescription className="text-xs font-mono opacity-50 truncate max-w-[200px]">{tiktokViewerId}</CardDescription>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-white mt-1">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : profile ? (
              <>
                {/* Level + XP */}
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <span className="text-3xl font-black text-white mr-2">Lv.{level}</span>
                      <span className="text-xs text-muted-foreground">{getLevelTitle(level)}</span>
                    </div>
                    <span className="text-xs text-primary font-medium">{xp.toLocaleString()} XP</span>
                  </div>
                  <Progress value={xpProgress} className="h-2 bg-muted border border-border" />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "🪙 Coins", value: profile.totalCoins.toLocaleString() },
                    { label: "🎁 Gifts", value: profile.giftCount },
                    { label: "💬 Comments", value: profile.commentCount },
                    { label: "❤️ Likes", value: profile.likeCount },
                  ].map((s) => (
                    <div key={s.label} className="bg-background rounded-lg p-2 border border-border text-center">
                      <div className="text-lg font-black text-white">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* First/Last seen */}
                {profile.firstSeenAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>First seen: {new Date(profile.firstSeenAt).toLocaleDateString()}</span>
                    {profile.lastSeenAt && (
                      <span>· Last: {new Date(profile.lastSeenAt).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* Achievements */}
                {profile.achievements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Achievements ({profile.achievements.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {profile.achievements.slice(0, 8).map((ach: any) => {
                        const Icon = ICON_MAP[ach.iconType] ?? Trophy;
                        return (
                          <div
                            key={ach.key}
                            title={`${ach.name}: ${ach.description}`}
                            className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-help"
                          >
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                        );
                      })}
                      {profile.achievements.length > 8 && (
                        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground">+{profile.achievements.length - 8}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No data found for this viewer.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function Gamification() {
  const { data: streamer } = useGetMyStreamer();
  const streamerId = streamer?.id;

  const { data: activeSession } = useGetActiveSession();
  const sessionId = activeSession?.session?.id ?? null;

  const { data: myStats, isLoading: loadingMe } = useGetMyGamificationStats();
  const { data: achievements, isLoading: loadingAch } = useGetAchievements();
  const { data: claimStatus, refetch: refetchStatus } = useGetDailyClaimStatus();
  const { data: streamerLb, isLoading: loadingSlb } = useGetStreamerLeaderboard();
  const { data: luckyDropHistory, refetch: refetchDrops } = useGetLuckyDropHistory({ limit: 10 });

  const [lbPeriod, setLbPeriod] = useState<LbPeriod>("all-time");
  const [lbTab, setLbTab] = useState<LbTab>("viewers");
  const [achFilter, setAchFilter] = useState<"all" | "unlocked" | "locked">("all");

  const { data: leaderboard, isLoading: loadingLb } = useGetGamificationLeaderboard(
    streamerId ? { streamerId, period: lbPeriod } : undefined
  );

  const claimMutation = useClaimDailyReward();
  const triggerDrop = useTriggerLuckyDrop();
  const { toast } = useToast();

  const [activeDrop, setActiveDrop] = useState<null | {
    dropName: string; prizeDescription: string; xpReward: number;
    coinReward: number; winnerName: string;
  }>(null);

  const [fanProfile, setFanProfile] = useState<null | { tiktokViewerId: string; viewerName: string }>(null);
  const seenAchievementsRef = useRef<Set<string>>(new Set());
  const seenDropsRef = useRef<Set<number>>(new Set());

  // Socket events from live session
  const { recentXpAwards, achievementUnlocks, luckyDrops } = useLiveSession(sessionId);

  // Toast on achievement unlock
  useEffect(() => {
    for (const unlock of achievementUnlocks) {
      const key = `${unlock.viewerName}:${unlock.achievement.key}:${unlock.timestamp}`;
      if (seenAchievementsRef.current.has(key)) continue;
      seenAchievementsRef.current.add(key);
      const Icon = ICON_MAP[unlock.achievement.iconType] ?? Trophy;
      toast({
        title: `🏆 Achievement Unlocked!`,
        description: `${unlock.viewerName} earned "${unlock.achievement.name}": ${unlock.achievement.description}`,
        duration: 6000,
      });
    }
  }, [achievementUnlocks, toast]);

  // Overlay on lucky drop
  useEffect(() => {
    for (const drop of luckyDrops) {
      const key = drop.id ?? drop.timestamp;
      if (seenDropsRef.current.has(key)) continue;
      seenDropsRef.current.add(key);
      setActiveDrop({
        dropName: drop.dropName,
        prizeDescription: drop.prizeDescription,
        xpReward: drop.xpReward,
        coinReward: drop.coinReward,
        winnerName: drop.winnerName,
      });
      refetchDrops();
      break;
    }
  }, [luckyDrops, refetchDrops]);

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

  async function handleTriggerDrop() {
    try {
      const result = await triggerDrop.mutateAsync({ sessionId: sessionId ?? undefined });
      if (!result.ok) {
        toast({
          title: "No active viewers",
          description: "Viewers need to comment or interact first before a drop can fire.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `🎰 Lucky Drop fired!`,
          description: `Winner: ${result.winnerName} — ${result.dropName}`,
        });
        refetchDrops();
      }
    } catch {
      toast({ title: "Error", description: "Could not trigger lucky drop.", variant: "destructive" });
    }
  }

  return (
    <>
      {/* Lucky Drop Overlay */}
      {activeDrop && (
        <LuckyDropOverlay
          {...activeDrop}
          onDismiss={() => setActiveDrop(null)}
        />
      )}

      {/* Fan Profile Modal */}
      {fanProfile && (
        <FanProfileModal
          tiktokViewerId={fanProfile.tiktokViewerId}
          viewerName={fanProfile.viewerName}
          streamerId={streamerId}
          onClose={() => setFanProfile(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Gamification</h2>
            <p className="text-muted-foreground">Viewer levels, XP, leaderboards, achievements &amp; lucky drops.</p>
          </div>
          {sessionId && (
            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs animate-pulse">
              ● LIVE
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="md:col-span-2 space-y-6">
            {/* Your Progression */}
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

            {/* Real-time XP Feed */}
            {sessionId && recentXpAwards.length > 0 && (
              <Card className="bg-card border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Live XP Feed
                    <Badge variant="outline" className="text-[10px] h-4 border-green-500/50 text-green-400 ml-1">LIVE</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {recentXpAwards.slice(0, 12).map((award, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground shrink-0">
                            {EVENT_TYPE_LABELS[award.eventType] ?? award.eventType}
                          </span>
                          <span
                            className="text-white truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setFanProfile({ tiktokViewerId: award.tiktokViewerId, viewerName: award.viewerName })}
                          >
                            {award.viewerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-primary font-bold">+{award.xp} XP</span>
                          {award.coins > 0 && (
                            <span className="text-yellow-400">+{award.coins}🪙</span>
                          )}
                          <span className="text-muted-foreground">Lv.{award.level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">
            {/* Daily Reward */}
            <Card className="bg-gradient-to-b from-card to-background border-accent/20">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">Daily Bonus</CardTitle>
                <CardDescription>Claim 100 coins every day</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className={`w-20 h-20 my-3 rounded-full border-2 border-dashed flex items-center justify-center ${
                  claimStatus?.alreadyClaimed
                    ? "bg-muted border-muted-foreground"
                    : "bg-accent/20 border-accent animate-[pulse_3s_ease-in-out_infinite]"
                }`}>
                  <Gift className={`w-9 h-9 ${claimStatus?.alreadyClaimed ? "text-muted-foreground" : "text-accent"}`} />
                </div>
                <Button
                  className="w-full"
                  onClick={handleClaim}
                  disabled={claimStatus?.alreadyClaimed || claimMutation.isPending}
                  variant={claimStatus?.alreadyClaimed ? "outline" : "default"}
                  size="sm"
                >
                  {claimStatus?.alreadyClaimed ? "✓ Claimed Today" : claimMutation.isPending ? "Claiming..." : "Claim +100 Coins"}
                </Button>
                {claimStatus?.alreadyClaimed && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">Resets at midnight UTC</p>
                )}
              </CardContent>
            </Card>

            {/* Lucky Drops */}
            <Card className="bg-card border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Lucky Drops
                </CardTitle>
                <CardDescription className="text-xs">Random rewards for active viewers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Manual trigger */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs"
                  onClick={handleTriggerDrop}
                  disabled={triggerDrop.isPending}
                >
                  {triggerDrop.isPending ? "Firing..." : "🎰 Fire Lucky Drop Now"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Auto-fires every ~50 events · Large gifts trigger early
                </p>

                {/* Drop history */}
                <div className="space-y-1.5">
                  {(luckyDropHistory ?? []).slice(0, 5).map((drop: any) => {
                    const gradClass = getDropColor(drop.dropName);
                    return (
                      <div key={drop.id} className="flex items-center gap-2 p-2 rounded bg-background border border-border">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradClass} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {drop.winnerName ?? "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{drop.dropName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-primary">+{drop.xpReward}</p>
                          <p className="text-[10px] text-yellow-400">+{drop.coinReward}🪙</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!luckyDropHistory || luckyDropHistory.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No drops yet. Start streaming to activate!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="bg-card border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Leaderboard
                </CardTitle>
                {/* Tab row */}
                <div className="flex gap-1 mt-1 flex-wrap">
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
                {/* Period tabs — only for viewers */}
                {lbTab === "viewers" && (
                  <div className="flex gap-1 mt-1">
                    {(["daily", "weekly", "all-time"] as LbPeriod[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setLbPeriod(p)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors capitalize ${
                          lbPeriod === p
                            ? "bg-primary/20 border-primary/50 text-primary"
                            : "border-border text-muted-foreground hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-1.5">
                {lbTab === "viewers" ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Top viewers by XP · {lbPeriod === "daily" ? "today" : lbPeriod === "weekly" ? "this week" : "all time"}
                    </p>
                    {loadingLb
                      ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                      : (leaderboard ?? []).slice(0, 10).map((entry) => (
                          <button
                            key={entry.tiktokViewerId}
                            onClick={() => setFanProfile({ tiktokViewerId: entry.tiktokViewerId, viewerName: entry.viewerName })}
                            className="w-full flex items-center gap-2 p-2 rounded bg-background border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
                          >
                            <span className={`font-black text-sm w-5 text-center shrink-0 ${
                              entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-slate-300" : entry.rank === 3 ? "text-amber-600" : "text-muted-foreground"
                            }`}>{entry.rank}</span>
                            {entry.rank <= 3 && <Crown className={`w-3 h-3 shrink-0 ${entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-slate-300" : "text-amber-600"}`} />}
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {entry.level}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white truncate group-hover:text-primary transition-colors">{entry.viewerName}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-primary">{entry.totalXp.toLocaleString()} XP</p>
                              {entry.totalGifts > 0 && (
                                <p className="text-[10px] text-muted-foreground">{entry.totalGifts} gifts</p>
                              )}
                            </div>
                            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
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
                              <p className="text-xs text-white truncate">{entry.streamerName}</p>
                              <p className="text-[10px] text-muted-foreground">{entry.uniqueViewers} viewers · {entry.totalGiftsReceived} gifts</p>
                            </div>
                            <span className="text-xs font-bold text-accent shrink-0">{entry.totalXpAwarded.toLocaleString()}</span>
                          </div>
                        ))}
                    {(!streamerLb || streamerLb.length === 0) && !loadingSlb && (
                      <p className="text-sm text-muted-foreground text-center py-4">No streamers ranked yet.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
