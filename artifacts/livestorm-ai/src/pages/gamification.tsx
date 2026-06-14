import { useState, useEffect, useRef } from "react";
import {
  useGetGamificationLeaderboard,
  useGetAchievements,
  useGetDailyClaimStatus,
  useClaimDailyReward,
  useGetMyStreamer,
  useGetMyGamificationStats,
  useGetStreamerLeaderboard,
  useGetLuckyDropHistory,
  useTriggerLuckyDrop,
  useGetViewerProfile,
} from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";
import {
  Trophy, Star, Medal, Zap, Gift, Heart, Shield, Sword, Target,
  TrendingUp, Users, MessageCircle, Map, Brain, Circle, Flame, Home,
  X, Sparkles, Crown, ChevronRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RankBadge, ProgressRing, AnimatedCounter } from "@/components/ui/premium";

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
              <p className="text-xs font-mono text-muted-foreground/65 truncate max-w-[200px]">{tiktokViewerId}</p>
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

  const { recentXpAwards, achievementUnlocks, luckyDrops, leaderboardVersion, activeSessionId } = useLiveSessionContext();
  const sessionId = activeSessionId ?? null;

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
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url('/gifts-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
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

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-400/50 mb-0.5">XP System</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Gamification</h1>
            <p className="text-sm text-white/72 mt-0.5">Viewer XP · Levels · Achievements · Lucky Drops</p>
          </div>
          {sessionId && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <span className="text-xs font-bold text-green-300">LIVE</span>
            </div>
          )}
        </div>

        {/* ── QUICK STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Your Level",    value: myLevel,                           icon: <Star className="w-4 h-4" />,    iconBg: "bg-violet-500/15", color: "text-violet-300", suffix: ""         },
            { label: "Total XP",      value: myXp,                              icon: <Zap className="w-4 h-4" />,     iconBg: "bg-yellow-500/15", color: "text-yellow-300", suffix: ""         },
            { label: "Coins",         value: myStats?.totalCoins ?? 0,          icon: <Crown className="w-4 h-4" />,   iconBg: "bg-amber-500/15",  color: "text-amber-300",  suffix: ""         },
            { label: "Achievements",  value: (achievements ?? []).filter(a => a.unlocked).length, icon: <Medal className="w-4 h-4" />, iconBg: "bg-cyan-500/15", color: "text-cyan-300", suffix: `/${achievements?.length ?? "…"}` },
          ].map((s) => (
            <div key={s.label} className="ls-card-elevated p-4 relative overflow-hidden">
              <div className={cn("ls-icon-wrap p-1.5 w-9 h-9 mb-2.5", s.iconBg)}>
                <span className={s.color}>{s.icon}</span>
              </div>
              <p className="ls-stat text-xl">
                <AnimatedCounter target={s.value} /><span className="text-sm text-white/70">{s.suffix}</span>
              </p>
              <p className="ls-label mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* ── LEFT COLUMN ── */}
          <div className="md:col-span-2 space-y-5">

            {/* YOUR PROGRESSION */}
            <div className="rounded-2xl border border-violet-500/25 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(14,165,233,0.04) 100%)" }}>
              <div className="absolute right-0 top-0 w-48 h-48 bg-violet-500/10 blur-3xl pointer-events-none rounded-full" />
              <div className="absolute left-1/2 bottom-0 w-32 h-32 bg-cyan-500/8 blur-3xl pointer-events-none rounded-full" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-yellow-500/15">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <span className="ls-section">Your Progression</span>
                  </div>
                  {myRank && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25">
                      Rank #{myRank}
                    </span>
                  )}
                </div>
                {loadingMe ? (
                  <Skeleton className="h-24 w-full bg-white/5 rounded-xl" />
                ) : (
                  <div className="flex items-center gap-5">
                    <ProgressRing value={xpProgress} max={100} size={92} strokeWidth={6} colorClass="stroke-violet-500">
                      <div className="text-center">
                        <div className="text-lg font-black text-white leading-none">{myLevel}</div>
                        <div className="text-[9px] text-white/68 uppercase tracking-wider">LVL</div>
                      </div>
                    </ProgressRing>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-black text-white">Lv.{myLevel}</span>
                        <span className="text-sm font-semibold text-violet-300">{getLevelTitle(myLevel)}</span>
                      </div>
                      <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.07] mb-2">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          style={{ boxShadow: "0 0 12px rgba(139,92,246,0.6)" }}
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-violet-300">{myXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                        <span className="text-xs text-white/35">·</span>
                        <span className="text-xs text-amber-300">🪙 {(myStats?.totalCoins ?? 0).toLocaleString()}</span>
                        <span className="text-xs text-white/35">·</span>
                        <span className="text-xs text-pink-300">🎁 {myStats?.totalGifts ?? 0} gifts</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE XP FEED */}
            {sessionId && recentXpAwards.length > 0 && (
              <div className="rounded-2xl border border-green-500/15 overflow-hidden" style={{ background: "rgba(34,197,94,0.03)" }}>
                <div className="px-4 py-3 border-b border-green-500/10 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-yellow-500/15">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="ls-section">Live XP Feed</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="divide-y divide-white/[0.03] max-h-48 overflow-y-auto">
                  <AnimatePresence>
                    {recentXpAwards.slice(0, 12).map((award, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-xs text-white/68 shrink-0 w-[72px] truncate">
                          {EVENT_TYPE_LABELS[award.eventType] ?? award.eventType}
                        </span>
                        <span
                          className="text-white/70 text-xs truncate flex-1 cursor-pointer hover:text-violet-300 transition-colors"
                          onClick={() => setFanProfile({ tiktokViewerId: award.tiktokViewerId, viewerName: award.viewerName })}
                        >
                          {award.viewerName}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-violet-400 font-black text-xs">+{award.xp} XP</span>
                          {award.coins > 0 && <span className="text-yellow-400/80 text-[10px] font-bold">+{award.coins}🪙</span>}
                          <span className="text-[10px] text-white/68 bg-white/[0.04] px-1.5 py-0.5 rounded-full tabular-nums">Lv{award.level}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ACHIEVEMENTS */}
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/15">
                    <Medal className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="ls-section">Achievements</p>
                    <p className="text-[10px] text-white/55">
                      {achievements
                        ? `${achievements.filter(a => a.unlocked).length} / ${achievements.length} unlocked`
                        : "Loading…"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  {(["all", "unlocked", "locked"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAchFilter(f)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-all",
                        achFilter === f
                          ? "bg-violet-500/20 text-violet-300"
                          : "text-white/55 hover:text-white/72",
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {filteredAch.map((ach) => {
                      const Icon = ICON_MAP[ach.iconType] ?? Trophy;
                      return (
                        <motion.div
                          key={ach.key}
                          layout
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all relative overflow-hidden",
                            ach.unlocked
                              ? "border-violet-500/25 bg-violet-500/[0.07] hover:bg-violet-500/[0.12]"
                              : "border-white/[0.04] bg-white/[0.01] opacity-35 grayscale",
                          )}
                        >
                          {ach.unlocked && (
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
                          )}
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative",
                            ach.unlocked
                              ? "bg-violet-500/20 border border-violet-500/30 shadow-md shadow-violet-500/15"
                              : "bg-white/[0.04] border border-white/[0.06]",
                          )}>
                            <Icon className={cn("w-4 h-4", ach.unlocked ? "text-violet-300" : "text-white/38")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-xs font-bold text-white truncate">{ach.name}</p>
                              {ach.unlocked && <span className="text-[9px] text-violet-400 bg-violet-500/20 px-1 py-0.5 rounded shrink-0">✓</span>}
                            </div>
                            <p className="text-[10px] text-white/55 truncate">{ach.description}</p>
                            <p className="text-[10px] text-yellow-400/60 mt-0.5">+{ach.xpReward} XP · +{ach.coinReward}🪙</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    {filteredAch.length === 0 && (
                      <div className="col-span-2 text-center py-10">
                        <Medal className="w-10 h-10 mx-auto mb-2 text-white/10" />
                        <p className="text-sm text-white/68">No achievements in this category yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">

            {/* DAILY REWARD CHEST */}
            <div className="rounded-2xl border overflow-hidden relative" style={{
              background: "linear-gradient(160deg, rgba(14,165,233,0.08) 0%, rgba(6,182,212,0.04) 100%)",
              borderColor: claimStatus?.alreadyClaimed ? "rgba(255,255,255,0.07)" : "rgba(14,165,233,0.25)",
            }}>
              {!claimStatus?.alreadyClaimed && (
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
              )}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Gift className={cn("w-4 h-4 shrink-0", claimStatus?.alreadyClaimed ? "text-white/35" : "text-cyan-400")} />
                <div className="flex-1">
                  <p className="ls-section">Щоденний бонус</p>
                  <p className="text-[10px] text-white/70">+100 монет кожен день</p>
                </div>
              </div>
              <div className="p-5 flex flex-col items-center gap-4">
                <div className={cn(
                  "relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                  claimStatus?.alreadyClaimed
                    ? "bg-white/[0.03] border-2 border-dashed border-white/10"
                    : "border-2 border-cyan-400/40 bg-cyan-500/10",
                )}>
                  {!claimStatus?.alreadyClaimed && (
                    <>
                      <div className="absolute inset-0 rounded-2xl bg-cyan-500/10 animate-pulse" />
                      <div className="absolute -inset-1 rounded-2xl border border-cyan-400/20 animate-ping" style={{ animationDuration: "3s" }} />
                    </>
                  )}
                  <Gift className={cn("w-9 h-9 relative z-10", claimStatus?.alreadyClaimed ? "text-white/35" : "text-cyan-300")} />
                </div>
                {claimStatus?.alreadyClaimed ? (
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-white/65">✓ Вже отримано</p>
                    <p className="text-[10px] text-white/68">Скидається о опівночі UTC</p>
                  </div>
                ) : (
                  <Button
                    className="w-full font-bold bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 border-0"
                    onClick={handleClaim}
                    disabled={claimMutation.isPending}
                    size="sm"
                  >
                    {claimMutation.isPending ? "Claiming…" : "🪙 Отримати +100 монет"}
                  </Button>
                )}
              </div>
            </div>

            {/* LUCKY DROPS */}
            <div className="rounded-2xl border border-yellow-500/20 overflow-hidden" style={{ background: "rgba(234,179,8,0.04)" }}>
              <div className="px-4 py-3 border-b border-yellow-500/10 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-yellow-500/15">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="ls-section">Lucky Drops</p>
                  <p className="text-[10px] text-white/70">Рандомні нагороди для глядачів</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 font-bold hover:border-yellow-400/50 transition-all"
                  onClick={handleTriggerDrop}
                  disabled={triggerDrop.isPending}
                >
                  {triggerDrop.isPending ? "Firing…" : "🎰 Запустити Drop зараз"}
                </Button>
                <p className="text-[10px] text-white/68 text-center">Авто-спрацьовує кожні ~50 подій</p>

                {/* Tier legend */}
                <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                  {[
                    { name: "Common",    from: "from-slate-400",  to: "to-slate-500"  },
                    { name: "Rare",      from: "from-blue-400",   to: "to-cyan-500"   },
                    { name: "Epic",      from: "from-purple-400", to: "to-violet-500" },
                    { name: "Legendary", from: "from-yellow-400", to: "to-amber-500"  },
                  ].map((tier) => (
                    <div key={tier.name} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tier.from} ${tier.to} shrink-0`} />
                      <span className="text-[9px] text-white/48">{tier.name}</span>
                    </div>
                  ))}
                </div>

                {/* Drop history */}
                <div className="space-y-1.5">
                  {(luckyDropHistory ?? []).slice(0, 5).map((drop: any, i: number) => {
                    const gradClass = getDropColor(drop.dropName);
                    const isLegendary = drop.dropName.includes("Legendary");
                    return (
                      <motion.div
                        key={drop.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all",
                          isLegendary
                            ? "border-yellow-500/25 bg-yellow-500/[0.06]"
                            : "border-white/[0.05] bg-white/[0.02]",
                        )}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${gradClass} shrink-0 shadow-sm`}
                          style={{ boxShadow: isLegendary ? "0 0 6px rgba(251,191,36,0.5)" : undefined }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{drop.winnerName ?? "—"}</p>
                          <p className="text-[10px] text-white/55 truncate">{drop.dropName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-violet-400">+{drop.xpReward} XP</p>
                          <p className="text-[10px] text-yellow-400">+{drop.coinReward}🪙</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  {(!luckyDropHistory || luckyDropHistory.length === 0) && (
                    <div className="text-center py-5">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-white/10" />
                      <p className="text-xs text-white/68">Drops з'являться під час стриму</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LEADERBOARD */}
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="px-4 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/15">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="ls-section">Leaderboard</span>
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.05] mb-2">
                  {(["viewers", "streamers"] as LbTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLbTab(tab)}
                      className={cn(
                        "flex-1 text-xs py-1.5 rounded-md font-semibold capitalize transition-all",
                        lbTab === tab ? "bg-amber-500/20 text-amber-300" : "text-white/65 hover:text-white/85",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {lbTab === "viewers" && (
                  <div className="flex gap-1 flex-wrap">
                    {(["daily", "weekly", "all-time"] as LbPeriod[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setLbPeriod(p)}
                        className={cn(
                          "text-[10px] px-2.5 py-1 rounded-full border transition-all capitalize font-medium",
                          lbPeriod === p
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "border-white/[0.08] text-white/50 hover:text-white/72",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-2.5 space-y-1 max-h-80 overflow-y-auto">
                {lbTab === "viewers" ? (
                  loadingLb
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl bg-white/5" />)
                    : (leaderboard ?? []).slice(0, 10).map((entry, i) => (
                        <button
                          key={entry.tiktokViewerId}
                          onClick={() => setFanProfile({ tiktokViewerId: entry.tiktokViewerId, viewerName: entry.viewerName })}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.04] hover:border-violet-500/25 hover:bg-violet-500/[0.06] transition-all text-left group"
                        >
                          <div className="w-6 text-center shrink-0">
                            {i === 0 ? <span className="text-sm">🥇</span> : i === 1 ? <span className="text-sm">🥈</span> : i === 2 ? <span className="text-sm">🥉</span> : <span className="text-[10px] text-white/50 tabular-nums">#{i + 1}</span>}
                          </div>
                          <div className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/15 flex items-center justify-center text-[10px] font-black text-violet-300 shrink-0 tabular-nums">
                            {entry.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/80 truncate group-hover:text-violet-300 transition-colors font-medium">{entry.viewerName}</p>
                            {entry.totalGifts > 0 && <p className="text-[10px] text-white/45 truncate">{entry.totalGifts} gifts</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-violet-400 tabular-nums">{entry.totalXp.toLocaleString()}</p>
                            <p className="text-[9px] text-white/45">XP</p>
                          </div>
                        </button>
                      ))
                ) : (
                  loadingSlb
                    ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl bg-white/5" />)
                    : (streamerLb ?? []).slice(0, 8).map((entry, i) => (
                        <div key={entry.streamerId} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                          <div className="w-6 text-center shrink-0">
                            {i === 0 ? <span className="text-sm">🥇</span> : i === 1 ? <span className="text-sm">🥈</span> : i === 2 ? <span className="text-sm">🥉</span> : <span className="text-[10px] text-white/50">#{i + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/80 truncate font-medium">{entry.streamerName}</p>
                            <p className="text-[10px] text-white/50">{entry.uniqueViewers} viewers · {entry.totalGiftsReceived} gifts</p>
                          </div>
                          <span className="text-xs font-black text-cyan-400 shrink-0 tabular-nums">{entry.totalXpAwarded.toLocaleString()}</span>
                        </div>
                      ))
                )}
                {lbTab === "viewers" && (!leaderboard || leaderboard.length === 0) && !loadingLb && (
                  <div className="py-8 text-center">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-white/10" />
                    <p className="text-xs text-white/55">
                      {streamerId ? "No viewers ranked yet. Go live to earn XP!" : "Start streaming to see rankings."}
                    </p>
                  </div>
                )}
                {lbTab === "streamers" && (!streamerLb || streamerLb.length === 0) && !loadingSlb && (
                  <div className="py-8 text-center">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-white/10" />
                    <p className="text-xs text-white/55">No streamers ranked yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
