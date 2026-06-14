import { motion } from "framer-motion";
import { Link } from "wouter";
import { Cpu, Wifi, WifiOff, Radio, Activity, Clock, ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

function DiagRow({ label, value, status }: { label: string; value: string; status?: "ok" | "warn" | "error" | "neutral" }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-muted-foreground/70">{label}</span>
      <div className="flex items-center gap-1.5">
        {status === "ok"   && <CheckCircle2 className="h-3 w-3 text-green-400" />}
        {status === "warn" && <AlertTriangle className="h-3 w-3 text-amber-400" />}
        {status === "error"&& <AlertTriangle className="h-3 w-3 text-red-400" />}
        <span className={cn(
          "text-xs font-mono font-medium",
          status === "ok"    && "text-green-400",
          status === "warn"  && "text-amber-400",
          status === "error" && "text-red-400",
          (!status || status === "neutral") && "text-white/80",
        )}>{value}</span>
      </div>
    </div>
  );
}

export function LiveControlDiagnostics() {
  const { t } = useLanguage();
  const { connected, tiktokMode, tiktokError, sessionMode, stats, events, activeSessionRes, isActive } = useLiveSessionContext();
  const effectiveMode = tiktokMode ?? sessionMode;

  const uptime = activeSessionRes?.session?.startedAt
    ? Math.floor((Date.now() - new Date(activeSessionRes.session.startedAt).getTime()) / 1000)
    : 0;

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Back link */}
      <Link href="/live-control">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer group">
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          {t("nav_live_control")}
        </div>
      </Link>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-5">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0",
            isActive ? "bg-green-500/10 border-green-500/20" : "bg-slate-500/10 border-slate-500/20",
          )}>
            <Cpu className={cn("h-6 w-6", isActive ? "text-green-400" : "text-slate-400")} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{t("nav_live_control")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/20 text-slate-400 font-semibold">{t("diag_diagnostics")}</span>
            </div>
            <h1 className="text-xl font-black text-white">{t("diag_connection_health")}</h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{t("diag_realtime_note")}</p>
          </div>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* WebSocket */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                {connected ? <Wifi className="h-3.5 w-3.5 text-blue-400" /> : <WifiOff className="h-3.5 w-3.5 text-slate-400" />}
              </div>
              <span className="text-xs font-bold text-white/80">{t("diag_websocket")}</span>
            </div>
            <DiagRow label={t("diag_status")}  value={connected ? t("diag_connected") : t("diag_disconnected")} status={connected ? "ok" : isActive ? "error" : "neutral"} />
            <DiagRow label={t("diag_session")} value={isActive ? t("diag_active") : t("diag_offline")} status={isActive ? "ok" : "neutral"} />
            <DiagRow label={t("diag_mode")}    value={effectiveMode ?? "—"} status={effectiveMode === "real" ? "ok" : effectiveMode === "demo" ? "warn" : effectiveMode === "error" ? "error" : "neutral"} />
          </div>

          {/* TikTok */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Radio className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <span className="text-xs font-bold text-white/80">{t("nav_lc_connection")}</span>
            </div>
            <DiagRow label={t("diag_provider")} value={tiktokMode ?? "—"} />
            <DiagRow label={t("ls_error_label")} value={tiktokError ? tiktokError.slice(0, 40) : t("diag_none")} status={tiktokError ? "error" : "ok"} />
            <DiagRow label={t("diag_uptime")}   value={isActive ? formatUptime(uptime) : "—"} status={isActive ? "ok" : "neutral"} />
          </div>

          {/* Event Stats */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-cyan-500/10">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="text-xs font-bold text-white/80">{t("diag_event_counters")}</span>
            </div>
            <DiagRow label={t("diag_total_events")} value={events.filter(e => e.type !== "viewerCount").length.toString()} />
            <DiagRow label={t("ls_stat_comments")}  value={stats.totalComments.toString()} />
            <DiagRow label={t("dash_gifts")}        value={stats.totalGifts.toString()} />
            <DiagRow label={t("diag_peak_viewers")} value={stats.viewerCount.toString()} />
          </div>

          {/* Session */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Clock className="h-3.5 w-3.5 text-green-400" />
              </div>
              <span className="text-xs font-bold text-white/80">{t("diag_session_info")}</span>
            </div>
            <DiagRow label={t("diag_session_id")} value={activeSessionRes?.session?.id ? `#${activeSessionRes.session.id}` : "—"} />
            <DiagRow label={t("diag_started")}    value={activeSessionRes?.session?.startedAt ? new Date(activeSessionRes.session.startedAt).toLocaleTimeString() : "—"} />
            <DiagRow label={t("diag_duration")}   value={isActive ? formatUptime(uptime) : "—"} status={isActive ? "ok" : "neutral"} />
          </div>
        </div>

        {/* Error log */}
        {tiktokError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs font-bold text-red-400">{t("diag_active_error")}</span>
            </div>
            <p className="text-xs font-mono text-red-300/80 break-all">{tiktokError}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
