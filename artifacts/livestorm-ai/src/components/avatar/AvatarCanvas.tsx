import { Component, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import { Boxes, Upload, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarVRMPath } from "./avatarAssets";
import type { AnimationState } from "./avatarAnimationMachine";
import { ANIMATION_EMOJI } from "./avatarAnimationMachine";

// ── WebGL availability check (runs once, synchronously) ───────────────────────
// Detects before mounting the Canvas so Three.js never throws into the global
// error handler (which @replit/vite-plugin-runtime-error-modal intercepts).
// Exported so callers (AvatarStage debug panel, tests) can read the same value.
export function checkWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ── WebGL-unavailable 2D placeholder ──────────────────────────────────────────
function WebGLFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center bg-gradient-to-b from-violet-950/40 to-black/60 rounded-2xl border border-violet-500/20", className)}>
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
            <Bot className="h-8 w-8 text-violet-400/60" />
          </div>
          <div className="absolute inset-0 rounded-full animate-ping bg-violet-500/10" style={{ animationDuration: "2.5s" }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/70">3D Avatar</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">Ready to render in-browser</p>
        </div>
      </div>
    </div>
  );
}

// ── WebGL Error Boundary (second line of defence) ─────────────────────────────
interface EBState { hasError: boolean }
class WebGLErrorBoundary extends Component<
  { children: ReactNode; className?: string; onError?: (msg: string) => void },
  EBState
> {
  constructor(props: { children: ReactNode; className?: string; onError?: (msg: string) => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { this.props.onError?.(error.message); }
  render() {
    if (this.state.hasError) {
      return <WebGLFallback className={this.props.className} />;
    }
    return this.props.children;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type QualityTier = "low" | "medium" | "high";

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
  avatarUrl?: string | null;
  showFps?: boolean;
  onStats?: (stats: RendererStats) => void;
  onError?: (msg: string) => void;
  className?: string;
  animationState?: AnimationState;
  mouthOpenAmount?: number;
  expressionIntensity?: number;
  backgroundGradient?: string;
}

type VRMState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; vrm: VRM }
  | { status: "error"; message: string };

type GLBState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; scene: THREE.Group; morphTargets: string[] }
  | { status: "error"; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────


function detectInitialQuality(): QualityTier {
  if (typeof navigator === "undefined") return "medium";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return "high";
  const cores = (navigator as Navigator & { hardwareConcurrency?: number })
    .hardwareConcurrency ?? 4;
  return cores >= 6 ? "medium" : "low";
}

function applyVRMAccentTint(vrm: VRM, accentColor: string, strength = 0.18) {
  const accent = new THREE.Color(accentColor);
  vrm.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      if (mat && "color" in mat && mat.color instanceof THREE.Color) {
        mat.color.lerp(accent, strength);
        if ("needsUpdate" in mat) (mat as THREE.Material).needsUpdate = true;
      }
    });
  });
}

// ── VRM loader ────────────────────────────────────────────────────────────────

function useVRMLoader(url: string | null | undefined): VRMState {
  const [state, setState] = useState<VRMState>({ status: "idle" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) { setState({ status: "idle" }); return; }
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

// ── Ready Player Me / GLB loader ─────────────────────────────────────────────

function useGLBLoader(url: string | null | undefined): GLBState {
  const [state, setState] = useState<GLBState>({ status: "idle" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) { setState({ status: "idle" }); return; }
    setState({ status: "loading" });

    (async () => {
      try {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        // RPM CORS: fetch with mode cors, convert to blob URL
        let loadUrl = url;
        if (url.startsWith("https://models.readyplayer.me") || url.startsWith("https://api.readyplayer.me")) {
          try {
            const res = await fetch(url + (url.includes("?") ? "&" : "?") + "morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024", {
              mode: "cors",
            });
            if (res.ok) {
              const blob = await res.blob();
              loadUrl = URL.createObjectURL(blob);
            }
          } catch {
            // Fall through to direct load
          }
        }
        const gltf = await loader.loadAsync(loadUrl);
        const scene = gltf.scene;
        scene.rotation.y = Math.PI;

        // Collect available morph target names for lip sync mapping
        const morphTargets: string[] = [];
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.morphTargetDictionary) {
            morphTargets.push(...Object.keys(obj.morphTargetDictionary));
          }
        });

        if (mounted.current) setState({ status: "loaded", scene, morphTargets: [...new Set(morphTargets)] });
        // If we created a blob URL, release it after load
        if (loadUrl !== url) {
          URL.revokeObjectURL(loadUrl);
        }
      } catch (err) {
        if (mounted.current) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load avatar",
          });
        }
      }
    })();
  }, [url]);

  return state;
}

