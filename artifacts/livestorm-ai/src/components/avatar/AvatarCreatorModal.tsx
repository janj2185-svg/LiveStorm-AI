import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, Camera, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// ── URL helpers ───────────────────────────────────────────────────────────────

function normalizeRpmUrl(raw: string): string {
  const base = raw.split("?")[0];
  return `${base}?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024`;
}

function rpmThumbnailUrl(raw: string): string {
  const base = raw.split("?")[0].replace(/\.glb$/, "");
  return `${base}.png?scene=fullbody-portrait-v1-transparent&blendShapes[mouthSmile]=0.2&background=transparent&w=400&h=600`;
}

// ── Ready Player Me Tab ───────────────────────────────────────────────────────

function ReadyPlayerMeTab({
  onSuccess,
}: {
  onSuccess: (avatarUrl: string, thumbnailUrl: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "done">("loading");
  const capturedRef = useRef(false);

  const RPM_URL =
    "https://readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody&quality=high";

  const handleSuccess = useCallback(
    (avatarUrl: string, thumbnailUrl: string) => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      setPhase("done");
      onSuccess(avatarUrl, thumbnailUrl);
    },
    [onSuccess],
  );

  useEffect(() => {
    capturedRef.current = false;
    function onMessage(e: MessageEvent) {
      if (!e.data) return;
      const data =
        typeof e.data === "string"
          ? (() => {
              try {
                return JSON.parse(e.data);
              } catch {
                return null;
              }
            })()
          : e.data;
      if (!data) return;

      if (
        data.source === "readyplayerme" &&
        data.eventName === "v1.frame.ready"
      ) {
        setPhase("ready");
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            target: "readyplayerme",
            type: "subscribe",
            eventName: "v1.avatar.exported",
          }),
          "*",
        );
      }

      if (
        data.source === "readyplayerme" &&
        data.eventName === "v1.avatar.exported"
      ) {
        const rawUrl: string = data.data?.url ?? data.url ?? "";
        if (rawUrl) {
          handleSuccess(normalizeRpmUrl(rawUrl), rpmThumbnailUrl(rawUrl));
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleSuccess]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">Photorealistic</Badge>
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">ARKit Lip Sync</Badge>
        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">Selfie → Avatar</Badge>
        <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">Full Body</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Create a photorealistic avatar from a selfie or customise one from scratch.
        Full ARKit facial blend shapes for lip sync and expressions.
      </p>
      <div
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{ height: 480 }}
      >
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
            <p className="text-[11px] text-muted-foreground">Click Save to use this presenter</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={RPM_URL}
          className="w-full h-full border-0"
          allow="camera *; microphone *"
          onLoad={() => {
            if (phase === "loading") {
              setTimeout(() => {
                if (phase === "loading") setPhase("ready");
              }, 2000);
            }
          }}
        />
      </div>
    </div>
  );
}

// ── Avaturn Tab ───────────────────────────────────────────────────────────────

function AvaturnTab({ onSuccess }: { onSuccess: (avatarUrl: string) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "done">("loading");
  const capturedRef = useRef(false);

  const AVATURN_URL = "https://avaturn.me/sdk/";

  const handleSuccess = useCallback(
    (url: string) => {
      if (capturedRef.current) return;
      capturedRef.current = true;
      setPhase("done");
      onSuccess(url);
    },
    [onSuccess],
  );

  useEffect(() => {
    capturedRef.current = false;
    function onMessage(e: MessageEvent) {
      if (!e.data) return;
      const data =
        typeof e.data === "string"
          ? (() => {
              try {
                return JSON.parse(e.data);
              } catch {
                return null;
              }
            })()
          : e.data;
      if (!data) return;

      if (
        data.type === "avaturn:sdk:ready" ||
        (data.source === "avaturn" && data.type === "ready")
      ) {
        setPhase("ready");
      }

      const isExport =
        data.type === "avaturn:avatar:export" ||
        data.eventName === "export_avatar" ||
        data.type === "export_avatar" ||
        data.type === "avaturnComplete";
      if (isExport) {
        const url: string = data.data?.url ?? data.url ?? "";
        if (url) handleSuccess(url);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleSuccess]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">Hyper-Realistic</Badge>
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">Photo → Avatar</Badge>
        <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-[10px]">MetaHuman Quality</Badge>
        <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">Facial Blend Shapes</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Upload a photo to generate a hyper-realistic avatar with real skin, hair, and eyes.
        Exports as a standard GLB with full facial blend shapes.
      </p>
      <div
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{ height: 480 }}
      >
        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070010] z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
            <p className="text-xs text-muted-foreground">Loading Avaturn…</p>
          </div>
        )}
        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="text-white font-semibold">Avatar captured!</p>
            <p className="text-[11px] text-muted-foreground">Click Save to use this presenter</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={AVATURN_URL}
          className="w-full h-full border-0"
          allow="camera *; microphone *"
          onLoad={() => {
            setTimeout(() => setPhase((p) => (p === "loading" ? "ready" : p)), 1500);
          }}
        />
      </div>
    </div>
  );
}

