import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Radio, Plug, Activity, ShieldAlert, Layers, Cpu,
  Wifi, WifiOff, PlayCircle, ChevronRight, Eye,
  MessageSquare, Gift, Heart, UserPlus, Monitor,
  BarChart3, Zap, Settings, ArrowRight,
} from "lucide-react";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";
import { useGetMyProfile } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { PulsingDot } from "@/components/ui/premium";
import { GlassCard } from "@/components/ui/glass";

interface SubPage {
  label: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  border: string;
  gradient: string;
  badge?: string;
  badgeColor?: string;
}

const SUB_PAGES: SubPage[] = [
  {
    label: "Overview",
    desc: "Session status, controls and live stats",
    href: "/live-control",
    icon: Radio,
    gradient: "from-violet-500/30 to-purple-500/10",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
    badge: "Active",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  {
    label: "Connection",
    desc: "TikTok & YouTube platform settings",
    href: "/platforms",
    icon: Plug,
    gradient: "from-cyan-500/25 to-blue-500/10",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/18",
  },
  {
    label: "Event Feed",
    desc: "Live event stream & automation rules",
    href: "/live-studio",
    icon: Activity,
    gradient: "from-blue-500/25 to-indigo-500/10",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    border: "border-blue-500/18",
  },
  {
    label: "Moderation",
    desc: "Flagged comments & safety controls",
    href: "/moderation",
    icon: ShieldAlert,
    gradient: "from-orange-500/25 to-red-500/10",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
    border: "border-orange-500/18",
  },
  {
    label: "Overlays",
    desc: "OBS overlays & display widgets",
    href: "/overlays",
    icon: Layers,
    gradient: "from-indigo-500/25 to-violet-500/10",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
    border: "border-indigo-500/18",
  },
  {
    label: "Diagnostics",
    desc: "Connection debug & system health",
    href: "/dashboard",
    icon: Cpu,
    gradient: "from-slate-500/20 to-slate-600/8",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-400",
    border: "border-slate-500/15",
  },
];

const QUICK_ACTIONS = [
  { label: "Go Live",   href: "/dashboard",    icon: PlayCircle, color: "violet", desc: "Start your broadcast" },
  { label: "AI Storm",  href: "/ai-assistant", icon: Zap,        color: "purple", desc: "Configure AI co-host" },
  { label: "Analytics", href: "/analytics",    icon: BarChart3,  color: "cyan",   desc: "View session stats" },
  { label: "Settings",  href: "/settings",     icon: Settings,   color: "slate",  desc: "Platform settings" },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", icon: "text-violet-400", text: "text-violet-300" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", icon: "text-purple-400", text: "text-purple-300" },
  cyan:   { bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   icon: "text-cyan-400",   text: "text-cyan-300" },
  slate:  { bg: "bg-white/[0.04]",  border: "border-white/[0.08]",  icon: "text-white/70",   text: "text-white/65" },
};

