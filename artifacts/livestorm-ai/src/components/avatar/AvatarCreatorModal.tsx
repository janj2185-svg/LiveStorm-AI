import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, Camera, Sparkles,
  ExternalLink, Settings2, ArrowRight, Info, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvaturnSDK } from "@avaturn/sdk";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvatarCreatorResult {
  avatarUrl: string;
  renderer: "rpm" | "vrm" | "avaturn";
  thumbnailUrl?: string;
}

interface AvatarCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (result: AvatarCreatorResult) => void;
}

type AvaturnPhase = "loading" | "ready" | "done" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RPM_SUBDOMAIN_KEY = "livestorm_rpm_subdomain";

function getRpmSubdomain(): string {
  try { return localStorage.getItem(RPM_SUBDOMAIN_KEY) ?? ""; } catch { return ""; }
}

function setRpmSubdomain(sub: string) {
  try { localStorage.setItem(RPM_SUBDOMAIN_KEY, sub.trim()); } catch {}
}

function normalizeRpmUrl(raw: string): string {
  const base = raw.split("?")[0];
  return `${base}?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024`;
}

function rpmThumbnailUrl(raw: string): string {
  const base = raw.split("?")[0].replace(/\.glb$/, "");
  return `${base}.png?scene=fullbody-portrait-v1-transparent&blendShapes[mouthSmile]=0.2&background=transparent&w=400&h=600`;
}

// ── Avaturn Tab ───────────────────────────────────────────────────────────────
// SDK init runs ONCE on mount via empty [] deps.
// Ref-callback pattern keeps onSuccess always-current without re-running the effect.

