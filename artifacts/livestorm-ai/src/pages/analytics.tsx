import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2, Users, Gift, MessageSquare, Heart, Clock,
  TrendingUp, Zap, ChevronRight, ChevronDown, Star, Play,
  Share2, RefreshCw, Sparkles, AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero, GradientText, AnimatedCounter } from "@/components/ui/premium";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, token?: string | null) {
  const resp = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return resp.json();
}

function formatDuration(seconds: number) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CssBar({ value, max, colorClass = "bg-violet-500" }: { value: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type Session = {
  id: number;
  streamerId: number;
  startedAt: string;
  endedAt: string | null;
  peakViewers: number;
  totalGifts: number;
  totalLikes: number;
  totalFollowers: number;
  totalComments: number;
  totalShares: number;
};

type SessionStats = {
  id: number;
  streamerId: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  peakViewers: number;
  totalGifts: number;
  totalLikes: number;
  totalFollowers: number;
  totalComments: number;
  totalShares: number;
};

type InsightsResponse = {
  insights: string[] | null;
  tooFewSessions: boolean;
  sessionCount?: number;
  fromCache?: boolean;
  cachedAt?: string;
};

// ── AI Insights panel ─────────────────────────────────────────────────────────
function InsightsPanel({ sessionCount }: { sessionCount: number }) {
  const { getToken } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<InsightsResponse>({
    queryKey: ["analytics-insights", refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const forceRefresh = refreshKey > 0;
      return apiFetch(`/analytics/insights${forceRefresh ? "?refresh=true" : ""}`, token);
    },
    staleTime: 30 * 60 * 1000, // consider fresh for 30min on client
    retry: 1,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-r from-violet-500/[0.06] to-pink-500/[0.04] p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-500/15">
            <Star className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">AI Recommendations</p>
            {data?.fromCache && data.cachedAt && (
              <p className="text-[10px] text-muted-foreground/50">
                Generated {format(new Date(data.cachedAt), "MMM d · HH:mm")}
              </p>
            )}
          </div>
        </div>
        {!data?.tooFewSessions && (
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-300 transition-colors px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-violet-400/30 hover:bg-violet-500/10"
          >
            <RefreshCw className={cn("h-3 w-3", (isLoading || isRefreshing) && "animate-spin")} />
            Refresh Insights
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2">
              <Skeleton className="h-3 w-3/4 bg-white/5" />
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-2/3 bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {/* Too few sessions */}
      {!isLoading && data?.tooFewSessions && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="p-2 rounded-lg bg-amber-500/15 flex-shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Not enough data yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You have {data.sessionCount ?? sessionCount} session{(data.sessionCount ?? 0) === 1 ? "" : "s"} recorded. 
              Run at least 2 streams to unlock AI-powered personalized recommendations based on your real performance.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Failed to load recommendations. Try refreshing.</p>
          </div>
        </div>
      )}

      {/* Insights */}
      {!isLoading && !error && data?.insights && data.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.insights.map((tip, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex gap-2.5">
              <span className="text-violet-400 font-black text-sm shrink-0 mt-px">{i + 1}.</span>
              <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Analytics() {
  const { t } = useLanguage();
  const { getToken } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch("/sessions", token);
    },
  });

  const { data: expandedStats, isLoading: loadingStats } = useQuery<SessionStats>({
    queryKey: ["session-stats", expandedId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch(`/sessions/${expandedId}/stats`, token);
    },
    enabled: expandedId !== null,
  });

  const { data: liveStats } = useQuery({
    queryKey: ["streamer-live-analytics"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch("/streamers/me", token);
    },
    refetchInterval: 10000,
  });

  const totalSessions = sessions?.length ?? 0;
  const totalGifts    = sessions?.reduce((s, sess) => s + (sess.totalGifts ?? 0), 0) ?? 0;
  const maxPeak       = sessions?.reduce((m, sess) => Math.max(m, sess.peakViewers ?? 0), 0) ?? 0;
  const avgPeak       = sessions?.length
    ? Math.round(sessions.reduce((s, sess) => s + (sess.peakViewers ?? 0), 0) / sessions.length)
    : 0;

  const hasEnoughData = totalSessions >= 1;
  const [period, setPeriod] = useState<"day" | "7d" | "30d" | "month">("7d");

  const nowMs = Date.now();
  const filteredSessions = sessions?.filter(s => {
    const age = nowMs - new Date(s.startedAt).getTime();
    if (period === "day")   return age <  86_400_000;
    if (period === "7d")    return age <  7 * 86_400_000;
    if (period === "30d")   return age < 30 * 86_400_000;
    if (period === "month") return new Date(s.startedAt).getMonth() === new Date().getMonth();
    return true;
  }) ?? [];
  const fGifts = filteredSessions.reduce((a, s) => a + (s.totalGifts ?? 0), 0);
  const fFollowers = filteredSessions.reduce((a, s) => a + (s.totalFollowers ?? 0), 0);
  const fPeak = filteredSessions.reduce((m, s) => Math.max(m, s.peakViewers ?? 0), 0);
  const fDuration = filteredSessions.reduce((a, s) =>
    s.endedAt ? a + (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000 : a, 0);

  const PERIOD_LABELS: Record<string, string> = { day: "День", "7d": "7 днів", "30d": "30 днів", month: "Місяць" };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url('/analytics-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header + period selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/50 mb-0.5">Insight Hub</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Analytics</h1>
          <p className="text-sm text-white/30 mt-0.5">
            {liveStats && (liveStats as any).isLive ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-emerald-400 font-semibold">Live now · {(liveStats as any).viewerCount ?? 0} viewers</span>
              </span>
            ) : "Your stream performance data"}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] self-start">
          {(["day", "7d", "30d", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                period === p
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Clock className="h-5 w-5" />,    label: "Час перегляду",  value: isLoading ? "—" : formatDuration(fDuration),            delta: "+6%",  iconBg: "bg-blue-500/12",   iconColor: "text-blue-400",   border: "border-blue-500/[0.12]"   },
          { icon: <Gift className="h-5 w-5" />,     label: "Подарунки",      value: isLoading ? "—" : fGifts.toLocaleString(),               delta: "+115%", iconBg: "bg-amber-500/12",  iconColor: "text-amber-400",  border: "border-amber-500/[0.12]"  },
          { icon: <Users className="h-5 w-5" />,    label: "Підписники",     value: isLoading ? "—" : `+${fFollowers.toLocaleString()}`,      delta: "+10%", iconBg: "bg-violet-500/12", iconColor: "text-violet-400", border: "border-violet-500/[0.12]" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-5 hover:bg-white/[0.025] transition-all", s.border)}
            style={{ background: "rgba(255,255,255,0.018)" }}>
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", s.iconBg)}>
                <span className={s.iconColor}>{s.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                {s.delta}
              </span>
            </div>
            <div className="text-3xl font-black text-white tabular-nums mb-1">
              {isLoading ? <Skeleton className="h-9 w-20 bg-white/5" /> : s.value}
            </div>
            <div className="text-xs text-white/30">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sparkline chart */}
      {filteredSessions.length >= 2 && (() => {
        const raw = filteredSessions.slice(-30).map(s => s.peakViewers ?? 0);
        const maxV = Math.max(...raw, 1);
        const minV = Math.min(...raw);
        const W = 400, H = 80, pad = 6;
        const pts = raw.map((v, i) => ({
          x: pad + (i / Math.max(raw.length - 1, 1)) * (W - 2 * pad),
          y: H - pad - ((v - minV) / Math.max(maxV - minV, 1)) * (H - 2 * pad),
        }));
        const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        const fillD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
        return (
          <div className="rounded-2xl border border-violet-500/12 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.05]">
              <div>
                <p className="text-sm font-semibold text-white">Пікові глядачі</p>
                <p className="text-xs text-white/25 mt-0.5">{filteredSessions.length} сесій за цей період</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/25">
                <span className="flex items-center gap-1.5"><div className="w-5 h-0.5 rounded-full bg-violet-400 opacity-70" />Глядачі</span>
                <span className="text-white/35 font-mono">Пік: {fPeak}</span>
              </div>
            </div>
            <div className="px-4 pb-3 pt-2">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 sm:h-24" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={fillD} fill="url(#chart-fill)" />
                <path d={lineD} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {pts.length > 0 && (
                  <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#a78bfa" filter="drop-shadow(0 0 4px #7c3aed)" />
                )}
              </svg>
            </div>
            <div className="px-5 py-2.5 border-t border-white/[0.05] flex items-center justify-end">
              <button className="text-xs text-violet-400/50 hover:text-violet-300 transition-colors">
                Детальна аналітика →
              </button>
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {!isLoading && totalSessions === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-fit mx-auto mb-4">
            <Zap className="h-10 w-10 text-emerald-400/60" />
          </div>
          <p className="text-lg font-bold text-white mb-2">No streams yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Go live for the first time to start building your analytics. Your viewer counts, gifts, and engagement stats will appear here after your first stream.
          </p>
        </div>
      )}

      {/* AI Insights */}
      {hasEnoughData && <InsightsPanel sessionCount={totalSessions} />}

      {/* Session list */}
      {hasEnoughData && (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.07]">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{t("analytics_sessions")}</p>
              <p className="text-xs text-muted-foreground">{t("analytics_sessions_desc")}</p>
            </div>
            <span className="ml-auto text-xs font-bold text-white/20 tabular-nums">
              {filteredSessions.length} sessions
            </span>
          </div>

          <div className="p-4 space-y-2">
            {isLoading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}

            {filteredSessions.map((sess, idx) => {
              const isExpanded = expandedId === sess.id;
              const duration = sess.endedAt && sess.startedAt
                ? Math.round((new Date(sess.endedAt).getTime() - new Date(sess.startedAt).getTime()) / 1000)
                : null;

              return (
                <motion.div
                  key={sess.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-xl border border-white/[0.06] overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : sess.id)}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      sess.endedAt ? "bg-slate-500/15 border border-slate-500/20" : "bg-emerald-500/15 border border-emerald-500/20",
                    )}>
                      {sess.endedAt ? <Clock className="h-4 w-4 text-slate-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {sess.startedAt ? format(new Date(sess.startedAt), "MMM d, HH:mm") : "Session"}
                        </span>
                        {!sess.endedAt && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">LIVE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {duration !== null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(duration)}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{sess.peakViewers ?? 0} peak</span>
                        <span className="flex items-center gap-1 text-amber-400/60"><Gift className="h-3 w-3" />{sess.totalGifts ?? 0}</span>
                        <span className="flex items-center gap-1 text-blue-400/60"><MessageSquare className="h-3 w-3" />{sess.totalComments ?? 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex gap-1.5 items-end h-5">
                        {[
                          { v: sess.totalGifts,    color: "bg-amber-400", max: 100 },
                          { v: sess.totalLikes,    color: "bg-pink-400",  max: 500 },
                          { v: sess.totalComments, color: "bg-blue-400",  max: 200 },
                        ].map((bar, i) => (
                          <div key={i} className={cn("w-1.5 rounded-sm", bar.color)}
                            style={{ height: `${Math.max(4, Math.min(20, (bar.v / bar.max) * 20))}px`, opacity: 0.7 }} />
                        ))}
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-3 border-t border-white/[0.05] space-y-4">
                          {loadingStats ? (
                            <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
                          ) : expandedStats ? (
                            <>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                  { label: t("analytics_duration"),     value: formatDuration(expandedStats.durationSeconds),  icon: <Clock className="h-3.5 w-3.5" />,         color: "text-slate-400",  iconBg: "bg-slate-500/10"  },
                                  { label: t("analytics_peak_viewers"), value: expandedStats.peakViewers.toLocaleString(),      icon: <Users className="h-3.5 w-3.5" />,         color: "text-blue-400",   iconBg: "bg-blue-500/10"   },
                                  { label: t("analytics_total_gifts"),  value: expandedStats.totalGifts.toLocaleString(),       icon: <Gift className="h-3.5 w-3.5" />,          color: "text-amber-400",  iconBg: "bg-amber-500/10"  },
                                  { label: t("analytics_comments"),     value: expandedStats.totalComments.toLocaleString(),    icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-violet-400", iconBg: "bg-violet-500/10" },
                                ].map((s) => (
                                  <div key={s.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                    <div className={cn("flex items-center gap-1.5 mb-2 text-xs", s.color)}>
                                      <div className={cn("p-1 rounded-md", s.iconBg)}>{s.icon}</div>
                                      <span className="text-muted-foreground">{s.label}</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{s.value}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("analytics_engagement")}</p>
                                {[
                                  { label: "Likes",   value: expandedStats.totalLikes,    colorClass: "bg-pink-500",  icon: <Heart className="h-3.5 w-3.5 text-pink-400" />  },
                                  { label: "Follows", value: expandedStats.totalFollowers, colorClass: "bg-green-500", icon: <Users className="h-3.5 w-3.5 text-green-400" /> },
                                  { label: "Shares",  value: expandedStats.totalShares,    colorClass: "bg-cyan-500",  icon: <Share2 className="h-3.5 w-3.5 text-cyan-400" /> },
                                ].map((item) => {
                                  const maxVal = Math.max(expandedStats.totalLikes, expandedStats.totalFollowers, expandedStats.totalShares, 1);
                                  return (
                                    <div key={item.label} className="flex items-center gap-3">
                                      {item.icon}
                                      <span className="text-xs text-muted-foreground w-14 shrink-0">{item.label}</span>
                                      <div className="flex-1"><CssBar value={item.value} max={maxVal} colorClass={item.colorClass} /></div>
                                      <span className="text-xs font-bold text-white w-10 text-right shrink-0">{item.value.toLocaleString()}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
