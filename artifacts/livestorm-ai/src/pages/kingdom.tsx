import {
  useGetMyKingdom,
  useGetKingdoms,
  useUpgradeKingdomBuilding,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Castle, Pickaxe, Hammer, Coins, Globe, TrendingUp } from "lucide-react";
import { useState } from "react";

const BUILDINGS_CATALOG = [
  { type: "Tavern",    emoji: "🍺", desc: "Welcomes viewers",  goldRequired: 100,  woodRequired: 50,   stoneRequired: 0,    color: "border-amber-500/30 bg-amber-500/5" },
  { type: "Farm",      emoji: "🌾", desc: "Generates wood",    goldRequired: 300,  woodRequired: 0,    stoneRequired: 100,  color: "border-green-500/30 bg-green-500/5" },
  { type: "Barracks",  emoji: "⚔️", desc: "Trains fighters",   goldRequired: 600,  woodRequired: 200,  stoneRequired: 200,  color: "border-red-500/30 bg-red-500/5" },
  { type: "Market",    emoji: "🏪", desc: "Boosts resources",  goldRequired: 1000, woodRequired: 400,  stoneRequired: 200,  color: "border-blue-500/30 bg-blue-500/5" },
  { type: "Castle",    emoji: "🏰", desc: "Kingdom HQ",        goldRequired: 2000, woodRequired: 800,  stoneRequired: 600,  color: "border-purple-500/30 bg-purple-500/5" },
  { type: "Cathedral", emoji: "⛪", desc: "Spiritual power",   goldRequired: 5000, woodRequired: 1500, stoneRequired: 1500, color: "border-yellow-500/30 bg-yellow-500/5" },
  { type: "Library",   emoji: "📚", desc: "+XP multiplier",    goldRequired: 800,  woodRequired: 600,  stoneRequired: 0,    color: "border-cyan-500/30 bg-cyan-500/5" },
  { type: "Forge",     emoji: "⚒️", desc: "Crafts weapons",    goldRequired: 1500, woodRequired: 300,  stoneRequired: 1000, color: "border-orange-500/30 bg-orange-500/5" },
];

