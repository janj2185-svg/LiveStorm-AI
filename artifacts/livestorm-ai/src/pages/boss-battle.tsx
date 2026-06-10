import { useState, useEffect, useRef } from "react";
import {
  useGetActiveBossBattle,
  useSpawnBossBattle,
  useEndBossBattle,
  useGetBossAttacks,
  useGetMyStreamer,
  useGetActiveSession,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sword, Skull, Zap, Heart, Shield, Trophy, Flame } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";
import { cn } from "@/lib/utils";
import { PageHero, PulsingDot, AnimatedCounter } from "@/components/ui/premium";
import { motion, AnimatePresence } from "framer-motion";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const BOSS_PRESETS = [
  { name: "Shadow Dragon", emoji: "🐉", hp: 1000 },
  { name: "Dark Titan",    emoji: "👹", hp: 2000 },
  { name: "Void Wraith",   emoji: "💀", hp: 500  },
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

const attackTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Zap, like: Heart, comment: Shield, follow: Trophy, share: Flame,
};

const attackTypeColor: Record<string, { text: string; bg: string }> = {
  gift:    { text: "text-yellow-400",  bg: "bg-yellow-500/10" },
  like:    { text: "text-pink-400",    bg: "bg-pink-500/10"   },
  comment: { text: "text-blue-400",    bg: "bg-blue-500/10"   },
  follow:  { text: "text-green-400",   bg: "bg-green-500/10"  },
  share:   { text: "text-purple-400",  bg: "bg-purple-500/10" },
};

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
  const [shake, setShake] = useState(false);

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
      socket.on("connect", () => { socket.emit("session:join", sessionId); });
      socket.on("boss:attacked", (data: AttackEvent & { currentHp: number }) => {
        setLiveAttacks((prev) => [data, ...prev.slice(0, 19)]);
        setCurrentHp(data.currentHp);
        setShake(true);
        setTimeout(() => setShake(false), 400);
      });
      socket.on("boss:defeated", (data: { bossName: string; killingBlowBy: string }) => {
        toast({ title: `⚔️ ${data.bossName} has been defeated!`, description: `Killing blow by ${data.killingBlowBy}` });
        refetchBattle();
      });
      socket.on("boss:spawned", () => { refetchBattle(); });
    });
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [sessionId]);

  useEffect(() => {
    if (battle) setCurrentHp(battle.currentHp);
  }, [battle?.id]);

  const displayHp = currentHp ?? battle?.currentHp ?? 0;
  const maxHp = battle?.maxHp ?? 1;
  const hpPercent = Math.round((displayHp / maxHp) * 100);
  const hpColor = hpPercent > 60 ? "#ef4444" : hpPercent > 30 ? "#f97316" : "#eab308";

  async function handleSpawn() {
    const bossName  = customName  || preset.name;
    const bossEmoji = customEmoji || preset.emoji;
    const hp        = customHp ? Number(customHp) : preset.hp;
    try {
      await spawnMutation.mutateAsync({ data: { bossName, bossEmoji, maxHp: hp, sessionId: sessionId ?? undefined } });
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

  const allAttacks = [...liveAttacks, ...(attacks ?? []).slice(0, 30 - liveAttacks.length)];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Hero */}
      <PageHero
        gradientFrom="rgba(220,38,38,0.18)"
        gradientTo="rgba(234,179,8,0.08)"
        eyebrow={
          battle?.status === "active" ? (
            <div className="flex items-center gap-2">
              <PulsingDot color="bg-red-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">Battle Active</span>
            </div>
          ) : null
        }
        icon={
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/20 shadow-lg shadow-red-500/10">
            <Sword className="h-8 w-8 text-red-400" />
          </div>
        }
        title={<span>Boss <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Battle</span></span>}
        subtitle="Spawn a boss for your viewers to defeat together — live."
        right={
          battle?.status === "active" ? (
            <Button
              variant="destructive"
              onClick={handleEnd}
              disabled={endMutation.isPending}
              className="font-bold shadow-lg shadow-red-500/20"
            >
              <Skull className="w-4 h-4 mr-2" />
              {endMutation.isPending ? "Ending…" : "Expire Boss"}
            </Button>
          ) : undefined
        }
      />

      {battle?.status === "active" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Boss arena */}
          <div className={cn(
            "lg:col-span-2 rounded-2xl border overflow-hidden relative",
            "border-red-500/25 bg-gradient-to-b from-red-950/30 to-transparent",
            "shadow-2xl shadow-red-500/10",
            shake && "animate-[shake_0.3s_ease-in-out]",
          )}>
            <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }`}</style>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.08),transparent_60%)] pointer-events-none" />

            {/* Boss display */}
            <div className="relative flex flex-col items-center pt-8 pb-4 px-6">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-8xl mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)] select-none"
              >
                {battle.bossEmoji}
              </motion.div>
              <h2 className="text-3xl font-black text-white text-center mb-1 drop-shadow">{battle.bossName}</h2>
              <p className="text-sm text-red-300/60 mb-6">Defeat it before HP reaches zero!</p>

              {/* HP Bar */}
              <div className="w-full max-w-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-1.5 text-red-400 font-bold">
                    <Skull className="w-4 h-4" /> HP
                  </span>
                  <span className="font-mono font-black text-white text-base">
                    <AnimatedCounter target={displayHp} /> / {maxHp.toLocaleString()}
                  </span>
                </div>
                <div className="relative h-7 rounded-full overflow-hidden bg-black/50 border border-white/10 shadow-inner">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${hpPercent}%`,
                      background: `linear-gradient(90deg, ${hpColor}cc, ${hpColor})`,
                      boxShadow: `0 0 20px ${hpColor}80`,
                    }}
                  />
                  {/* Segments */}
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="absolute inset-y-0 bg-black/30 w-px" style={{ left: `${(i + 1) * 10}%` }} />
                  ))}
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow">
                    {hpPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Attack types */}
            <div className="grid grid-cols-3 gap-3 px-6 pb-6">
              {[
                { icon: Zap,    color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Gift",    dmg: "Coins × 2 DMG" },
                { icon: Heart,  color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20",   label: "Like",    dmg: "1 DMG each" },
                { icon: Shield, color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   label: "Comment", dmg: "1 DMG each" },
              ].map((item) => (
                <div key={item.label} className={cn("p-4 rounded-xl border text-center", item.bg, item.border)}>
                  <item.icon className={cn("w-6 h-6 mx-auto mb-2", item.color)} />
                  <p className={cn("font-bold text-sm", item.color)}>{item.label}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{item.dmg}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Damage Feed */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/15">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <span className="font-semibold text-white text-sm">Damage Feed</span>
              <span className="ml-auto text-xs text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-full">
                {allAttacks.length} hits
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[450px]">
              {allAttacks.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  Waiting for viewers to attack…
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {allAttacks.map((atk, i) => {
                      const Icon = attackTypeIcon[atk.attackType] ?? Zap;
                      const c = attackTypeColor[atk.attackType] ?? attackTypeColor.gift;
                      return (
                        <motion.div
                          key={`${'timestamp' in atk ? atk.timestamp : i}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02]"
                        >
                          <div className={cn("p-1.5 rounded-lg shrink-0", c.bg)}>
                            <Icon className={cn("w-3.5 h-3.5", c.text)} />
                          </div>
                          <span className="text-white font-semibold text-sm truncate flex-1">{atk.viewerName}</span>
                          <span className="text-red-400 font-black text-sm shrink-0">-{atk.damage}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Spawn Form */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/15">
                <Skull className="w-4 h-4 text-red-400" />
              </div>
              <span className="font-semibold text-white">Spawn a Boss</span>
            </div>
            <div className="p-5 space-y-5">
              {/* Preset grid */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choose Preset</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {BOSS_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => { setPreset(p); setCustomName(""); setCustomEmoji(""); setCustomHp(""); }}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all hover:scale-[1.02]",
                        preset.name === p.name && !customName
                          ? "border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-red-500/25 hover:bg-red-500/5",
                      )}
                    >
                      <span className="text-3xl block mb-1.5">{p.emoji}</span>
                      <p className="text-xs font-bold text-white leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.hp.toLocaleString()} HP</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom overrides */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custom Name (optional)</Label>
                  <Input
                    placeholder={preset.name}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="bg-white/[0.04] border-white/10 focus:border-red-500/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Emoji</Label>
                    <Input
                      placeholder={preset.emoji}
                      value={customEmoji}
                      onChange={(e) => setCustomEmoji(e.target.value)}
                      className="bg-white/[0.04] border-white/10 focus:border-red-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Max HP</Label>
                    <Input
                      type="number"
                      placeholder={String(preset.hp)}
                      value={customHp}
                      onChange={(e) => setCustomHp(e.target.value)}
                      className="bg-white/[0.04] border-white/10 focus:border-red-500/40"
                    />
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-black bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-red-500/25 transition-all hover:scale-[1.01]"
                onClick={handleSpawn}
                disabled={spawnMutation.isPending || !streamer}
              >
                <span className="mr-2 text-lg">{customEmoji || preset.emoji}</span>
                {spawnMutation.isPending ? "Spawning…" : `Spawn ${customName || preset.name}`}
              </Button>

              {!sessionId && (
                <p className="text-xs text-amber-400/80 text-center bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/15">
                  ⚠️ Start a live session to link this battle to your stream.
                </p>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="font-semibold text-white">How Boss Battle Works</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { icon: Skull,  color: "text-red-400",    bg: "bg-red-500/12",    border: "border-red-500/20",    num: "01", title: "Spawn a Boss",       desc: "Pick a boss with a name, emoji, and HP pool. The battle begins immediately for your viewers." },
                { icon: Zap,    color: "text-yellow-400", bg: "bg-yellow-500/12", border: "border-yellow-500/20", num: "02", title: "Viewers Attack",      desc: "Gifts deal Coins × 2 damage. Likes and comments deal 1 HP each. Follows deal 5 HP." },
                { icon: Trophy, color: "text-green-400",  bg: "bg-green-500/12",  border: "border-green-500/20",  num: "03", title: "Defeat & Reward",     desc: "When HP hits 0, the viewer who dealt the killing blow wins the Boss Slayer achievement." },
                { icon: Shield, color: "text-blue-400",   bg: "bg-blue-500/12",   border: "border-blue-500/20",   num: "04", title: "Real-time Updates",   desc: "HP bar updates live every hit. Your viewers see every attack as it happens." },
              ].map((item) => (
                <div key={item.num} className="flex gap-4 items-start">
                  <div className={cn("w-11 h-11 rounded-xl border shrink-0 flex items-center justify-center", item.bg, item.border)}>
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-black text-muted-foreground/40">{item.num}</span>
                      <p className="text-sm font-bold text-white">{item.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
