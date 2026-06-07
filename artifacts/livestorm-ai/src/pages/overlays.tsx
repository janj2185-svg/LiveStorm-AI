import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Copy, MonitorPlay, Loader2, RefreshCw, AlertCircle, Bell, Target, Trophy, Sword, Activity } from "lucide-react";
import { useAuth } from "@clerk/react";

interface ObsTokenResponse {
  token: string;
  expiresAt: number;
  streamerId: number;
}

interface WidgetConfig {
  accentColor: string;
  goalType: string;
  goalTarget: number;
  goalLabel: string;
  fontScale: number;
  animationStyle: "smooth" | "snappy" | "none";
}

const OVERLAYS = [
  {
    id: "alerts",
    name: "Alerts",
    icon: Bell,
    desc: "Animated pop-up cards for new followers, gifts, and shares.",
    path: "/obs/alerts",
    width: 1920,
    height: 1080,
    color: "#8b5cf6",
    configurable: ["accentColor", "fontScale", "animationStyle"],
  },
  {
    id: "goals",
    name: "Stream Goal",
    icon: Target,
    desc: "Animated progress bar toward a streamer-set goal.",
    path: "/obs/goals",
    width: 1920,
    height: 120,
    color: "#7c3aed",
    configurable: ["accentColor", "goalType", "goalTarget", "goalLabel", "fontScale", "animationStyle"],
  },
  {
    id: "leaderboard",
    name: "Leaderboard",
    icon: Trophy,
    desc: "Live top-10 viewer leaderboard ranked by gifts this session.",
    path: "/obs/leaderboard",
    width: 360,
    height: 600,
    color: "#f59e0b",
    configurable: ["accentColor", "fontScale", "animationStyle"],
  },
  {
    id: "boss-battle",
    name: "Boss Battle",
    icon: Sword,
    desc: "Boss HP bar, attack feed, damage numbers, and defeat celebration.",
    path: "/obs/boss-battle",
    width: 640,
    height: 400,
    color: "#ef4444",
    configurable: ["accentColor", "fontScale", "animationStyle"],
  },
  {
    id: "activity-feed",
    name: "Activity Feed",
    icon: Activity,
    desc: "Scrolling live event ticker — comments, gifts, follows.",
    path: "/obs/activity-feed",
    width: 360,
    height: 800,
    color: "#06b6d4",
    configurable: ["accentColor", "fontScale", "animationStyle"],
  },
];

