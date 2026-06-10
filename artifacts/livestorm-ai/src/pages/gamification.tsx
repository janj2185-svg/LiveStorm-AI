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
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero, GradientText, RankBadge, ProgressRing, AnimatedCounter } from "@/components/ui/premium";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `twinkle 1s ease-in-out ${Math.random() * 2}s infinite`,
                  }}
                />
              ))}
            </div>
            <button onClick={onDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-white">
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
        <div className="rounded-2xl border border-violet-500/25 bg-card shadow-[0_0_40px_rgba(124,58,237,0.2)] overflow-hidden">
          <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06]">
            <div>
              <p className="text-lg font-bold text-white">{viewerName}</p>
              <p className="text-xs font-mono text-muted-foreground/50 truncate max-w-[200px]">{tiktokViewerId}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-white mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}
              </div>
            ) : profile ? (
              <>
                {/* Level + XP */}
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-violet-500/[0.06] border border-violet-500/20">
                  <ProgressRing value={xpProgress} max={100} size={64} strokeWidth={5} colorClass="stroke-violet-500">
                    <div className="text-center">
                      <div className="text-sm font-black text-white leading-none">{level}</div>
                    </div>
                  </ProgressRing>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-xl font-black text-white">Lv. {level}</span>
                      <span className="text-xs text-violet-400 font-medium">{getLevelTitle(level)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        style={{ width: `${xpProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{xp.toLocaleString()} XP</p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "🪙 Coins", value: profile.totalCoins.toLocaleString() },
                    { label: "🎁 Gifts", value: profile.giftCount },
                    { label: "💬 Comments", value: profile.commentCount },
                    { label: "❤️ Likes", value: profile.likeCount },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                      <div className="text-xl font-black text-white">{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* First/Last seen */}
                {profile.firstSeenAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>First seen: {new Date(profile.firstSeenAt).toLocaleDateString()}</span>
                    {profile.lastSeenAt && <span>· Last: {new Date(profile.lastSeenAt).toLocaleDateString()}</span>}
                  </div>
                )}

                {/* Achievements */}
                {profile.achievements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Achievements ({profile.achievements.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.achievements.slice(0, 8).map((ach: any) => {
                        const Icon = ICON_MAP[ach.iconType] ?? Trophy;
                        return (
                          <div
                            key={ach.key}
                            title={`${ach.name}: ${ach.description}`}
                            className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center cursor-help hover:scale-110 transition-transform"
                          >
                            <Icon className="w-4 h-4 text-violet-400" />
                          </div>
                        );
                      })}
                      {profile.achievements.length > 8 && (
                        <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground">+{profile.achievements.length - 8}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data found for this viewer.</p>
            )}
          </div>
        </div>
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

  const { data: leaderboard, isLoading: loadingLb, refetch: refetchLeaderboard } = useGetGamificationLeaderboard(
    streamerId
      ? { streamerId, period: lbPeriod, ...(sessionId ? { sessionId } : {}) }
      : undefined
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

  const { recentXpAwards, achievementUnlocks, luckyDrops, leaderboardVersion } = useLiveSession(sessionId);

  useEffect(() => {
    if (leaderboardVersion > 0) refetchLeaderboard();
  }, [leaderboardVersion]);

  useEffect(() => {
    for (const unlock of achievementUnlocks) {
      const key = `${unlock.viewerName}:${unlock.achievement.key}:${unlock.timestamp}`;
      if (seenAchievementsRef.current.has(key)) continue;
      seenAchievementsRef.current.add(key);
      toast({
        title: `🏆 Achievement Unlocked!`,
        description: `${unlock.viewerName} earned "${unlock.achievement.name}": ${unlock.achievement.description}`,
        duration: 6000,
      });
    }
  }, [achievementUnlocks, toast]);

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
      {activeDrop && (
        <LuckyDropOverlay {...activeDrop} onDismiss={() => setActiveDrop(null)} />
      )}
      {fanProfile && (
        <FanProfileModal
          tiktokViewerId={fanProfile.tiktokViewerId}
          viewerName={fanProfile.viewerName}
          streamerId={streamerId}
          onClose={() => setFanProfile(null)}
        />
      )}

      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Hero */}
        <PageHero
          gradientFrom="rgba(234,179,8,0.14)"
          gradientTo="rgba(124,58,237,0.08)"
          icon={
            <div className="p-3 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
              <Trophy className="h-8 w-8 text-yellow-400" />
            </div>
          }
          title={<span>Gamification <GradientText from="from-yellow-400" to="to-violet-400">Hub</GradientText></span>}
          subtitle="Viewer XP, levels, leaderboards, achievements & lucky drops — all in real time."
          right={
            sessionId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <span className="text-xs font-bold text-green-300">LIVE</span>
              </div>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* ── LEFT COLUMN ── */}
          <div className="md:col-span-2 space-y-5">

            {/* Your Progression */}
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] to-transparent overflow-hidden shadow-lg shadow-violet-500/5 relative">
              <div className="absolute right-0 top-0 w-40 h-40 bg-violet-500/10 blur-3xl pointer-events-none rounded-full" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 rounded-lg bg-yellow-500/15">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <span className="font-semibold text-white">Your Progression</span>
                </div>
                {loadingMe ? (
                  <Skeleton className="h-20 w-full bg-white/5" />
                ) : (
                  <div className="flex items-center gap-6">
                    <ProgressRing value={xpProgress} max={100} size={88} strokeWidth={7} colorClass="stroke-violet-500">
                      <div className="text-center">
                        <div className="text-base font-black text-white leading-none">{myLevel}</div>
                        <div className="text-[9px] text-muted-foreground">LVL</div>
                      </div>
                    </ProgressRing>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-end justify-between mb-1.5">
                        <div>
                          <span className="text-3xl font-black text-white">Lv. {myLevel}</span>
                          <span className="text-sm text-violet-300 ml-2">{getLevelTitle(myLevel)}</span>
                        </div>
                        {myRank && (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                            Rank #{myRank}
                          </span>
                        )}
                      </div>
                      <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.06] mb-2">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
                          style={{ width: `${xpProgress}%`, boxShadow: "0 0 10px rgba(139,92,246,0.5)" }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="text-violet-300 font-medium">{myXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                        <span>🪙 {(myStats?.totalCoins ?? 0).toLocaleString()}</span>
                        <span>🎁 {myStats?.totalGifts ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time XP Feed */}
            {sessionId && recentXpAwards.length > 0 && (
              <div className="rounded-2xl border border-green-500/15 bg-gradient-to-b from-green-500/[0.04] to-transparent overflow-hidden">
                <div className="px-4 py-3.5 border-b border-green-500/10 flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-yellow-500/15">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="font-semibold text-white text-sm">Live XP Feed</span>
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="divide-y divide-white/[0.03] max-h-44 overflow-y-auto">
                  {recentXpAwards.slice(0, 12).map((award, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <span className="text-xs text-muted-foreground shrink-0 w-20">
                        {EVENT_TYPE_LABELS[award.eventType] ?? award.eventType}
                      </span>
                      <span
                        className="text-white text-sm truncate flex-1 cursor-pointer hover:text-violet-300 transition-colors"
                        onClick={() => setFanProfile({ tiktokViewerId: award.tiktokViewerId, viewerName: award.viewerName })}
                      >
                        {award.viewerName}
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-violet-400 font-black text-sm">+{award.xp} XP</span>
                        {award.coins > 0 && <span className="text-yellow-400 text-xs font-bold">+{award.coins}🪙</span>}
                        <span className="text-xs text-muted-foreground/60 bg-white/[0.04] px-1.5 py-0.5 rounded-full">Lv.{award.level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/15">
                    <Medal className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Achievements</p>
                    <p className="text-xs text-muted-foreground">
                      {achievements
                        ? `${achievements.filter(a => a.unlocked).length} / ${achievements.length} unlocked`
                        : "Loading…"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
                  {(["all", "unlocked", "locked"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAchFilter(f)}
                      className={cn(
                        "text-xs px-3 py-1 rounded-md font-medium capitalize transition-all",
                        achFilter === f
                          ? "bg-violet-500/20 text-violet-300"
                          : "text-muted-foreground hover:text-white",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {loadingAch ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {filteredAch.map((ach) => {
                      const Icon = ICON_MAP[ach.iconType] ?? Trophy;
                      return (
                        <motion.div
                          key={ach.key}
                          layout
                          className={cn(
                            "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                            ach.unlocked
                              ? "border-violet-500/25 bg-violet-500/[0.06] hover:bg-violet-500/[0.1]"
                              : "border-white/[0.05] bg-white/[0.01] opacity-40 grayscale",
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            ach.unlocked ? "bg-violet-500/20 border border-violet-500/25" : "bg-white/[0.05]",
                          )}>
                            <Icon className={cn("w-5 h-5", ach.unlocked ? "text-violet-400" : "text-muted-foreground/30")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white truncate">{ach.name}</p>
                              {ach.unlocked && <span className="text-[10px] text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded-full shrink-0">✓</span>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{ach.description}</p>
                            <p className="text-xs text-yellow-500/80 mt-0.5">+{ach.xpReward} XP · +{ach.coinReward} coins</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    {filteredAch.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-10">
                        <Medal className="w-10 h-10 mx-auto mb-2 opacity-15" />
                        No achievements in this category yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">

            {/* Daily Reward */}
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.06] to-transparent overflow-hidden">
              <div className="px-4 py-3.5 border-b border-cyan-500/10 text-center">
                <p className="font-semibold text-white text-sm">Daily Bonus</p>
                <p className="text-xs text-muted-foreground">Claim 100 coins every day</p>
              </div>
              <div className="p-5 flex flex-col items-center gap-4">
                <div className={cn(
                  "w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all",
                  claimStatus?.alreadyClaimed
                    ? "bg-white/[0.03] border-white/10"
                    : "bg-cyan-500/15 border-cyan-400/40 shadow-lg shadow-cyan-500/10",
                  !claimStatus?.alreadyClaimed && "animate-[pulse_3s_ease-in-out_infinite]",
                )}>
                  <Gift className={cn("w-9 h-9", claimStatus?.alreadyClaimed ? "text-muted-foreground/40" : "text-cyan-400")} />
                </div>
                <Button
                  className={cn(
                    "w-full font-bold",
                    !claimStatus?.alreadyClaimed && "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/20",
                  )}
                  onClick={handleClaim}
                  disabled={claimStatus?.alreadyClaimed || claimMutation.isPending}
                  variant={claimStatus?.alreadyClaimed ? "outline" : "default"}
                  size="sm"
                >
                  {claimStatus?.alreadyClaimed ? "✓ Claimed Today" : claimMutation.isPending ? "Claiming…" : "🪙 Claim +100 Coins"}
                </Button>
                {claimStatus?.alreadyClaimed && (
                  <p className="text-xs text-muted-foreground text-center">Resets at midnight UTC</p>
                )}
              </div>
            </div>

            {/* Lucky Drops */}
            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-yellow-500/[0.05] to-transparent overflow-hidden">
              <div className="px-4 py-3.5 border-b border-yellow-500/10 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-yellow-500/15">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Lucky Drops</p>
                  <p className="text-xs text-muted-foreground">Random rewards for active viewers</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 font-bold"
                  onClick={handleTriggerDrop}
                  disabled={triggerDrop.isPending}
                >
                  {triggerDrop.isPending ? "Firing…" : "🎰 Fire Lucky Drop Now"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Auto-fires every ~50 events · Large gifts trigger early
                </p>
                <div className="space-y-2">
                  {(luckyDropHistory ?? []).slice(0, 5).map((drop: any) => {
                    const gradClass = getDropColor(drop.dropName);
                    return (
                      <div key={drop.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradClass} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{drop.winnerName ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{drop.dropName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-violet-400">+{drop.xpReward}</p>
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
              </div>
            </div>

            {/* Leaderboard */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/15">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="font-semibold text-white text-sm">Leaderboard</span>
                </div>
                <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1 mb-2">
                  {(["viewers", "streamers"] as LbTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLbTab(tab)}
                      className={cn(
                        "flex-1 text-xs py-1 rounded-md font-medium capitalize transition-all",
                        lbTab === tab ? "bg-amber-500/20 text-amber-300" : "text-muted-foreground hover:text-white",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {lbTab === "viewers" && (
                  <div className="flex gap-1">
                    {(["daily", "weekly", "all-time"] as LbPeriod[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setLbPeriod(p)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border transition-colors capitalize",
                          lbPeriod === p
                            ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                            : "border-white/10 text-muted-foreground hover:text-white",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
                {lbTab === "viewers" ? (
                  loadingLb
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl bg-white/5" />)
                    : (leaderboard ?? []).slice(0, 10).map((entry) => (
                        <button
                          key={entry.tiktokViewerId}
                          onClick={() => setFanProfile({ tiktokViewerId: entry.tiktokViewerId, viewerName: entry.viewerName })}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:border-violet-500/25 hover:bg-violet-500/[0.05] transition-all text-left group"
                        >
                          <RankBadge rank={entry.rank} />
                          <div className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/15 flex items-center justify-center text-[10px] font-black text-violet-300 shrink-0">
                            {entry.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate group-hover:text-violet-300 transition-colors">{entry.viewerName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-violet-400">{entry.totalXp.toLocaleString()}</p>
                            {entry.totalGifts > 0 && <p className="text-[10px] text-muted-foreground">{entry.totalGifts} gifts</p>}
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))
                ) : (
                  loadingSlb
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl bg-white/5" />)
                    : (streamerLb ?? []).slice(0, 8).map((entry) => (
                        <div key={entry.streamerId} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                          <RankBadge rank={entry.rank} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{entry.streamerName}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.uniqueViewers} viewers · {entry.totalGiftsReceived} gifts</p>
                          </div>
                          <span className="text-xs font-black text-cyan-400 shrink-0">{entry.totalXpAwarded.toLocaleString()}</span>
                        </div>
                      ))
                )}
                {lbTab === "viewers" && (!leaderboard || leaderboard.length === 0) && !loadingLb && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {streamerId ? "No viewers ranked yet. Go live to earn XP!" : "Start streaming to see viewer rankings."}
                  </p>
                )}
                {lbTab === "streamers" && (!streamerLb || streamerLb.length === 0) && !loadingSlb && (
                  <p className="text-sm text-muted-foreground text-center py-6">No streamers ranked yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