// ── VRM avatar renderer ───────────────────────────────────────────────────────

function VRMAvatarView({
  vrm,
  accentColor,
  quality,
  animationState,
  mouthOpenRef,
  expressionIntensityRef,
}: {
  vrm: VRM;
  accentColor: string;
  quality: QualityTier;
  animationState: AnimationState;
  mouthOpenRef: React.MutableRefObject<number>;
  expressionIntensityRef: React.MutableRefObject<number>;
}) {
  const tinted = useRef(false);
  const animRef = useRef(animationState);
  animRef.current = animationState;

  const leftArmZRef = useRef(0.30);
  const rightArmZRef = useRef(-0.30);
  const leftArmXRef = useRef(0);
  const rightArmXRef = useRef(0);
  const neckZRef = useRef(0);

  useEffect(() => {
    if (!tinted.current) {
      applyVRMAccentTint(vrm, accentColor, 0.15);
      tinted.current = true;
    }
  }, [vrm, accentColor]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const anim = animRef.current;
    const intensity = expressionIntensityRef.current;
    const mouthOpen = mouthOpenRef.current;
    const lf = 1 - Math.pow(0.001, delta);

    let tLeftZ = 0.30, tRightZ = -0.30;
    let tLeftX = 0, tRightX = 0;
    let bounceFreq = 0.85, bounceAmp = 0.012;

    switch (anim) {
      case "talking":   tLeftZ = 0.28;  tRightZ = -0.28;  bounceFreq = 1.1;  bounceAmp = 0.014; break;
      case "happy":     tLeftZ = 0.14;  tRightZ = -0.14;  bounceFreq = 1.45; bounceAmp = 0.022; break;
      case "excited":   tLeftZ = 0.06;  tRightZ = -0.06;  bounceFreq = 2.2;  bounceAmp = 0.032; break;
      case "gift_reaction":   tLeftZ = 0.18; tRightZ = -0.18; tLeftX = -0.5; tRightX = -0.5; bounceFreq = 0.9; bounceAmp = 0.014; break;
      case "follow_reaction": tLeftZ = -0.55; tRightZ = 0.55; bounceFreq = 1.8; bounceAmp = 0.028; break;
      case "victory":   tLeftZ = -1.1;  tRightZ = 1.1;   bounceFreq = 2.5;  bounceAmp = 0.042; break;
      case "surprised": tLeftZ = 0.08;  tRightZ = -0.08;  bounceFreq = 0.5;  bounceAmp = 0.006; break;
      case "thinking":  tLeftZ = 0.22;  tRightZ = -0.72;  bounceFreq = 0.45; bounceAmp = 0.005; break;
      case "listening": tLeftZ = 0.26;  tRightZ = -0.26;  bounceFreq = 0.90; bounceAmp = 0.011; break;
    }

    leftArmZRef.current  += (tLeftZ  - leftArmZRef.current)  * lf;
    rightArmZRef.current += (tRightZ - rightArmZRef.current) * lf;
    leftArmXRef.current  += (tLeftX  - leftArmXRef.current)  * lf;
    rightArmXRef.current += (tRightX - rightArmXRef.current) * lf;

    const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
    if (hips) {
      hips.position.y = Math.sin(t * bounceFreq) * bounceAmp;
      hips.rotation.y = Math.sin(t * 0.32) * 0.06;
    }

    // Breathing — subtle chest/spine rise
    const spine = vrm.humanoid?.getNormalizedBoneNode("spine");
    if (spine) {
      const breathAmp = anim === "excited" ? 0.018 : anim === "surprised" ? 0.014 : 0.008;
      spine.rotation.x = Math.sin(t * 0.24) * breathAmp;
    }

    const neck = vrm.humanoid?.getNormalizedBoneNode("neck");
    if (neck) {
      neck.rotation.y = Math.sin(t * 0.68) * 0.12;
      const nodAmp  = anim === "talking" ? 0.065 : anim === "listening" ? 0.055 : 0.04;
      const nodFreq = anim === "talking" ? 2.8   : anim === "listening" ? 1.8   : 0.48;
      neck.rotation.x = Math.sin(t * nodFreq) * nodAmp + (anim === "listening" ? 0.04 : 0);
      const tNeckZ = anim === "thinking" ? 0.10 + Math.sin(t * 0.12) * 0.04 : 0;
      neckZRef.current += (tNeckZ - neckZRef.current) * lf;
      neck.rotation.z = neckZRef.current;
    }

    const leftArm  = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
    const rightArm = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
    const swayBase = anim === "excited" || anim === "follow_reaction" ? 0.12 : 0.04;
    const swayFreq = anim === "follow_reaction" ? 2.8 : 0.88;
    if (leftArm)  { leftArm.rotation.z  = leftArmZRef.current  + Math.sin(t * swayFreq)           * swayBase; leftArm.rotation.x  = leftArmXRef.current; }
    if (rightArm) { rightArm.rotation.z = rightArmZRef.current + Math.sin(t * swayFreq + Math.PI) * swayBase; rightArm.rotation.x = rightArmXRef.current; }

    // Blink
    const blinkPhase = t % 3.8;
    const blinkVal = blinkPhase > 3.62 ? Math.max(0, 1 - (blinkPhase - 3.62) * 26) : 0;
    vrm.expressionManager?.setValue("blink",      blinkVal);
    vrm.expressionManager?.setValue("blinkLeft",  blinkVal);
    vrm.expressionManager?.setValue("blinkRight", blinkVal);

    // Eye look-around — slow organic saccades
    const eyeLookX = Math.sin(t * 0.37) * 0.4 + Math.sin(t * 1.1) * 0.15;
    const eyeLookY = Math.sin(t * 0.29) * 0.25 + Math.sin(t * 0.83) * 0.1;
    vrm.expressionManager?.setValue("lookLeft",  Math.max(0, -eyeLookX));
    vrm.expressionManager?.setValue("lookRight", Math.max(0,  eyeLookX));
    vrm.expressionManager?.setValue("lookDown",  Math.max(0, -eyeLookY));
    vrm.expressionManager?.setValue("lookUp",    Math.max(0,  eyeLookY));

    // Expressions
    const aa =
      (anim === "talking" || anim === "victory") ? mouthOpen * intensity :
      anim === "surprised" ? 0.38 * intensity : 0;
    const happy =
      anim === "happy"           ? 0.7  * intensity :
      anim === "follow_reaction" ? 0.9  * intensity :
      anim === "victory"         ? 1.0  * intensity :
      anim === "excited"         ? 0.45 * intensity :
      anim === "listening"       ? 0.2  * intensity : 0;
    const surprisedExpr =
      anim === "surprised"      ? 1.0  * intensity :
      anim === "excited"        ? 0.85 * intensity :
      anim === "gift_reaction"  ? 1.0  * intensity :
      anim === "victory"        ? 0.45 * intensity : 0;
    vrm.expressionManager?.setValue("aa",        aa);
    vrm.expressionManager?.setValue("happy",     happy);
    vrm.expressionManager?.setValue("surprised", surprisedExpr);

    vrm.update(delta);
  });

  void quality;
  return <primitive object={vrm.scene} dispose={null} />;
}

