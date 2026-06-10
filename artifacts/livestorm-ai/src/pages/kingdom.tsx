import {
  useGetMyKingdom,
  useGetKingdoms,
  useUpgradeKingdomBuilding,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Castle, Pickaxe, Hammer, Coins, Globe, TrendingUp, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageHero, AnimatedCounter, GradientText, ProgressRing, RankBadge } from "@/components/ui/premium";

const BUILDINGS_CATALOG = [
  { type: "Tavern",    emoji: "🍺", desc: "Welcomes viewers",  goldRequired: 100,  woodRequired: 50,   stoneRequired: 0,    accent: "amber"  },
  { type: "Farm",      emoji: "🌾", desc: "Generates wood",    goldRequired: 300,  woodRequired: 0,    stoneRequired: 100,  accent: "green"  },
  { type: "Barracks",  emoji: "⚔️", desc: "Trains fighters",   goldRequired: 600,  woodRequired: 200,  stoneRequired: 200,  accent: "red"    },
  { type: "Market",    emoji: "🏪", desc: "Boosts resources",  goldRequired: 1000, woodRequired: 400,  stoneRequired: 200,  accent: "blue"   },
  { type: "Castle",    emoji: "🏰", desc: "Kingdom HQ",        goldRequired: 2000, woodRequired: 800,  stoneRequired: 600,  accent: "purple" },
  { type: "Cathedral", emoji: "⛪", desc: "Spiritual power",   goldRequired: 5000, woodRequired: 1500, stoneRequired: 1500, accent: "yellow" },
  { type: "Library",   emoji: "📚", desc: "+XP multiplier",    goldRequired: 800,  woodRequired: 600,  stoneRequired: 0,    accent: "cyan"   },
  { type: "Forge",     emoji: "⚒️", desc: "Crafts weapons",    goldRequired: 1500, woodRequired: 300,  stoneRequired: 1000, accent: "orange" },
];

const ACCENT_STYLES: Record<string, { border: string; bg: string; text: string; glow: string; ring: string }> = {
  amber:  { border: "border-amber-500/25",  bg: "bg-amber-500/8",   text: "text-amber-400",  glow: "shadow-amber-500/15",  ring: "stroke-amber-400"  },
  green:  { border: "border-green-500/25",  bg: "bg-green-500/8",   text: "text-green-400",  glow: "shadow-green-500/15",  ring: "stroke-green-400"  },
  red:    { border: "border-red-500/25",    bg: "bg-red-500/8",     text: "text-red-400",    glow: "shadow-red-500/15",    ring: "stroke-red-400"    },
  blue:   { border: "border-blue-500/25",   bg: "bg-blue-500/8",    text: "text-blue-400",   glow: "shadow-blue-500/15",   ring: "stroke-blue-400"   },
  purple: { border: "border-violet-500/25", bg: "bg-violet-500/8",  text: "text-violet-400", glow: "shadow-violet-500/15", ring: "stroke-violet-400" },
  yellow: { border: "border-yellow-500/25", bg: "bg-yellow-500/8",  text: "text-yellow-400", glow: "shadow-yellow-500/15", ring: "stroke-yellow-400" },
  cyan:   { border: "border-cyan-500/25",   bg: "bg-cyan-500/8",    text: "text-cyan-400",   glow: "shadow-cyan-500/15",   ring: "stroke-cyan-400"   },
  orange: { border: "border-orange-500/25", bg: "bg-orange-500/8",  text: "text-orange-400", glow: "shadow-orange-500/15", ring: "stroke-orange-400" },
};

