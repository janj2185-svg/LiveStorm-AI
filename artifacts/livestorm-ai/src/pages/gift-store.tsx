/**
 * SYLORA Gift Gallery Store — premium cinematic catalog of 100 original gifts.
 * Not a TikTok clone. Original Sylora IP only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Sparkles, Play, Filter, Zap, Crown, Flame, Star, Wand2,
  Gauge, Volume2, Boxes, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SyloraGiftPlayer,
  loadGiftCatalog,
  loadGiftManifest,
  type GiftPlayStats,
} from "@/lib/syloraGiftPlayer";

type CatalogGift = {
  id: number;
  slug: string;
  name: string;
  rarity: "rare" | "epic" | "legendary" | "mythic" | "divine";
  priceCoins: number;
  durationSec: number;
  story: string;
  assets: { thumbnail: string; previewGif: string; glb: string };
  performance: { targetFps: number; particles: number };
  qualityTarget: string;
  status: Record<string, string>;
};

type Catalog = {
  library: string;
  version: string;
  count: number;
  policy: string;
  gifts: CatalogGift[];
};

const RARITY_STYLE: Record<string, { label: string; ring: string; text: string; glow: string }> = {
  rare: { label: "Rare", ring: "ring-sky-400/40", text: "text-sky-300", glow: "from-sky-500/20" },
  epic: { label: "Epic", ring: "ring-violet-400/40", text: "text-violet-300", glow: "from-violet-500/20" },
  legendary: { label: "Legendary", ring: "ring-amber-400/40", text: "text-amber-300", glow: "from-amber-500/20" },
  mythic: { label: "Mythic", ring: "ring-fuchsia-400/40", text: "text-fuchsia-300", glow: "from-fuchsia-500/20" },
  divine: { label: "Divine", ring: "ring-yellow-200/50", text: "text-yellow-100", glow: "from-yellow-200/25" },
};

function formatCoins(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

export function GiftStore() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rarity, setRarity] = useState<"all" | CatalogGift["rarity"]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogGift | null>(null);
  const [playing, setPlaying] = useState(false);
  const [stats, setStats] = useState<GiftPlayStats | null>(null);
  const [beat, setBeat] = useState<string>("");
  const [combo, setCombo] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<SyloraGiftPlayer | null>(null);

  useEffect(() => {
    loadGiftCatalog()
      .then((c) => setCatalog(c))
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    return () => {
      playerRef.current?.dispose();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return catalog.gifts.filter((g) => {
      if (rarity !== "all" && g.rarity !== rarity) return false;
      if (query && !`${g.name} ${g.story}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [catalog, rarity, query]);

  const playGift = useCallback(async (gift: CatalogGift) => {
    setSelected(gift);
    setPlaying(true);
    setStats(null);
    setBeat("loading");
    if (!canvasRef.current) return;
    playerRef.current?.dispose();
    const player = new SyloraGiftPlayer(canvasRef.current);
    playerRef.current = player;
    try {
      const manifest = await loadGiftManifest(gift.slug);
      const result = await player.play(manifest, {
        quality: window.innerWidth < 768 ? "mobile" : "desktop",
        onBeat: setBeat,
      });
      setStats(result);
      setCombo((prev) => [...prev.slice(-4), gift.slug]);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setPlaying(false);
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-4.5rem)] pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 mb-8">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(251,191,36,0.18), transparent 50%), radial-gradient(ellipse 60% 50% at 80% 10%, rgba(167,139,250,0.2), transparent 45%), linear-gradient(160deg, #070b16 0%, #0c1224 50%, #05070f 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />
        <div className="relative px-6 py-10 md:px-10 md:py-14 max-w-5xl">
          <p className="text-[11px] font-bold tracking-[0.28em] text-amber-300/90 mb-3">SYLORA GIFT LIBRARY</p>
          <h1 className="font-[family-name:var(--font-display,inherit)] text-4xl md:text-6xl font-black text-white tracking-tight mb-3">
            Gallery Gift Store
          </h1>
          <p className="text-base md:text-lg text-white/70 max-w-2xl leading-relaxed">
            100 original cinematic gifts — Rare to Divine. Built for Sylora, not copied from anyone.
            Each gift carries its own story, VFX language, AI reaction, and runtime manifest.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            {[
              { icon: Boxes, label: "100 unique IP gifts" },
              { icon: Wand2, label: "Blender → GLB pipeline" },
              { icon: Volume2, label: "Spatial audio synth" },
              { icon: Gauge, label: "Mobile LOD + Desktop Ultra" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80">
                <Icon className="h-3.5 w-3.5 text-amber-300" />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Catalog */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search gifts…"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-amber-500/40"
              />
            </div>
            {(["all", "rare", "epic", "legendary", "mythic", "divine"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors",
                  rarity === r ? "bg-amber-500/20 text-amber-200 border border-amber-500/30" : "bg-white/5 text-white/60 border border-white/10 hover:text-white",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((g, i) => {
              const style = RARITY_STYLE[g.rarity];
              const thumb = `/gift-library/${g.assets.thumbnail}`;
              return (
                <motion.button
                  key={g.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.3) }}
                  onClick={() => playGift(g)}
                  className={cn(
                    "text-left rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b to-transparent p-0 ring-1",
                    style.ring,
                    style.glow,
                    "hover:border-white/25 transition-all group",
                  )}
                >
                  <div className="aspect-square relative bg-[#0a0e1a] overflow-hidden">
                    <img
                      src={thumb}
                      alt={g.name}
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-transparent to-transparent" />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/50 border border-white/10", style.text)}>
                        {style.label}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-black">
                        <Play className="h-3 w-3" /> Play
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white leading-snug">{g.name}</h3>
                      <span className="text-xs font-mono text-amber-300/90 shrink-0">{formatCoins(g.priceCoins)}</span>
                    </div>
                    <p className="text-[11px] text-white/55 line-clamp-2 leading-relaxed">{g.story}</p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-white/40">
                      <span>{g.durationSec}s</span>
                      <span>·</span>
                      <span>{g.performance.particles} fx</span>
                      <span>·</span>
                      <span className="truncate">{g.qualityTarget.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {catalog && (
            <p className="mt-4 text-xs text-white/40">
              Showing {filtered.length} / {catalog.count} · {catalog.policy}
            </p>
          )}
        </div>

        {/* Stage player */}
        <div className="lg:sticky lg:top-20 h-fit space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[#070b16] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-bold text-white">Live Stage</span>
              </div>
              {beat && (
                <span className="text-[10px] uppercase tracking-wider text-violet-300/80">{beat}</span>
              )}
            </div>
            <div className="aspect-square relative bg-[radial-gradient(circle_at_50%_40%,#1a2240_0%,#070b16_70%)]">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {!selected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <Gift className="h-10 w-10 text-white/15 mb-3" />
                  <p className="text-sm text-white/50">Select a gift to play its cinematic runtime</p>
                </div>
              )}
              {playing && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-bold text-red-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" /> PLAYING
                </div>
              )}
            </div>
            {selected && (
              <div className="p-4 space-y-2 border-t border-white/8">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-black text-white">{selected.name}</h2>
                  <span className={cn("text-xs font-bold uppercase", RARITY_STYLE[selected.rarity].text)}>
                    {selected.rarity}
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{selected.story}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => playGift(selected)}
                    disabled={playing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" /> Replay
                  </button>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70">
                    <Crown className="h-3 w-3 text-amber-300" /> {formatCoins(selected.priceCoins)} coins
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70">
                    <Zap className="h-3 w-3 text-violet-300" /> AI + Avatar sync
                  </span>
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2"
              >
                <div className="flex items-center gap-2 text-emerald-300 text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Runtime test passed
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                  <div>FPS <span className="text-white font-mono font-bold">{stats.fps}</span></div>
                  <div>Frame <span className="text-white font-mono font-bold">{stats.frameMs}ms</span></div>
                  <div>Particles <span className="text-white font-mono font-bold">{stats.particles}</span></div>
                  <div>GLB <span className="text-white font-mono font-bold">{stats.usedGlb ? "yes" : "procedural"}</span></div>
                  {stats.memoryMB != null && (
                    <div>Heap <span className="text-white font-mono font-bold">{stats.memoryMB} MB</span></div>
                  )}
                  <div>Duration <span className="text-white font-mono font-bold">{(stats.durationMs / 1000).toFixed(1)}s</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {combo.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-orange-300" />
                <span className="text-xs font-bold text-white/80">Combo chain</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {combo.map((slug, i) => (
                  <span key={`${slug}-${i}`} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-200 border border-orange-500/20">
                    {slug}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-white/45 mt-2">Gifts can chain — Divine gifts may trigger global room events.</p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-[11px] text-white/55">
            <div className="flex items-center gap-2 text-white/80 text-xs font-bold">
              <Star className="h-3.5 w-3.5 text-amber-300" /> Interaction matrix
            </div>
            <p>AI shout-out · Avatar emotion · Streamer overlay flash · Chat emote burst · Gift-to-gift combo tags</p>
          </div>
        </div>
      </div>
    </div>
  );
}
