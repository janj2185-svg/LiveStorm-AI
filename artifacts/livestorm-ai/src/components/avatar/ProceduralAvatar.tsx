import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AnimationState } from "./avatarAnimationMachine";

export type AvatarStyle = "anime" | "realistic" | "chibi";
export type QualityTier = "high" | "medium" | "low";

interface Props {
  style: AvatarStyle;
  accentColor: string;
  quality: QualityTier;
  animationState?: AnimationState;
  mouthOpenAmount?: number;
  expressionIntensity?: number;
}

const SEG = {
  high: { sphere: 24, cap: 6, rad: 12 },
  medium: { sphere: 16, cap: 4, rad: 8 },
  low: { sphere: 8, cap: 3, rad: 6 },
} as const;

interface StyleDef {
  headR: number;
  headOffY: number;
  bodyH: number;
  bodyTopR: number;
  bodyBotR: number;
  bodyOffY: number;
  armH: number;
  armR: number;
  armOffX: number;
  armOffY: number;
  armRotZ: number;
  legH: number;
  legR: number;
  legOffX: number;
  eyeR: number;
  eyeOffX: number;
  eyeOffY: number;
  eyeOffZ: number;
  hairStyle: "spiky" | "neat" | "round";
  emissive: number;
}

const STYLES: Record<AvatarStyle, StyleDef> = {
  anime: {
    headR: 0.19, headOffY: 1.52,
    bodyH: 0.42, bodyTopR: 0.105, bodyBotR: 0.118, bodyOffY: 1.08,
    armH: 0.30, armR: 0.045, armOffX: 0.195, armOffY: 1.20, armRotZ: 0.38,
    legH: 0.36, legR: 0.062, legOffX: 0.072,
    eyeR: 0.044, eyeOffX: 0.075, eyeOffY: 0.030, eyeOffZ: 0.178,
    hairStyle: "spiky",
    emissive: 0.18,
  },
  realistic: {
    headR: 0.148, headOffY: 1.59,
    bodyH: 0.50, bodyTopR: 0.110, bodyBotR: 0.132, bodyOffY: 1.07,
    armH: 0.35, armR: 0.050, armOffX: 0.208, armOffY: 1.18, armRotZ: 0.28,
    legH: 0.44, legR: 0.068, legOffX: 0.078,
    eyeR: 0.030, eyeOffX: 0.056, eyeOffY: 0.020, eyeOffZ: 0.143,
    hairStyle: "neat",
    emissive: 0.08,
  },
  chibi: {
    headR: 0.268, headOffY: 1.18,
    bodyH: 0.23, bodyTopR: 0.085, bodyBotR: 0.096, bodyOffY: 0.86,
    armH: 0.19, armR: 0.038, armOffX: 0.158, armOffY: 0.90, armRotZ: 0.50,
    legH: 0.21, legR: 0.056, legOffX: 0.058,
    eyeR: 0.064, eyeOffX: 0.098, eyeOffY: 0.012, eyeOffZ: 0.258,
    hairStyle: "round",
    emissive: 0.22,
  },
};

function SpikyHair({ headR, mat }: { headR: number; mat: THREE.MeshStandardMaterial }) {
  const spikes: [number, number, number][] = [
    [0, headR * 0.88, 0],
    [-headR * 0.52, headR * 0.72, 0],
    [headR * 0.52, headR * 0.72, 0],
    [-headR * 0.28, headR * 1.0, headR * -0.1],
    [headR * 0.28, headR * 1.0, headR * -0.1],
  ];
  const rots: [number, number, number][] = [
    [0, 0, 0], [0, 0, 0.45], [0, 0, -0.45], [0.1, 0, 0.2], [0.1, 0, -0.2],
  ];
  const sizes: [number, number, number][] = [
    [headR * 0.28, headR * 0.72, headR * 0.22],
    [headR * 0.22, headR * 0.58, headR * 0.18],
    [headR * 0.22, headR * 0.58, headR * 0.18],
    [headR * 0.18, headR * 0.50, headR * 0.16],
    [headR * 0.18, headR * 0.50, headR * 0.16],
  ];
  return (
    <>
      {spikes.map((pos, i) => (
        <mesh key={i} position={pos} rotation={rots[i]} material={mat}>
          <boxGeometry args={sizes[i]} />
        </mesh>
      ))}
    </>
  );
}

