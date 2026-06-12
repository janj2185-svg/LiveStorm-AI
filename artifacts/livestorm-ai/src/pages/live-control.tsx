import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Radio, Plug, Activity, ShieldAlert, Layers, Cpu,
  Wifi, WifiOff, PlayCircle, ChevronRight, Eye,
  MessageSquare, Gift, Heart, UserPlus,
} from "lucide-react";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";
import { useGetMyProfile } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { PulsingDot } from "@/components/ui/premium";
import { useLanguage } from "@/contexts/LanguageContext";

export function LiveControl() {
  const { connected, stats, activeSessionRes } = useLiveSessionContext();
  const { data: profile } = useGetMyProfile();
  const { t } = useLanguage();
  const isActive = activeSessionRes?.active;

  const SUB_PAGES = [
    {
      label: t("nav_lc_overview"),
      desc: t("lc_overview_desc"),
      href: "/live-control",
      icon: Radio,
      color: "violet",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
      border: "border-violet-500/20",
      active: true,
    },
    {
      label: t("nav_lc_connection"),
      desc: t("lc_connection_desc"),
      href: "/platforms",
      icon: Plug,
      color: "cyan",
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
      border: "border-cyan-500/20",
    },
    {
      label: t("nav_lc_events"),
      desc: t("lc_events_desc"),
      href: "/live-studio",
      icon: Activity,
      color: "blue",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      border: "border-blue-500/20",
    },
    {
      label: t("nav_lc_moderation"),
      desc: t("lc_moderation_desc"),
      href: "/moderation",
      icon: ShieldAlert,
      color: "orange",
      iconBg: "bg-orange-500/15",
      iconColor: "text-orange-400",
      border: "border-orange-500/20",
    },
    {
      label: t("nav_lc_overlays"),
      desc: t("lc_overlays_desc"),
      href: "/overlays",
      icon: Layers,
      color: "indigo",
      iconBg: "bg-indigo-500/15",
      iconColor: "text-indigo-400",
      border: "border-indigo-500/20",
    },
    {
      label: t("nav_lc_diagnostics"),
      desc: t("lc_diagnostics_desc"),
      href: "/live-control/diagnostics",
      icon: Cpu,
      color: "slate",
      iconBg: "bg-slate-500/15",
      iconColor: "text-slate-400",
      border: "border-slate-500/20",
    },
  ];

  const quickStats = [
    { label: t("dash_viewers"),      value: stats.viewerCount,   icon: Eye,          color: "text-green-400" },
    { label: t("dash_stat_comments"),value: stats.totalComments, icon: MessageSquare, color: "text-blue-400" },
    { label: t("dash_gifts"),        value: stats.totalGifts,    icon: Gift,          color: "text-amber-400" },
    { label: t("dash_followers"),    value: stats.totalFollows,  icon: UserPlus,      color: "text-violet-400" },
    { label: t("dash_likes"),        value: stats.totalLikes,    icon: Heart,         color: "text-pink-400" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "rounded-2xl border p-5",
          isActive
            ? "border-green-500/25 bg-gradient-to-r from-green-500/[0.07] to-emerald-500/[0.04]"
            : "border-white/[0.08] bg-gradient-to-r from-violet-500/[0.06] to-cyan-500/[0.03]",
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border",
              isActive
                ? "bg-green-500/15 border-green-500/30"
                : "bg-violet-500/10 border-violet-500/20",
            )}>
              <Radio className={cn("h-5 w-5", isActive ? "text-green-400" : "text-violet-400")} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {isActive
                  ? <><PulsingDot color={connected ? "bg-green-400" : "bg-amber-400"} /><span className={cn("text-xs font-bold uppercase tracking-widest", connected ? "text-green-400" : "text-amber-400")}>{connected ? t("lc_live_now") : t("dash_status_reconnecting")}</span></>
                  : <><span className="h-2 w-2 rounded-full bg-slate-500 inline-block flex-shrink-0" /><span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("lc_offline")}</span></>
                }
              </div>
              <p className="font-bold text-white truncate">
                {isActive ? `${t("lc_streaming_as")} @${profile?.tiktokUsername}` : t("lc_ready_to_stream")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {profile?.tiktokUsername
                  ? `TikTok: @${profile.tiktokUsername} · ${isActive ? t("lc_session_active") : t("lc_session_inactive")}`
                  : t("lc_no_tiktok")
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected
              ? <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400"><Wifi className="h-3 w-3" /> <span className="hidden sm:inline">{t("lc_connected")}</span></div>
              : <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400"><WifiOff className="h-3 w-3" /> <span className="hidden sm:inline">{t("lc_disconnected")}</span></div>
            }
            {!isActive && (
              <Link href="/dashboard">
                <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold cursor-pointer transition-colors">
                  <PlayCircle className="h-4 w-4" />
                  {t("lc_go_live")}
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {isActive && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            {quickStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Icon className={cn("h-3 w-3 flex-shrink-0", s.color)} />
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 uppercase tracking-wider truncate">{s.label}</span>
                  </div>
                  <p className={cn("text-base sm:text-lg font-black tabular-nums", s.color)}>{s.value.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Sub-pages Grid */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-3">{t("lc_sections_title")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUB_PAGES.map((page, i) => {
            const Icon = page.icon;
            return (
              <motion.div
                key={page.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={page.href}>
                  <div className={cn(
                    "group flex items-start gap-4 p-4 rounded-2xl border cursor-pointer",
                    "bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200",
                    "hover:border-white/[0.12]",
                    page.border,
                  )}>
                    <div className={cn("p-2.5 rounded-xl flex-shrink-0 border", page.iconBg, page.border)}>
                      <Icon className={cn("h-5 w-5", page.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm group-hover:text-white transition-colors">{page.label}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 leading-snug">{page.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0 mt-0.5 transition-colors" />
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