// ── RPM / GLB avatar renderer ─────────────────────────────────────────────────

function RPMAvatarView({
  scene,
  morphTargets,
  animationState,
  mouthOpenRef,
  expressionIntensityRef,
}: {
  scene: THREE.Group;
  morphTargets: string[];
  animationState: AnimationState;
  mouthOpenRef: React.MutableRefObject<number>;
  expressionIntensityRef: React.MutableRefObject<number>;
}) {
  const animRef = useRef(animationState);
  animRef.current = animationState;

  // Map ARKit morph target names to indices per mesh
  const morphMapRef = useRef<Map<THREE.Mesh, Record<string, number>>>(new Map());
  useEffect(() => {
    morphMapRef.current.clear();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.morphTargetDictionary) {
        morphMapRef.current.set(obj, obj.morphTargetDictionary);
      }
    });
  }, [scene]);

  const leftArmZRef = useRef(0.30);
  const rightArmZRef = useRef(-0.30);
  const neckZRef = useRef(0);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(2.8 + Math.random() * 2.4);
  const blinkPhaseRef = useRef(0);

  // RPM bone name mapping
  const bonesRef = useRef<{
    hips?: THREE.Bone; neck?: THREE.Bone; head?: THREE.Bone;
    leftUpperArm?: THREE.Bone; rightUpperArm?: THREE.Bone;
  }>({});

  useEffect(() => {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Bone)) return;
      const n = obj.name.toLowerCase();
      if (n.includes("hips") || n.includes("pelvis")) bonesRef.current.hips = obj;
      else if (n.includes("neck")) bonesRef.current.neck = obj;
      else if (n.includes("head")) bonesRef.current.head = obj;
      else if ((n.includes("left") || n.includes("_l")) && n.includes("upperarm")) bonesRef.current.leftUpperArm = obj;
      else if ((n.includes("right") || n.includes("_r")) && n.includes("upperarm")) bonesRef.current.rightUpperArm = obj;
    });
  }, [scene]);

  void morphTargets;

  function setMorph(name: string, value: number) {
    morphMapRef.current.forEach((dict, mesh) => {
      const idx = dict[name];
      if (idx !== undefined && mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, value));
      }
    });
  }

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const anim = animRef.current;
    const intensity = expressionIntensityRef.current;
    const mouthOpen = mouthOpenRef.current;
    const lf = 1 - Math.pow(0.001, delta);
    const { hips, neck, leftUpperArm, rightUpperArm } = bonesRef.current;

    // Body sway + breathing
    if (hips) {
      hips.rotation.y = Math.sin(t * 0.32) * 0.06;
      hips.position.y = Math.sin(t * 0.38) * 0.008;
    }
    // Breathing — spine
    const spineB = bonesRef.current as { spine?: THREE.Bone; hips?: THREE.Bone; neck?: THREE.Bone; head?: THREE.Bone; leftUpperArm?: THREE.Bone; rightUpperArm?: THREE.Bone };
    if (!spineB.spine) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Bone && obj.name.toLowerCase().includes("spine") && !obj.name.toLowerCase().includes("2") && !obj.name.toLowerCase().includes("3")) {
          (bonesRef.current as Record<string, THREE.Bone>).spine = obj;
        }
      });
    }
    if (spineB.spine) {
      const breathAmp = anim === "excited" ? 0.018 : anim === "surprised" ? 0.014 : 0.008;
      spineB.spine.rotation.x = Math.sin(t * 0.24) * breathAmp;
    }
    if (neck) {
      neck.rotation.y = Math.sin(t * 0.68) * 0.10;
      const nodAmp  = anim === "listening" ? 0.05 : 0.03;
      const nodFreq = anim === "listening" ? 1.8  : 0.28;
      neck.rotation.x = Math.sin(t * nodFreq) * nodAmp + (anim === "listening" ? 0.04 : 0);
      const tNeckZ = anim === "thinking" ? 0.10 + Math.sin(t * 0.12) * 0.04 : 0;
      neckZRef.current += (tNeckZ - neckZRef.current) * lf;
      neck.rotation.z = neckZRef.current;
    }

    // Arm poses
    let tLZ = 0.30, tRZ = -0.30;
    switch (anim) {
      case "happy":           tLZ = 0.14;  tRZ = -0.14;  break;
      case "excited":         tLZ = 0.06;  tRZ = -0.06;  break;
      case "follow_reaction": tLZ = -0.55; tRZ = 0.55;   break;
      case "victory":         tLZ = -1.1;  tRZ = 1.1;    break;
      case "surprised":       tLZ = 0.08;  tRZ = -0.08;  break;
      case "thinking":        tLZ = 0.22;  tRZ = -0.72;  break;
      case "listening":       tLZ = 0.26;  tRZ = -0.26;  break;
    }
    leftArmZRef.current  += (tLZ - leftArmZRef.current)  * lf;
    rightArmZRef.current += (tRZ - rightArmZRef.current) * lf;
    if (leftUpperArm)  leftUpperArm.rotation.z  = leftArmZRef.current;
    if (rightUpperArm) rightUpperArm.rotation.z = rightArmZRef.current;

    // Blink
    blinkTimer.current += delta;
    if (blinkPhaseRef.current === 0 && blinkTimer.current >= nextBlink.current) {
      blinkPhaseRef.current = 1; blinkTimer.current = 0;
    } else if (blinkPhaseRef.current === 1) {
      const v = Math.min(1, blinkTimer.current / 0.08);
      setMorph("eyeBlinkLeft", v); setMorph("eyeBlinkRight", v);
      if (blinkTimer.current >= 0.08) { blinkPhaseRef.current = 2; blinkTimer.current = 0; }
    } else if (blinkPhaseRef.current === 2) {
      const v = 1 - Math.min(1, blinkTimer.current / 0.10);
      setMorph("eyeBlinkLeft", v); setMorph("eyeBlinkRight", v);
      if (blinkTimer.current >= 0.10) {
        blinkPhaseRef.current = 0; blinkTimer.current = 0;
        nextBlink.current = 2.2 + Math.random() * 3.2;
      }
    }

    // Lip sync (ARKit visemes)
    const aa =
      (anim === "talking" || anim === "victory") ? mouthOpen * intensity :
      anim === "surprised" ? 0.38 * intensity : 0;
    setMorph("mouthOpen",  aa * 0.85);
    setMorph("jawOpen",    aa * 0.55);
    setMorph("viseme_aa",  aa * 0.9);
    setMorph("viseme_PP",  Math.max(0, aa - 0.4) * intensity * 0.5);

    // Expressions
    const happyV =
      anim === "happy"     ? 0.7  * intensity :
      anim === "victory"   ? 1.0  * intensity :
      anim === "excited"   ? 0.4  * intensity :
      anim === "listening" ? 0.2  * intensity : 0;
    const surprisedV =
      anim === "surprised"     ? 1.0  * intensity :
      anim === "excited"       ? 0.85 * intensity :
      anim === "gift_reaction" ? 1.0  * intensity : 0;
    setMorph("mouthSmile",       happyV * 0.8);
    setMorph("mouthSmileLeft",   happyV);
    setMorph("mouthSmileRight",  happyV);
    setMorph("browInnerUp",      surprisedV * 0.9);
    setMorph("eyeWideLeft",      surprisedV * 0.7);
    setMorph("eyeWideRight",     surprisedV * 0.7);
  });

  return <primitive object={scene} dispose={null} />;
}

