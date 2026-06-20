import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Zap,
  Play,
  Trophy,
  Bot,
  Activity,
  Sparkles,
  Users,
  Globe,
  ArrowRight,
  Heart,
  Gift,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function Tile({
  className = "",
  children,
  i = 0,
}: {
  className?: string;
  children: React.ReactNode;
  i?: number;
}) {
  return (
    <motion.div
      custom={i}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={
        "relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-[0_10px_40px_-12px_rgba(76,29,149,0.25)] backdrop-blur-xl " +
        className
      }
    >
      {children}
    </motion.div>
  );
}

function Orb({ emoji, from, to }: { emoji: string; from: string; to: string }) {
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 12px 30px -8px ${to}aa`,
      }}
    >
      <span style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.25))" }}>{emoji}</span>
    </div>
  );
}

export function Home() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="relative min-h-[100dvh] overflow-hidden text-slate-900">
      {/* Vibrant gradient-mesh background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 12% 10%, #c7b2ff 0%, transparent 60%)," +
            "radial-gradient(55% 55% at 88% 8%, #9ad7ff 0%, transparent 55%)," +
            "radial-gradient(60% 60% at 90% 85%, #ffc2ec 0%, transparent 55%)," +
            "radial-gradient(70% 70% at 8% 92%, #b5c8ff 0%, transparent 60%)," +
            "linear-gradient(180deg, #f3f1ff 0%, #eef4ff 100%)",
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 -z-10 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
        {/* Nav */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
              <Zap className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">LiveStorm AI</span>
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/60 px-2 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-xl md:flex">
            {["Product", "Features", "Pricing", "Partners"].map((l) => (
              <span
                key={l}
                className="cursor-pointer rounded-full px-3.5 py-1.5 transition-colors hover:bg-white hover:text-slate-900"
              >
                {l}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <button
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
                data-testid="link-login"
              >
                Log in
              </button>
            </Link>
            <Link href="/sign-up">
              <button
                className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition-transform hover:scale-[1.03]"
                data-testid="link-signup"
              >
                Sign up
              </button>
            </Link>
          </div>
        </header>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Hero */}
          <Tile i={0} className="col-span-12 p-8 md:p-10 lg:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" /> TikTok LIVE Gamification Platform
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Turn your stream into
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                a living game
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
              The TikTok LIVE platform that rewards, ranks, and grows your
              community — XP, gifts, kingdoms, boss battles and an AI co-host.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/sign-up">
                <button className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-fuchsia-500/30 transition-transform hover:scale-[1.03]">
                  Start your adventure
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white">
                <Play className="h-4 w-4 fill-violet-600 text-violet-600" /> Watch demo
              </button>
            </div>
          </Tile>

          {/* Phone / LIVE */}
          <Tile i={1} className="col-span-12 p-5 sm:col-span-6 lg:col-span-5 lg:row-span-2">
            <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
            </div>
            <div className="relative mx-auto mt-2 h-full min-h-[360px] w-full overflow-hidden rounded-[24px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-indigo-600 p-4">
              <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,.6), transparent 40%)" }} />
              <div className="relative flex items-center gap-2 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg backdrop-blur">🎤</div>
                <div className="leading-tight">
                  <div className="text-sm font-bold">@novastorm</div>
                  <div className="text-[11px] text-white/80">2,487 watching</div>
                </div>
              </div>

              {/* floating event chips */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute left-4 top-24 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg"
              >
                <span className="text-base">⬆️</span> Level Up! <span className="text-violet-600">Lv.24</span>
              </motion.div>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.4, repeat: Infinity }}
                className="absolute right-4 top-40 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg"
              >
                <Gift className="h-4 w-4 text-fuchsia-500" /> Galaxy Gift ×12
              </motion.div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="rounded-full bg-black/25 px-3 py-2 text-xs text-white backdrop-blur">Add comment…</div>
                <div className="flex items-center gap-2 text-white">
                  <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
                  <span className="text-xs font-semibold">2.4K</span>
                </div>
              </div>
            </div>
          </Tile>

          {/* Coins & Rewards */}
          <Tile i={2} className="col-span-6 p-6 lg:col-span-4">
            <Orb emoji="🪙" from="#fbbf24" to="#f59e0b" />
            <h3 className="mt-4 text-lg font-extrabold">Coins &amp; Rewards</h3>
            <p className="mt-1 text-sm text-slate-600">Every gift, like and comment earns real value.</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
              <Zap className="h-3.5 w-3.5" /> +12,560 this week
            </div>
          </Tile>

          {/* Top Supporter */}
          <Tile i={3} className="col-span-6 p-6 lg:col-span-3">
            <Orb emoji="🏆" from="#a78bfa" to="#7c3aed" />
            <h3 className="mt-4 text-lg font-extrabold">Top Supporter</h3>
            <p className="mt-1 text-sm text-slate-600">Crown your MVP every session.</p>
          </Tile>

          {/* Kingdom */}
          <Tile i={4} className="col-span-12 p-6 sm:col-span-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <Orb emoji="🏰" from="#60a5fa" to="#6366f1" />
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">Lv.12</span>
            </div>
            <h3 className="mt-4 text-lg font-extrabold">Your Kingdom</h3>
            <p className="mt-1 text-sm text-slate-600">Viewers build &amp; defend your empire with gifts.</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </div>
          </Tile>

          {/* Boss Battles */}
          <Tile i={5} className="col-span-12 p-6 sm:col-span-6 lg:col-span-4">
            <Orb emoji="🐉" from="#f472b6" to="#a855f7" />
            <h3 className="mt-4 text-lg font-extrabold">Boss Battles</h3>
            <p className="mt-1 text-sm text-slate-600">Rally the chat to defeat epic shared bosses.</p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>Shadowfire Drake</span>
                <span>64%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500" />
              </div>
            </div>
          </Tile>

          {/* Leaderboard */}
          <Tile i={6} className="col-span-12 p-6 sm:col-span-6 lg:col-span-4">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-extrabold">Leaderboard</h3>
            </div>
            <ul className="space-y-2.5">
              {[
                ["🥇", "StarGazer", "245.6K"],
                ["🥈", "Moonlight", "198.3K"],
                ["🥉", "DragonSlayer", "156.7K"],
              ].map(([medal, name, xp]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <span>{medal}</span> {name}
                  </span>
                  <span className="font-bold text-violet-600">{xp} XP</span>
                </li>
              ))}
            </ul>
          </Tile>

          {/* AI Co-Host */}
          <Tile i={7} className="col-span-12 p-6 lg:col-span-8">
            <div className="flex items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-3xl shadow-lg shadow-cyan-400/40">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold">AI Co-Host</h3>
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-bold text-cyan-700">Nova</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Your smart companion welcomes viewers, hypes gifts, replies in any
                  language and moderates chat — automatically.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-white">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  "Let's boost the energy! Shall we start a challenge? ⚡"
                </div>
              </div>
            </div>
          </Tile>
        </div>

        {/* Feature strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-full border border-white/60 bg-white/50 px-6 py-4 text-sm font-semibold text-slate-600 backdrop-blur-xl">
          <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-violet-600" /> Real-time Engagement</span>
          <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Gamified Rewards</span>
          <span className="flex items-center gap-2"><Bot className="h-4 w-4 text-cyan-600" /> AI-Powered</span>
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-fuchsia-600" /> Community First</span>
          <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-indigo-600" /> Cross-Platform</span>
        </div>

        <footer className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-400">
          <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5 opacity-60" />
          © {new Date().getFullYear()} LiveStorm AI. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
