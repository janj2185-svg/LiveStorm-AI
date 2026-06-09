import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { Boxes, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProceduralAvatar, type QualityTier, type AvatarStyle } from "./ProceduralAvatar";
import { getAvatarVRMPath, isVRMBacked } from "./avatarAssets";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RendererStats {
  geometries: number;
  textures: number;
  triangles: number;
  drawCalls: number;
  fps: number;
  quality: QualityTier;
}

export interface AvatarCanvasProps {
  avatarKey: string;
  accentColor: string;
  scale: number;
  positionY: number;
  lightingPreset: string;
  avatarEnabled: boolean;
  /** Explicit VRM URL — overrides the built-in asset for this avatarKey. */
  avatarUrl?: string | null;
  showFps?: boolean;
  onStats?: (stats: RendererStats) => void;
  className?: string;
}

type VRMState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; vrm: VRM }
  | { status: "error"; message: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_STYLE_MAP: Record<string, AvatarStyle> = {
  "storm-default": "anime",
  "storm-serious": "realistic",
  "storm-cute": "chibi",
};

function detectInitialQuality(): QualityTier {
  if (typeof navigator === "undefined") return "medium";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return "high";
  const cores = (navigator as Navigator & { hardwareConcurrency?: number })
    .hardwareConcurrency ?? 4;
  return cores >= 6 ? "medium" : "low";
}

// Apply a subtle accent tint to a loaded VRM model's materials.
// Works for both PBR (MeshStandardMaterial) and MToon materials.
function applyVRMAccentTint(vrm: VRM, accentColor: string, strength = 0.18) {
  const accent = new THREE.Color(accentColor);
  vrm.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      // MeshStandardMaterial / MeshBasicMaterial / MToon all expose .color
      if (mat && "color" in mat && mat.color instanceof THREE.Color) {
        mat.color.lerp(accent, strength);
        if ("needsUpdate" in mat) (mat as THREE.Material).needsUpdate = true;
      }
    });
  });
}

// ── @pixiv/three-vrm loader hook ──────────────────────────────────────────────

function useVRMLoader(url: string | null | undefined): VRMState {
  const [state, setState] = useState<VRMState>({ status: "idle" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });

    (async () => {
      try {
        const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("@pixiv/three-vrm"),
        ]);

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        const gltf = await loader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;

        VRMUtils.removeUnnecessaryVertices(vrm.scene);
        VRMUtils.removeUnnecessaryJoints(vrm.scene);

        // VRM 1.0 models face away — rotate to face camera
        vrm.scene.rotation.y = Math.PI;

        if (mounted.current) setState({ status: "loaded", vrm });
      } catch (err) {
        if (mounted.current) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load VRM",
          });
        }
      }
    })();
  }, [url]);

  return state;
}

// ── VRM avatar renderer ───────────────────────────────────────────────────────

function VRMAvatarView({ vrm, accentColor }: { vrm: VRM; accentColor: string; quality: QualityTier }) {
  const tinted = useRef(false);

  useEffect(() => {
    if (!tinted.current) {
      applyVRMAccentTint(vrm, accentColor, 0.15);
      tinted.current = true;
    }
  }, [vrm, accentColor]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
    if (hips) {
      hips.position.y = Math.sin(t * 0.85) * 0.012;
      hips.rotation.y = Math.sin(t * 0.32) * 0.06;
    }

    const neck = vrm.humanoid?.getNormalizedBoneNode("neck");
    if (neck) {
      neck.rotation.y = Math.sin(t * 0.68) * 0.12;
      neck.rotation.x = Math.sin(t * 0.48) * 0.04;
    }

    const leftArm = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
    const rightArm = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
    if (leftArm) leftArm.rotation.z = 0.3 + Math.sin(t * 0.88) * 0.05;
    if (rightArm) rightArm.rotation.z = -0.3 + Math.sin(t * 0.88 + Math.PI) * 0.05;

    // Blink
    const blinkPhase = t % 3.8;
    const blinkVal = blinkPhase > 3.62 ? Math.max(0, 1 - (blinkPhase - 3.62) * 26) : 0;
    vrm.expressionManager?.setValue("blink", blinkVal);
    vrm.expressionManager?.setValue("blinkLeft", blinkVal);
    vrm.expressionManager?.setValue("blinkRight", blinkVal);

    vrm.update(delta);
  });

  return <primitive object={vrm.scene} dispose={null} />;
}

