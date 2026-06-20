import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Castle,
  Crown,
  Gem,
  Heart,
  MessageCircle,
  Play,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const concepts = [
  {
    eyebrow: "Concept 01",
    title: "Neon Control Room",
    description:
      "A cinematic mission-control dashboard for streamers who want every viewer action to feel immediate and premium.",
    gradient: "from-violet-500 via-fuchsia-500 to-cyan-400",
    accent: "text-cyan-200",
    cta: "Dashboard-first",
    metrics: [
      { label: "Live viewers", value: "8.4k" },
      { label: "Gift velocity", value: "+32%" },
      { label: "AI replies", value: "246" },
    ],
    features: ["Glass panels", "Live command feed", "AI co-host spotlight"],
  },
  {
    eyebrow: "Concept 02",
    title: "Creator Commerce",
    description:
      "A softer landing page that sells LiveStorm AI as a growth toolkit with packages, proof, and conversion-focused sections.",
    gradient: "from-amber-300 via-orange-400 to-rose-500",
    accent: "text-amber-100",
    cta: "Launch-ready",
    metrics: [
      { label: "Revenue lift", value: "2.8x" },
      { label: "Retention", value: "74%" },
      { label: "Set up", value: "10m" },
    ],
    features: ["Pricing-ready hero", "Creator testimonials", "Gift funnel cards"],
  },
  {
    eyebrow: "Concept 03",
    title: "Kingdom Quest",
    description:
      "A fantasy RPG interface where viewers build kingdoms, defeat bosses, and unlock stream-wide story moments.",
    gradient: "from-emerald-300 via-teal-400 to-violet-500",
    accent: "text-emerald-100",
    cta: "Most playful",
    metrics: [
      { label: "Realm level", value: "42" },
      { label: "Boss HP", value: "18%" },
      { label: "Guilds", value: "9" },
    ],
    features: ["Quest map", "Boss battle overlay", "Viewer guild progression"],
  },
];

const activity = [
  { icon: Heart, label: "Mila sent 1.2k likes", tone: "text-pink-300" },
  { icon: Gem, label: "Artem dropped Galaxy x4", tone: "text-amber-200" },
  { icon: MessageCircle, label: "AI welcomed 18 new viewers", tone: "text-cyan-200" },
];

function DesignMockup({ concept, index }: { concept: (typeof concepts)[number]; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/40"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${concept.gradient}`} />
      <div className={`absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${concept.gradient} opacity-20 blur-3xl transition-opacity group-hover:opacity-35`} />

      <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
        <div className="flex flex-col justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              <Sparkles className="h-3.5 w-3.5" />
              {concept.eyebrow}
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">{concept.title}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300 md:text-base">{concept.description}</p>
          </div>

          <div className="mt-8 space-y-3">
            {concept.features.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-slate-200">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${concept.gradient} text-slate-950`}>
                  <Zap className="h-3.5 w-3.5" />
                </span>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#070b18] p-4">
          <div className={`absolute inset-0 bg-gradient-to-br ${concept.gradient} opacity-10`} />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/85 p-4">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${concept.gradient} text-slate-950 shadow-lg`}>
                  {index === 2 ? <Castle className="h-5 w-5" /> : index === 1 ? <Crown className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">LiveStorm Studio</p>
                  <p className="text-xs text-slate-400">Broadcast is live</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                LIVE
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {concept.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className={`mt-2 text-2xl font-black ${concept.accent}`}>{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Audience pulse</p>
                  <p className="text-xs text-slate-500">last 60s</p>
                </div>
                <div className="flex h-44 items-end gap-2">
                  {[42, 64, 38, 82, 56, 94, 70, 88, 52, 76, 96, 68].map((height, barIndex) => (
                    <div
                      key={`${height}-${barIndex}`}
                      className={`flex-1 rounded-t-full bg-gradient-to-t ${concept.gradient} opacity-80`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                    <Shield className="h-4 w-4 text-violet-200" />
                    AI Co-host
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    "New guild quest unlocked. Chat, send likes, and help the realm claim bonus XP."
                  </p>
                </div>

                {activity.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                    <item.icon className={`h-4 w-4 ${item.tone}`} />
                    <span className="text-xs font-medium text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function Designs() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#050711] text-white selection:bg-cyan-400/30">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050711]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-8 w-8" />
            <span className="text-lg font-black tracking-tight">LiveStorm AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Home
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-white text-slate-950 hover:bg-cyan-100">Try it</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-4 py-20 md:py-28">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mx-auto max-w-5xl text-center"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <Wand2 className="h-4 w-4" />
                Fresh website design directions
              </div>
              <h1 className="text-5xl font-black leading-tight tracking-[-0.06em] text-white md:text-7xl">
                New visual concepts for the{" "}
                <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                  LiveStorm AI site
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Three directions you can compare right away: a neon product dashboard, a creator-sales landing page,
                and a playful RPG kingdom experience for TikTok LIVE communities.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href="#concepts">
                  <Button size="lg" className="h-13 rounded-full bg-cyan-200 px-7 font-bold text-slate-950 hover:bg-cyan-100">
                    View concepts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link href="/sign-up">
                  <Button size="lg" variant="outline" className="h-13 rounded-full border-white/15 bg-white/5 px-7 text-white hover:bg-white/10">
                    <Play className="mr-2 h-4 w-4" />
                    Start from this style
                  </Button>
                </Link>
              </div>
            </motion.div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
              {[
                { icon: Users, label: "Audience-first layouts" },
                { icon: Swords, label: "Gamified content blocks" },
                { icon: Trophy, label: "Conversion-ready sections" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur">
                  <item.icon className="mb-4 h-6 w-6 text-cyan-200" />
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Designed to fit the existing dark LiveStorm AI brand while giving each direction a distinct mood.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="concepts" className="px-4 pb-20">
          <div className="container mx-auto space-y-8">
            {concepts.map((concept, index) => (
              <DesignMockup key={concept.title} concept={concept} index={index} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
