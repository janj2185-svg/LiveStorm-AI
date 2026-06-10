import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetMyStreamer } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2, Users, Gift, MessageSquare, Heart, Clock,
  TrendingUp, Zap, ChevronRight, ChevronDown, Star, Play,
  Share2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero, GradientText, AnimatedCounter } from "@/components/ui/premium";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string) {
  const resp = await fetch(`${BASE}/api${path}`, { credentials: "include" });
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
  mode: string;
  startedAt: string;
  endedAt: string | null;
  peakViewers: number;
  totalGifts: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalShares: number;
};

type SessionStats = {
  duration: number;
  peakViewers: number;
  totalGifts: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalShares: number;
};

export function Analytics() {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: () => apiFetch("/sessions"),
  });

  const { data: expandedStats, isLoading: loadingStats } = useQuery<SessionStats>({
    queryKey: ["session-stats", expandedId],
    queryFn: () => apiFetch(`/sessions/${expandedId}/stats`),
    enabled: expandedId !== null,
  });

  const { data: liveStats } = useQuery({
    queryKey: ["streamer-live-analytics"],
    queryFn: () => apiFetch("/streamers/me"),
    refetchInterval: 10000,
  });

  const totalSessions = sessions?.length ?? 0;
  const totalGifts    = sessions?.reduce((s, sess) => s + (sess.totalGifts ?? 0), 0) ?? 0;
  const maxPeak       = sessions?.reduce((m, sess) => Math.max(m, sess.peakViewers ?? 0), 0) ?? 0;
  const avgPeak       = sessions?.length
    ? Math.round(sessions.reduce((s, sess) => s + (sess.peakViewers ?? 0), 0) / sessions.length)
    : 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Hero */}
      <PageHero
        gradientFrom="rgba(16,185,129,0.14)"
        gradientTo="rgba(14,165,233,0.08)"
        icon={
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <BarChart2 className="h-8 w-8 text-emerald-400" />
          </div>
        }
        title={
          <GradientText from="from-emerald-400" to="to-cyan-400">{t("analytics_title")}</GradientText>
        }
        subtitle={t("analytics_desc")}
        right={
          liveStats ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-bold text-emerald-300">{t("analytics_live_now")}</span>
              <span className="text-xs text-white ml-1">{(liveStats as any).viewerCount ?? 0} viewers</span>
            </div>
          ) : undefined
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Play className="h-5 w-5" />,       label: t("analytics_total_sessions"), value: totalSessions,  iconBg: "bg-violet-500/15",  iconColor: "text-violet-400" },
          { icon: <Gift className="h-5 w-5" />,        label: t("analytics_total_gifts"),    value: totalGifts,     iconBg: "bg-amber-500/15",   iconColor: "text-amber-400"  },
          { icon: <Users className="h-5 w-5" />,       label: t("analytics_peak_viewers"),   value: maxPeak,        iconBg: "bg-blue-500/15",    iconColor: "text-blue-400"   },
          { icon: <TrendingUp className="h-5 w-5" />,  label: t("analytics_avg_peak"),       value: avgPeak,        iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400"},
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all">
            <div className={cn("p-2.5 rounded-xl w-fit mb-3", s.iconBg)}>
              <span className={s.iconColor}>{s.icon}</span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-white tabular-nums">
              <AnimatedCounter target={s.value} />
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Tips */}
      <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-r from-violet-500/[0.06] to-pink-500/[0.04] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-violet-500/15">
            <Star className="h-4 w-4 text-violet-400" />
          </div>
          <p className="font-semibold text-white text-sm">{t("analytics_ai_tips")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[t("analytics_tip_1"), t("analytics_tip_2"), t("analytics_tip_3")].map((tip, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex gap-2.5">
              <span className="text-violet-400 font-black text-sm shrink-0 mt-px">{i + 1}.</span>
              <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Session list */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{t("analytics_sessions")}</p>
            <p className="text-xs text-muted-foreground">{t("analytics_sessions_desc")}</p>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {isLoading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)}

          {!isLoading && (!sessions || sessions.length === 0) && (
            <div className="text-center py-14">
              <BarChart2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("analytics_no_sessions")}</p>
            </div>
          )}

          {sessions?.map((sess, idx) => {
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
                    {sess.endedAt
                      ? <Clock className="h-4 w-4 text-slate-400" />
                      : <Play className="h-4 w-4 text-emerald-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {sess.startedAt ? format(new Date(sess.startedAt), "MMM d, HH:mm") : "Session"}
                      </span>
                      {!sess.endedAt && (
                        <Badge className="h-4 text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/20 px-1.5">LIVE</Badge>
                      )}
                      <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-white/10 text-muted-foreground capitalize">
                        {sess.mode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {duration !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{formatDuration(duration)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />{sess.peakViewers ?? 0} peak
                      </span>
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3 text-amber-400" />{sess.totalGifts ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-blue-400" />{sess.totalComments ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Mini engagement bars */}
                    <div className="hidden sm:flex gap-1.5 items-end h-5">
                      {[
                        { v: sess.totalGifts,    color: "bg-amber-400", max: 100 },
                        { v: sess.totalLikes,    color: "bg-pink-400",  max: 500 },
                        { v: sess.totalComments, color: "bg-blue-400",  max: 200 },
                      ].map((bar, i) => (
                        <div
                          key={i}
                          className={cn("w-1.5 rounded-sm", bar.color)}
                          style={{ height: `${Math.max(4, Math.min(20, (bar.v / bar.max) * 20))}px`, opacity: 0.7 }}
                        />
                      ))}
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
                                { label: t("analytics_duration"),     value: formatDuration(expandedStats.duration),           icon: <Clock className="h-3.5 w-3.5" />,         color: "text-slate-400",   iconBg: "bg-slate-500/10"   },
                                { label: t("analytics_peak_viewers"), value: expandedStats.peakViewers.toLocaleString(),       icon: <Users className="h-3.5 w-3.5" />,         color: "text-blue-400",    iconBg: "bg-blue-500/10"    },
                                { label: t("analytics_total_gifts"),  value: expandedStats.totalGifts.toLocaleString(),        icon: <Gift className="h-3.5 w-3.5" />,          color: "text-amber-400",   iconBg: "bg-amber-500/10"   },
                                { label: t("analytics_comments"),     value: expandedStats.totalComments.toLocaleString(),     icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-violet-400",  iconBg: "bg-violet-500/10"  },
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
                                { label: "Likes",   value: expandedStats.totalLikes,   colorClass: "bg-pink-500",  icon: <Heart className="h-3.5 w-3.5 text-pink-400" />    },
                                { label: "Follows", value: expandedStats.totalFollows, colorClass: "bg-green-500", icon: <Users className="h-3.5 w-3.5 text-green-400" />   },
                                { label: "Shares",  value: expandedStats.totalShares,  colorClass: "bg-cyan-500",  icon: <Share2 className="h-3.5 w-3.5 text-cyan-400" />   },
                              ].map((item) => {
                                const maxVal = Math.max(expandedStats.totalLikes, expandedStats.totalFollows, expandedStats.totalShares, 1);
                                return (
                                  <div key={item.label} className="flex items-center gap-3">
                                    {item.icon}
                                    <span className="text-xs text-muted-foreground w-14 shrink-0">{item.label}</span>
                                    <div className="flex-1">
                                      <CssBar value={item.value} max={maxVal} colorClass={item.colorClass} />
                                    </div>
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
    </div>
  );
}