// ── Lighting presets (upgraded studio quality) ────────────────────────────────

function LightingRig({ preset, quality }: { preset: string; quality: QualityTier }) {
  const castShadow = quality === "high";
  if (preset === "broadcast") {
    return (
      <>
        <ambientLight intensity={0.35} color="#d6e8ff" />
        {/* Key light — warm, strong, 45° upper left */}
        <directionalLight position={[-3.5, 5.5, 3.5]} intensity={2.4} color="#fff4e0" castShadow={castShadow}
          shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.002} />
        {/* Fill light — cool, soft, right */}
        <directionalLight position={[4, 3, 2]} intensity={0.6} color="#c0d8ff" />
        {/* Back/rim light — warm kick for hair */}
        <pointLight position={[0, 4, -3]} intensity={1.2} color="#ffe0c0" />
        {/* Subtle eye light from front-below */}
        <pointLight position={[0, 0.5, 3.5]} intensity={0.35} color="#ffffff" />
      </>
    );
  }
  if (preset === "dramatic") {
    return (
      <>
        <ambientLight intensity={0.08} />
        <directionalLight position={[3, 5, 2]} intensity={3.2} color="#fff8f0" castShadow={castShadow} />
        <pointLight position={[-4, 2, -3]} intensity={1.2} color="#ff6622" />
        <pointLight position={[0, 0, 4]}   intensity={0.5} color="#3366ff" />
        <pointLight position={[0, 5, -2]}  intensity={0.8} color="#ff9944" />
      </>
    );
  }
  if (preset === "soft") {
    return (
      <>
        <ambientLight intensity={1.3} color="#f0f4ff" />
        <directionalLight position={[0, 8, 4]}  intensity={0.55} color="#ffffff" />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#aaccff" />
        <pointLight position={[2, 2, 3]} intensity={0.25} color="#fff0e0" />
      </>
    );
  }
  if (preset === "neon") {
    return (
      <>
        <ambientLight intensity={0.06} />
        <pointLight position={[0, 3, 2]}  intensity={4.0} color="#ff00ff" />
        <pointLight position={[2, 1, 1]}  intensity={2.5} color="#00ffff" />
        <pointLight position={[-2, 1, 1]} intensity={2.0} color="#ff44ee" />
        <pointLight position={[0, -1, 2]} intensity={1.4} color="#4400ff" />
        <pointLight position={[0, 5, -2]} intensity={0.8} color="#ff00aa" />
      </>
    );
  }
  // Default "studio" — three-point broadcast setup
  return (
    <>
      <ambientLight intensity={0.30} color="#e0ecff" />
      <directionalLight
        position={[-3, 6, 4]} intensity={2.2} color="#fff8f0"
        castShadow={castShadow}
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-bias={-0.002}
      />
      <directionalLight position={[3.5, 3, 2]} intensity={0.7} color="#c8d8ff" />
      <pointLight position={[0, 4, -2.5]} intensity={1.0} color="#ffe8c0" />
      <pointLight position={[0, 0.8, 4]}  intensity={0.28} color="#ffffff" />
    </>
  );
}