// ── Lighting presets ─────────────────────────────────────────────────────────

function LightingRig({ preset, quality }: { preset: string; quality: QualityTier }) {
  const castShadow = quality === "high";

  if (preset === "dramatic") {
    return (
      <>
        <ambientLight intensity={0.12} />
        <directionalLight position={[3, 5, 2]} intensity={2.8} castShadow={castShadow} />
        <pointLight position={[-4, 2, -3]} intensity={1.0} color="#ff7733" />
        <pointLight position={[0, 0, 3]} intensity={0.4} color="#3366ff" />
      </>
    );
  }
  if (preset === "soft") {
    return (
      <>
        <ambientLight intensity={1.1} />
        <directionalLight position={[0, 8, 4]} intensity={0.55} />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#aaccff" />
      </>
    );
  }
  if (preset === "neon") {
    return (
      <>
        <ambientLight intensity={0.07} />
        <pointLight position={[0, 3, 2]} intensity={3.5} color="#ff00ff" />
        <pointLight position={[2, 1, 1]} intensity={2.2} color="#00ffff" />
        <pointLight position={[-2, 1, 1]} intensity={1.8} color="#ff44ee" />
        <pointLight position={[0, -1, 2]} intensity={1.2} color="#4400ff" />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.38} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.9}
        castShadow={castShadow}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.38} color="#aabbdd" />
      <pointLight position={[0, 2, 4]} intensity={0.55} />
    </>
  );
}

// ── FPS + memory tracker ──────────────────────────────────────────────────────

function StatsTracker({
  quality,
  onStats,
}: {
  quality: QualityTier;
  onStats: (s: RendererStats) => void;
}) {
  const { gl } = useThree();
  const frames = useRef(0);
  const last = useRef(performance.now());
  const fps = useRef(60);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - last.current >= 1000) {
      fps.current = Math.round((frames.current * 1000) / (now - last.current));
      frames.current = 0;
      last.current = now;
      onStats({
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        triangles: gl.info.render.triangles,
        drawCalls: gl.info.render.calls,
        fps: fps.current,
        quality,
      });
    }
  });
  return null;
}

// ── Scene (inner Canvas children) ─────────────────────────────────────────────

