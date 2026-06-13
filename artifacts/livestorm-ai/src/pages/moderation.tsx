import { useGetActiveSession, useGetSessions, useGetModerationRules, useUpdateModerationRule } from "@workspace/api-client-react";
import type { ModerationRule } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Ban, Clock,
  MessageSquare, Eye, Filter, ChevronRight,
  Info, Flame, Volume2, VolumeX, CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const RULE_META: Record<string, { name: string; icon: React.ComponentType<{ className?: string }>; severity: string; description: string }> = {
  hate_speech: { name: "Hate Speech", icon: Ban,          severity: "high",   description: "Block messages containing hate speech or slurs" },
  spam:        { name: "Spam",        icon: AlertTriangle, severity: "medium", description: "Filter repeated or bot-like messages" },
  profanity:   { name: "Profanity",   icon: Volume2,       severity: "medium", description: "Flag messages with excessive profanity" },
  self_promo:  { name: "Self-promo",  icon: Eye,           severity: "low",    description: "Detect and suppress self-promotion links" },
};

const SEVERITY_CONFIG = {
  high:   { label: "High",   bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/20" },
  medium: { label: "Medium", bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/20" },
  low:    { label: "Low",    bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/20" },
};

const RULE_ORDER = ["hate_speech", "spam", "profanity", "self_promo"];

function StatsRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Moderation() {
  const queryClient = useQueryClient();
  const { data: activeData } = useGetActiveSession();
  const { data: sessions } = useGetSessions();
  const { data: rulesData, isLoading: rulesLoading } = useGetModerationRules();
  const updateRule = useUpdateModerationRule({
    mutation: {
      onMutate: async ({ id, isActive }) => {
        await queryClient.cancelQueries({ queryKey: ["/api/moderation/rules"] });
        const prev = queryClient.getQueryData<ModerationRule[]>(["/api/moderation/rules"]);
        queryClient.setQueryData<ModerationRule[]>(["/api/moderation/rules"], (old) =>
          old?.map((r) => (r.id === id ? { ...r, isActive } : r)) ?? old
        );
        return { prev };
      },
      onError: (_err, _vars, ctx: any) => {
        if (ctx?.prev) queryClient.setQueryData(["/api/moderation/rules"], ctx.prev);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/moderation/rules"] });
      },
    },
  });

  const isActive = activeData?.active ?? false;
  const session = activeData?.session;
  const recentSessions = sessions?.slice(0, 5) ?? [];

  const rules = RULE_ORDER.map((key) => {
    const backendRule = rulesData?.find((r) => r.ruleKey === key);
    const meta = RULE_META[key];
    return backendRule
      ? { ...backendRule, ...meta }
      : { id: -1, streamerId: -1, ruleKey: key, isActive: false, updatedAt: "", ...meta };
  });

  const activeRulesCount = rules.filter((r) => r.isActive).length;

  function handleToggle(rule: { id: number; isActive: boolean }) {
    if (rule.id === -1) return;
    updateRule.mutate({ id: rule.id, isActive: !rule.isActive });
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/50 mb-1">CONTENT SAFETY</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Moderation</h1>
          <p className="text-white/40 text-sm mt-1">Protect your stream from harmful content automatically.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          {isActive ? (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/20 border gap-1.5 px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Moderation Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-muted-foreground border-white/10">
              <Clock className="h-3 w-3" />
              No Active Stream
            </Badge>
          )}
          <Link href="/ai-assistant">
            <Button variant="outline" size="sm" className="gap-1.5 border-white/10 hover:border-primary/30 text-xs">
              AI Assistant Settings
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Rules",    value: rulesLoading ? "—" : activeRulesCount, icon: ShieldCheck,   color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/10" },
          { label: "Blocked Today",   value: 0,                                      icon: Ban,           color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/10" },
          { label: "Flagged Items",   value: 0,                                      icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/10" },
          { label: "Session Actions", value: 0,                                      icon: Eye,           color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/10" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={cn("rounded-2xl bg-white/[0.04] backdrop-blur-sm border p-5 transition-all", border)}>
            <div className={cn("p-2 rounded-xl w-fit mb-3", bg)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Moderation Rules */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-white text-sm">Auto-Moderation Rules</span>
              </div>
              <Badge variant="outline" className="text-xs font-normal border-white/10">
                {rulesLoading ? "…" : `${activeRulesCount}/${rules.length} active`}
              </Badge>
            </div>
            <p className="px-5 py-2.5 text-xs text-muted-foreground border-b border-white/5">
              Rules are applied in real-time to all chat messages during your stream.
            </p>

            {rulesLoading ? (
              <div className="divide-y divide-white/5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <Skeleton className="h-8 w-8 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-10 rounded-full flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {rules.map((rule) => {
                  const Icon = rule.icon;
                  const sev = SEVERITY_CONFIG[rule.severity as keyof typeof SEVERITY_CONFIG];
                  const pending = updateRule.isPending && updateRule.variables?.id === rule.id;
                  return (
                    <div key={rule.ruleKey} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={cn("p-2 rounded-xl flex-shrink-0", rule.isActive ? sev.bg : "bg-white/5")}>
                        <Icon className={cn("h-4 w-4", rule.isActive ? sev.text : "text-muted-foreground/40")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm font-medium", rule.isActive ? "text-white" : "text-muted-foreground")}>
                            {rule.name}
                          </span>
                          <span className={cn("text-[10px] border px-1.5 py-0.5 rounded-full font-medium", sev.bg, sev.text, sev.border)}>
                            {sev.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{rule.description}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={pending || rule.id === -1}
                        className={cn(
                          "w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0 relative",
                          rule.isActive ? "bg-primary" : "bg-white/10",
                          (pending || rule.id === -1) && "opacity-60 cursor-not-allowed",
                        )}
                        role="switch"
                        aria-checked={rule.isActive}
                      >
                        <span className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200",
                          rule.isActive ? "left-5" : "left-1",
                        )} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Log */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-white text-sm">Action Log</span>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
                <CheckCircle2 className="h-8 w-8 opacity-30" />
                <p className="text-sm">No moderation actions taken</p>
                <p className="text-xs opacity-60">Actions will appear here during your stream</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Session info */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-white text-sm">Current Stream</span>
            </div>
            <div className="p-5">
              {isActive && session ? (
                <div className="space-y-0">
                  <StatsRow label="Comments" value={session.totalComments ?? 0} />
                  <StatsRow label="Likes"    value={session.totalLikes ?? 0} />
                  <StatsRow label="Gifts"    value={session.totalGifts ?? 0} />
                  <StatsRow label="Viewers"  value={session.peakViewers ?? 0} sub="peak" />
                  <StatsRow label="Duration" value={session.endedAt ? "Ended" : "Active"} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-3">
                  <VolumeX className="h-8 w-8 opacity-30" />
                  <p className="text-sm text-center">Start a stream to activate real-time moderation</p>
                  <Link href="/dashboard">
                    <Button size="sm" className="mt-1 bg-primary hover:bg-primary/90">Go to Dashboard</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* AI Co-Host link */}
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/15 flex-shrink-0 mt-0.5">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">AI Assistant Moderation</p>
                <p className="text-xs text-muted-foreground mb-3">
                  The AI Assistant includes smart moderation — it automatically flags toxic comments and handles them based on your persona settings.
                </p>
                <Link href="/ai-assistant">
                  <Button size="sm" variant="outline" className="w-full border-white/10 hover:border-primary/30 gap-1.5 text-xs">
                    Configure AI Assistant
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-white text-sm">Recent Sessions</span>
            </div>
            {recentSessions.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground">No past sessions yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white">Session #{s.id}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(s.startedAt).toLocaleDateString()} · {s.totalComments ?? 0} msgs
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {s.endedAt ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-white/10">Ended</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/20 border">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