export function LiveControl() {
  const { connected, stats, activeSessionRes } = useLiveSessionContext();
  const { data: profile } = useGetMyProfile();
  const isActive = activeSessionRes?.active;

  const quickStats = [
    { label: "Viewers",  value: stats.viewerCount,   icon: Eye,           color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
    { label: "Comments", value: stats.totalComments, icon: MessageSquare, color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Gifts",    value: stats.totalGifts,    icon: Gift,          color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Follows",  value: stats.totalFollows,  icon: UserPlus,      color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { label: "Likes",    value: stats.totalLikes,    icon: Heart,         color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url('/scenes-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
    <div className="space-y-5 max-w-5xl">

      {/* ── Status Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl border",
          isActive
            ? "border-green-500/22 shadow-lg shadow-green-500/[0.07]"
            : "border-violet-500/18 shadow-lg shadow-violet-500/[0.05]",
        )} style={{
          background: isActive
            ? "linear-gradient(135deg,rgba(22,163,74,.10) 0%,rgba(5,150,105,.05) 50%,rgba(6,182,212,.03) 100%)"
            : "linear-gradient(135deg,rgba(124,58,237,.10) 0%,rgba(109,40,217,.06) 50%,rgba(14,165,233,.04) 100%)",
        }}>
          {/* Decorative */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle,${isActive ? "rgba(34,197,94,.4)" : "rgba(139,92,246,.4)"} 0%,transparent 70%)` }} />
            <div className="absolute inset-0" style={{
              backgroundImage: "linear-gradient(rgba(139,92,246,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.025) 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }} />
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left */}
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-lg",
                  isActive
                    ? "bg-green-500/15 border-green-500/28 shadow-green-500/15"
                    : "bg-violet-500/12 border-violet-500/22 shadow-violet-500/10",
                )}>
                  <Radio className={cn("h-6 w-6", isActive ? "text-green-400" : "text-violet-400")} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isActive
                      ? <><PulsingDot color={connected ? "bg-green-400" : "bg-amber-400"} />
                          <span className={cn("text-xs font-bold uppercase tracking-widest", connected ? "text-green-400" : "text-amber-400")}>
                            {connected ? "Live Now" : "Reconnecting…"}
                          </span>
                        </>
                      : <><span className="h-2 w-2 rounded-full bg-slate-500 inline-block flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Offline</span>
                        </>
                    }
                  </div>
                  <p className="font-black text-white text-xl leading-tight truncate">
                    {isActive
                      ? `Streaming as @${profile?.tiktokUsername}`
                      : "Ready to stream"}
                  </p>
                  <p className="text-xs text-white/65 mt-0.5 truncate">
                    {profile?.tiktokUsername
                      ? `TikTok: @${profile.tiktokUsername} · ${isActive ? "Session active" : "Session inactive"}`
                      : "No TikTok account connected"}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 flex-wrap">
                {connected
                  ? <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/12 border border-green-500/22 text-xs font-semibold text-green-400">
                      <Wifi className="h-3.5 w-3.5" /><span className="hidden sm:inline">Connected</span>
                    </div>
                  : <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/12 border border-red-500/22 text-xs font-semibold text-red-400">
                      <WifiOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">Disconnected</span>
                    </div>
                }
                {!isActive && (
                  <Link href="/dashboard">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-bold cursor-pointer transition-all shadow-lg shadow-violet-500/25">
                      <PlayCircle className="h-4 w-4" />
                      Go Live
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Live stats row */}
            {isActive && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-white/[0.07]">
                {quickStats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border",
                      s.bg,
                    )}>
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5", s.color)} />
                        <span className="text-[10px] text-white/68 uppercase tracking-wider font-medium">{s.label}</span>
                      </div>
                      <p className={cn("text-xl font-black tabular-nums", s.color)}>{s.value.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions (offline only) ── */}
      {!isActive && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            const c = COLOR_MAP[action.color];
            return (
              <Link key={action.href} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: 0.1 + i * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "group p-4 rounded-2xl border cursor-pointer transition-all duration-200",
                    c.bg, c.border,
                  )}
                >
                  <Icon className={cn("h-6 w-6 mb-3", c.icon)} />
                  <p className="text-sm font-bold text-white mb-0.5">{action.label}</p>
                  <p className="text-[11px] text-white/65">{action.desc}</p>
                  <div className="flex items-center gap-1 mt-3">
                    <ArrowRight className={cn("h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform", c.text)} />
                    <span className={cn("text-[10px] font-semibold", c.text)}>Open</span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      )}

      {/* ── Sub-pages Grid ── */}
      <div>
        <p className="text-[11px] font-bold text-white/72 uppercase tracking-[0.14em] mb-3">Studio Sections</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUB_PAGES.map((page, i) => {
            const Icon = page.icon;
            return (
              <motion.div
                key={page.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <Link href={page.href}>
                  <div className={cn(
                    "group relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer",
                    "bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200",
                    page.border,
                  )}>
                    {/* Gradient top bar */}
                    <div className={cn(
                      "absolute top-0 inset-x-0 h-[1px] rounded-t-2xl opacity-70",
                      `bg-gradient-to-r ${page.gradient}`,
                    )} />
                    <div className={cn("p-2.5 rounded-xl flex-shrink-0 border", page.iconBg, page.border)}>
                      <Icon className={cn("h-5 w-5", page.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">{page.label}</p>
                        {page.badge && page.badgeColor && (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0", page.badgeColor)}>
                            {page.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/65 leading-snug">{page.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/62 group-hover:text-white/82 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Platform Status ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
      >
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-4 w-4 text-white/40" />
            <span className="text-[11px] font-bold text-white/65 uppercase tracking-[0.12em]">Platform Status</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "TikTok",   status: profile?.tiktokUsername ? "Connected" : "Not set", ok: !!profile?.tiktokUsername },
              { label: "Socket",   status: connected ? "Active" : "Offline",                  ok: connected },
              { label: "AI Storm", status: isActive ? "Running" : "Standby",                  ok: !!isActive },
              { label: "Session",  status: isActive ? "Live" : "Idle",                        ok: !!isActive },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className={cn(
                  "h-2 w-2 rounded-full flex-shrink-0",
                  item.ok ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,.6)]" : "bg-slate-500",
                )} />
                <div>
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <p className={cn("text-[10px] font-medium", item.ok ? "text-green-400/80" : "text-white/55")}>{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
    </div>
  );
}
