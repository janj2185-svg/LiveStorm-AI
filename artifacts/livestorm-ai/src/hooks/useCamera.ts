import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "cameraSelectedDeviceId";

export type CameraPermission = "unknown" | "granted" | "denied" | "unavailable";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CameraStats {
  width: number;
  height: number;
  frameRate: number;
}

export interface UseCameraReturn {
  supported: boolean;
  permission: CameraPermission;
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  stream: MediaStream | null;
  active: boolean;
  stats: CameraStats | null;
  error: string | null;
  mirrored: boolean;
  start: () => Promise<void>;
  stop: () => void;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => void;
  toggleMirror: () => void;
}

const SUPPORTED =
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

export function useCamera(): UseCameraReturn {
  const [permission, setPermission] = useState<CameraPermission>("unknown");
  const [devices, setDevices]       = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [stream, setStream]   = useState<MediaStream | null>(null);
  const [active, setActive]   = useState(false);
  const [stats, setStats]     = useState<CameraStats | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [mirrored, setMirrored] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);

  // ── Permission query ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPPORTED) { setPermission("unavailable"); return; }
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        const map = (s: string): CameraPermission =>
          s === "granted" ? "granted" : s === "denied" ? "denied" : "unknown";
        setPermission(map(status.state));
        status.addEventListener("change", () => setPermission(map(status.state)));
      })
      .catch(() => setPermission("unknown"));
  }, []);

  // ── Enumerate devices ───────────────────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    if (!SUPPORTED) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const video = all
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setDevices(video);
    } catch (e) {
      console.warn("[Camera] enumerateDevices failed:", e);
    }
  }, []);

  useEffect(() => { void refreshDevices(); }, [refreshDevices]);

  // ── Stop helper ─────────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setActive(false);
    setStats(null);
  }, []);

  // ── Start camera ────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!SUPPORTED) {
      setError("Camera API not supported in this browser");
      return;
    }
    setError(null);
    stopStream();

    try {
      const videoConstraint: MediaTrackConstraints | boolean =
        selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true;

      const s = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false,
      });

      streamRef.current = s;
      setStream(s);
      setActive(true);
      setPermission("granted");

      const track = s.getVideoTracks()[0];
      if (track) {
        const cfg = track.getSettings();
        setStats({
          width:     cfg.width     ?? 0,
          height:    cfg.height    ?? 0,
          frameRate: Math.round(cfg.frameRate ?? 0),
        });
        // Auto-record active deviceId after permission granted
        if (!selectedDeviceId && cfg.deviceId) {
          setSelectedDeviceId(cfg.deviceId);
          try { localStorage.setItem(STORAGE_KEY, cfg.deviceId); } catch {}
        }
      }

      // Re-enumerate now that labels are available
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        all
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
      );
    } catch (err: unknown) {
      const e = err as DOMException;
      const msg =
        e?.name === "NotAllowedError"  ? "Camera permission denied — allow access in browser settings" :
        e?.name === "NotFoundError"    ? "No camera found on this device" :
        e?.name === "NotReadableError" ? "Camera is already in use by another app" :
        e?.message ?? "Failed to access camera";
      setError(msg);
      if (e?.name === "NotAllowedError") setPermission("denied");
    }
  }, [selectedDeviceId, stopStream]);

  // ── Stop (public) ───────────────────────────────────────────────────────────
  const stop = useCallback(() => { stopStream(); }, [stopStream]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // ── Select device ───────────────────────────────────────────────────────────
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try { localStorage.setItem(STORAGE_KEY, deviceId); } catch {}
  }, []);

  const toggleMirror = useCallback(() => setMirrored((v) => !v), []);

  return {
    supported: SUPPORTED,
    permission,
    devices,
    selectedDeviceId,
    stream,
    active,
    stats,
    error,
    mirrored,
    start,
    stop,
    refreshDevices,
    selectDevice,
    toggleMirror,
  };
}