export function Kingdom() {
  const { data: kingdom, isLoading, refetch } = useGetMyKingdom();
  const { data: allKingdoms } = useGetKingdoms();
  const upgradeMutation = useUpgradeKingdomBuilding();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const gold  = kingdom?.gold  ?? 0;
  const wood  = kingdom?.wood  ?? 0;
  const stone = kingdom?.stone ?? 0;

  const buildingLevels = new Map<string, number>(
    ((kingdom as any)?.buildings ?? []).map((b: { buildingType: string; level: number }) => [b.buildingType, b.level])
  );

  function isUnlocked(b: typeof BUILDINGS_CATALOG[0]) {
    return gold >= b.goldRequired && wood >= b.woodRequired && stone >= b.stoneRequired;
  }

  function upgradeCost(b: typeof BUILDINGS_CATALOG[0]) {
    const currentLevel = buildingLevels.get(b.type) ?? 1;
    return { gold: b.goldRequired * currentLevel, wood: b.woodRequired * currentLevel, stone: b.stoneRequired * currentLevel, level: currentLevel };
  }

  function canAffordUpgrade(b: typeof BUILDINGS_CATALOG[0]) {
    const cost = upgradeCost(b);
    return gold >= cost.gold && wood >= cost.wood && stone >= cost.stone;
  }

  async function handleUpgrade(buildingType: string) {
    setUpgrading(buildingType);
    try {
      const result = await upgradeMutation.mutateAsync({ type: buildingType });
      toast({ title: `${buildingType} upgraded to Level ${result.building.level}!`, description: `Spent ${result.goldSpent}g / ${result.woodSpent}w / ${result.stoneSpent}s` });
      refetch();
    } catch (err: any) {
      toast({ title: "Upgrade failed", description: err?.response?.data?.error ?? "Upgrade failed", variant: "destructive" });
    } finally {
      setUpgrading(null);
    }
  }

  const unlockedCount = BUILDINGS_CATALOG.filter(isUnlocked).length;
  const kingdomLevel = Math.max(1, unlockedCount);
  const nextBuilding = BUILDINGS_CATALOG[Math.min(unlockedCount, BUILDINGS_CATALOG.length - 1)];
  const progressToNext = Math.min(100, (gold / nextBuilding.goldRequired) * 100);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Hero */}
      <PageHero
        gradientFrom="rgba(234,179,8,0.14)"
        gradientTo="rgba(124,58,237,0.08)"
        icon={
          <div className="p-3 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
            <Castle className="h-8 w-8 text-yellow-400" />
          </div>
        }
        title={
          <span>
            Your{" "}
            <GradientText from="from-yellow-400" to="to-amber-500">Kingdom</GradientText>
          </span>
        }
        subtitle="Build your empire through viewer gifts and engagement. Every interaction grows your realm."
        right={
          <div className="flex flex-col items-end gap-2">
            <ProgressRing value={unlockedCount} max={BUILDINGS_CATALOG.length} size={72} strokeWidth={6} colorClass="stroke-yellow-400">
              <div className="text-center">
                <div className="text-sm font-black text-white leading-none">{kingdomLevel}</div>
                <div className="text-[9px] text-muted-foreground">LVL</div>
              </div>
            </ProgressRing>
            <span className="text-xs text-muted-foreground">{unlockedCount}/{BUILDINGS_CATALOG.length} built</span>
          </div>
        }
      />

      {/* Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Gold",  value: gold,  icon: <Coins className="w-6 h-6" />,   from: "from-yellow-300", to: "to-amber-500",   iconBg: "bg-yellow-500/15", iconColor: "text-yellow-400", border: "border-yellow-500/20", glow: "shadow-yellow-500/10", sub: "From viewer gifts" },
          { label: "Wood",  value: wood,  icon: <Pickaxe className="w-6 h-6" />, from: "from-green-300",  to: "to-emerald-500", iconBg: "bg-green-500/15",  iconColor: "text-green-400",  border: "border-green-500/20",  glow: "shadow-green-500/10",  sub: "From viewer likes" },
          { label: "Stone", value: stone, icon: <Hammer className="w-6 h-6" />,  from: "from-slate-300",  to: "to-slate-500",   iconBg: "bg-slate-500/15",  iconColor: "text-slate-300",  border: "border-slate-500/20",  glow: "shadow-slate-500/10",  sub: "From viewer follows" },
        ].map((r) => (
          <div key={r.label} className={cn("rounded-2xl border p-5 bg-white/[0.02] shadow-lg", r.border, r.glow)}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", r.iconBg)}>
                <span className={r.iconColor}>{r.icon}</span>
              </div>
              <span className={cn("text-xs font-bold uppercase tracking-widest", r.iconColor)}>{r.label}</span>
            </div>
            <div className="text-4xl font-black text-white tabular-nums mb-1">
              {isLoading ? <Skeleton className="h-10 w-24 bg-white/5" /> : <AnimatedCounter target={r.value} />}
            </div>
            <p className="text-xs text-muted-foreground">{r.sub}</p>
          </div>
        ))}
      </div>

      {/* Kingdom Progress */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.06] to-transparent p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-white">{unlockedCount} / {BUILDINGS_CATALOG.length} buildings unlocked</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Next: <span className="text-white font-medium">{nextBuilding.emoji} {nextBuilding.type}</span>
              {" — needs "}{nextBuilding.goldRequired.toLocaleString()} Gold
              {nextBuilding.woodRequired > 0 && `, ${nextBuilding.woodRequired.toLocaleString()} Wood`}
              {nextBuilding.stoneRequired > 0 && `, ${nextBuilding.stoneRequired.toLocaleString()} Stone`}
            </p>
          </div>
          <span className="text-violet-400 font-black text-lg">{Math.round(progressToNext)}%</span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.05] border border-white/[0.06]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${progressToNext}%`, boxShadow: "0 0 12px rgba(139,92,246,0.5)" }}
          />
        </div>
      </div>

      {/* Buildings Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Castle className="w-5 h-5 text-violet-400" />
          Buildings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUILDINGS_CATALOG.map((b, i) => {
            const unlocked = isUnlocked(b);
            const dbLevel  = buildingLevels.get(b.type) ?? (unlocked ? 1 : 0);
            const cost     = upgradeCost(b);
            const canUpg   = unlocked && canAffordUpgrade(b);
            const isUpg    = upgrading === b.type;
            const s        = ACCENT_STYLES[b.accent] ?? ACCENT_STYLES.amber;

            return (
              <motion.div
                key={b.type}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "rounded-2xl border p-5 transition-all duration-300",
                  unlocked
                    ? cn(s.border, s.bg, `shadow-lg ${s.glow}`, "hover:scale-[1.02]")
                    : "border-white/[0.05] bg-white/[0.01] opacity-50 grayscale",
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{b.emoji}</span>
                  {unlocked ? (
                    <Badge className={cn("text-xs font-bold border-0", s.bg, s.text)}>
                      Lv. {dbLevel}
                    </Badge>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-white/[0.05]">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                <p className="font-bold text-white text-sm mb-0.5">{b.type}</p>
                <p className="text-xs text-muted-foreground mb-3">{b.desc}</p>

                {/* Requirements */}
                <div className="space-y-1 mb-3">
                  {b.goldRequired > 0 && (
                    <div className={cn("flex items-center gap-1.5 text-xs", gold >= b.goldRequired ? "text-green-400" : "text-muted-foreground/60")}>
                      <Coins className="w-3 h-3 shrink-0" />
                      <span>{b.goldRequired.toLocaleString()}g {gold >= b.goldRequired ? "✓" : `(${Math.max(0, b.goldRequired - gold).toLocaleString()} needed)`}</span>
                    </div>
                  )}
                  {b.woodRequired > 0 && (
                    <div className={cn("flex items-center gap-1.5 text-xs", wood >= b.woodRequired ? "text-green-400" : "text-muted-foreground/60")}>
                      <Pickaxe className="w-3 h-3 shrink-0" />
                      <span>{b.woodRequired.toLocaleString()}w {wood >= b.woodRequired ? "✓" : `(${Math.max(0, b.woodRequired - wood).toLocaleString()} needed)`}</span>
                    </div>
                  )}
                  {b.stoneRequired > 0 && (
                    <div className={cn("flex items-center gap-1.5 text-xs", stone >= b.stoneRequired ? "text-green-400" : "text-muted-foreground/60")}>
                      <Hammer className="w-3 h-3 shrink-0" />
                      <span>{b.stoneRequired.toLocaleString()}s {stone >= b.stoneRequired ? "✓" : `(${Math.max(0, b.stoneRequired - stone).toLocaleString()} needed)`}</span>
                    </div>
                  )}
                </div>

                {unlocked && (
                  <Button
                    size="sm"
                    className={cn(
                      "w-full h-8 text-xs font-bold transition-all",
                      canUpg
                        ? cn("bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-md shadow-violet-500/20")
                        : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06]",
                    )}
                    disabled={!canUpg || isUpg}
                    onClick={() => handleUpgrade(b.type)}
                  >
                    <TrendingUp className="w-3 h-3 mr-1.5" />
                    {isUpg
                      ? "Upgrading…"
                      : canUpg
                      ? `Upgrade → Lv.${dbLevel + 1}`
                      : `Need ${cost.gold}g${cost.wood > 0 ? ` / ${cost.wood}w` : ""}${cost.stone > 0 ? ` / ${cost.stone}s` : ""}`}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Global Realms */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/15">
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Global Realms</p>
            <p className="text-xs text-muted-foreground">Other kingdoms around the world</p>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(allKingdoms ?? []).slice(0, 6).map((k, i) => (
              <div key={k.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                <RankBadge rank={i + 1} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{k.name}</p>
                  <p className="text-xs text-muted-foreground">🪙 {k.gold.toLocaleString()} gold</p>
                </div>
                <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground shrink-0">Lv. {k.level}</Badge>
              </div>
            ))}
            {(!allKingdoms || allKingdoms.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6 col-span-3">No other realms discovered yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