function AvaturnTab({
  onSuccess,
  onPhaseChange,
  phase,
}: {
  onSuccess: (avatarUrl: string) => void;
  onPhaseChange?: (phase: AvaturnPhase) => void;
  phase: AvaturnPhase;
}) {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<AvaturnSDK | null>(null);
  const exportCaptured = useRef(false);

  const AVATURN_URL = "https://demo.avaturn.dev";

  function setPhase(p: AvaturnPhase) {
    onPhaseChangeRef.current?.(p);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    console.log("[Avaturn] SDK init — mount");
    exportCaptured.current = false;
    const sdk = new AvaturnSDK();
    sdkRef.current = sdk;

    sdk.init(container, { url: AVATURN_URL })
      .then(() => {
        setPhase("ready");

        sdk.on("export", (data) => {
          if (!data?.url || exportCaptured.current) return;
          exportCaptured.current = true;
          console.log("[Avaturn] export received:", data.url.slice(0, 80));
          setPhase("done");
          onSuccessRef.current(data.url);
        });

        sdk.on("error", (err) => {
          console.error("[Avaturn] SDK error:", err);
          setPhase("error");
        });
      })
      .catch((err: unknown) => {
        console.error("[Avaturn] init failed:", err);
        setPhase("error");
      });

    return () => {
      console.log("[Avaturn] SDK destroy — unmount");
      sdk.destroy();
      sdkRef.current = null;
    };
  }, []); // EMPTY: init once on mount, destroy once on unmount

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-white/10"
      style={{ height: 420 }}
    >
      {phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070010] z-10 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
          <p className="text-xs text-muted-foreground">Loading Avaturn editor…</p>
        </div>
      )}
      {phase === "done" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/60 z-10 gap-3 backdrop-blur-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
          <p className="text-white font-bold text-base">Avatar exported!</p>
          <p className="text-[11px] text-emerald-300/70">Click Save Avatar below to apply it</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ── Ready Player Me Tab ───────────────────────────────────────────────────────

function ReadyPlayerMeTab({
  onSuccess,
}: {
  onSuccess: (avatarUrl: string, thumbnailUrl: string) => void;
}) {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [subdomain, setSubdomain] = useState(() => getRpmSubdomain());
  const [inputValue, setInputValue] = useState(() => getRpmSubdomain());
  const [phase, setPhase] = useState<"setup" | "loading" | "ready" | "done">(
    () => (getRpmSubdomain() ? "loading" : "setup"),
  );
  const [inputError, setInputError] = useState("");
  const capturedRef = useRef(false);

  const rpmUrl = subdomain
    ? `https://${subdomain}.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody`
    : null;

  function handleSubdomainSubmit() {
    const val = inputValue.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!val) { setInputError("Enter a valid subdomain"); return; }
    setInputError("");
    setRpmSubdomain(val);
    setSubdomain(val);
    capturedRef.current = false;
    setPhase("loading");
  }

  function handleReset() {
    setRpmSubdomain("");
    setSubdomain("");
    setInputValue("");
    setPhase("setup");
    capturedRef.current = false;
  }

  useEffect(() => {
    if (phase === "setup" || phase === "done") return;

    function onMessage(e: MessageEvent) {
      if (!e.data) return;
      const data =
        typeof e.data === "string"
          ? (() => { try { return JSON.parse(e.data); } catch { return null; } })()
          : e.data;
      if (!data || data.source !== "readyplayerme") return;

      if (data.eventName === "v1.frame.ready") {
        setPhase("ready");
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.avatar.exported" }),
          "*",
        );
      }

      if (data.eventName === "v1.avatar.exported") {
        const rawUrl: string = data.data?.url ?? data.url ?? "";
        if (rawUrl && !capturedRef.current) {
          capturedRef.current = true;
          setPhase("done");
          onSuccessRef.current(normalizeRpmUrl(rawUrl), rpmThumbnailUrl(rawUrl));
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [phase]);

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-blue-200/80 leading-relaxed">
              Ready Player Me requires a free partner subdomain.
              Register at <strong>studio.readyplayer.me</strong>, create an application and copy your subdomain.
            </div>
          </div>
          <a href="https://studio.readyplayer.me" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors">
            <ExternalLink className="h-3 w-3" />
            Get your free subdomain at studio.readyplayer.me
          </a>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">Your RPM Subdomain</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-blue-500/50 transition-all">
              <span className="text-[11px] text-white/30 pl-3 pr-0.5 whitespace-nowrap flex-shrink-0">https://</span>
              <Input
                className="border-0 bg-transparent h-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                placeholder="your-subdomain"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setInputError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubdomainSubmit()}
              />
              <span className="text-[11px] text-white/30 pr-3 pl-0.5 whitespace-nowrap flex-shrink-0">.readyplayer.me</span>
            </div>
            <Button size="sm" className="h-9 px-4 bg-blue-600 hover:bg-blue-500 gap-1.5 flex-shrink-0"
              onClick={handleSubdomainSubmit} disabled={!inputValue.trim()}>
              Load <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {inputError && <p className="text-xs text-red-400">{inputError}</p>}
          <p className="text-[10px] text-muted-foreground/50">Saved locally — only needs to be set once.</p>
        </div>

        <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 space-y-2">
          <p className="text-[10px] font-medium text-white/50">Quick setup steps</p>
          {[
            "Go to studio.readyplayer.me and sign up (free)",
            'Click "Create Application" and give it any name',
            "Copy your subdomain (e.g. my-stream-5f2a)",
            "Paste it above and click Load",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/8 text-[9px] text-white/40 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-[10px] text-white/40">{step}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">Photorealistic</Badge>
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">ARKit Lip Sync</Badge>
        </div>
        <button onClick={handleReset}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
          <Settings2 className="h-3 w-3" />
          {subdomain}.readyplayer.me
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 440 }}>
        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070010] z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-xs text-muted-foreground">Loading Ready Player Me…</p>
          </div>
        )}
        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="text-white font-semibold">Avatar captured!</p>
            <p className="text-[11px] text-muted-foreground">Click Save Avatar below</p>
          </div>
        )}
        {rpmUrl && (
          <iframe key={rpmUrl} ref={iframeRef} src={rpmUrl}
            className="w-full h-full border-0"
            allow="camera *; microphone *; clipboard-write"
            onLoad={() => { setTimeout(() => { setPhase((p) => (p === "loading" ? "ready" : p)); }, 2000); }}
          />
        )}
      </div>
    </div>
  );
}

// ── VRM / GLB Upload Tab ──────────────────────────────────────────────────────

