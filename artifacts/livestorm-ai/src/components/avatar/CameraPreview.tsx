import { useEffect, useRef } from "react";
import { Camera, CameraOff, RefreshCw, FlipHorizontal, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
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

export function CameraPreview() {
  const cam = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    cam.selectDevice(id);
    if (cam.active) {
      // Auto-restart with new device
      void cam.stop();
      setTimeout(() => void cam.start(), 100);
    }
  };

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
            {/* Mirror label */}
            {cam.mirrored && (
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

      {/* Controls */}
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
      </div>

      {/* Phase label */}
      <p className="text-[8px] text-muted-foreground/25 text-center">
        Phase 1 — Preview only · Avatar tracking not connected
      </p>

    </div>
  );
}
