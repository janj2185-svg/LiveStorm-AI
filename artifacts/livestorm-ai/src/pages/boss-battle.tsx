import { useState, useEffect, useRef } from "react";
import {
  useGetActiveBossBattle,
  useSpawnBossBattle,
  useEndBossBattle,
  useGetBossAttacks,
  useGetMyStreamer,
  useGetActiveSession,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Sword, Skull, Zap, Heart, Shield, Trophy, Flame } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const BOSS_PRESETS = [
  { name: "Shadow Dragon", emoji: "🐉", hp: 1000 },
  { name: "Dark Titan", emoji: "👹", hp: 2000 },
  { name: "Void Wraith", emoji: "💀", hp: 500 },
  { name: "Ancient Golem", emoji: "🗿", hp: 3000 },
  { name: "Chaos Phoenix", emoji: "🔥", hp: 1500 },
  { name: "Cursed Kraken", emoji: "🐙", hp: 2500 },
];

interface AttackEvent {
  viewerName: string;
  attackType: string;
  damage: number;
  timestamp: number;
}

export function BossBattle() {
  const { getToken } = useAuth();
  const { data: streamer } = useGetMyStreamer();
  const { data: activeSessionData } = useGetActiveSession();
  const sessionId = activeSessionData?.session?.id;

  const { data: activeBattle, refetch: refetchBattle } = useGetActiveBossBattle();
  const battle = activeBattle?.battle;

  const battleId = battle?.id ?? 0;
  const { data: attacks } = useGetBossAttacks(battleId);

  const spawnMutation = useSpawnBossBattle();
  const endMutation = useEndBossBattle();
  const { toast } = useToast();

  const [preset, setPreset] = useState(BOSS_PRESETS[0]);
  const [customName, setCustomName] = useState("");
  const [customHp, setCustomHp] = useState("");
  const [customEmoji, setCustomEmoji] = useState("");
  const [liveAttacks, setLiveAttacks] = useState<AttackEvent[]>([]);
  const [currentHp, setCurrentHp] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let socket: Socket;

    getToken().then((token) => {
      socket = io(window.location.origin, {
        path: `${BASE_URL}/api/socket.io`,
        transports: ["websocket", "polling"],
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("session:join", sessionId);
      });

      socket.on("boss:attacked", (data: AttackEvent & { currentHp: number }) => {
        setLiveAttacks((prev) => [data, ...prev.slice(0, 19)]);
        setCurrentHp(data.currentHp);
      });

      socket.on("boss:defeated", (data: { bossName: string; killingBlowBy: string }) => {
        toast({
          title: `⚔️ ${data.bossName} has been defeated!`,
          description: `Killing blow by ${data.killingBlowBy}`,
        });
        refetchBattle();
      });

      socket.on("boss:spawned", () => {
        refetchBattle();
      });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    if (battle) setCurrentHp(battle.currentHp);
  }, [battle?.id]);

  const displayHp = currentHp ?? battle?.currentHp ?? 0;
  const maxHp = battle?.maxHp ?? 1;
  const hpPercent = Math.round((displayHp / maxHp) * 100);

  async function handleSpawn() {
    const bossName = customName || preset.name;
    const bossEmoji = customEmoji || preset.emoji;
    const hp = customHp ? Number(customHp) : preset.hp;

    try {
      await spawnMutation.mutateAsync({
        data: { bossName, bossEmoji, maxHp: hp, sessionId: sessionId ?? undefined },
      });
      toast({ title: `${bossEmoji} ${bossName} has appeared!`, description: `${hp.toLocaleString()} HP — defeat it with gifts and likes!` });
      refetchBattle();
    } catch {
      toast({ title: "Error", description: "Could not spawn boss.", variant: "destructive" });
    }
  }

  async function handleEnd() {
    if (!battle) return;
    try {
      await endMutation.mutateAsync({ id: battle.id });
      toast({ title: "Battle ended", description: "The boss has fled." });
      refetchBattle();
    } catch {
      toast({ title: "Error", description: "Could not end battle.", variant: "destructive" });
    }
  }

  const attackTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    gift: Zap, like: Heart, comment: Shield, follow: Trophy, share: Flame,
  };

  const attackTypeColor: Record<string, string> = {
    gift: "text-yellow-400", like: "text-pink-400", comment: "text-blue-400",
    follow: "text-green-400", share: "text-purple-400",
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sword className="w-8 h-8 text-red-500" />
            Boss Battle
          </h2>
          <p className="text-muted-foreground">Spawn a boss for your viewers to defeat together.</p>
        </div>
        {battle && battle.status === "active" && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-sm px-3 py-1">
            ⚔️ Battle Active
          </Badge>
        )}
      </div>

      {battle && battle.status === "active" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Boss HP card */}
          <Card className="lg:col-span-2 bg-card border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <span className="text-4xl">{battle.bossEmoji}</span>
                {battle.bossName}
              </CardTitle>
              <CardDescription>Viewers deal damage via gifts, likes, and comments!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <Skull className="w-4 h-4" /> HP
                </span>
                <span className="font-mono font-bold text-white">
                  {displayHp.toLocaleString()} / {maxHp.toLocaleString()}
                </span>
              </div>
              <div className="relative h-6 rounded-full overflow-hidden bg-background border border-border">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500 rounded-full"
                  style={{
                    width: `${hpPercent}%`,
                    background: hpPercent > 50 ? "#ef4444" : hpPercent > 25 ? "#f97316" : "#eab308",
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                  {hpPercent}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-center text-sm">
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-yellow-400 font-bold">Gift</p>
                  <p className="text-muted-foreground text-xs">Coins × 2 DMG</p>
                </div>
                <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <Heart className="w-5 h-5 text-pink-400 mx-auto mb-1" />
                  <p className="text-pink-400 font-bold">Like</p>
                  <p className="text-muted-foreground text-xs">1 DMG each</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Shield className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-blue-400 font-bold">Comment</p>
                  <p className="text-muted-foreground text-xs">1 DMG each</p>
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full mt-2"
                onClick={handleEnd}
                disabled={endMutation.isPending}
              >
                End Battle (Expire Boss)
              </Button>
            </CardContent>
          </Card>

          {/* Attack feed */}
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Damage Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {liveAttacks.length === 0 && (attacks ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Waiting for viewers to attack...
                  </p>
                )}
                {[...liveAttacks, ...(attacks ?? []).slice(0, 30 - liveAttacks.length)].map((atk, i) => {
                  const Icon = attackTypeIcon[atk.attackType] ?? Zap;
                  const color = attackTypeColor[atk.attackType] ?? "text-yellow-400";
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-background border border-border text-sm">
                      <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                      <span className="text-white font-medium truncate flex-1">{atk.viewerName}</span>
                      <span className="text-red-400 font-bold shrink-0">-{atk.damage} HP</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spawn a boss */}
          <Card className="bg-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-red-500" />
                Spawn a Boss
              </CardTitle>
              <CardDescription>Pick a preset or customize your boss.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Choose preset</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BOSS_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => { setPreset(p); setCustomName(""); setCustomEmoji(""); setCustomHp(""); }}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        preset.name === p.name && !customName
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <p className="text-xs font-bold text-white mt-1">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.hp.toLocaleString()} HP</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Custom name (optional)</Label>
                <Input
                  placeholder={preset.name}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Emoji</Label>
                  <Input
                    placeholder={preset.emoji}
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Max HP</Label>
                  <Input
                    type="number"
                    placeholder={String(preset.hp)}
                    value={customHp}
                    onChange={(e) => setCustomHp(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleSpawn}
                disabled={spawnMutation.isPending || !streamer}
              >
                <Skull className="w-4 h-4 mr-2" />
                {spawnMutation.isPending ? "Spawning..." : `Spawn ${customEmoji || preset.emoji} ${customName || preset.name}`}
              </Button>

              {!sessionId && (
                <p className="text-xs text-yellow-500 text-center">
                  ⚠️ Start a live session to link this battle to your stream.
                </p>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg">How Boss Battle Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Skull, color: "text-red-400", bg: "bg-red-400/10", title: "Spawn a Boss", desc: "Pick a boss with a name, emoji, and HP pool. The battle begins immediately." },
                { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", title: "Viewers Attack", desc: "Gifts deal Coins × 2 damage. Likes and comments deal 1 HP each. Follows deal 5 HP." },
                { icon: Trophy, color: "text-green-400", bg: "bg-green-400/10", title: "Defeat & Reward", desc: "When HP hits 0, the viewer who dealt the killing blow gets the Boss Slayer achievement." },
                { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10", title: "Real-time Updates", desc: "The HP bar updates live. Your viewers see every attack in the damage feed." },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