function NeatHair({ headR, mat }: { headR: number; mat: THREE.MeshStandardMaterial }) {
  return (
    <mesh position={[0, headR * 0.08, 0]} material={mat}>
      <sphereGeometry args={[headR * 0.97, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
    </mesh>
  );
}

function RoundHair({ headR, mat }: { headR: number; mat: THREE.MeshStandardMaterial }) {
  return (
    <>
      <mesh position={[0, headR * 0.62, 0]} material={mat}>
        <sphereGeometry args={[headR * 0.76, 12, 12]} />
      </mesh>
      <mesh position={[-headR * 0.68, headR * 0.30, 0]} material={mat}>
        <sphereGeometry args={[headR * 0.52, 10, 10]} />
      </mesh>
      <mesh position={[headR * 0.68, headR * 0.30, 0]} material={mat}>
        <sphereGeometry args={[headR * 0.52, 10, 10]} />
      </mesh>
    </>
  );
}

export function ProceduralAvatar({
  style,
  accentColor,
  quality,
  animationState = "idle",
  mouthOpenAmount = 0,
  expressionIntensity = 0.8,
}: Props) {
  const p = STYLES[style];
  const s = SEG[quality];

  // ── Mesh refs ──────────────────────────────────────────────────────────────
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);
  const shadowDiscRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  // ── Animation lerp state refs ──────────────────────────────────────────────
  const leftCurZRef = useRef(-p.armRotZ);
  const rightCurZRef = useRef(p.armRotZ);
  const leftCurXRef = useRef(0);
  const rightCurXRef = useRef(0);
  const mouthCurYRef = useRef(p.eyeR * 0.12);

  // Live prop refs (avoid stale closures inside useFrame)
  const animStateRef = useRef(animationState);
  animStateRef.current = animationState;
  const mouthOpenRef = useRef(mouthOpenAmount);
  mouthOpenRef.current = mouthOpenAmount;
  const exprRef = useRef(expressionIntensity);
  exprRef.current = expressionIntensity;

  // ── Materials ──────────────────────────────────────────────────────────────
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(accentColor),
        roughness: 0.42,
        metalness: 0.08,
        emissive: new THREE.Color(accentColor),
        emissiveIntensity: p.emissive,
      }),
    [accentColor, p.emissive],
  );

  const eyeWhiteMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }),
    [],
  );

  const pupilMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#101010",
        roughness: 0.3,
        emissive: "#222222",
        emissiveIntensity: 0.6,
      }),
    [],
  );

  const mouthMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#cc3355",
        transparent: true,
        opacity: 0.85,
      }),
    [],
  );

  // ── Animation ──────────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const anim = animStateRef.current;
    const expr = exprRef.current;
    const mouthOpen = mouthOpenRef.current;

    // Smooth lerp factor — snappy ~120ms settle
    const lf = 1 - Math.pow(0.001, delta);

    // ── Arm pose targets per state ─────────────────────────────────────────
    let tLeftZ = -p.armRotZ;
    let tRightZ = p.armRotZ;
    let tLeftX = 0;
    let tRightX = 0;
    let bounceFreq = 0.85;
    let bounceAmp = 0.019;
    let swayAmpL = 0.055;
    let swayAmpR = 0.055;

    switch (anim) {
      case "talking":
        tLeftZ = -p.armRotZ * 0.88;
        tRightZ = p.armRotZ * 0.88;
        bounceFreq = 1.15;
        bounceAmp = 0.021;
        break;
      case "happy":
        tLeftZ = -p.armRotZ * 0.55;
        tRightZ = p.armRotZ * 0.55;
        bounceFreq = 1.5;
        bounceAmp = 0.026;
        break;
      case "excited":
        tLeftZ = -p.armRotZ * 0.28;
        tRightZ = p.armRotZ * 0.28;
        bounceFreq = 2.2;
        bounceAmp = 0.034;
        swayAmpL = 0.12;
        swayAmpR = 0.12;
        break;
      case "gift_reaction":
        tLeftZ = -p.armRotZ * 0.65;
        tRightZ = p.armRotZ * 0.65;
        tLeftX = -0.55;
        tRightX = -0.55;
        bounceFreq = 0.9;
        bounceAmp = 0.015;
        break;
      case "follow_reaction":
        tLeftZ = -(p.armRotZ + Math.PI * 0.30);
        tRightZ = p.armRotZ + Math.PI * 0.30;
        bounceFreq = 1.9;
        bounceAmp = 0.030;
        swayAmpL = 0.20;
        swayAmpR = 0.20;
        break;
      case "victory":
        tLeftZ = -(p.armRotZ + Math.PI * 0.42);
        tRightZ = p.armRotZ + Math.PI * 0.42;
        bounceFreq = 2.6;
        bounceAmp = 0.044;
        swayAmpL = 0.08;
        swayAmpR = 0.08;
        break;
    }

    leftCurZRef.current += (tLeftZ - leftCurZRef.current) * lf;
    rightCurZRef.current += (tRightZ - rightCurZRef.current) * lf;
    leftCurXRef.current += (tLeftX - leftCurXRef.current) * lf;
    rightCurXRef.current += (tRightX - rightCurXRef.current) * lf;

    // ── Root body float ────────────────────────────────────────────────────
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * bounceFreq) * bounceAmp;
      rootRef.current.rotation.y = Math.sin(t * 0.32) * 0.07;
    }

    // ── Head motion ────────────────────────────────────────────────────────
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.68) * 0.13;
      const nodAmp = anim === "talking" ? 0.07 : 0.045;
      const nodFreq = anim === "talking" ? 2.8 : 0.48;
      headRef.current.rotation.x = Math.sin(t * nodFreq) * nodAmp;
      headRef.current.rotation.z = Math.sin(t * 0.55) * 0.025;
    }

    // ── Arm sway ───────────────────────────────────────────────────────────
    const waveFreq = anim === "follow_reaction" ? 3.0 : anim === "excited" ? 2.4 : 0.88;
    const swayL = Math.sin(t * waveFreq) * swayAmpL;
    const swayR = Math.sin(t * waveFreq + Math.PI) * swayAmpR;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = leftCurZRef.current + swayL;
      leftArmRef.current.rotation.x = leftCurXRef.current;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = rightCurZRef.current + swayR;
      rightArmRef.current.rotation.x = rightCurXRef.current;
    }

    // ── Pupils (scale up when excited/happy) ──────────────────────────────
    const isExcited = anim === "excited" || anim === "gift_reaction" || anim === "victory";
    const isHappy = anim === "happy" || anim === "follow_reaction";
    const pupilXZ = isExcited ? 1.28 : isHappy ? 1.12 : 1.0;
    const blinkPhase = t % 3.8;
    const blinkMul = blinkPhase < 3.62 ? 1 : Math.max(0.05, 1 - (blinkPhase - 3.62) * 26);
    if (leftPupilRef.current) {
      leftPupilRef.current.scale.set(pupilXZ, pupilXZ * blinkMul, pupilXZ);
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.scale.set(pupilXZ, pupilXZ * blinkMul, pupilXZ);
    }

    // ── Mouth lip sync ─────────────────────────────────────────────────────
    if (mouthRef.current) {
      const baseH = p.eyeR * 0.35;
      const target = baseH * (0.12 + mouthOpen * expr * 2.8);
      mouthCurYRef.current += (target - mouthCurYRef.current) * 0.35;
      mouthRef.current.scale.y = mouthCurYRef.current;
    }

    // ── Shadow disc pulse ──────────────────────────────────────────────────
    if (shadowDiscRef.current) {
      (shadowDiscRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.08 + Math.sin(t * bounceFreq) * 0.03;
    }
  });

  const legOffY = p.bodyOffY - p.bodyH / 2 - p.legH / 2;
  const mouthY = -(p.eyeOffY * 2.8 + p.eyeR * 0.6);
  const mouthZ = p.eyeOffZ * 0.88;

  return (
    <group ref={rootRef}>
      {/* Torso */}
      <mesh position={[0, p.bodyOffY, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[p.bodyTopR, p.bodyBotR, p.bodyH, s.rad]} />
      </mesh>

      {/* Left arm */}
      <mesh
        ref={leftArmRef}
        position={[-p.armOffX, p.armOffY, 0]}
        rotation={[0, 0, -p.armRotZ]}
        material={bodyMat}
        castShadow
      >
        <capsuleGeometry args={[p.armR, p.armH, s.cap, s.rad]} />
      </mesh>

      {/* Right arm */}
      <mesh
        ref={rightArmRef}
        position={[p.armOffX, p.armOffY, 0]}
        rotation={[0, 0, p.armRotZ]}
        material={bodyMat}
        castShadow
      >
        <capsuleGeometry args={[p.armR, p.armH, s.cap, s.rad]} />
      </mesh>

      {/* Left leg */}
      <mesh position={[-p.legOffX, legOffY, 0]} material={bodyMat} castShadow>
        <capsuleGeometry args={[p.legR, p.legH, s.cap, s.rad]} />
      </mesh>

      {/* Right leg */}
      <mesh position={[p.legOffX, legOffY, 0]} material={bodyMat} castShadow>
        <capsuleGeometry args={[p.legR, p.legH, s.cap, s.rad]} />
      </mesh>

      {/* Head group */}
      <group ref={headRef} position={[0, p.headOffY, 0]}>
        {/* Head sphere */}
        <mesh material={bodyMat} castShadow>
          <sphereGeometry args={[p.headR, s.sphere, s.sphere]} />
        </mesh>

        {/* Left eye white */}
        <mesh position={[-p.eyeOffX, p.eyeOffY, p.eyeOffZ]} material={eyeWhiteMat}>
          <sphereGeometry args={[p.eyeR, 12, 12]} />
        </mesh>
        {/* Left pupil */}
        <mesh
          ref={leftPupilRef}
          position={[-p.eyeOffX, p.eyeOffY, p.eyeOffZ + p.eyeR * 0.78]}
          material={pupilMat}
        >
          <sphereGeometry args={[p.eyeR * 0.62, 10, 10]} />
        </mesh>

        {/* Right eye white */}
        <mesh position={[p.eyeOffX, p.eyeOffY, p.eyeOffZ]} material={eyeWhiteMat}>
          <sphereGeometry args={[p.eyeR, 12, 12]} />
        </mesh>
        {/* Right pupil */}
        <mesh
          ref={rightPupilRef}
          position={[p.eyeOffX, p.eyeOffY, p.eyeOffZ + p.eyeR * 0.78]}
          material={pupilMat}
        >
          <sphereGeometry args={[p.eyeR * 0.62, 10, 10]} />
        </mesh>

        {/* Mouth (lip sync visualization) */}
        <mesh
          ref={mouthRef}
          position={[0, mouthY, mouthZ]}
          scale={[p.eyeR * 1.6, p.eyeR * 0.12, p.eyeR * 0.55]}
          material={mouthMat}
        >
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>

        {/* Hair */}
        {p.hairStyle === "spiky" && <SpikyHair headR={p.headR} mat={bodyMat} />}
        {p.hairStyle === "neat" && <NeatHair headR={p.headR} mat={bodyMat} />}
        {p.hairStyle === "round" && <RoundHair headR={p.headR} mat={bodyMat} />}
      </group>

      {/* Ground glow disc */}
      {quality !== "low" && (
        <mesh
          ref={shadowDiscRef}
          position={[0, 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[0.28, 24]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}
