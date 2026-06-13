import { useEffect, useRef, useState } from "react";
import {
  Camera, CameraOff, RefreshCw, FlipHorizontal,
  AlertTriangle, CheckCircle2, Clock, XCircle, ScanFace,
} from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useFaceTracking } from "@/hooks/useFaceTracking";
import type { FaceTrackingData } from "@/lib/faceExpressionMapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PermissionBadge({ state }: { state: string }) {
  const cfg = {
    granted:     { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", label: "Granted" },
    denied:      { icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/25",         label: "Denied" },
    unknown:     { icon: Clock,        color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",     label: "Not asked" },
    unavailable: { icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/25",         label: "Unavailable" },
  }[state] ?? { icon: Clock, color: "text-muted-foreground", bg: "bg-white/5 border-white/10", label: state };

  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold", cfg.bg, cfg.color)}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

const EXPRESSION_EMOJI: Record<string, string> = {
  neutral:   "😐",
  smile:     "😊",
  talking:   "🗣️",
  surprised: "😲",
  focused:   "🤔",
};

export interface CameraPreviewProps {
  onTrackingData?: (data: FaceTrackingData | null) => void;
}

export function CameraPreview({ onTrackingData }: CameraPreviewProps) {
  const cam = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  const { trackingData, isReady, isTracking, error: trackingError } =
    useFaceTracking(videoRef, cam.active && trackingEnabled);

  // Wire stream → <video> srcObject
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (cam.stream) {
      el.srcObject = cam.stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [cam.stream]);

  // Emit tracking data to parent
  useEffect(() => {
    onTrackingData?.(trackingEnabled && cam.active ? trackingData : null);
  }, [trackingData, trackingEnabled, cam.active, onTrackingData]);

  // When camera stops, disable tracking too
  useEffect(() => {
    if (!cam.active) setTrackingEnabled(false);
  }, [cam.active]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    cam.selectDevice(id);
    if (cam.active) {
      void cam.stop();
      setTimeout(() => void cam.start(), 100);
    }
  };

  const td = trackingEnabled && cam.active ? trackingData : null;

  return (
    <div className="space-y-3">

      {/* Permission row */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-widest">Permission</span>
        <PermissionBadge state={cam.permission} />
      </div>

      {/* Camera preview frame */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/[0.06]">
        {cam.active ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                cam.mirrored && "scale-x-[-1]",
              )}
            />
            {/* Live badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-400 font-bold">Camera active</span>
            </div>
            {/* Stats badge */}
            {cam.stats && (
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 border border-white/[0.08]">
                <span className="text-[9px] text-white/60 font-mono">
                  {cam.stats.width}×{cam.stats.height}
                  {cam.stats.frameRate > 0 && ` · ${cam.stats.frameRate}fps`}
                </span>
              </div>
            )}
            {/* Face detected badge */}
            {td && (
              <div className={cn(
                "absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold",
                td.faceDetected
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-black/60 border-white/10 text-white/30",
              )}>
                <ScanFace className="h-2.5 w-2.5" />
                {td.faceDetected
                  ? `${EXPRESSION_EMOJI[td.expression] ?? ""}  ${td.expression}`
                  : "No face"}
              </div>
            )}
            {/* Mirror label */}
            {cam.mirrored && !td && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 border border-white/[0.08]">
                <span className="text-[9px] text-white/40 font-medium">Mirrored</span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <CameraOff className="h-8 w-8 text-white/20" />
            <p className="text-[10px] text-white/30">
              {cam.permission === "denied"
                ? "Permission denied"
                : cam.permission === "unavailable"
                ? "No camera API"
                : "Camera off"}
            </p>
          </div>
        )}

        {/* Error overlay */}
        {cam.error && (
          <div className="absolute inset-x-0 bottom-0 flex items-start gap-1.5 p-2 bg-red-900/80 border-t border-red-500/30">
            <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-red-300 leading-tight">{cam.error}</p>
          </div>
        )}
      </div>

      {/* Device selector */}
      {cam.devices.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-bold">Device</p>
          <select
            value={cam.selectedDeviceId ?? ""}
            onChange={handleSelectChange}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-violet-500/40 cursor-pointer"
          >
            {cam.devices.length > 1 && !cam.selectedDeviceId && (
              <option value="">Select camera…</option>
            )}
            {cam.devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {cam.devices.length === 0 && cam.permission !== "unavailable" && (
        <p className="text-[9px] text-muted-foreground/40 text-center">
          No cameras detected — click Refresh to scan
        </p>
      )}

      {/* Camera controls */}
      <div className="grid grid-cols-2 gap-1.5">
        {!cam.active ? (
          <Button
            size="sm"
            onClick={() => void cam.start()}
            disabled={!cam.supported || cam.permission === "denied"}
            className="col-span-2 h-7 text-[11px] bg-violet-600 hover:bg-violet-500"
          >
            <Camera className="h-3 w-3 mr-1.5" />
            Start Camera
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={cam.stop}
            className="col-span-2 h-7 text-[11px] border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          >
            <CameraOff className="h-3 w-3 mr-1.5" />
            Stop Camera
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => void cam.refreshDevices()}
          className="h-7 text-[10px] border-white/[0.08] text-muted-foreground hover:text-white"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={cam.toggleMirror}
          className={cn(
            "h-7 text-[10px] border-white/[0.08]",
            cam.mirrored
              ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
              : "text-muted-foreground hover:text-white",
          )}
        >
          <FlipHorizontal className="h-3 w-3 mr-1" />
          {cam.mirrored ? "Mirror ON" : "Mirror OFF"}
        </Button>
      </div>

      {/* Face Tracking toggle */}
      {cam.active && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ScanFace className={cn("h-3.5 w-3.5", trackingEnabled ? "text-violet-400" : "text-white/30")} />
              <span className="text-[10px] font-bold text-white/70">Face Tracking</span>
            </div>
            <button
              onClick={() => setTrackingEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                trackingEnabled ? "bg-violet-600" : "bg-white/10",
              )}
            >
              <span className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform",
                trackingEnabled ? "translate-x-3.5" : "translate-x-0.5",
              )} />
            </button>
          </div>

          {trackingEnabled && (
            <div className="flex items-center gap-1.5">
              {!isReady ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  <span className="text-[9px] text-amber-400/70">Loading MediaPipe model…</span>
                </>
              ) : isTracking ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className="text-[9px] text-emerald-400/70">Tracking active · 15fps</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                  <span className="text-[9px] text-white/30">Initializing…</span>
                </>
              )}
              {trackingError && (
                <span className="text-[9px] text-red-400/70 truncate">{trackingError}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Diagnostics */}
      <div className="rounded-lg bg-black/30 border border-white/[0.05] p-2 space-y-1">
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-1.5">Diagnostics</p>
        {[
          { key: "Camera API",    val: cam.supported ? "YES" : "NO",             ok: cam.supported },
          { key: "Permission",    val: cam.permission,                            ok: cam.permission === "granted" },
          { key: "Device ID",     val: cam.selectedDeviceId ? cam.selectedDeviceId.slice(0, 16) + "…" : "none", ok: !!cam.selectedDeviceId },
          { key: "Stream active", val: cam.active ? "YES" : "NO",                ok: cam.active },
          { key: "Resolution",    val: cam.stats ? `${cam.stats.width}×${cam.stats.height}` : "—", ok: !!cam.stats },
          { key: "FPS",           val: cam.stats?.frameRate ? `${cam.stats.frameRate}fps` : "—",   ok: !!(cam.stats?.frameRate) },
          { key: "Error",         val: cam.error ?? "none",                       ok: !cam.error },
        ].map(({ key, val, ok }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/40 font-mono">{key}</span>
            <span className={cn("text-[9px] font-mono font-bold", ok ? "text-emerald-400/80" : "text-red-400/70")}>
              {val}
            </span>
          </div>
        ))}

        {/* Face tracking diagnostics — only when active */}
        {trackingEnabled && cam.active && (
          <>
            <div className="border-t border-white/[0.05] mt-1.5 pt-1.5">
              <p className="text-[8px] font-bold uppercase tracking-widest text-violet-400/40 mb-1">Face Tracking</p>
            </div>
            {[
              {
                key: "MediaPipe",
                val: isReady ? "ready" : "loading",
                ok: isReady,
              },
              {
                key: "Face detected",
                val: td?.faceDetected ? "YES" : "NO",
                ok: td?.faceDetected ?? false,
              },
              {
                key: "Confidence",
                val: td?.faceDetected ? td.confidence.toFixed(2) : "—",
                ok: (td?.confidence ?? 0) > 0.7,
              },
              {
                key: "Expression",
                val: td?.faceDetected
                  ? `${EXPRESSION_EMOJI[td.expression] ?? ""} ${td.expression}`
                  : "—",
                ok: td?.faceDetected ?? false,
              },
              {
                key: "Mouth open",
                val: td?.faceDetected ? td.mouthOpenValue.toFixed(2) : "—",
                ok: true,
              },
              {
                key: "Blink L/R",
                val: td?.faceDetected
                  ? `${td.blinkLeft.toFixed(2)} / ${td.blinkRight.toFixed(2)}`
                  : "—",
                ok: true,
              },
              {
                key: "Avatar state",
                val: td?.faceDetected ? td.avatarState : "—",
                ok: td?.faceDetected ?? false,
              },
            ].map(({ key, val, ok }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground/40 font-mono">{key}</span>
                <span className={cn("text-[9px] font-mono font-bold", ok ? "text-violet-300/80" : "text-muted-foreground/40")}>
                  {val}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Phase label */}
      <p className="text-[8px] text-muted-foreground/25 text-center">
        Phase 2 — Face tracking · All processing local · No data sent to server
      </p>

    </div>
  );
}
