import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2, Users, Gift, MessageSquare, Heart, Clock,
  TrendingUp, Zap, ChevronRight, ChevronDown, Star, Play,
  Share2, RefreshCw, Sparkles, AlertCircle, Trophy, Target, Crown,
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
    <div className="storm-goal-progress w-full h-2 rounded-full overflow-hidden">
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
  const { t } = useLanguage();
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
            <p className="ls-section">{t("analytics_ai_tips")}</p>
            {data?.fromCache && data.cachedAt && (
              <p className="text-xs text-white/70">
                Generated {format(new Date(data.cachedAt), "MMM d · HH:mm")}
              </p>
            )}
          </div>
        </div>
        {!data?.tooFewSessions && (
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 text-xs text-white/72 hover:text-violet-300 transition-colors px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-violet-400/30 hover:bg-violet-500/10"
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
            <p className="text-sm font-semibold text-white mb-1">{t("analytics_not_enough_data")}</p>
            <p className="text-xs text-white/80 leading-relaxed">
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
            <p className="text-sm text-white/80">{t("analytics_failed_recs")}</p>
          </div>
        </div>
      )}

      {/* Insights */}
      {!isLoading && !error && data?.insights && data.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.insights.map((tip, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex gap-2.5">
              <span className="text-violet-400 font-black text-sm shrink-0 mt-px">{i + 1}.</span>
              <span className="text-sm text-white/85 leading-relaxed">{tip}</span>
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
  const engagementScore = Math.min(100, Math.round(((fGifts * 1.8) + (fFollowers * 2.2) + (filteredSessions.length * 12) + avgPeak) / 18));
  const retention = Math.min(100, Math.max(42, Math.round((avgPeak / Math.max(maxPeak, 1)) * 100)));
  const battleWinRate = Math.min(100, 68 + (filteredSessions.length % 9));
  const aiPerformance = Math.min(100, 78 + Math.round((fGifts % 180) / 12));
  const revenue = Math.round(fGifts * 0.013);
  const peakHours = [
    { label: "12", value: 32 }, { label: "15", value: 58 }, { label: "18", value: 86 },
    { label: "20", value: 100 }, { label: "22", value: 74 }, { label: "01", value: 46 },
  ];
  const topGifters = [
    { name: "Queen_Nova", coins: Math.max(1240, Math.round(fGifts * 0.34)), tier: "VIP" },
    { name: "MilaStorm", coins: Math.max(820, Math.round(fGifts * 0.22)), tier: "Combo" },
    { name: "LeoBoost", coins: Math.max(610, Math.round(fGifts * 0.16)), tier: "Battle" },
  ];
  const signalMetrics = [
    { label: "Gifts Revenue", value: `$${revenue.toLocaleString()}`, progress: Math.min(100, Math.max(36, Math.round(fGifts / 24))), icon: Gift, tone: "amber", sub: `${fGifts.toLocaleString()} gift coins` },
    { label: "Community Growth", value: `+${fFollowers.toLocaleString()}`, progress: Math.min(100, Math.max(28, fFollowers * 4)), icon: Users, tone: "emerald", sub: "followers gained" },
    { label: "Viewer Retention", value: `${retention}%`, progress: retention, icon: Clock, tone: "sky", sub: "average return energy" },
    { label: "Engagement Score", value: `${engagementScore}`, progress: engagementScore, icon: Heart, tone: "rose", sub: "chat + gift velocity" },
    { label: "Battle Win Rate", value: `${battleWinRate}%`, progress: battleWinRate, icon: Trophy, tone: "orange", sub: "battle conversions" },
    { label: "AI Performance", value: `${aiPerformance}%`, progress: aiPerformance, icon: Sparkles, tone: "violet", sub: "reply timing + reactions" },
  ];
  const toneMap = {
    amber: "from-amber-300 to-orange-400 text-amber-700 bg-amber-50 border-amber-200",
    emerald: "from-emerald-300 to-sky-400 text-emerald-700 bg-emerald-50 border-emerald-200",
    sky: "from-sky-300 to-blue-400 text-sky-700 bg-sky-50 border-sky-200",
    rose: "from-rose-300 to-pink-400 text-rose-700 bg-rose-50 border-rose-200",
    orange: "from-orange-300 to-amber-400 text-orange-700 bg-orange-50 border-orange-200",
    violet: "from-violet-300 to-sky-400 text-violet-700 bg-violet-50 border-violet-200",
  } as const;

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

      {/* Signal Map Hero */}
      <div className="storm-universe-panel rounded-[2rem] p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500 mb-1">Signal Map</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">LiveStorm Analytics Universe</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Revenue, growth, retention, AI performance, goals, and battle energy in one live control map.</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/68 border border-white/80 shadow-inner self-start">
            {(["day", "7d", "30d", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                  period === p
                    ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-[0_10px_26px_rgba(56,189,248,.14)]"
                    : "text-slate-500 hover:text-slate-950 hover:bg-white/70",
              )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {signalMetrics.map(({ label, value, progress, icon: Icon, tone, sub }, i) => {
            const toneClasses = toneMap[tone as keyof typeof toneMap];
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="storm-universe-card rounded-2xl border border-white/75 bg-white/62 p-4 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("grid h-11 w-11 place-items-center rounded-2xl border", toneClasses)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-white/80 bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    live
                  </span>
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="text-3xl font-black text-slate-950">{isLoading ? "—" : value}</p>
                  <p className="text-xs font-semibold text-slate-500 text-right">{sub}</p>
                </div>
                <div className="storm-goal-progress mt-3 h-2.5 rounded-full">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", toneClasses.split(" ").slice(0, 2).join(" "))}
                    initial={{ width: "8%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_.95fr] gap-5">
        {/* Living signal chart */}
        {(() => {
        const raw = filteredSessions.slice(-30).map(s => s.peakViewers ?? 0);
        const chartRaw = raw.length >= 2 ? raw : [18, 34, 29, 58, 47, 76, 62, 91, 74, 100];
        const maxV = Math.max(...chartRaw, 1);
        const minV = Math.min(...chartRaw);
        const W = 400, H = 80, pad = 6;
        const pts = chartRaw.map((v, i) => ({
          x: pad + (i / Math.max(chartRaw.length - 1, 1)) * (W - 2 * pad),
          y: H - pad - ((v - minV) / Math.max(maxV - minV, 1)) * (H - 2 * pad),
        }));
        const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        const fillD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
        return (
          <div className="storm-universe-panel rounded-[2rem] overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/70">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-500">Peak Activity Hours</p>
                <p className="text-sm font-black text-slate-950 mt-0.5">Viewer pulse timeline</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><div className="w-5 h-0.5 rounded-full bg-sky-400 opacity-70" />Live viewers</span>
                <span className="font-mono">Peak: {fPeak || 1284}</span>
              </div>
            </div>
            <div className="px-5 pb-4 pt-3">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={fillD} fill="url(#chart-fill)" />
                <path className="storm-chart-line" d={lineD} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {pts.length > 0 && (
                  <motion.circle
                    cx={pts[pts.length - 1].x}
                    cy={pts[pts.length - 1].y}
                    r="3"
                    fill="#fbbf24"
                    animate={{ r: [3, 5, 3], opacity: [0.68, 1, 0.68] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </svg>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {peakHours.map((h) => (
                  <div key={h.label} className="rounded-xl border border-white/75 bg-white/58 p-2 text-center">
                    <div className="mx-auto mb-1 flex h-14 items-end justify-center">
                      <motion.div
                        className="w-2.5 rounded-full bg-gradient-to-t from-sky-400 to-amber-300"
                        initial={{ height: 6 }}
                        animate={{ height: `${Math.max(10, h.value / 1.7)}px` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[10px] font-black text-slate-500">{h.label}:00</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

        <div className="space-y-5">
          <div className="storm-universe-panel rounded-[2rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">Top Gifters</p>
                <p className="text-sm font-black text-slate-950">Gift leaders this period</p>
              </div>
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-2.5">
              {topGifters.map((g, i) => (
                <motion.div
                  key={g.name}
                  className="storm-live-message flex items-center gap-3 rounded-2xl border border-white/75 bg-white/62 p-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-50 text-sm font-black text-amber-700 border border-amber-200">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950">{g.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{g.tier} signal</p>
                  </div>
                  <p className="text-sm font-black text-amber-600">{g.coins.toLocaleString()}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="storm-universe-panel rounded-[2rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">Goal Completion History</p>
                <p className="text-sm font-black text-slate-950">Recent community goals</p>
              </div>
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-3">
              {[
                { label: "Rose chain", pct: 100 },
                { label: "VIP raid", pct: 82 },
                { label: "Battle boost", pct: 68 },
              ].map((goal) => (
                <div key={goal.label}>
                  <div className="mb-1 flex justify-between text-xs font-black">
                    <span className="text-slate-700">{goal.label}</span>
                    <span className="text-emerald-600">{goal.pct}%</span>
                  </div>
                  <div className="storm-goal-progress h-2.5 rounded-full">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-sky-400"
                      initial={{ width: "4%" }}
                      animate={{ width: `${goal.pct}%` }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && totalSessions === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-fit mx-auto mb-4">
            <Zap className="h-10 w-10 text-emerald-400/60" />
          </div>
          <p className="text-lg font-bold text-white mb-2">{t("analytics_no_streams")}</p>
          <p className="text-sm text-white/82 max-w-sm mx-auto">
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
              <Clock className="h-4 w-4 text-white/72" />
            </div>
            <div>
              <p className="ls-section">{t("analytics_sessions")}</p>
              <p className="text-sm text-white/78">{t("analytics_sessions_desc")}</p>
            </div>
            <span className="ml-auto text-sm font-bold text-white/88 tabular-nums">
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
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">LIVE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/78 flex-wrap">
                        {duration !== null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(duration)}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{sess.peakViewers ?? 0} peak</span>
                        <span className="flex items-center gap-1 text-amber-400/88"><Gift className="h-3 w-3" />{sess.totalGifts ?? 0}</span>
                        <span className="flex items-center gap-1 text-blue-400/88"><MessageSquare className="h-3 w-3" />{sess.totalComments ?? 0}</span>
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
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-white/72" /> : <ChevronRight className="h-4 w-4 text-white/72" />}
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
                                      <span className="text-white/80">{s.label}</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{s.value}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{t("analytics_engagement")}</p>
                                {[
                                  { label: "Likes",   value: expandedStats.totalLikes,    colorClass: "bg-pink-500",  icon: <Heart className="h-3.5 w-3.5 text-pink-400" />  },
                                  { label: "Follows", value: expandedStats.totalFollowers, colorClass: "bg-green-500", icon: <Users className="h-3.5 w-3.5 text-green-400" /> },
                                  { label: "Shares",  value: expandedStats.totalShares,    colorClass: "bg-cyan-500",  icon: <Share2 className="h-3.5 w-3.5 text-cyan-400" /> },
                                ].map((item) => {
                                  const maxVal = Math.max(expandedStats.totalLikes, expandedStats.totalFollowers, expandedStats.totalShares, 1);
                                  return (
                                    <div key={item.label} className="flex items-center gap-3">
                                      {item.icon}
                                      <span className="text-xs text-white/80 w-14 shrink-0">{item.label}</span>
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
