import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Trophy, Sword, Gamepad2, Castle, Globe, ChevronRight,
  Zap, Crown, Star, Users, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export function Games() {
  const { t } = useLanguage();

  const GAME_MODES = [
    {
      label: t("games_mode_gamification"),
      desc: t("games_mode_gamification_desc"),
      href: "/gamification",
      icon: Trophy,
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
      border: "border-amber-500/20",
      gradient: "from-amber-500/[0.08] to-orange-500/[0.04]",
      badge: "XP & Levels",
      badgeColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
      stats: ["Viewer XP", "Level-ups", "Leaderboard"],
      comingSoon: false,
    },
    {
      label: t("games_mode_bossbattle"),
      desc: t("games_mode_bossbattle_desc"),
      href: "/boss-battle",
      icon: Sword,
      iconBg: "bg-red-500/15",
      iconColor: "text-red-400",
      border: "border-red-500/20",
      gradient: "from-red-500/[0.08] to-rose-500/[0.04]",
      badge: "Co-op",
      badgeColor: "text-red-300 bg-red-500/15 border-red-500/30",
      stats: ["Boss HP", "Damage Dealt", "Rewards"],
      comingSoon: true,
    },
    {
      label: t("games_mode_minigames"),
      desc: t("games_mode_minigames_desc"),
      href: "/mini-games",
      icon: Gamepad2,
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
      border: "border-cyan-500/20",
      gradient: "from-cyan-500/[0.08] to-sky-500/[0.04]",
      badge: "Interactive",
      badgeColor: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
      stats: ["Lucky Draw", "Quiz", "Treasure Hunt"],
      comingSoon: true,
    },
    {
      label: t("games_mode_kingdom"),
      desc: t("games_mode_kingdom_desc"),
      href: "/kingdom",
      icon: Castle,
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
      border: "border-violet-500/20",
      gradient: "from-violet-500/[0.08] to-purple-500/[0.04]",
      badge: "Build",
      badgeColor: "text-violet-300 bg-violet-500/15 border-violet-500/30",
      stats: ["Buildings", "Resources", "Upgrades"],
      comingSoon: true,
    },
    {
      label: t("games_mode_universe"),
      desc: t("games_mode_universe_desc"),
      href: "/universe",
      icon: Globe,
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      border: "border-blue-500/20",
      gradient: "from-blue-500/[0.08] to-indigo-500/[0.04]",
      badge: "Global",
      badgeColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
      stats: ["Rankings", "Alliances", "Seasons"],
      comingSoon: true,
    },
  ];

  const FEATURE_HIGHLIGHTS = [
    { icon: Zap,   label: t("games_feat_xp"),          desc: t("games_feat_xp_desc"),          color: "text-yellow-400" },
    { icon: Crown, label: t("games_feat_leaderboard"),  desc: t("games_feat_leaderboard_desc"), color: "text-amber-400"  },
    { icon: Star,  label: t("games_feat_achievements"), desc: t("games_feat_achievements_desc"), color: "text-violet-400" },
    { icon: Users, label: t("games_feat_coop"),         desc: t("games_feat_coop_desc"),        color: "text-cyan-400"   },
  ];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-cyan-500/20 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(124,58,237,0.06) 100%)" }}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/15">
              <Gamepad2 className="h-7 w-7 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{t("games_title")}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 font-semibold">{t("games_modes_count")}</span>
              </div>
              <h1 className="text-xl font-black text-white">{t("games_engage_title")}</h1>
              <p className="text-sm text-muted-foreground">{t("games_engage_desc")}</p>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURE_HIGHLIGHTS.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <Icon className={cn("h-4 w-4 flex-shrink-0", f.color)} />
                  <div>
                    <p className="text-xs font-semibold text-white">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Game Modes */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-3">{t("games_game_modes")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAME_MODES.map((game, i) => {
            const Icon = game.icon;

            if (game.comingSoon) {
              return (
                <motion.div
                  key={game.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                >
                  <div className={cn(
                    "group p-5 rounded-2xl border",
                    "bg-gradient-to-br opacity-50 cursor-not-allowed select-none",
                    game.gradient,
                    game.border,
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3 rounded-xl flex-shrink-0 border shadow-inner", game.iconBg, game.border)}>
                        <Icon className={cn("h-6 w-6", game.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-white">{game.label}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-bold text-white/50 bg-white/5 border-white/10 flex items-center gap-1">
                            <Lock className="h-2 w-2" />Coming Soon
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">{game.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {game.stats.map((stat) => (
                            <span
                              key={stat}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.07] text-muted-foreground/40"
                            >
                              {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={game.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <Link href={game.href}>
                  <div className={cn(
                    "group p-5 rounded-2xl border cursor-pointer",
                    "bg-gradient-to-br transition-all duration-200",
                    "hover:border-white/[0.15] hover:bg-white/[0.04]",
                    game.gradient,
                    game.border,
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3 rounded-xl flex-shrink-0 border shadow-inner", game.iconBg, game.border)}>
                        <Icon className={cn("h-6 w-6", game.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-white">{game.label}</p>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-bold", game.badgeColor)}>
                            {game.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">{game.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {game.stats.map((stat) => (
                            <span
                              key={stat}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.07] text-muted-foreground/60"
                            >
                              {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