// ── VRM / GLB Upload Tab ──────────────────────────────────────────────────────

function VRMUploadTab({
  onSuccess,
}: {
  onSuccess: (avatarUrl: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "uploading" | "done" | "error">(
    "idle",
  );
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
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "model/gltf-binary",
        }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = (await res.json()) as {
        uploadURL: string;
        objectPath: string;
      };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "model/gltf-binary",
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      const servingUrl = `${BASE}/api/storage${objectPath}`;
      setPhase("done");
      onSuccess(servingUrl);
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
        <Badge className="bg-white/5 text-white/50 border-white/10 text-[10px]">Custom Characters</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Upload a VRM 1.0 or GLB file. Must include facial blend shapes for lip sync and
        expressions. Compatible with VRoid Hub, Ready Player Me exports, and custom characters.
      </p>

      {phase === "done" ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <p className="text-white font-semibold">{fileName} uploaded!</p>
          <p className="text-[11px] text-muted-foreground">Click Save to use this presenter</p>
        </div>
      ) : (
        <label
          className={cn(
            "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed cursor-pointer transition-all py-14 select-none",
            phase === "uploading"
              ? "border-violet-500/50 bg-violet-500/5 cursor-default"
              : phase === "error"
                ? "border-red-500/40 bg-red-500/5"
                : "border-white/10 hover:border-white/25 bg-white/[0.02]",
          )}
        >
          <input
            type="file"
            accept=".vrm,.glb"
            className="sr-only"
            disabled={phase === "uploading"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {phase === "uploading" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
              <div className="text-center">
                <p className="text-sm text-white font-medium">
                  Uploading {fileName}…
                </p>
                <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
              </div>
              <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              {phase === "error" ? (
                <AlertCircle className="h-10 w-10 text-red-400" />
              ) : (
                <Upload className="h-10 w-10 text-white/20" />
              )}
              <div className="text-center">
                <p className="text-sm text-white font-medium">
                  {phase === "error" ? "Upload failed" : "Drop VRM / GLB here"}
                </p>
                {error ? (
                  <p className="text-xs text-red-400 mt-1">{error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/40">
                Max 100 MB · .vrm · .glb
              </p>
            </>
          )}
        </label>
      )}

      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
        <p className="text-[10px] font-medium text-white/60">Compatible sources</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[
            "VRoid Studio",
            "VRoid Hub",
            "Ready Player Me .glb",
            "Mixamo",
            "Custom Blender export",
          ].map((s) => (
            <span
              key={s}
              className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-white/40"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function AvatarCreatorModal({
  open,
  onOpenChange,
  onSave,
}: AvatarCreatorModalProps) {
  const [activeTab, setActiveTab] = useState<"rpm" | "avaturn" | "vrm">("rpm");
  const [pending, setPending] = useState<AvatarCreatorResult | null>(null);

  function handleRPMSuccess(avatarUrl: string, thumbnailUrl: string) {
    setPending({ avatarUrl, renderer: "rpm", thumbnailUrl });
  }
  function handleAvaturnSuccess(avatarUrl: string) {
    setPending({ avatarUrl, renderer: "avaturn" });
  }
  function handleVRMSuccess(avatarUrl: string) {
    setPending({ avatarUrl, renderer: "vrm" });
  }

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
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-white font-bold text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Create Your AI Presenter
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Photorealistic avatar · Real skin · Real hair · Real eyes ·
            ARKit lip sync · Facial expressions · TikTok reactions
          </p>
        </DialogHeader>

        <div className="px-6 py-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as "rpm" | "avaturn" | "vrm");
              setPending(null);
            }}
          >
            <TabsList className="w-full bg-white/5 border border-white/10 mb-4 p-0.5">
              <TabsTrigger
                value="rpm"
                className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Camera className="h-3 w-3" />
                Ready Player Me
              </TabsTrigger>
              <TabsTrigger
                value="avaturn"
                className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white"
              >
                <Sparkles className="h-3 w-3" />
                Avaturn
              </TabsTrigger>
              <TabsTrigger
                value="vrm"
                className="flex-1 text-[11px] gap-1.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              >
                <Upload className="h-3 w-3" />
                Upload VRM / GLB
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rpm" className="mt-0">
              <ReadyPlayerMeTab onSuccess={handleRPMSuccess} />
            </TabsContent>
            <TabsContent value="avaturn" className="mt-0">
              <AvaturnTab onSuccess={handleAvaturnSuccess} />
            </TabsContent>
            <TabsContent value="vrm" className="mt-0">
              <VRMUploadTab onSuccess={handleVRMSuccess} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/5 bg-black/30">
          <p className="text-[10px] text-muted-foreground/50">
            {pending ? (
              <span className="flex items-center gap-1 text-emerald-400/80">
                <CheckCircle2 className="h-3 w-3" />
                Avatar ready — click Save to apply
              </span>
            ) : (
              "Complete the steps above to capture your avatar"
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-7 bg-violet-600 hover:bg-violet-500 disabled:opacity-40"
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
