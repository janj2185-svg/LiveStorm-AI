/**
 * Gift Reactions catalog — honest TikTok/demo gift event → platform reaction map.
 * This is NOT a Gift Store / Wallet. AAA store assets require approval:
 * docs/GIFTS_AAA_PIPELINE_PLAN.md
 */
import { Link } from "wouter";
import { Gift, Sparkles, Sword, Coins, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const REACTIONS = [
  {
    tier: "Common",
    coins: "1–49",
    examples: "Rose, TikTok, GG",
    ai: "Short thank-you, light energy",
    avatar: "gift_reaction (subtle)",
    game: "XP + small gold",
    color: "border-slate-500/30 bg-slate-500/10",
  },
  {
    tier: "Rare",
    coins: "50–199",
    examples: "Perfume, Doughnut",
    ai: "Named shout-out, warmer tone",
    avatar: "gift_reaction + smile",
    game: "XP + gold + lucky-drop chance",
    color: "border-cyan-500/30 bg-cyan-500/10",
  },
  {
    tier: "Epic",
    coins: "200–999",
    examples: "Universe, Lion",
    ai: "Hype announcement, crowd call",
    avatar: "excited gift reaction",
    game: "Boss damage × coins×2",
    color: "border-violet-500/30 bg-violet-500/10",
  },
  {
    tier: "Legendary",
    coins: "1000+",
    examples: "Drama Queen, Lion",
    ai: "Priority queue P1–P2 announcement",
    avatar: "full celebration",
    game: "Major XP + boss spike + drop",
    color: "border-amber-500/30 bg-amber-500/10",
  },
] as const;

export function GiftReactions() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="rounded-2xl border border-white/10 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url('/gifts-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative p-8 bg-gradient-to-r from-[#0b1020]/95 to-[#0b1020]/70">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-300/90 mb-2">GIFT REACTIONS</p>
          <h1 className="text-3xl font-black text-white mb-2">How gifts power the live room</h1>
          <p className="text-sm text-white/75 max-w-2xl">
            LiveStorm reacts to TikTok (or demo) gift events with AI voice, avatar motion, OBS alerts, and gamification.
            There is no first-party Gift Store or Wallet in this build.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-100/90 space-y-1">
          <p className="font-semibold text-amber-200">AAA Gift Gallery / Store / Wallet — not shipped</p>
          <p>
            3D particles, shaders, and purchasable packs require a professional pipeline (Blender / Unreal / Houdini / studio).
            See the approval plan before we build it.
          </p>
          <p className="text-xs text-amber-100/80">
            See <code className="text-amber-200">docs/GIFTS_AAA_PIPELINE_PLAN.md</code> in this repo — requires your approval before we build it.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {REACTIONS.map((r, i) => (
          <motion.div
            key={r.tier}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border p-5 ${r.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                <span className="font-bold text-white">{r.tier}</span>
              </div>
              <span className="text-xs font-mono text-white/70">{r.coins} coins</span>
            </div>
            <p className="text-xs text-white/65 mb-3">Examples: {r.examples}</p>
            <ul className="space-y-2 text-sm text-white/85">
              <li className="flex gap-2"><Sparkles className="h-4 w-4 text-violet-300 shrink-0" /><span><strong>AI:</strong> {r.ai}</span></li>
              <li className="flex gap-2"><Gift className="h-4 w-4 text-pink-300 shrink-0" /><span><strong>Avatar:</strong> {r.avatar}</span></li>
              <li className="flex gap-2"><Sword className="h-4 w-4 text-red-300 shrink-0" /><span><strong>Game:</strong> {r.game}</span></li>
              <li className="flex gap-2"><Coins className="h-4 w-4 text-amber-300 shrink-0" /><span><strong>Kingdom:</strong> gold from gifts</span></li>
            </ul>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/ai-assistant">
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold cursor-pointer">
            Test in AI Co-Host
          </span>
        </Link>
        <Link href="/boss-battle">
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold cursor-pointer">
            Boss damage from gifts
          </span>
        </Link>
        <Link href="/overlays">
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold cursor-pointer">
            OBS gift alerts
          </span>
        </Link>
      </div>
    </div>
  );
}