export function Kingdom() {
  const { data: kingdom, isLoading, refetch } = useGetMyKingdom();
  const { data: allKingdoms } = useGetKingdoms();
  const upgradeMutation = useUpgradeKingdomBuilding();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const gold  = kingdom?.gold  ?? 0;
  const wood  = kingdom?.wood  ?? 0;
  const stone = kingdom?.stone ?? 0;

  // Map of building type → DB level (from the real buildings array on the kingdom)
  const buildingLevels = new Map<string, number>(
    ((kingdom as any)?.buildings ?? []).map((b: { buildingType: string; level: number }) => [b.buildingType, b.level])
  );

  function isUnlocked(b: typeof BUILDINGS_CATALOG[0]) {
    return gold >= b.goldRequired && wood >= b.woodRequired && stone >= b.stoneRequired;
  }

  function upgradeCost(b: typeof BUILDINGS_CATALOG[0]) {
    const currentLevel = buildingLevels.get(b.type) ?? 1;
    return {
      gold:  b.goldRequired  * currentLevel,
      wood:  b.woodRequired  * currentLevel,
      stone: b.stoneRequired * currentLevel,
      level: currentLevel,
    };
  }

  function canAffordUpgrade(b: typeof BUILDINGS_CATALOG[0]) {
    const cost = upgradeCost(b);
    return gold >= cost.gold && wood >= cost.wood && stone >= cost.stone;
  }

  async function handleUpgrade(buildingType: string) {
    setUpgrading(buildingType);
    try {
      const result = await upgradeMutation.mutateAsync({ type: buildingType });
      toast({
        title: `${buildingType} upgraded to Level ${result.building.level}!`,
        description: `Spent ${result.goldSpent}g / ${result.woodSpent}w / ${result.stoneSpent}s`,
      });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Upgrade failed";
      toast({ title: "Upgrade failed", description: msg, variant: "destructive" });
    } finally {
      setUpgrading(null);
    }
  }

  const unlockedCount = BUILDINGS_CATALOG.filter(isUnlocked).length;
  const kingdomLevel = Math.max(1, unlockedCount);
  const nextBuilding = BUILDINGS_CATALOG[Math.min(unlockedCount, BUILDINGS_CATALOG.length - 1)];
  const progressToNext = Math.min(100, (gold / nextBuilding.goldRequired) * 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Your Kingdom</h2>
          <p className="text-muted-foreground">Build your empire through viewer gifts and engagement.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-white/5 shadow-sm">
          <Castle className="w-5 h-5 text-primary" />
          <span className="font-bold text-white text-lg">Lv. {kingdomLevel}</span>
        </div>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              Gold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? <Skeleton className="h-9 w-20" /> : gold.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From viewer gifts</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Pickaxe className="w-4 h-4 text-emerald-500" />
              Wood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? <Skeleton className="h-9 w-20" /> : wood.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From viewer likes</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-400/20 shadow-[0_0_15px_rgba(148,163,184,0.05)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Hammer className="w-4 h-4 text-slate-400" />
              Stone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {isLoading ? <Skeleton className="h-9 w-20" /> : stone.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From viewer follows</p>
          </CardContent>
        </Card>
      </div>

      {/* Kingdom progress */}
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Kingdom Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white font-medium">{unlockedCount} / {BUILDINGS_CATALOG.length} buildings unlocked</span>
            <span className="text-primary">{Math.round(progressToNext)}% to next</span>
          </div>
          <Progress value={progressToNext} className="h-2 bg-background border border-border" />
          {unlockedCount < BUILDINGS_CATALOG.length && (
            <p className="text-xs text-muted-foreground mt-2">
              Next: <span className="text-white font-medium">{nextBuilding.emoji} {nextBuilding.type}</span>
              — needs {nextBuilding.goldRequired.toLocaleString()} Gold
              {nextBuilding.woodRequired > 0 && `, ${nextBuilding.woodRequired.toLocaleString()} Wood`}
              {nextBuilding.stoneRequired > 0 && `, ${nextBuilding.stoneRequired.toLocaleString()} Stone`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Buildings Grid — shows DB level and Upgrade button */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Castle className="w-5 h-5 text-primary" />
          Buildings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUILDINGS_CATALOG.map((b) => {
            const unlocked = isUnlocked(b);
            const dbLevel  = buildingLevels.get(b.type) ?? (unlocked ? 1 : 0);
            const cost     = upgradeCost(b);
            const canUpg   = unlocked && canAffordUpgrade(b);
            const isUpg    = upgrading === b.type;

            return (
              <Card
                key={b.type}
                className={`border transition-all ${b.color} ${unlocked ? "" : "opacity-50 grayscale"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{b.emoji}</span>
                    {unlocked ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Lv. {dbLevel}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Locked</Badge>
                    )}
                  </div>
                  <p className="font-bold text-white text-sm">{b.type}</p>
                  <p className="text-xs text-muted-foreground mb-2">{b.desc}</p>

                  {/* Unlock requirements */}
                  <div className="space-y-1 text-xs mb-3">
                    {b.goldRequired > 0 && (
                      <div className={`flex items-center gap-1 ${gold >= b.goldRequired ? "text-green-400" : "text-muted-foreground"}`}>
                        <Coins className="w-3 h-3" />
                        <span>
                          {b.goldRequired.toLocaleString()} Gold{" "}
                          {gold >= b.goldRequired ? "✓" : `(${Math.max(0, b.goldRequired - gold).toLocaleString()} needed)`}
                        </span>
                      </div>
                    )}
                    {b.woodRequired > 0 && (
                      <div className={`flex items-center gap-1 ${wood >= b.woodRequired ? "text-green-400" : "text-muted-foreground"}`}>
                        <Pickaxe className="w-3 h-3" />
                        <span>
                          {b.woodRequired.toLocaleString()} Wood{" "}
                          {wood >= b.woodRequired ? "✓" : `(${Math.max(0, b.woodRequired - wood).toLocaleString()} needed)`}
                        </span>
                      </div>
                    )}
                    {b.stoneRequired > 0 && (
                      <div className={`flex items-center gap-1 ${stone >= b.stoneRequired ? "text-green-400" : "text-muted-foreground"}`}>
                        <Hammer className="w-3 h-3" />
                        <span>
                          {b.stoneRequired.toLocaleString()} Stone{" "}
                          {stone >= b.stoneRequired ? "✓" : `(${Math.max(0, b.stoneRequired - stone).toLocaleString()} needed)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upgrade button (only for unlocked buildings) */}
                  {unlocked && (
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      variant={canUpg ? "default" : "outline"}
                      disabled={!canUpg || isUpg}
                      onClick={() => handleUpgrade(b.type)}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {isUpg
                        ? "Upgrading..."
                        : canUpg
                        ? `Upgrade → Lv.${dbLevel + 1}`
                        : `Need ${cost.gold}g${cost.wood > 0 ? ` / ${cost.wood}w` : ""}${cost.stone > 0 ? ` / ${cost.stone}s` : ""}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Global Kingdoms */}
      <Card className="bg-card border-white/5">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Global Realms
          </CardTitle>
          <CardDescription>Other kingdoms around the world</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(allKingdoms ?? []).slice(0, 6).map((k) => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-2">
                  <Castle className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-white">{k.name}</p>
                    <p className="text-xs text-muted-foreground">🪙 {k.gold.toLocaleString()} gold</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Lv. {k.level}</Badge>
              </div>
            ))}
            {(!allKingdoms || allKingdoms.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-3">No other realms discovered yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
