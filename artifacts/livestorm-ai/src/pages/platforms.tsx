import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import {
  CheckCircle2, Clock, Plug, ExternalLink, Zap, ChevronRight,
  Globe, Sparkles, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrationData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  available: boolean;
  stage: "live" | "beta" | "coming_soon";
  color: string;
  roadmapStage?: number;
  connected: boolean;
  connectedAccount: string | null;
  docsUrl?: string;
}

const PLATFORM_LOGOS: Record<string, React.ReactNode> = {
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.28 8.28 0 004.84 1.54V7a4.85 4.85 0 01-1.07-.31z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.52V8.48L15.84 12l-6.09 3.52z" />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  ),
  kick: (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4H8C5.8 4 4 5.8 4 8v8c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4V8c0-2.2-1.8-4-4-4zM9 16.5v-9l7.5 4.5L9 16.5z" />
    </svg>
  ),
  internal: <Zap className="w-7 h-7" />,
};

const STAGE_LABELS: Record<number, string> = {
  1: "Stage 1 — Live Now",
  2: "Stage 2 — Coming Soon",
  3: "Stage 3 — Roadmap",
};

function PlatformCard({ integration }: { integration: IntegrationData }) {
  const isLive = integration.stage === "live";
  const stageLabel = integration.roadmapStage ? STAGE_LABELS[integration.roadmapStage] : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300",
        isLive
          ? "bg-white/[0.05] backdrop-blur-sm border-white/10 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(124,58,237,0.12)]"
          : "bg-white/[0.02] border-white/6 opacity-70 hover:opacity-85",
      )}
    >
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: integration.color }} />

      <div className="pt-6 px-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${integration.color}18`,
              color: integration.color,
              borderColor: `${integration.color}30`,
            }}
          >
            {PLATFORM_LOGOS[integration.id] ?? <Plug className="w-6 h-6" />}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {isLive ? (
              <Badge className="bg-primary/20 text-primary border-primary/30 border text-xs gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/10 text-muted-foreground text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>
            )}
            {stageLabel && (
              <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">{stageLabel}</span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h3 className="font-bold text-white text-lg leading-tight">{integration.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{integration.tagline}</p>
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{integration.description}</p>

        {isLive && (
          <div className="pt-1 space-y-3">
            {integration.connected ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-xs font-medium text-green-400">Connected</p>
                    <p className="text-sm font-bold text-white">@{integration.connectedAccount}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-white/10 text-xs" asChild>
                  <Link href="/live-studio">Open Studio <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-amber-400" />
                  <p className="text-xs text-amber-400 font-medium">Not connected</p>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs" asChild>
                  <Link href="/dashboard">Connect</Link>
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 border-white/10 text-xs" asChild>
                <Link href="/live-studio">Live Studio</Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 border-white/10 text-xs" asChild>
                <Link href="/overlays">Overlays</Link>
              </Button>
            </div>
          </div>
        )}

        {!isLive && integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Learn more
          </a>
        )}

        {!isLive && !integration.docsUrl && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Planned for {stageLabel?.split("—")[1]?.trim() ?? "later"}
          </span>
        )}
      </div>
    </div>
  );
}

export function Platforms() {
  const { getToken, isLoaded } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const baseUrl = `${window.location.origin}${BASE}`;

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${baseUrl}/api/integrations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load integrations");
        const data = await res.json();
        if (!cancelled) setIntegrations(data.integrations ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded]);

  const liveIntegrations = integrations.filter((i) => i.stage === "live");
  const upcomingIntegrations = integrations.filter((i) => i.stage !== "live");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400/50 mb-1">STREAMING PLATFORMS</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Platforms</h1>
          <p className="text-white/40 text-sm mt-1">Connect to live streaming platforms. TikTok LIVE is active — more on the roadmap.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">Stage 1 Active</span>
        </div>
      </div>

      {/* Roadmap stages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { stage: 1, label: "Stage 1", subtitle: "TikTok LIVE + Creator Tools", status: "active" as const },
          { stage: 2, label: "Stage 2", subtitle: "More Platforms + Social Layer", status: "upcoming" as const },
          { stage: 3, label: "Stage 3", subtitle: "Native LiveStorm Streaming", status: "upcoming" as const },
        ].map(({ stage, label, subtitle, status }) => (
          <div
            key={stage}
            className={cn(
              "p-4 rounded-2xl border transition-all",
              status === "active"
                ? "border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(124,58,237,0.08)]"
                : "border-white/6 bg-white/[0.02]",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  status === "active" ? "bg-primary text-white" : "bg-white/10 text-muted-foreground",
                )}
              >
                {stage}
              </span>
              <span className={cn("font-bold text-sm", status === "active" ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
              {status === "active" && (
                <span className="ml-auto text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  NOW
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground pl-8">{subtitle}</p>
          </div>
        ))}
      </div>

      {/* Integrations grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl bg-white/[0.04] border border-white/8" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      ) : (
        <>
          {liveIntegrations.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Integrations
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveIntegrations.map((i) => (
                  <PlatformCard key={i.id} integration={i} />
                ))}
              </div>
            </div>
          )}

          {upcomingIntegrations.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upcoming Integrations
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingIntegrations.map((i) => (
                  <PlatformCard key={i.id} integration={i} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Request CTA */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/15 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Want a specific platform sooner?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suggest it via the feedback button. Most-voted integrations get built first.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-white/10 hover:border-primary/30 shrink-0">
          Request integration
        </Button>
      </div>
    </div>
  );
}