function AvatarScene({
  avatarKey,
  accentColor,
  scale,
  positionY,
  lightingPreset,
  effectiveVrmUrl,
  quality,
  onStats,
  onQualityDecline,
}: {
  avatarKey: string;
  accentColor: string;
  scale: number;
  positionY: number;
  lightingPreset: string;
  effectiveVrmUrl: string | null | undefined;
  quality: QualityTier;
  onStats: (s: RendererStats) => void;
  onQualityDecline: () => void;
}) {
  const style: AvatarStyle = AVATAR_STYLE_MAP[avatarKey] ?? "anime";
  const vrmState = useVRMLoader(effectiveVrmUrl);

  return (
    <>
      <PerformanceMonitor factor={1} onDecline={onQualityDecline} threshold={0.85} />
      <StatsTracker quality={quality} onStats={onStats} />
      <LightingRig preset={lightingPreset} quality={quality} />

      <group position={[0, positionY, 0]} scale={[scale, scale, scale]}>
        {vrmState.status === "loaded" ? (
          <VRMAvatarView vrm={vrmState.vrm} accentColor={accentColor} quality={quality} />
        ) : (
          <ProceduralAvatar style={style} accentColor={accentColor} quality={quality} />
        )}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 1.75}
        rotateSpeed={0.65}
        makeDefault
      />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AvatarCanvas({
  avatarKey,
  accentColor,
  scale,
  positionY,
  lightingPreset,
  avatarEnabled,
  avatarUrl,
  showFps = true,
  onStats,
  className,
}: AvatarCanvasProps) {
  const [stats, setStats] = useState<RendererStats>({
    geometries: 0, textures: 0, triangles: 0, drawCalls: 0, fps: 60, quality: "high",
  });
  const [quality, setQuality] = useState<QualityTier>(detectInitialQuality);

  // Resolve effective VRM URL:
  // - explicit avatarUrl prop wins (e.g. user-uploaded file)
  // - else look up built-in asset path for this avatarKey
  // - null → procedural fallback
  const effectiveVrmUrl = avatarUrl !== undefined
    ? avatarUrl
    : getAvatarVRMPath(avatarKey);

  const handleStats = useCallback((s: RendererStats) => {
    setStats(s);
    onStats?.(s);
  }, [onStats]);

  if (!avatarEnabled) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/5",
          className,
        )}
      >
        <Boxes className="h-8 w-8 text-violet-400/20 mb-2" />
        <p className="text-xs text-muted-foreground/40">Avatar disabled</p>
        <p className="text-[10px] text-muted-foreground/25 mt-0.5">Enable via the toggle above</p>
      </div>
    );
  }

  const dpr: [number, number] =
    quality === "low" ? [1, 1] : quality === "medium" ? [1, 1.5] : [1, 2];

  const fpsColor =
    stats.fps >= 50
      ? "text-green-400 border-green-500/25"
      : stats.fps >= 30
      ? "text-yellow-400 border-yellow-500/25"
      : "text-red-400 border-red-500/25";

  const qualityColor =
    quality === "high"
      ? "text-violet-300"
      : quality === "medium"
      ? "text-blue-300"
      : "text-gray-400";

  const vrmBacked = isVRMBacked(avatarKey) || !!avatarUrl;

  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            lightingPreset === "neon"
              ? "linear-gradient(160deg, #0d0024 0%, #000010 100%)"
              : lightingPreset === "dramatic"
              ? "linear-gradient(160deg, #1a0800 0%, #0a0000 100%)"
              : "linear-gradient(160deg, #0e0018 0%, #000008 100%)",
        }}
      />

      <Canvas
        gl={{
          antialias: quality !== "low",
          alpha: true,
          powerPreference: quality === "low" ? "low-power" : "high-performance",
        }}
        shadows={quality === "high"}
        camera={{ position: [0, 1.1, 2.5], fov: 37 }}
        dpr={dpr}
        style={{ position: "relative" }}
      >
        <Suspense fallback={null}>
          <AvatarScene
            avatarKey={avatarKey}
            accentColor={accentColor}
            scale={scale}
            positionY={positionY}
            lightingPreset={lightingPreset}
            effectiveVrmUrl={effectiveVrmUrl}
            quality={quality}
            onStats={handleStats}
            onQualityDecline={() =>
              setQuality((q) => (q === "high" ? "medium" : "low"))
            }
          />
        </Suspense>
      </Canvas>

      {/* FPS + quality overlay */}
      {showFps && (
        <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
          <div className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border", fpsColor)}>
            {stats.fps}fps
          </div>
          <div className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border border-white/10", qualityColor)}>
            {quality}
          </div>
        </div>
      )}

      {/* VRM badge (bottom-left) */}
      <div className="absolute bottom-6 left-2 pointer-events-none">
        {vrmBacked ? (
          <div className="text-[8px] px-1.5 py-0.5 rounded bg-violet-900/70 border border-violet-500/30 text-violet-300 font-mono">
            VRM 1.0
          </div>
        ) : (
          <div className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-white/30 font-mono">
            Procedural
          </div>
        )}
      </div>

      {/* Drag hint */}
      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[8px] text-white/20 tracking-wide">drag to rotate</span>
      </div>
    </div>
  );
}

// ── Upload button (standalone) ────────────────────────────────────────────────
// Used in ai-assistant.tsx to wire a file-input to the canvas avatarUrl.

export interface VRMUploadButtonProps {
  onUpload: (url: string, filename: string) => void;
  onClear?: () => void;
  uploadedName?: string | null;
  className?: string;
}

export function VRMUploadButton({ onUpload, onClear, uploadedName, className }: VRMUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    onUpload(url, file.name);
  };

  const handleClear = () => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".vrm"
        className="hidden"
        onChange={handleChange}
      />
      {uploadedName ? (
        <>
          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0 animate-pulse" />
            <span className="text-[11px] text-violet-300 truncate">{uploadedName}</span>
          </div>
          <button
            onClick={handleClear}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors flex-shrink-0"
          >
            Clear
          </button>
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/15 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-muted-foreground hover:text-violet-300 group"
        >
          <Upload className="h-3.5 w-3.5 group-hover:text-violet-400 transition-colors" />
          <span className="text-xs">Upload custom .vrm</span>
        </button>
      )}
    </div>
  );
}