const GOAL_TYPES = [
  { value: "followers", label: "Followers" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comments" },
  { value: "gifts", label: "Gifts (coins)" },
  { value: "viewers", label: "Peak Viewers" },
];

const ANIMATION_STYLES = [
  { value: "smooth", label: "Smooth (0.4s transitions)" },
  { value: "snappy", label: "Snappy (0.15s transitions)" },
  { value: "none", label: "No animations" },
];

function buildOverlayUrl(
  baseUrl: string,
  overlayPath: string,
  streamerId: number,
  token: string,
  config: WidgetConfig,
  overlayId: string
): string {
  const params = new URLSearchParams({
    streamerId: String(streamerId),
    token,
    color: config.accentColor.replace("#", ""),
    fontScale: String(config.fontScale),
    animation: config.animationStyle,
  });
  if (overlayId === "goals") {
    params.set("goalType", config.goalType);
    params.set("goalTarget", String(config.goalTarget));
    params.set("label", config.goalLabel || `${config.goalTarget} ${config.goalType}`);
  }
  return `${baseUrl}${overlayPath}?${params.toString()}`;
}

export function Overlays() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const baseUrl = `${window.location.origin}${BASE_URL}`;

  const [obsData, setObsData] = useState<ObsTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<string>("alerts");

  const [config, setConfig] = useState<WidgetConfig>({
    accentColor: "#7c3aed",
    goalType: "followers",
    goalTarget: 500,
    goalLabel: "",
    fontScale: 1,
    animationStyle: "smooth",
  });

  const fetchToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const clerkToken = await getToken();
      const res = await fetch(`${BASE_URL}/api/obs/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to generate token");
      }
      const data: ObsTokenResponse = await res.json();
      setObsData(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate overlay token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Paste this URL into an OBS Browser Source." });
  };

  const activeWidget = OVERLAYS.find((o) => o.id === activeOverlay)!;
  const overlayUrl = obsData
    ? buildOverlayUrl(baseUrl, activeWidget.path, obsData.streamerId, obsData.token, config, activeWidget.id)
    : "";

  const tokenExpiry = obsData ? new Date(obsData.expiresAt) : null;
  const isExpired = tokenExpiry ? tokenExpiry.getTime() < Date.now() : false;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">OBS Overlays</h2>
        <p className="text-muted-foreground">Browser source URLs for your stream overlays. Add them to OBS as Browser Sources.</p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-start gap-4">
          <MonitorPlay className="w-7 h-7 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-white mb-1">How to use</h3>
            <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 text-sm">
              <li>Select a widget below and configure it.</li>
              <li>Copy the Browser Source URL.</li>
              <li>In OBS → Add Source → Browser Source → paste the URL.</li>
              <li>Set the recommended width & height, enable "Transparent background".</li>
            </ol>
          </div>
          <div className="text-right shrink-0">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating token...
              </div>
            ) : error ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
                <Button size="sm" variant="outline" onClick={fetchToken}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            ) : obsData ? (
              <div className="text-xs text-muted-foreground">
                <div className="text-green-400 font-medium">✓ Token active</div>
                <div className="mt-0.5">Expires {tokenExpiry?.toLocaleTimeString()}</div>
                <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs" onClick={fetchToken}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {isExpired && (
        <Card className="bg-amber-950/20 border-amber-800/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <span className="text-sm text-amber-300">Your overlay token has expired. Refresh to generate a new 24-hour token.</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={fetchToken}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh Token
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Widgets</h3>
          {OVERLAYS.map((overlay) => {
            const Icon = overlay.icon;
            return (
              <button
                key={overlay.id}
                onClick={() => setActiveOverlay(overlay.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  activeOverlay === overlay.id
                    ? "bg-primary/10 border-primary/40 shadow-[0_0_16px_rgba(124,58,237,0.15)]"
                    : "bg-card border-white/5 hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${overlay.color}22` }}>
                    <Icon className="w-4 h-4" style={{ color: overlay.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{overlay.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{overlay.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Configure: {activeWidget.name}
            </h3>
            <Card className="bg-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {(() => { const Icon = activeWidget.icon; return <Icon className="w-5 h-5" style={{ color: activeWidget.color }} />; })()}
                  {activeWidget.name}
                </CardTitle>
                <CardDescription>{activeWidget.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeWidget.configurable.includes("accentColor") && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={config.accentColor}
                        onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value }))}
                        className="bg-background text-sm font-mono w-32"
                        maxLength={7}
                      />
                      <div className="flex gap-1.5">
                        {["#7c3aed", "#ef4444", "#f59e0b", "#06b6d4", "#22c55e"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setConfig((prev) => ({ ...prev, accentColor: c }))}
                            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                            style={{ background: c, borderColor: config.accentColor === c ? "#fff" : "transparent" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeWidget.configurable.includes("fontScale") && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Font Scale: <span className="text-white font-semibold">{config.fontScale.toFixed(1)}×</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={0.6}
                        max={1.6}
                        step={0.1}
                        value={[config.fontScale]}
                        onValueChange={([v]) => setConfig((c) => ({ ...c, fontScale: v }))}
                        className="py-1 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">{config.fontScale.toFixed(1)}×</span>
                    </div>
                  </div>
                )}

                {activeWidget.configurable.includes("animationStyle") && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Animation Style</Label>
                    <Select
                      value={config.animationStyle}
                      onValueChange={(v) => setConfig((c) => ({ ...c, animationStyle: v as WidgetConfig["animationStyle"] }))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMATION_STYLES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activeWidget.configurable.includes("goalType") && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Goal Type</Label>
                    <Select value={config.goalType} onValueChange={(v) => setConfig((c) => ({ ...c, goalType: v }))}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPES.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activeWidget.configurable.includes("goalTarget") && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Goal Target: {config.goalTarget.toLocaleString()}</Label>
                    <Slider
                      min={10}
                      max={10000}
                      step={10}
                      value={[config.goalTarget]}
                      onValueChange={([v]) => setConfig((c) => ({ ...c, goalTarget: v }))}
                      className="py-1"
                    />
                  </div>
                )}

                {activeWidget.configurable.includes("goalLabel") && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Goal Label (optional)</Label>
                    <Input
                      placeholder={`${config.goalTarget} ${GOAL_TYPES.find((g) => g.value === config.goalType)?.label ?? ""} Goal`}
                      value={config.goalLabel}
                      onChange={(e) => setConfig((c) => ({ ...c, goalLabel: e.target.value }))}
                      className="bg-background border-border"
                    />
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1.5 block">Browser Source URL</Label>
                    {obsData ? (
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={overlayUrl}
                          className="bg-background font-mono text-xs text-muted-foreground border-border"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(overlayUrl)}
                          className="shrink-0 border-border hover:bg-white/5"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-10 bg-background rounded-md border border-border flex items-center px-3">
                        <span className="text-xs text-muted-foreground">
                          {loading ? "Generating token..." : error ? "Token unavailable" : "Loading..."}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="bg-white/5 rounded px-2 py-1 font-mono">
                      {activeWidget.width} × {activeWidget.height}px
                    </span>
                    <span className="bg-white/5 rounded px-2 py-1">✓ Transparent background</span>
                    <span className="bg-white/5 rounded px-2 py-1">✓ Auto-updates via socket</span>
                    <span className="bg-white/5 rounded px-2 py-1">✓ 10s leaderboard refresh</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {obsData && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</h3>
              <div
                className="rounded-xl border border-white/5 overflow-hidden bg-[repeating-conic-gradient(#ffffff08_0%_25%,transparent_0%_50%)] bg-[length:24px_24px]"
                style={{ height: "280px", position: "relative" }}
              >
                <iframe
                  key={`${activeOverlay}-${obsData.token}-${JSON.stringify(config)}`}
                  src={overlayUrl}
                  style={{ width: "100%", height: "100%", border: "none", background: "transparent" }}
                  title={`${activeWidget.name} preview`}
                />
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                  Preview (scaled)
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Overlay URLs</h3>
            <div className="space-y-2">
              {OVERLAYS.map((overlay) => {
                const Icon = overlay.icon;
                const url = obsData
                  ? buildOverlayUrl(baseUrl, overlay.path, obsData.streamerId, obsData.token, config, overlay.id)
                  : "";
                return (
                  <div key={overlay.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-white/5">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: overlay.color }} />
                    <span className="text-sm font-medium text-white w-28 shrink-0">{overlay.name}</span>
                    <Input
                      readOnly
                      value={url || "Generating..."}
                      className="bg-background font-mono text-xs text-muted-foreground border-border h-8 flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={!obsData}
                      onClick={() => url && handleCopy(url)}
                      className="shrink-0 h-8 w-8 hover:bg-white/5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