function VRMUploadTab({ onSuccess }: { onSuccess: (avatarUrl: string) => void }) {
  const [phase, setPhase] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    if (!file.name.match(/\.(vrm|glb)$/i)) {
      setError("Only .vrm and .glb files are supported");
      setPhase("error");
      return;
    }
    setPhase("uploading");
    setFileName(file.name);
    setError("");
    setProgress(0);

    try {
      const res = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "model/gltf-binary" }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = (await res.json()) as { uploadURL: string; objectPath: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "model/gltf-binary");
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload failed: ${xhr.status}`)); };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      setPhase("done");
      onSuccess(`${BASE}/api/storage${objectPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">VRM 1.0</Badge>
        <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">GLB</Badge>
        <Badge className="bg-white/5 text-white/50 border-white/10 text-[10px]">VRoid Studio</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Upload a VRM 1.0 or GLB file with facial blend shapes for lip sync and expressions.
      </p>

      {phase === "done" ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <p className="text-white font-semibold">{fileName} uploaded!</p>
          <p className="text-[11px] text-muted-foreground">Click Save Avatar below</p>
        </div>
      ) : (
        <label className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all py-14 select-none",
          phase === "uploading" ? "border-violet-500/50 bg-violet-500/5 cursor-default"
            : phase === "error" ? "border-red-500/40 bg-red-500/5"
            : "border-white/10 hover:border-white/25 bg-white/[0.02]",
        )}>
          <input type="file" accept=".vrm,.glb" className="sr-only" disabled={phase === "uploading"}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {phase === "uploading" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
              <div className="text-center">
                <p className="text-sm text-white font-medium">Uploading {fileName}…</p>
                <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
              </div>
              <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              {phase === "error" ? <AlertCircle className="h-10 w-10 text-red-400" /> : <Upload className="h-10 w-10 text-white/20" />}
              <div className="text-center">
                <p className="text-sm text-white font-medium">{phase === "error" ? "Upload failed" : "Drop VRM / GLB here"}</p>
                {error ? <p className="text-xs text-red-400 mt-1">{error}</p> : <p className="text-xs text-muted-foreground mt-1">or click to browse</p>}
              </div>
              <p className="text-[10px] text-muted-foreground/40">Max 100 MB · .vrm · .glb</p>
            </>
          )}
        </label>
      )}

      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
        <p className="text-[10px] font-medium text-white/60">Compatible sources</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {["VRoid Studio", "VRoid Hub", "Ready Player Me .glb", "Mixamo", "Custom Blender export"].map((s) => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-white/40">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Wizard step bar ───────────────────────────────────────────────────────────

const WIZARD_STEPS = ["Open Editor", "Create Avatar", "Save"];

function WizardSteps({ step }: { step: number }) {
  return (
    <div className="flex items-center mt-3">
      {WIZARD_STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all",
              step > i ? "bg-emerald-500 border-emerald-500 text-white"
                : step === i ? "bg-rose-600 border-rose-500 text-white"
                : "bg-white/5 border-white/10 text-white/30",
            )}>
              {step > i ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn("text-[9px] font-medium whitespace-nowrap",
              step === i ? "text-rose-300" : step > i ? "text-emerald-400" : "text-white/25",
            )}>{label}</span>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <div className={cn("flex-1 h-px mx-2 mb-4 transition-all", step > i ? "bg-emerald-500/40" : "bg-white/10")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Guidance banner ───────────────────────────────────────────────────────────

function AvaturnGuidance({ phase }: { phase: AvaturnPhase }) {
  if (phase === "loading") {
    return (
      <div className="rounded-lg bg-white/[0.03] border border-white/8 px-3 py-2.5 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin flex-shrink-0" />
        <p className="text-[10px] text-white/40">Starting Avaturn editor…</p>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 px-3 py-2.5 space-y-2">
        <p className="text-[10px] font-semibold text-blue-300">Follow these steps inside the editor:</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: "1", text: "Sign in or create a free Avaturn account" },
            { n: "2", text: "Click Take Selfie — use the QR code on your phone, or your webcam" },
            { n: "3", text: "Customise, then click Next to export your avatar" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
              <p className="text-[10px] text-blue-200/60 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-3 py-2 flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
        <p className="text-[10px] text-emerald-300 font-medium">
          Avatar exported successfully — click <strong>Save Avatar</strong> below to apply it.
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-lg bg-red-500/8 border border-red-500/20 px-3 py-2 flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
        <p className="text-[10px] text-red-300">
          Avaturn failed to load. Try refreshing the page, or use the Advanced options below to upload a VRM/GLB file.
        </p>
      </div>
    );
  }

  return null;
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function AvatarCreatorModal({
  open,
  onOpenChange,
  onSave,
}: AvatarCreatorModalProps) {
  const [pending, setPending] = useState<AvatarCreatorResult | null>(null);
  const [avaturnPhase, setAvaturnPhase] = useState<AvaturnPhase>("loading");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<"vrm" | "rpm">("vrm");

  const wizardStep = avaturnPhase === "loading" ? 0 : avaturnPhase === "ready" ? 1 : avaturnPhase === "done" ? 2 : 0;

  const handleAvaturnSuccess = useCallback((avatarUrl: string) => {
    setPending({ avatarUrl, renderer: "avaturn" });
  }, []);
  const handleRPMSuccess = useCallback((avatarUrl: string, thumbnailUrl: string) => {
    setPending({ avatarUrl, renderer: "rpm", thumbnailUrl });
  }, []);
  const handleVRMSuccess = useCallback((avatarUrl: string) => {
    setPending({ avatarUrl, renderer: "vrm" });
  }, []);

  function handleSave() {
    if (!pending) return;
    onSave(pending);
    onOpenChange(false);
    setPending(null);
  }

  function handleClose() {
    onOpenChange(false);
    setPending(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl w-full border-white/10 p-0 overflow-hidden"
        style={{ background: "#070010" }}
      >
        {/* ── Header with wizard ──────────────────────────────── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/5">
          <DialogTitle className="text-white font-bold text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Create Your AI Presenter
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Photorealistic avatar · ARKit lip sync · TikTok reactions · Free Avaturn account required
          </p>
          <WizardSteps step={wizardStep} />
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(85vh - 180px)" }}>

          {/* Contextual guidance */}
          <AvaturnGuidance phase={avaturnPhase} />

          {/* Avaturn SDK — mounted once, never remounted */}
          <AvaturnTab onSuccess={handleAvaturnSuccess} onPhaseChange={setAvaturnPhase} phase={avaturnPhase} />

          {/* ── Advanced accordion ───────────────────────────── */}
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-white/25" />
                <span className="text-[11px] text-white/35 font-medium">
                  Advanced — Ready Player Me / Upload VRM or GLB
                </span>
              </div>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-white/20 transition-transform duration-200",
                advancedOpen && "rotate-180",
              )} />
            </button>

            {advancedOpen && (
              <div className="border-t border-white/5 p-4">
                <Tabs value={advancedTab} onValueChange={(v) => setAdvancedTab(v as "vrm" | "rpm")}>
                  <TabsList className="w-full bg-white/5 border border-white/10 mb-4 p-0.5 h-8">
                    <TabsTrigger
                      value="vrm"
                      className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white h-7"
                    >
                      <Upload className="h-3 w-3" />
                      Upload VRM / GLB
                    </TabsTrigger>
                    <TabsTrigger
                      value="rpm"
                      className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-7"
                    >
                      <Camera className="h-3 w-3" />
                      Ready Player Me
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="vrm" className="mt-0">
                    <VRMUploadTab onSuccess={handleVRMSuccess} />
                  </TabsContent>
                  <TabsContent value="rpm" className="mt-0">
                    <ReadyPlayerMeTab onSuccess={handleRPMSuccess} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/5 bg-black/30">
          <p className="text-[10px] text-muted-foreground/50">
            {pending ? (
              <span className="flex items-center gap-1 text-emerald-400/80">
                <CheckCircle2 className="h-3 w-3" />
                Avatar ready — click Save to apply
              </span>
            ) : (
              "Follow the steps above to create your avatar"
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                "text-xs h-7 transition-all",
                pending
                  ? "bg-violet-600 hover:bg-violet-500 ring-2 ring-violet-500/30"
                  : "bg-violet-600/40 opacity-50 cursor-not-allowed",
              )}
              disabled={!pending}
              onClick={handleSave}
            >
              {pending ? "Save Avatar" : "Waiting…"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