// ── Stats tracker ─────────────────────────────────────────────────────────────

function StatsTracker({ quality, onStats }: { quality: QualityTier; onStats: (s: RendererStats) => void }) {
  const { gl } = useThree();
  const frames = useRef(0);
  const last   = useRef(performance.now());
  const fps    = useRef(60);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - last.current >= 1000) {
      fps.current = Math.round((frames.current * 1000) / (now - last.current));
      frames.current = 0;
      last.current = now;
      onStats({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, triangles: gl.info.render.triangles, drawCalls: gl.info.render.calls, fps: fps.current, quality });
    }
  });
  return null;
}

// ── Loading spinner inside canvas ─────────────────────────────────────────────

function CanvasLoader() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 2.2;
  });
  return (
    <mesh ref={meshRef} position={[0, 1.2, 0]}>
      <torusGeometry args={[0.18, 0.04, 8, 24]} />
      <meshBasicMaterial color="#8b5cf6" />
    </mesh>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

// ── Empty state shown when no avatar URL is configured ────────────────────────

function EmptyAvatarPlaceholder() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.7;
  });
  return (
    <group ref={groupRef} position={[0, 1.1, 0]}>
      <mesh>
        <torusGeometry args={[0.5, 0.045, 10, 48]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.045, 10, 48]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ── AvatarScene ───────────────────────────────────────────────────────────────

function AvatarScene({
  avatarKey, accentColor, scale, positionY, lightingPreset,
  effectiveVrmUrl, rpmUrl, quality, onStats, onQualityDecline,
  animationState, mouthOpenRef, expressionIntensityRef,
}: {
  avatarKey: string; accentColor: string; scale: number; positionY: number;
  lightingPreset: string; effectiveVrmUrl: string | null | undefined;
  rpmUrl: string | null | undefined; quality: QualityTier;
  onStats: (s: RendererStats) => void; onQualityDecline: () => void;
  animationState: AnimationState; mouthOpenRef: React.MutableRefObject<number>;
  expressionIntensityRef: React.MutableRefObject<number>;
}) {
  const vrmState = useVRMLoader(rpmUrl ? null : effectiveVrmUrl);
  const glbState = useGLBLoader(rpmUrl ?? null);

  const isLoading =
    (rpmUrl && glbState.status === "loading") ||
    (!rpmUrl && effectiveVrmUrl && vrmState.status === "loading");

  return (
    <>
      <PerformanceMonitor factor={1} onDecline={onQualityDecline} threshold={0.85} />
      <StatsTracker quality={quality} onStats={onStats} />
      <LightingRig preset={lightingPreset} quality={quality} />

      {isLoading && <CanvasLoader />}

      <group position={[0, positionY, 0]} scale={[scale, scale, scale]}>
        {/* Priority: RPM/Avaturn GLB > VRM > Empty placeholder */}
        {rpmUrl && glbState.status === "loaded" ? (
          <RPMAvatarView
            scene={glbState.scene}
            morphTargets={glbState.morphTargets}
            animationState={animationState}
            mouthOpenRef={mouthOpenRef}
            expressionIntensityRef={expressionIntensityRef}
          />
        ) : !rpmUrl && vrmState.status === "loaded" ? (
          <VRMAvatarView
            vrm={vrmState.vrm}
            accentColor={accentColor}
            quality={quality}
            animationState={animationState}
            mouthOpenRef={mouthOpenRef}
            expressionIntensityRef={expressionIntensityRef}
          />
        ) : !isLoading ? (
          <EmptyAvatarPlaceholder />
        ) : null}
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

// ── ProceduralUpdater ─────────────────────────────────────────────────────────

function ProceduralUpdater({
  mouthOpenAmount, expressionIntensity, mouthOpenRef, expressionIntensityRef,
}: {
  mouthOpenAmount: number; expressionIntensity: number;
  mouthOpenRef: React.MutableRefObject<number>;
  expressionIntensityRef: React.MutableRefObject<number>;
}) {
  useFrame(() => {
    mouthOpenRef.current = mouthOpenAmount;
    expressionIntensityRef.current = expressionIntensity;
  });
  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AvatarCanvas({
  avatarKey, accentColor, scale, positionY, lightingPreset,
  avatarEnabled, avatarUrl, showFps = true, onStats, onError, className,
  animationState = "idle", mouthOpenAmount = 0, expressionIntensity = 0.8,
  backgroundGradient,
}: AvatarCanvasProps) {
  const [stats, setStats] = useState<RendererStats>({
    geometries: 0, textures: 0, triangles: 0, drawCalls: 0, fps: 60, quality: "high",
  });
  const [quality, setQuality] = useState<QualityTier>(detectInitialQuality);

  const mouthOpenRef = useRef(mouthOpenAmount);
  const expressionIntensityRef = useRef(expressionIntensity);

  // avatarUrl can be: built-in VRM path, custom VRM blob/file, RPM GLB URL,
  // Avaturn CDN URL (any subdomain of avaturn.me or avaturn.dev), or a data: URI.
  // Anything that is NOT a .vrm file or explicitly a VRM source goes through GLTFLoader.
  const isRpmUrl = typeof avatarUrl === "string" && (
    avatarUrl.startsWith("https://models.readyplayer.me") ||
    avatarUrl.startsWith("https://api.readyplayer.me") ||
    // All Avaturn CDN variants (api.avaturn.me, demo.avaturn.dev, cdn.avaturn.me, etc.)
    avatarUrl.includes("avaturn.me") ||
    avatarUrl.includes("avaturn.dev") ||
    // Base64-encoded GLB export (Avaturn dataURL fallback)
    avatarUrl.startsWith("data:model/gltf") ||
    avatarUrl.startsWith("data:application/octet-stream") ||
    // Generic GLB file URL
    avatarUrl.endsWith(".glb")
  );

  const effectiveVrmUrl = avatarUrl && !isRpmUrl
    ? avatarUrl
    : getAvatarVRMPath(avatarKey);

  const rpmUrl = isRpmUrl ? avatarUrl : null;

  const handleStats = useCallback((s: RendererStats) => {
    setStats(s);
    onStats?.(s);
  }, [onStats]);

  // Check WebGL before mounting Canvas — Three.js throws synchronously when
  // no GPU is available, which bypasses React error boundaries and hits the
  // global error handler (Vite dev overlay). Early-exit with a 2D fallback.
  const [webGLAvailable] = useState(checkWebGL);

  if (!avatarEnabled) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/5", className)}>
        <Boxes className="h-8 w-8 text-violet-400/20 mb-2" />
        <p className="text-xs text-muted-foreground/40">Avatar disabled</p>
        <p className="text-[10px] text-muted-foreground/25 mt-0.5">Enable via the toggle above</p>
      </div>
    );
  }

  if (!webGLAvailable) {
    return <WebGLFallback className={className} />;
  }

  const dpr: [number, number] = quality === "low" ? [1, 1] : quality === "medium" ? [1, 1.5] : [1, 2];
  const fpsColor = stats.fps >= 50 ? "text-green-400 border-green-500/25" : stats.fps >= 30 ? "text-yellow-400 border-yellow-500/25" : "text-red-400 border-red-500/25";
  const qualityColor = quality === "high" ? "text-violet-300" : quality === "medium" ? "text-blue-300" : "text-gray-400";

  const vrmBacked = !!avatarUrl && !isRpmUrl;
  const rpmActive = !!rpmUrl;

  const animEmoji = ANIMATION_EMOJI[animationState] ?? "😐";

  // Background per lighting preset (or custom scene override)
  const bgStyle = backgroundGradient ?? (
    lightingPreset === "neon"      ? "linear-gradient(160deg, #0d0024 0%, #000010 100%)" :
    lightingPreset === "dramatic"  ? "linear-gradient(160deg, #1a0800 0%, #0a0000 100%)" :
    lightingPreset === "broadcast" ? "linear-gradient(160deg, #060b14 0%, #020508 100%)" :
                                     "linear-gradient(160deg, #0a0014 0%, #020008 100%)"
  );

  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      <div className="absolute inset-0 rounded-2xl" style={{ background: bgStyle }} />

      <WebGLErrorBoundary className="absolute inset-0" onError={onError}>
        <Canvas
          gl={{ antialias: quality !== "low", alpha: true, powerPreference: quality === "low" ? "low-power" : "high-performance" }}
          shadows={quality === "high"}
          camera={{ position: [0, 1.2, 2.4], fov: 36 }}
          onCreated={({ gl }) => { gl.shadowMap.type = THREE.PCFShadowMap; }}
          dpr={dpr}
          style={{ position: "relative" }}
        >
          <ProceduralUpdater
            mouthOpenAmount={mouthOpenAmount}
            expressionIntensity={expressionIntensity}
            mouthOpenRef={mouthOpenRef}
            expressionIntensityRef={expressionIntensityRef}
          />
          <Suspense fallback={<CanvasLoader />}>
            <AvatarScene
              avatarKey={avatarKey}
              accentColor={accentColor}
              scale={scale}
              positionY={positionY}
              lightingPreset={lightingPreset}
              effectiveVrmUrl={effectiveVrmUrl}
              rpmUrl={rpmUrl}
              quality={quality}
              onStats={handleStats}
              onQualityDecline={() => setQuality((q) => (q === "high" ? "medium" : "low"))}
              animationState={animationState}
              mouthOpenRef={mouthOpenRef}
              expressionIntensityRef={expressionIntensityRef}
            />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {/* FPS + quality */}
      {showFps && (
        <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
          <div className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border", fpsColor)}>{stats.fps}fps</div>
          <div className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border border-white/10", qualityColor)}>{quality}</div>
        </div>
      )}

      {/* Animation badge */}
      <div className="absolute top-2 left-2 pointer-events-none">
        <div className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-white/60 font-mono flex items-center gap-1">
          <span>{animEmoji}</span>
          <span>{animationState}</span>
        </div>
      </div>

      {/* Model type badge */}
      <div className="absolute bottom-6 left-2 pointer-events-none">
        {rpmActive ? (
          <div className="text-[8px] px-1.5 py-0.5 rounded bg-blue-900/80 border border-blue-400/40 text-blue-300 font-mono">GLB</div>
        ) : vrmBacked ? (
          <div className="text-[8px] px-1.5 py-0.5 rounded bg-violet-900/70 border border-violet-500/30 text-violet-300 font-mono">VRM</div>
        ) : (
          <div className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-white/30 font-mono">No Avatar</div>
        )}
      </div>

      {/* Drag hint */}
      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[8px] text-white/20 tracking-wide">drag to rotate</span>
      </div>
    </div>
  );
}

// ── VRM/GLB Upload button ─────────────────────────────────────────────────────

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
      <input ref={inputRef} type="file" accept=".vrm,.glb" className="hidden" onChange={handleChange} />
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
          <span className="text-xs">Upload .vrm or .glb</span>
        </button>
      )}
    </div>
  );
}
