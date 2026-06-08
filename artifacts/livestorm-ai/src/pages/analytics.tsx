import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetMyStreamer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2, Users, Gift, MessageSquare, Heart, Clock,
  TrendingUp, Zap, ChevronRight, ChevronDown, Star, Play,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string) {
  const resp = await fetch(`${BASE}/api${path}`, { credentials: "include" });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return resp.json();
}

function StatCard({
  icon, label, value, sub, color = "text-primary",
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card className="bg-card border-white/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={color}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CssBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
  const totalGifts = sessions?.reduce((s, sess) => s + (sess.totalGifts ?? 0), 0) ?? 0;
  const maxPeak = sessions?.reduce((m, sess) => Math.max(m, sess.peakViewers ?? 0), 0) ?? 0;
  const avgPeak = sessions?.length
    ? Math.round(sessions.reduce((s, sess) => s + (sess.peakViewers ?? 0), 0) / sessions.length)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <BarChart2 className="h-6 w-6 text-emerald-400" />
          </div>
          {t("analytics_title")}
        </h2>
        <p className="text-muted-foreground mt-2">{t("analytics_desc")}</p>
      </div>

      {/* Live Now banner */}
      {liveStats && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-300">{t("analytics_live_now")}</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <span className="flex items-center gap-1.5 text-white">
                  <Users className="h-4 w-4 text-emerald-400" />
                  {(liveStats as any).viewerCount ?? 0} {t("analytics_viewers")}
                </span>
                <span className="flex items-center gap-1.5 text-white">
                  <Gift className="h-4 w-4 text-amber-400" />
                  {(liveStats as any).totalGifts ?? 0} {t("analytics_gifts")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Play className="h-4 w-4" />}
          label={t("analytics_total_sessions")}
          value={totalSessions}
        />
        <StatCard
          icon={<Gift className="h-4 w-4" />}
          label={t("analytics_total_gifts")}
          value={totalGifts.toLocaleString()}
          color="text-amber-400"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label={t("analytics_peak_viewers")}
          value={maxPeak.toLocaleString()}
          color="text-blue-400"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("analytics_avg_peak")}
          value={avgPeak.toLocaleString()}
          color="text-purple-400"
        />
      </div>

      {/* Session list */}
      <Card className="bg-card border-white/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t("analytics_sessions")}
          </CardTitle>
          <CardDescription>{t("analytics_sessions_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}

          {!isLoading && (!sessions || sessions.length === 0) && (
            <div className="text-center py-12">
              <BarChart2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("analytics_no_sessions")}</p>
            </div>
          )}

          {sessions?.map((sess) => {
            const isExpanded = expandedId === sess.id;
            const duration = sess.endedAt && sess.startedAt
              ? Math.round((new Date(sess.endedAt).getTime() - new Date(sess.startedAt).getTime()) / 1000)
              : null;

            return (
              <div key={sess.id} className="rounded-lg border border-white/5 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : sess.id)}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    sess.endedAt ? "bg-slate-500/20 text-slate-400" : "bg-emerald-500/20 text-emerald-400",
                  )}>
                    {sess.endedAt
                      ? <Clock className="h-3.5 w-3.5" />
                      : <Play className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-white">
                        {sess.startedAt ? format(new Date(sess.startedAt), "MMM d, HH:mm") : "Session"}
                      </span>
                      {!sess.endedAt && (
                        <Badge className="h-4 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1">LIVE</Badge>
                      )}
                      <Badge variant="outline" className="h-4 text-[10px] px-1 border-white/10 text-muted-foreground capitalize">
                        {sess.mode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {duration !== null && (
                        <span><Clock className="h-3 w-3 inline mr-0.5" />{formatDuration(duration)}</span>
                      )}
                      <span><Users className="h-3 w-3 inline mr-0.5" />{sess.peakViewers ?? 0} peak</span>
                      <span><Gift className="h-3 w-3 inline mr-0.5" />{sess.totalGifts ?? 0}</span>
                      <span><MessageSquare className="h-3 w-3 inline mr-0.5" />{sess.totalComments ?? 0}</span>
                    </div>
                  </div>

                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
                    {loadingStats
                      ? <Skeleton className="h-20 w-full" />
                      : expandedStats
                        ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { label: t("analytics_duration"), value: formatDuration(expandedStats.duration), icon: <Clock className="h-3 w-3" />, color: "text-slate-400" },
                                { label: t("analytics_peak_viewers"), value: expandedStats.peakViewers, icon: <Users className="h-3 w-3" />, color: "text-blue-400" },
                                { label: t("analytics_total_gifts"), value: expandedStats.totalGifts, icon: <Gift className="h-3 w-3" />, color: "text-amber-400" },
                                { label: t("analytics_comments"), value: expandedStats.totalComments, icon: <MessageSquare className="h-3 w-3" />, color: "text-purple-400" },
                              ].map((s) => (
                                <div key={s.label} className="p-2.5 rounded-lg bg-background/50 border border-white/5">
                                  <div className={cn("flex items-center gap-1 mb-1 text-xs", s.color)}>
                                    {s.icon}
                                    <span className="text-muted-foreground">{s.label}</span>
                                  </div>
                                  <p className="text-base font-bold text-white">
                                    {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">{t("analytics_engagement")}</p>
                              {[
                                { label: "Likes", value: expandedStats.totalLikes, color: "bg-pink-500", icon: <Heart className="h-3 w-3 text-pink-400" /> },
                                { label: "Follows", value: expandedStats.totalFollows, color: "bg-green-500", icon: <Users className="h-3 w-3 text-green-400" /> },
                                { label: "Shares", value: expandedStats.totalShares, color: "bg-cyan-500", icon: <Zap className="h-3 w-3 text-cyan-400" /> },
                              ].map((item) => {
                                const maxVal = Math.max(expandedStats.totalLikes, expandedStats.totalFollows, expandedStats.totalShares, 1);
                                return (
                                  <div key={item.label} className="flex items-center gap-2">
                                    {item.icon}
                                    <span className="text-xs text-muted-foreground w-12">{item.label}</span>
                                    <div className="flex-1">
                                      <CssBar value={item.value} max={maxVal} color={item.color} />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8 text-right">{item.value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )
                      : null}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Tips */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-purple-400" />
            {t("analytics_ai_tips")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[t("analytics_tip_1"), t("analytics_tip_2"), t("analytics_tip_3")].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="text-purple-400 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
              <span>{tip}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
