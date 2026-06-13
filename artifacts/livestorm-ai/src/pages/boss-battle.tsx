import { useState, useEffect, useRef } from "react";
import {
  useGetActiveBossBattle,
  useSpawnBossBattle,
  useEndBossBattle,
  useGetBossAttacks,
  useGetMyStreamer,
} from "@workspace/api-client-react";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";
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
import { StageBackground } from "@/components/StageBackground";
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
  const { activeSessionId: sessionId } = useLiveSessionContext();

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

          {/* ── Boss Arena ── */}
          <div className={cn(
            "lg:col-span-2 relative rounded-2xl border overflow-hidden",
            "border-red-500/35 shadow-2xl shadow-red-500/[0.20]",
            shake && "animate-[shake_0.3s_ease-in-out]",
          )}>
            <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }`}</style>

            {/* Futuristic stage background */}
            <StageBackground variant="battle" showRing={true} showScan={true} showGrid={true} showCorners={true} />

            {/* Boss display */}
            <div className="relative flex flex-col items-center pt-10 pb-5 px-6">
              {/* Floating boss emoji */}
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40"
                  style={{ background: "radial-gradient(circle,rgba(239,68,68,.6),transparent)" }} />
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative text-[6rem] sm:text-[8rem] select-none"
                  style={{ filter: "drop-shadow(0 0 32px rgba(239,68,68,.5))" }}
                >
                  {battle.bossEmoji}
                </motion.div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-1 tracking-tight">{battle.bossName}</h2>
              <p className="text-sm text-red-300/50 mb-7 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                Defeat it before HP reaches zero!
              </p>

              {/* HP Bar */}
              <div className="w-full max-w-lg">
                <div className="flex justify-between items-center text-sm mb-2.5">
                  <span className="flex items-center gap-1.5 text-red-400 font-black text-xs uppercase tracking-widest">
                    <Skull className="w-3.5 h-3.5" /> Boss HP
                  </span>
                  <span className="font-mono font-black text-white text-base tabular-nums">
                    <AnimatedCounter target={displayHp} /> <span className="text-white/30 text-sm">/ {maxHp.toLocaleString()}</span>
                  </span>
                </div>
                {/* HP bar */}
                <div className="relative h-8 rounded-full overflow-hidden border border-white/10 shadow-inner"
                  style={{ background: "rgba(0,0,0,0.5)" }}>
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${hpColor}99, ${hpColor})`,
                      boxShadow: `0 0 24px ${hpColor}70`,
                    }}
                  />
                  {/* Segment lines */}
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="absolute inset-y-0 w-px bg-black/25" style={{ left: `${(i + 1) * 10}%` }} />
                  ))}
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-full" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-lg">
                    {hpPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Attack types strip */}
            <div className="grid grid-cols-3 gap-3 px-6 pb-7 pt-1">
              {[
                { icon: Zap,    color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", label: "Gift",    dmg: "Coins × 2 DMG",  glow: "shadow-yellow-500/15" },
                { icon: Heart,  color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/25",   label: "Like",    dmg: "1 DMG each",     glow: "shadow-pink-500/15" },
                { icon: Shield, color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/25",   label: "Comment", dmg: "1 DMG each",     glow: "shadow-blue-500/15" },
              ].map((item) => (
                <div key={item.label} className={cn(
                  "p-4 rounded-2xl border text-center shadow-lg",
                  item.bg, item.border, item.glow,
                )}>
                  <div className={cn("w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center border", item.bg, item.border)}>
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <p className={cn("font-bold text-sm", item.color)}>{item.label}</p>
                  <p className="text-muted-foreground/60 text-[11px] mt-0.5">{item.dmg}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Damage Feed ── */}
          <div className="rounded-2xl border border-orange-500/15 bg-white/[0.02] overflow-hidden flex flex-col"
            style={{ background: "linear-gradient(180deg,rgba(234,88,12,.06) 0%,rgba(0,0,0,0) 100%)" }}>
            <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-none">Damage Feed</p>
                <p className="text-[10px] text-white/30 mt-0.5">Real-time attacks</p>
              </div>
              <span className="ml-auto text-xs font-bold text-orange-400/70 bg-orange-500/10 border border-orange-500/15 px-2 py-0.5 rounded-full tabular-nums">
                {allAttacks.length} hits
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {allAttacks.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center">
                    <Sword className="w-6 h-6 text-orange-400/40" />
                  </div>
                  <p className="text-sm text-white/25">Waiting for viewers to attack…</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {allAttacks.map((atk, i) => {
                      const Icon = attackTypeIcon[atk.attackType] ?? Zap;
                      const c = attackTypeColor[atk.attackType] ?? attackTypeColor.gift;
                      return (
                        <motion.div
                          key={`${'timestamp' in atk ? atk.timestamp : i}-${i}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className={cn("p-1.5 rounded-lg shrink-0 border border-white/[0.06]", c.bg)}>
                            <Icon className={cn("w-3.5 h-3.5", c.text)} />
                          </div>
                          <span className="text-white font-semibold text-sm truncate flex-1">{atk.viewerName}</span>
                          <span className="text-red-400 font-black text-sm shrink-0 tabular-nums">−{atk.damage}</span>
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

          {/* ── Spawn Form ── */}
          <div className="relative rounded-2xl border border-red-500/20 overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(127,29,29,.10) 0%,rgba(154,52,18,.05) 60%,rgba(0,0,0,0) 100%)" }}>
            {/* Decorative */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15"
                style={{ background: "radial-gradient(circle,rgba(239,68,68,.5),transparent 70%)" }} />
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-500/30 rounded-tl" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-red-500/30 rounded-tr" />
            </div>

            <div className="relative px-5 py-4 border-b border-red-500/10 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/20 shadow-lg shadow-red-500/10">
                <Skull className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/50">Arena</p>
                <p className="font-bold text-white text-sm">Spawn a Boss</p>
              </div>
            </div>

            <div className="relative p-5 space-y-5">
              {/* Preset grid */}
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.14em] mb-3">Choose Preset</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {BOSS_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => { setPreset(p); setCustomName(""); setCustomEmoji(""); setCustomHp(""); }}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                        preset.name === p.name && !customName
                          ? "border-red-500/40 bg-red-500/12 shadow-lg shadow-red-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-red-500/25 hover:bg-red-500/5",
                      )}
                    >
                      <span className="text-3xl block mb-2" style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,.4))" }}>{p.emoji}</span>
                      <p className="text-xs font-bold text-white leading-tight">{p.name}</p>
                      <p className="text-[10px] text-red-300/40 mt-0.5 font-mono">{p.hp.toLocaleString()} HP</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom overrides */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/40">Custom Name <span className="text-white/20">(optional)</span></Label>
                  <Input placeholder={preset.name} value={customName} onChange={(e) => setCustomName(e.target.value)}
                    className="bg-white/[0.04] border-white/10 focus:border-red-500/40 focus:ring-0" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/40">Emoji</Label>
                    <Input placeholder={preset.emoji} value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value)}
                      className="bg-white/[0.04] border-white/10 focus:border-red-500/40 text-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/40">Max HP</Label>
                    <Input type="number" placeholder={String(preset.hp)} value={customHp} onChange={(e) => setCustomHp(e.target.value)}
                      className="bg-white/[0.04] border-white/10 focus:border-red-500/40 font-mono" />
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-sm font-black bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] border-0"
                onClick={handleSpawn}
                disabled={spawnMutation.isPending || !streamer}
              >
                <span className="mr-2 text-lg">{customEmoji || preset.emoji}</span>
                {spawnMutation.isPending ? "Spawning…" : `Spawn ${customName || preset.name}`}
              </Button>

              {!sessionId && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <span className="text-amber-400 text-base">⚠️</span>
                  <p className="text-xs text-amber-400/80">Start a live session to link this battle to your stream.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── How It Works ── */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-500/12 border border-violet-500/18">
                <Shield className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">Guide</p>
                <p className="font-bold text-white text-sm">How Boss Battle Works</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {[
                { icon: Skull,  color: "text-red-400",    bg: "bg-red-500/12",    border: "border-red-500/20",    num: "01", title: "Spawn a Boss",     desc: "Pick a boss with name, emoji and HP pool. The battle starts immediately for your viewers." },
                { icon: Zap,    color: "text-yellow-400", bg: "bg-yellow-500/12", border: "border-yellow-500/20", num: "02", title: "Viewers Attack",    desc: "Gifts deal Coins × 2 DMG. Likes and comments deal 1 HP. Follows deal 5 HP each." },
                { icon: Trophy, color: "text-green-400",  bg: "bg-green-500/12",  border: "border-green-500/20",  num: "03", title: "Defeat & Reward",   desc: "When HP hits 0, the killing blow viewer wins the Boss Slayer achievement." },
                { icon: Shield, color: "text-blue-400",   bg: "bg-blue-500/12",   border: "border-blue-500/20",   num: "04", title: "Real-time Updates", desc: "HP bar updates live on every hit — your viewers see the damage as it happens." },
              ].map((item) => (
                <div key={item.num} className="flex gap-4 items-start">
                  <div className={cn("w-10 h-10 rounded-xl border shrink-0 flex flex-col items-center justify-center gap-0.5 shadow-sm", item.bg, item.border)}>
                    <item.icon className={cn("w-4 h-4", item.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black text-white/20 font-mono">{item.num}</span>
                      <p className="text-sm font-bold text-white">{item.title}</p>
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
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
