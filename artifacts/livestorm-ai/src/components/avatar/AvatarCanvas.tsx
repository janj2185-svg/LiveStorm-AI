import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import type { VRM } from "@pixiv/three-vrm";
import { Boxes, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProceduralAvatar, type QualityTier, type AvatarStyle } from "./ProceduralAvatar";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AvatarCanvasProps {
  avatarKey: string;
  accentColor: string;
  scale: number;
  positionY: number;
  lightingPreset: string;
  avatarEnabled: boolean;
  /** Optional URL to a .vrm file. When set, loads via @pixiv/three-vrm instead of procedural. */
  avatarUrl?: string | null;
  showFps?: boolean;
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

// ── @pixiv/three-vrm loader hook ──────────────────────────────────────────────
// Dynamically imports GLTFLoader + VRMLoaderPlugin to keep bundle lean.
// Falls back to ProceduralAvatar when url is null/undefined.

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
        // Dynamic imports — only bundled when a VRM URL is actually provided
        const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("@pixiv/three-vrm"),
        ]);

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        const gltf = await loader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;

        // Optimization helpers from VRMUtils
        VRMUtils.removeUnnecessaryVertices(vrm.scene);
        VRMUtils.removeUnnecessaryJoints(vrm.scene);

        // VRM 1.0 models face away from camera by default — rotate to face forward
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
// Renders the loaded VRM scene via <primitive> and drives idle animation
// through the VRM humanoid bone API + vrm.update(delta).

function VRMAvatarView({ vrm, quality }: { vrm: VRM; quality: QualityTier }) {
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Whole-body float via hips bone
    const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
    if (hips) {
      hips.position.y = Math.sin(t * 0.85) * 0.012;
      hips.rotation.y = Math.sin(t * 0.32) * 0.06;
    }

    // Head look-around via neck bone
    const neck = vrm.humanoid?.getNormalizedBoneNode("neck");
    if (neck) {
      neck.rotation.y = Math.sin(t * 0.68) * 0.12;
      neck.rotation.x = Math.sin(t * 0.48) * 0.04;
    }

    // Arm gentle sway via upper-arm bones
    const leftArm = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
    const rightArm = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
    if (leftArm) leftArm.rotation.z = 0.3 + Math.sin(t * 0.88) * 0.05;
    if (rightArm) rightArm.rotation.z = -0.3 + Math.sin(t * 0.88 + Math.PI) * 0.05;

    // Blink via expression manager
    const blinkPhase = t % 3.8;
    const blinkVal =
      blinkPhase > 3.62 ? Math.max(0, 1 - (blinkPhase - 3.62) * 26) : 0;
    vrm.expressionManager?.setValue("blink", blinkVal);
    vrm.expressionManager?.setValue("blinkLeft", blinkVal);
    vrm.expressionManager?.setValue("blinkRight", blinkVal);

    // REQUIRED: update spring bones, expressions, lookAt each frame
    vrm.update(delta);
  });

  return (
    <primitive
      object={vrm.scene}
      dispose={null}
    />
  );
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
  // studio (default)
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

// ── FPS tracker ───────────────────────────────────────────────────────────────

function FpsTracker({ onFps }: { onFps: (fps: number) => void }) {
  const frames = useRef(0);
  const last = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - last.current >= 1000) {
      onFps(Math.round((frames.current * 1000) / (now - last.current)));
      frames.current = 0;
      last.current = now;
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
  avatarUrl,
  quality,
  onFps,
  onQualityDecline,
}: {
  avatarKey: string;
  accentColor: string;
  scale: number;
  positionY: number;
  lightingPreset: string;
  avatarUrl?: string | null;
  quality: QualityTier;
  onFps: (n: number) => void;
  onQualityDecline: () => void;
}) {
  const style: AvatarStyle = AVATAR_STYLE_MAP[avatarKey] ?? "anime";
  const vrmState = useVRMLoader(avatarUrl);

  return (
    <>
      <PerformanceMonitor factor={1} onDecline={onQualityDecline} threshold={0.85} />
      <FpsTracker onFps={onFps} />
      <LightingRig preset={lightingPreset} quality={quality} />

      <group position={[0, positionY, 0]} scale={[scale, scale, scale]}>
        {vrmState.status === "loaded" ? (
          // Real VRM model from @pixiv/three-vrm
          <VRMAvatarView vrm={vrmState.vrm} quality={quality} />
        ) : (
          // Procedural fallback (used when no avatarUrl is configured)
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
  className,
}: AvatarCanvasProps) {
  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState<QualityTier>(detectInitialQuality);

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
    fps >= 50
      ? "text-green-400 border-green-500/25"
      : fps >= 30
      ? "text-yellow-400 border-yellow-500/25"
      : "text-red-400 border-red-500/25";

  const qualityColor =
    quality === "high"
      ? "text-violet-300"
      : quality === "medium"
      ? "text-blue-300"
      : "text-gray-400";

  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      {/* Scene background — matches lighting preset mood */}
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
            avatarUrl={avatarUrl}
            quality={quality}
            onFps={setFps}
            onQualityDecline={() =>
              setQuality((q) => (q === "high" ? "medium" : "low"))
            }
          />
        </Suspense>
      </Canvas>

      {/* FPS + quality tier overlay */}
      {showFps && (
        <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
          <div
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border",
              fpsColor,
            )}
          >
            {fps}fps
          </div>
          <div
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border border-white/10",
              qualityColor,
            )}
          >
            {quality}
          </div>
        </div>
      )}

      {/* Loading indicator when a VRM URL is set but still fetching */}
      {avatarUrl && (
        <div className="absolute top-2 left-2 pointer-events-none">
          <Loader2 className="h-3 w-3 text-violet-400/50 animate-spin" style={{ display: "none" }} />
        </div>
      )}

      {/* Drag hint */}
      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[8px] text-white/20 tracking-wide">drag to rotate</span>
      </div>
    </div>
  );
}
