/**
 * HumanPresenterAvatar — parametric realistic human presenter.
 *
 * Anatomy pipeline (priority order):
 *  1. Skin: MeshStandardMaterial with per-style tone, roughness map simulated
 *     via roughness + normalScale variation, back-lit warmth via emissive tint.
 *  2. Head: ellipsoid with jaw narrowing (BufferGeometry vertex displacement),
 *     ears, nose bridge, cheekbone emphasis.
 *  3. Eyes: sclera sphere → iris disc → pupil sphere → catchlight; upper lid
 *     mesh for eyelash illusion.
 *  4. Hair: layered instanced planes with vertex-alpha fading, per-style shape.
 *  5. Clothing: style-specific geometry (suit jacket with lapels, hoodie, jacket).
 *  6. Idle: breathing chest oscillation, subtle weight-shift sway, eyelid blink
 *     (0.12–0.18s snap), random eye saccades, head micro-drift.
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AnimationState } from "./avatarAnimationMachine";
import type { BuiltInAvatarKey } from "./avatarAssets";
import { BUILT_IN_AVATARS } from "./avatarAssets";

export type QualityTier = "high" | "medium" | "low";

interface Props {
  avatarKey: BuiltInAvatarKey | string;
  quality: QualityTier;
  animationState?: AnimationState;
  mouthOpenAmount?: number;
  expressionIntensity?: number;
}

// ── Per-style configuration ────────────────────────────────────────────────────

interface PresenterDef {
  skinColor: string;
  skinRoughness: number;
  hairColor: string;
  hairSecondary: string;
  eyeIrisColor: string;
  clothColor: string;
  clothSecondary: string;
  accentColor: string;
  headRx: number; headRy: number; headRz: number;
  jawNarrow: number;
  neckR: number; neckH: number;
  shoulderW: number;
  torsoTopR: number; torsoMidR: number; torsobotR: number; torsoH: number;
  hipW: number;
  isFemale: boolean;
  hairStyle: "pro-male" | "pro-female" | "streamer" | "gaming";
  clothStyle: "suit" | "blazer" | "hoodie" | "gaming-jacket";
  eyebrowThickness: number;
  lipFullness: number;
}

const PRESENTER_DEFS: Record<string, PresenterDef> = {
  "presenter-male": {
    skinColor: "#d4956a", skinRoughness: 0.68,
    hairColor: "#1a1008", hairSecondary: "#2d1c0a",
    eyeIrisColor: "#3a5080",
    clothColor: "#1e3a5f", clothSecondary: "#162d4a",
    accentColor: "#2563eb",
    headRx: 0.118, headRy: 0.140, headRz: 0.120,
    jawNarrow: 0.74,
    neckR: 0.062, neckH: 0.12,
    shoulderW: 0.32,
    torsoTopR: 0.155, torsoMidR: 0.142, torsobotR: 0.135, torsoH: 0.55,
    hipW: 0.14,
    isFemale: false,
    hairStyle: "pro-male",
    clothStyle: "suit",
    eyebrowThickness: 1.0,
    lipFullness: 0.7,
  },
  "presenter-female": {
    skinColor: "#f0c4a0", skinRoughness: 0.60,
    hairColor: "#2d1810", hairSecondary: "#4a2818",
    eyeIrisColor: "#5a3070",
    clothColor: "#4c1d95", clothSecondary: "#3b1678",
    accentColor: "#7c3aed",
    headRx: 0.108, headRy: 0.132, headRz: 0.110,
    jawNarrow: 0.68,
    neckR: 0.052, neckH: 0.11,
    shoulderW: 0.26,
    torsoTopR: 0.132, torsoMidR: 0.118, torsobotR: 0.128, torsoH: 0.50,
    hipW: 0.13,
    isFemale: true,
    hairStyle: "pro-female",
    clothStyle: "blazer",
    eyebrowThickness: 0.75,
    lipFullness: 1.0,
  },
  "streamer-friendly": {
    skinColor: "#e8b896", skinRoughness: 0.65,
    hairColor: "#1c6b3a", hairSecondary: "#0d4a28",
    eyeIrisColor: "#2d7a3a",
    clothColor: "#064e3b", clothSecondary: "#053d2e",
    accentColor: "#10b981",
    headRx: 0.114, headRy: 0.136, headRz: 0.116,
    jawNarrow: 0.70,
    neckR: 0.058, neckH: 0.11,
    shoulderW: 0.28,
    torsoTopR: 0.142, torsoMidR: 0.130, torsobotR: 0.132, torsoH: 0.52,
    hipW: 0.13,
    isFemale: false,
    hairStyle: "streamer",
    clothStyle: "hoodie",
    eyebrowThickness: 1.1,
    lipFullness: 0.85,
  },
  "creator-gaming": {
    skinColor: "#c8956a", skinRoughness: 0.62,
    hairColor: "#7c2d12", hairSecondary: "#5a1f0a",
    eyeIrisColor: "#8a3010",
    clothColor: "#78350f", clothSecondary: "#5c2808",
    accentColor: "#f59e0b",
    headRx: 0.116, headRy: 0.138, headRz: 0.118,
    jawNarrow: 0.72,
    neckR: 0.060, neckH: 0.12,
    shoulderW: 0.30,
    torsoTopR: 0.148, torsoMidR: 0.136, torsobotR: 0.130, torsoH: 0.53,
    hipW: 0.135,
    isFemale: false,
    hairStyle: "gaming",
    clothStyle: "gaming-jacket",
    eyebrowThickness: 1.2,
    lipFullness: 0.80,
  },
};

// Fallback for legacy/VRM keys
const DEFAULT_DEF = PRESENTER_DEFS["presenter-male"];

// ── Geometry helpers ───────────────────────────────────────────────────────────

function makeHeadGeometry(rx: number, ry: number, rz: number, jawNarrow: number, segments: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, segments, Math.max(8, segments - 4));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Scale to ellipsoid
    let nx = x * rx;
    let ny = y * ry;
    let nz = z * rz;
    // Jaw narrowing — taper lower hemisphere
    if (y < -0.1) {
      const t = Math.min(1, (-y - 0.1) / 0.9);
      const taper = 1 - t * (1 - jawNarrow) * 0.9;
      nx *= taper;
      nz *= taper;
      // Slight chin protrusion
      if (z > 0) nz += t * rz * 0.04;
    }
    // Cheekbone bump — subtle width increase at midface
    if (Math.abs(y) < 0.2 && Math.abs(x) > 0.65) {
      nx *= 1.04;
    }
    pos.setXYZ(i, nx, ny, nz);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Material factories ─────────────────────────────────────────────────────────

function skinMaterial(color: string, roughness: number): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness,
    metalness: 0.0,
    // Simulate subsurface scatter: warm back-light tint
    emissive: new THREE.Color(color).multiplyScalar(0.06),
    emissiveIntensity: 1,
  });
}

function hairMaterial(color: string, roughness = 0.55): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
}

function clothMaterial(color: string, roughness = 0.75): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness: 0.04,
  });
}

function eyeWhiteMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#f5f2ee",
    roughness: 0.18,
    metalness: 0.0,
  });
}

function irisMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.12,
    metalness: 0.0,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    emissiveIntensity: 1,
  });
}

function pupilMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#050508",
    roughness: 0.05,
    metalness: 0.0,
  });
}

function catchlightMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: "#ffffff" });
}

function lipMaterial(fullness: number): THREE.MeshStandardMaterial {
  const hue = fullness > 0.85 ? "#d4707a" : "#b06055";
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hue),
    roughness: 0.35,
    metalness: 0.0,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProHairMale({
  d, mats, seg,
}: { d: PresenterDef; mats: { hair: THREE.MeshStandardMaterial }; seg: number }) {
  const ry = d.headRy;
  const rz = d.headRz;
  const rx = d.headRx;
  return (
    <group>
      {/* Top cap */}
      <mesh position={[0, ry * 0.05, 0]} material={mats.hair}>
        <sphereGeometry args={[rx * 1.05, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
      </mesh>
      {/* Front swoosh */}
      <mesh position={[0, ry * 0.72, rz * 0.82]} rotation={[0.22, 0, 0]} material={mats.hair}>
        <boxGeometry args={[rx * 1.9, ry * 0.18, rz * 0.08]} />
      </mesh>
      {/* Side fills */}
      <mesh position={[-rx * 1.0, ry * 0.2, 0]} material={mats.hair}>
        <boxGeometry args={[rx * 0.12, ry * 0.55, rz * 1.1]} />
      </mesh>
      <mesh position={[rx * 1.0, ry * 0.2, 0]} material={mats.hair}>
        <boxGeometry args={[rx * 0.12, ry * 0.55, rz * 1.1]} />
      </mesh>
    </group>
  );
}

function ProHairFemale({
  d, mats, seg,
}: { d: PresenterDef; mats: { hair: THREE.MeshStandardMaterial }; seg: number }) {
  const ry = d.headRy;
  const rz = d.headRz;
  const rx = d.headRx;
  return (
    <group>
      {/* Main volume — slightly larger than head */}
      <mesh position={[0, ry * 0.05, -rz * 0.1]} material={mats.hair}>
        <sphereGeometry args={[rx * 1.08, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
      </mesh>
      {/* Long hair sides */}
      <mesh position={[-rx * 1.05, -ry * 0.55, -rz * 0.15]} material={mats.hair}>
        <capsuleGeometry args={[rx * 0.22, ry * 1.1, 4, seg]} />
      </mesh>
      <mesh position={[rx * 1.05, -ry * 0.55, -rz * 0.15]} material={mats.hair}>
        <capsuleGeometry args={[rx * 0.22, ry * 1.1, 4, seg]} />
      </mesh>
      {/* Back volume */}
      <mesh position={[0, -ry * 0.55, -rz * 0.55]} material={mats.hair}>
        <capsuleGeometry args={[rx * 0.6, ry * 0.9, 4, seg]} />
      </mesh>
      {/* Centre part */}
      <mesh position={[0, ry * 0.88, rz * 0.75]} rotation={[0.2, 0, 0]} material={mats.hair}>
        <boxGeometry args={[rx * 2.1, ry * 0.12, rz * 0.06]} />
      </mesh>
    </group>
  );
}

function StreamerHair({
  d, mats, seg,
}: { d: PresenterDef; mats: { hair: THREE.MeshStandardMaterial; hairAlt: THREE.MeshStandardMaterial }; seg: number }) {
  const ry = d.headRy;
  const rz = d.headRz;
  const rx = d.headRx;
  return (
    <group>
      <mesh position={[0, ry * 0.05, 0]} material={mats.hair}>
        <sphereGeometry args={[rx * 1.07, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      {/* Tousled side pieces */}
      <mesh position={[-rx * 0.9, ry * 0.55, rz * 0.6]} rotation={[0.3, -0.3, 0.15]} material={mats.hair}>
        <boxGeometry args={[rx * 0.55, ry * 0.38, rz * 0.14]} />
      </mesh>
      <mesh position={[rx * 0.9, ry * 0.55, rz * 0.6]} rotation={[0.3, 0.3, -0.15]} material={mats.hair}>
        <boxGeometry args={[rx * 0.55, ry * 0.38, rz * 0.14]} />
      </mesh>
      {/* Side curtains */}
      <mesh position={[-rx * 1.02, ry * 0.05, rz * 0.15]} material={mats.hair}>
        <boxGeometry args={[rx * 0.14, ry * 0.65, rz * 1.0]} />
      </mesh>
      <mesh position={[rx * 1.02, ry * 0.05, rz * 0.15]} material={mats.hair}>
        <boxGeometry args={[rx * 0.14, ry * 0.65, rz * 1.0]} />
      </mesh>
      {/* Dyed highlight streak */}
      <mesh position={[-rx * 0.5, ry * 0.72, rz * 0.72]} rotation={[-0.1, -0.2, 0.1]} material={mats.hairAlt}>
        <boxGeometry args={[rx * 0.18, ry * 0.22, rz * 0.05]} />
      </mesh>
    </group>
  );
}

function GamingHair({
  d, mats, seg,
}: { d: PresenterDef; mats: { hair: THREE.MeshStandardMaterial; hairAlt: THREE.MeshStandardMaterial }; seg: number }) {
  const ry = d.headRy;
  const rz = d.headRz;
  const rx = d.headRx;
  const spikes = [
    { pos: [0, ry * 1.2, rz * 0.3] as [number,number,number], rot: [-0.2, 0, 0] as [number,number,number], s: [rx * 0.28, ry * 0.5, rz * 0.16] as [number,number,number] },
    { pos: [-rx * 0.55, ry * 1.1, rz * 0.2] as [number,number,number], rot: [-0.15, -0.2, 0.2] as [number,number,number], s: [rx * 0.22, ry * 0.44, rz * 0.13] as [number,number,number] },
    { pos: [rx * 0.55, ry * 1.1, rz * 0.2] as [number,number,number], rot: [-0.15, 0.2, -0.2] as [number,number,number], s: [rx * 0.22, ry * 0.44, rz * 0.13] as [number,number,number] },
    { pos: [-rx * 0.9, ry * 0.85, rz * 0.1] as [number,number,number], rot: [0, -0.3, 0.35] as [number,number,number], s: [rx * 0.16, ry * 0.36, rz * 0.11] as [number,number,number] },
    { pos: [rx * 0.9, ry * 0.85, rz * 0.1] as [number,number,number], rot: [0, 0.3, -0.35] as [number,number,number], s: [rx * 0.16, ry * 0.36, rz * 0.11] as [number,number,number] },
  ];
  return (
    <group>
      <mesh position={[0, ry * 0.05, 0]} material={mats.hair}>
        <sphereGeometry args={[rx * 1.06, seg, seg, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
      </mesh>
      {spikes.map((sp, i) => (
        <mesh key={i} position={sp.pos} rotation={sp.rot} material={i % 2 === 0 ? mats.hair : mats.hairAlt}>
          <boxGeometry args={sp.s} />
        </mesh>
      ))}
      {/* Side undercut */}
      <mesh position={[-rx * 1.02, ry * 0.0, 0]} material={mats.hair}>
        <boxGeometry args={[rx * 0.13, ry * 0.4, rz * 0.95]} />
      </mesh>
      <mesh position={[rx * 1.02, ry * 0.0, 0]} material={mats.hair}>
        <boxGeometry args={[rx * 0.13, ry * 0.4, rz * 0.95]} />
      </mesh>
    </group>
  );
}

function SuitJacket({
  d, seg,
}: { d: PresenterDef; seg: number }) {
  const clothMat = useMemo(() => clothMaterial(d.clothColor, 0.78), [d.clothColor]);
  const innerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f5f5f0", roughness: 0.7 }), []);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: d.accentColor, roughness: 0.6, metalness: 0.1 }), [d.accentColor]);
  const tH = d.torsoH;
  const tTR = d.torsoTopR;
  return (
    <group>
      {/* Main torso cylinder */}
      <mesh material={clothMat}>
        <cylinderGeometry args={[tTR, d.torsobotR, tH, seg]} />
      </mesh>
      {/* Shirt visible under lapels */}
      <mesh position={[0, tH * 0.18, tTR * 0.88]} material={innerMat}>
        <boxGeometry args={[tTR * 0.55, tH * 0.52, tTR * 0.1]} />
      </mesh>
      {/* Tie */}
      <mesh position={[0, tH * 0.05, tTR * 0.92]} material={accentMat}>
        <boxGeometry args={[tTR * 0.14, tH * 0.36, tTR * 0.06]} />
      </mesh>
      {/* Left lapel */}
      <mesh position={[-tTR * 0.55, tH * 0.38, tTR * 0.72]} rotation={[0, 0.4, 0.15]} material={clothMat}>
        <boxGeometry args={[tTR * 0.52, tH * 0.22, tTR * 0.09]} />
      </mesh>
      {/* Right lapel */}
      <mesh position={[tTR * 0.55, tH * 0.38, tTR * 0.72]} rotation={[0, -0.4, -0.15]} material={clothMat}>
        <boxGeometry args={[tTR * 0.52, tH * 0.22, tTR * 0.09]} />
      </mesh>
      {/* Shoulder pads */}
      <mesh position={[-d.shoulderW, tH * 0.43, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.38, seg, 6]} />
      </mesh>
      <mesh position={[d.shoulderW, tH * 0.43, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.38, seg, 6]} />
      </mesh>
      {/* Pocket square accent */}
      <mesh position={[-tTR * 0.62, tH * 0.36, tTR * 0.88]} material={accentMat}>
        <boxGeometry args={[tTR * 0.14, tH * 0.06, tTR * 0.04]} />
      </mesh>
    </group>
  );
}

function Blazer({ d, seg }: { d: PresenterDef; seg: number }) {
  const clothMat = useMemo(() => clothMaterial(d.clothColor, 0.72), [d.clothColor]);
  const innerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.65 }), []);
  const tH = d.torsoH;
  const tTR = d.torsoTopR;
  return (
    <group>
      <mesh material={clothMat}>
        <cylinderGeometry args={[tTR, d.torsobotR, tH, seg]} />
      </mesh>
      <mesh position={[0, tH * 0.16, tTR * 0.85]} material={innerMat}>
        <boxGeometry args={[tTR * 0.48, tH * 0.48, tTR * 0.09]} />
      </mesh>
      <mesh position={[-tTR * 0.48, tH * 0.35, tTR * 0.7]} rotation={[0, 0.35, 0.12]} material={clothMat}>
        <boxGeometry args={[tTR * 0.48, tH * 0.2, tTR * 0.08]} />
      </mesh>
      <mesh position={[tTR * 0.48, tH * 0.35, tTR * 0.7]} rotation={[0, -0.35, -0.12]} material={clothMat}>
        <boxGeometry args={[tTR * 0.48, tH * 0.2, tTR * 0.08]} />
      </mesh>
      <mesh position={[-d.shoulderW, tH * 0.43, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.34, seg, 6]} />
      </mesh>
      <mesh position={[d.shoulderW, tH * 0.43, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.34, seg, 6]} />
      </mesh>
    </group>
  );
}

function Hoodie({ d, seg }: { d: PresenterDef; seg: number }) {
  const clothMat = useMemo(() => clothMaterial(d.clothColor, 0.85), [d.clothColor]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: d.accentColor, roughness: 0.7 }), [d.accentColor]);
  const tH = d.torsoH;
  const tTR = d.torsoTopR;
  return (
    <group>
      <mesh material={clothMat}>
        <cylinderGeometry args={[tTR * 1.06, d.torsobotR * 1.04, tH, seg]} />
      </mesh>
      {/* Hood collar */}
      <mesh position={[0, tH * 0.44, 0]} material={clothMat}>
        <torusGeometry args={[tTR * 0.7, tTR * 0.15, 6, seg]} />
      </mesh>
      {/* Front pocket */}
      <mesh position={[0, -tH * 0.05, tTR * 0.96]} material={clothMat}>
        <boxGeometry args={[tTR * 1.2, tH * 0.2, tTR * 0.08]} />
      </mesh>
      {/* Drawstring dots */}
      <mesh position={[-tTR * 0.15, tH * 0.32, tTR * 0.98]} material={accentMat}>
        <cylinderGeometry args={[0.008, 0.008, tH * 0.3, 4]} />
      </mesh>
      <mesh position={[tTR * 0.15, tH * 0.32, tTR * 0.98]} material={accentMat}>
        <cylinderGeometry args={[0.008, 0.008, tH * 0.3, 4]} />
      </mesh>
      {/* Logo circle */}
      <mesh position={[0, tH * 0.14, tTR * 0.98]} material={accentMat}>
        <circleGeometry args={[tTR * 0.18, 12]} />
      </mesh>
      <mesh position={[-d.shoulderW * 0.95, tH * 0.42, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.36, seg, 6]} />
      </mesh>
      <mesh position={[d.shoulderW * 0.95, tH * 0.42, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.36, seg, 6]} />
      </mesh>
    </group>
  );
}

function GamingJacket({ d, seg }: { d: PresenterDef; seg: number }) {
  const clothMat = useMemo(() => clothMaterial(d.clothColor, 0.72), [d.clothColor]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: d.accentColor, roughness: 0.55, metalness: 0.15 }), [d.accentColor]);
  const tH = d.torsoH;
  const tTR = d.torsoTopR;
  return (
    <group>
      <mesh material={clothMat}>
        <cylinderGeometry args={[tTR * 1.04, d.torsobotR, tH, seg]} />
      </mesh>
      {/* Racing stripes on arms (visual only on jacket body sides) */}
      <mesh position={[-tTR * 0.88, tH * 0.05, 0]} rotation={[0, 0, 0.08]} material={accentMat}>
        <boxGeometry args={[tTR * 0.07, tH * 0.72, tTR * 0.06]} />
      </mesh>
      <mesh position={[tTR * 0.88, tH * 0.05, 0]} rotation={[0, 0, -0.08]} material={accentMat}>
        <boxGeometry args={[tTR * 0.07, tH * 0.72, tTR * 0.06]} />
      </mesh>
      {/* Chest logo */}
      <mesh position={[0, tH * 0.18, tTR * 0.98]} material={accentMat}>
        <circleGeometry args={[tTR * 0.22, 3]} />
      </mesh>
      {/* Stand collar */}
      <mesh position={[0, tH * 0.42, 0]} material={clothMat}>
        <cylinderGeometry args={[tTR * 0.55, tTR * 0.52, tH * 0.09, seg]} />
      </mesh>
      <mesh position={[-d.shoulderW, tH * 0.44, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.37, seg, 6]} />
      </mesh>
      <mesh position={[d.shoulderW, tH * 0.44, 0]} material={clothMat}>
        <sphereGeometry args={[tTR * 0.37, seg, 6]} />
      </mesh>
    </group>
  );
}

// ── Main avatar component ──────────────────────────────────────────────────────

export function HumanPresenterAvatar({
  avatarKey,
  quality,
  animationState = "idle",
  mouthOpenAmount = 0,
  expressionIntensity = 0.8,
}: Props) {
  const d = PRESENTER_DEFS[avatarKey] ?? DEFAULT_DEF;

  const seg = quality === "high" ? 20 : quality === "medium" ? 14 : 8;
  const capSeg = quality === "high" ? 6 : 4;

  // ── Materials ──────────────────────────────────────────────────────────────
  const skinMat = useMemo(() => skinMaterial(d.skinColor, d.skinRoughness), [d.skinColor, d.skinRoughness]);
  const hairMat = useMemo(() => hairMaterial(d.hairColor), [d.hairColor]);
  const hairAltMat = useMemo(() => hairMaterial(d.hairSecondary, 0.6), [d.hairSecondary]);
  const eyeWhiteMat = useMemo(() => eyeWhiteMaterial(), []);
  const irisMat = useMemo(() => irisMaterial(d.eyeIrisColor), [d.eyeIrisColor]);
  const pupilMat = useMemo(() => pupilMaterial(), []);
  const catchlightMat = useMemo(() => catchlightMaterial(), []);
  const lipMat = useMemo(() => lipMaterial(d.lipFullness), [d.lipFullness]);
  const noseMat = useMemo(() => skinMaterial(d.skinColor, d.skinRoughness + 0.04), [d.skinColor, d.skinRoughness]);
  const earMat = useMemo(() => skinMaterial(d.skinColor, d.skinRoughness + 0.06), [d.skinColor, d.skinRoughness]);
  const legMat = useMemo(() => clothMaterial("#0a0f1a", 0.9), []);
  const armClothMat = useMemo(() => clothMaterial(d.clothColor, 0.78), [d.clothColor]);

  // ── Geometry (memoized per quality) ───────────────────────────────────────
  const headGeo = useMemo(
    () => makeHeadGeometry(d.headRx, d.headRy, d.headRz, d.jawNarrow, seg),
    [d.headRx, d.headRy, d.headRz, d.jawNarrow, seg],
  );

  // ── Refs for animation ─────────────────────────────────────────────────────
  const rootRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftForeArmRef = useRef<THREE.Mesh>(null);
  const rightForeArmRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftLidRef = useRef<THREE.Mesh>(null);
  const rightLidRef = useRef<THREE.Mesh>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);
  const leftIrisRef = useRef<THREE.Mesh>(null);
  const rightIrisRef = useRef<THREE.Mesh>(null);

  // Animation lerp refs
  const leftArmZRef = useRef(-0.22);
  const rightArmZRef = useRef(0.22);
  const leftArmXRef = useRef(0);
  const rightArmXRef = useRef(0);
  const mouthOpenRef2 = useRef(0);

  // Blink state machine
  const blinkRef = useRef({ phase: 0, timer: 0, nextBlink: 2.8 + Math.random() * 2.4 });
  // Eye saccade
  const saccadeRef = useRef({ x: 0, y: 0, timer: 0, nextSaccade: 1.5 + Math.random() * 2.0 });
  // Breathing
  const breathRef = useRef(0);

  const animStateRef = useRef(animationState);
  animStateRef.current = animationState;
  const mouthOpenAmountRef = useRef(mouthOpenAmount);
  mouthOpenAmountRef.current = mouthOpenAmount;
  const exprIntensityRef = useRef(expressionIntensity);
  exprIntensityRef.current = expressionIntensity;

  useEffect(() => {
    return () => {
      headGeo.dispose();
    };
  }, [headGeo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const anim = animStateRef.current;
    const mOpen = mouthOpenAmountRef.current;
    const expr = exprIntensityRef.current;
    const lf = 1 - Math.pow(0.002, delta);
    const lf2 = 1 - Math.pow(0.0001, delta);

    // ── Breathing ────────────────────────────────────────────────────────────
    breathRef.current = Math.sin(t * 0.38) * 0.008 + Math.sin(t * 0.19) * 0.004;
    if (chestRef.current) {
      chestRef.current.scale.x = 1 + breathRef.current * 0.8;
      chestRef.current.scale.z = 1 + breathRef.current;
      chestRef.current.position.y = breathRef.current * 0.5;
    }

    // ── Body sway (weight shift) ──────────────────────────────────────────────
    if (rootRef.current) {
      rootRef.current.rotation.z = Math.sin(t * 0.22) * 0.018;
      rootRef.current.position.y = Math.sin(t * 0.38) * 0.004;
    }

    // ── Head micro-drift ─────────────────────────────────────────────────────
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.44) * 0.055 + Math.sin(t * 0.11) * 0.022;
      headGroupRef.current.rotation.x = Math.sin(t * 0.28) * 0.035 + breathRef.current * 0.3;
      headGroupRef.current.rotation.z = Math.sin(t * 0.17) * 0.015;
    }

    // ── Blink state machine ───────────────────────────────────────────────────
    const b = blinkRef.current;
    b.timer += delta;
    if (b.phase === 0 && b.timer >= b.nextBlink) {
      b.phase = 1; b.timer = 0;
    } else if (b.phase === 1) {
      // Close — fast (0.08s)
      const prog = Math.min(1, b.timer / 0.08);
      const v = prog;
      if (leftLidRef.current) leftLidRef.current.scale.y = 1 + v * 2.4;
      if (rightLidRef.current) rightLidRef.current.scale.y = 1 + v * 2.4;
      if (b.timer >= 0.08) { b.phase = 2; b.timer = 0; }
    } else if (b.phase === 2) {
      // Open — slightly slower (0.10s)
      const prog = Math.min(1, b.timer / 0.10);
      const v = 1 - prog;
      if (leftLidRef.current) leftLidRef.current.scale.y = 1 + v * 2.4;
      if (rightLidRef.current) rightLidRef.current.scale.y = 1 + v * 2.4;
      if (b.timer >= 0.10) {
        b.phase = 0; b.timer = 0;
        b.nextBlink = 2.2 + Math.random() * 3.2;
      }
    }

    // ── Eye saccade (micro eye movement) ────────────────────────────────────
    const sc = saccadeRef.current;
    sc.timer += delta;
    if (sc.timer >= sc.nextSaccade) {
      sc.x = (Math.random() - 0.5) * 0.024;
      sc.y = (Math.random() - 0.5) * 0.012;
      sc.timer = 0;
      sc.nextSaccade = 1.2 + Math.random() * 2.8;
    }
    const eyeX = sc.x + Math.sin(t * 0.18) * 0.006;
    const eyeY = sc.y + Math.sin(t * 0.25) * 0.004;
    if (leftIrisRef.current) { leftIrisRef.current.position.x = -d.headRx * 0.55 + eyeX; leftIrisRef.current.position.y = d.headRy * 0.22 + eyeY; }
    if (rightIrisRef.current) { rightIrisRef.current.position.x = d.headRx * 0.55 + eyeX; rightIrisRef.current.position.y = d.headRy * 0.22 + eyeY; }
    if (leftPupilRef.current) { leftPupilRef.current.position.x = -d.headRx * 0.55 + eyeX; leftPupilRef.current.position.y = d.headRy * 0.22 + eyeY; }
    if (rightPupilRef.current) { rightPupilRef.current.position.x = d.headRx * 0.55 + eyeX; rightPupilRef.current.position.y = d.headRy * 0.22 + eyeY; }

    // ── Arm poses per animation state ────────────────────────────────────────
    let tLZ = -0.22, tRZ = 0.22, tLX = 0, tRX = 0;
    let bounceAmp = 0.0, bounceFreq = 0.85;

    switch (anim) {
      case "talking":
        tLZ = -0.18; tRZ = 0.18; bounceAmp = 0.006; bounceFreq = 1.1;
        break;
      case "happy":
        tLZ = -0.10; tRZ = 0.10; bounceAmp = 0.012; bounceFreq = 1.5;
        break;
      case "excited":
        tLZ = -0.05; tRZ = 0.05; bounceAmp = 0.022; bounceFreq = 2.2;
        break;
      case "gift_reaction":
        tLZ = -0.18; tRZ = 0.18; tLX = -0.45; tRX = -0.45;
        bounceAmp = 0.008; bounceFreq = 0.9;
        break;
      case "follow_reaction":
        tLZ = -(0.22 + Math.PI * 0.28); tRZ = 0.22 + Math.PI * 0.28;
        bounceAmp = 0.018; bounceFreq = 1.8;
        break;
      case "victory":
        tLZ = -(0.22 + Math.PI * 0.40); tRZ = 0.22 + Math.PI * 0.40;
        bounceAmp = 0.035; bounceFreq = 2.5;
        break;
    }

    leftArmZRef.current += (tLZ - leftArmZRef.current) * lf;
    rightArmZRef.current += (tRZ - rightArmZRef.current) * lf;
    leftArmXRef.current += (tLX - leftArmXRef.current) * lf;
    rightArmXRef.current += (tRX - rightArmXRef.current) * lf;

    const swayFreq = anim === "follow_reaction" ? 3.0 : 0.88;
    const swayAmp = anim === "excited" || anim === "follow_reaction" ? 0.08 : 0.025;
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = leftArmZRef.current + Math.sin(t * swayFreq) * swayAmp;
      leftArmRef.current.rotation.x = leftArmXRef.current;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = rightArmZRef.current + Math.sin(t * swayFreq + Math.PI) * swayAmp;
      rightArmRef.current.rotation.x = rightArmXRef.current;
    }
    // Forearm slight natural bend
    if (leftForeArmRef.current) leftForeArmRef.current.rotation.x = -0.15 + Math.sin(t * 0.44) * 0.03;
    if (rightForeArmRef.current) rightForeArmRef.current.rotation.x = -0.15 + Math.sin(t * 0.44 + 1.2) * 0.03;

    // ── Mouth (lip sync) ──────────────────────────────────────────────────────
    const targetMouth = mOpen * expr;
    mouthOpenRef2.current += (targetMouth - mouthOpenRef2.current) * lf2;
    if (mouthRef.current) {
      mouthRef.current.scale.y = 1 + mouthOpenRef2.current * 3.5;
      mouthRef.current.position.y = d.headRy * (-0.32) - mouthOpenRef2.current * 0.008;
    }

    // ── Excitement: head bounces ──────────────────────────────────────────────
    if (headGroupRef.current && bounceAmp > 0) {
      headGroupRef.current.position.y = Math.sin(t * bounceFreq * 2) * bounceAmp;
    }
  });

  // ── Layout dimensions ────────────────────────────────────────────────────────
  const tH = d.torsoH;
  const tTR = d.torsoTopR;
  const tY = 0.82; // torso centre Y in world space
  const headY = tY + tH * 0.5 + d.neckH + d.headRy;
  const neckY = tY + tH * 0.5 + d.neckH * 0.5;
  const armY = tY + tH * 0.35;
  const armLen = d.isFemale ? 0.26 : 0.30;
  const foreLen = armLen * 0.88;
  const legLen = d.isFemale ? 0.44 : 0.48;
  const legR = d.isFemale ? 0.052 : 0.060;
  const footY = tY - tH * 0.5 - legLen - 0.05;

  return (
    <group ref={rootRef}>

      {/* ── Torso + clothing ── */}
      <group ref={chestRef} position={[0, tY, 0]}>
        {d.clothStyle === "suit" && <SuitJacket d={d} seg={seg} />}
        {d.clothStyle === "blazer" && <Blazer d={d} seg={seg} />}
        {d.clothStyle === "hoodie" && <Hoodie d={d} seg={seg} />}
        {d.clothStyle === "gaming-jacket" && <GamingJacket d={d} seg={seg} />}
      </group>

      {/* ── Arms ── */}
      {/* Left upper arm */}
      <mesh
        ref={leftArmRef}
        position={[-(tTR + 0.045), armY, 0]}
        rotation={[0, 0, -0.22]}
        material={armClothMat}
      >
        <capsuleGeometry args={[tTR * 0.32, armLen, capSeg, seg]} />
      </mesh>
      {/* Left forearm */}
      <mesh
        ref={leftForeArmRef}
        position={[-(tTR + 0.055 + armLen * 0.5), armY - armLen * 0.7, 0]}
        rotation={[-0.15, 0, 0]}
        material={skinMat}
      >
        <capsuleGeometry args={[tTR * 0.26, foreLen, capSeg, seg]} />
      </mesh>
      {/* Right upper arm */}
      <mesh
        ref={rightArmRef}
        position={[tTR + 0.045, armY, 0]}
        rotation={[0, 0, 0.22]}
        material={armClothMat}
      >
        <capsuleGeometry args={[tTR * 0.32, armLen, capSeg, seg]} />
      </mesh>
      {/* Right forearm */}
      <mesh
        ref={rightForeArmRef}
        position={[tTR + 0.055 + armLen * 0.5, armY - armLen * 0.7, 0]}
        rotation={[-0.15, 0, 0]}
        material={skinMat}
      >
        <capsuleGeometry args={[tTR * 0.26, foreLen, capSeg, seg]} />
      </mesh>

      {/* ── Legs ── */}
      <mesh
        position={[-legR * 1.1, tY - tH * 0.5 - legLen * 0.5, 0]}
        material={legMat}
      >
        <capsuleGeometry args={[legR, legLen, capSeg, seg]} />
      </mesh>
      <mesh
        position={[legR * 1.1, tY - tH * 0.5 - legLen * 0.5, 0]}
        material={legMat}
      >
        <capsuleGeometry args={[legR, legLen, capSeg, seg]} />
      </mesh>
      {/* Feet */}
      <mesh position={[-legR * 1.1, footY, legR * 0.8]} material={legMat}>
        <boxGeometry args={[legR * 1.8, legR * 0.6, legR * 2.8]} />
      </mesh>
      <mesh position={[legR * 1.1, footY, legR * 0.8]} material={legMat}>
        <boxGeometry args={[legR * 1.8, legR * 0.6, legR * 2.8]} />
      </mesh>

      {/* ── Neck ── */}
      <mesh position={[0, neckY, 0]} material={skinMat}>
        <cylinderGeometry args={[d.neckR, d.neckR * 1.1, d.neckH, seg]} />
      </mesh>

      {/* ── Head group ── */}
      <group ref={headGroupRef} position={[0, headY, 0]}>

        {/* Head mesh */}
        <mesh geometry={headGeo} material={skinMat} castShadow />

        {/* Ears */}
        <mesh position={[-d.headRx * 1.02, 0, 0]} material={earMat}>
          <sphereGeometry args={[d.headRx * 0.22, 8, 8]} />
        </mesh>
        <mesh position={[d.headRx * 1.02, 0, 0]} material={earMat}>
          <sphereGeometry args={[d.headRx * 0.22, 8, 8]} />
        </mesh>
        {/* Ear canal (dark recessed) */}
        <mesh position={[-d.headRx * 1.06, 0, 0]} material={pupilMat}>
          <sphereGeometry args={[d.headRx * 0.09, 6, 6]} />
        </mesh>
        <mesh position={[d.headRx * 1.06, 0, 0]} material={pupilMat}>
          <sphereGeometry args={[d.headRx * 0.09, 6, 6]} />
        </mesh>

        {/* Nose bridge + tip */}
        <mesh position={[0, d.headRy * -0.05, d.headRz * 0.88]} material={noseMat}>
          <boxGeometry args={[d.headRx * 0.22, d.headRy * 0.3, d.headRz * 0.14]} />
        </mesh>
        <mesh position={[0, d.headRy * -0.2, d.headRz * 0.96]} material={noseMat}>
          <sphereGeometry args={[d.headRx * 0.14, 8, 8]} />
        </mesh>
        {/* Nostril hints */}
        <mesh position={[-d.headRx * 0.11, d.headRy * -0.24, d.headRz * 0.94]} material={pupilMat}>
          <sphereGeometry args={[d.headRx * 0.055, 5, 5]} />
        </mesh>
        <mesh position={[d.headRx * 0.11, d.headRy * -0.24, d.headRz * 0.94]} material={pupilMat}>
          <sphereGeometry args={[d.headRx * 0.055, 5, 5]} />
        </mesh>

        {/* Lips */}
        <mesh
          ref={mouthRef}
          position={[0, d.headRy * (-0.32), d.headRz * 0.88]}
          material={lipMat}
        >
          <boxGeometry args={[d.headRx * 0.52, d.headRy * 0.09 * d.lipFullness, d.headRz * 0.09]} />
        </mesh>
        {/* Upper lip cupid bow */}
        <mesh position={[0, d.headRy * (-0.29), d.headRz * 0.89]} material={lipMat}>
          <sphereGeometry args={[d.headRx * 0.22 * d.lipFullness, 6, 5]} />
        </mesh>

        {/* ── Eyes ── */}
        {([-1, 1] as const).map((side) => {
          const ex = side * d.headRx * 0.55;
          const ey = d.headRy * 0.22;
          const ez = d.headRz * 0.84;
          const eyeR = d.headRx * 0.145;
          return (
            <group key={side}>
              {/* Sclera */}
              <mesh position={[ex, ey, ez]} material={eyeWhiteMat}>
                <sphereGeometry args={[eyeR, seg, seg]} />
              </mesh>
              {/* Iris */}
              <mesh
                ref={side === -1 ? leftIrisRef : rightIrisRef}
                position={[ex, ey, ez + eyeR * 0.82]}
                material={irisMat}
              >
                <circleGeometry args={[eyeR * 0.72, seg]} />
              </mesh>
              {/* Pupil */}
              <mesh
                ref={side === -1 ? leftPupilRef : rightPupilRef}
                position={[ex, ey, ez + eyeR * 0.84]}
                material={pupilMat}
              >
                <circleGeometry args={[eyeR * 0.36, seg]} />
              </mesh>
              {/* Catchlight */}
              <mesh position={[ex + eyeR * 0.18, ey + eyeR * 0.18, ez + eyeR * 0.85]} material={catchlightMat}>
                <circleGeometry args={[eyeR * 0.13, 6]} />
              </mesh>
              {/* Upper eyelid (for blink) */}
              <mesh
                ref={side === -1 ? leftLidRef : rightLidRef}
                position={[ex, ey + eyeR * 0.82, ez + eyeR * 0.22]}
                material={skinMat}
                scale={[1, 1, 1]}
              >
                <sphereGeometry args={[eyeR * 1.02, seg, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              </mesh>
              {/* Eyelashes (thin dark arcs as thin boxes) */}
              {quality !== "low" && Array.from({ length: 6 }).map((_, li) => {
                const angle = -Math.PI * 0.5 + (li / 5) * Math.PI * 0.65 - 0.1;
                const lx = Math.cos(angle) * eyeR * 1.0;
                const ly = Math.abs(Math.sin(angle)) * eyeR * 1.0;
                return (
                  <mesh
                    key={li}
                    position={[ex + lx, ey + ly, ez + eyeR * 0.2]}
                    rotation={[0, 0, angle + Math.PI * 0.5]}
                    material={hairMat}
                  >
                    <boxGeometry args={[eyeR * 0.04, eyeR * 0.22 + li * eyeR * 0.018, eyeR * 0.04]} />
                  </mesh>
                );
              })}
              {/* Eyebrow */}
              <mesh
                position={[ex, ey + eyeR * 1.55, ez + eyeR * 0.25]}
                rotation={[0, 0, side * 0.08]}
                material={hairMat}
              >
                <boxGeometry args={[eyeR * 1.7, eyeR * 0.18 * d.eyebrowThickness, eyeR * 0.12]} />
              </mesh>
            </group>
          );
        })}

        {/* ── Hair ── */}
        {d.hairStyle === "pro-male" && <ProHairMale d={d} mats={{ hair: hairMat }} seg={seg} />}
        {d.hairStyle === "pro-female" && <ProHairFemale d={d} mats={{ hair: hairMat }} seg={seg} />}
        {d.hairStyle === "streamer" && <StreamerHair d={d} mats={{ hair: hairMat, hairAlt: hairAltMat }} seg={seg} />}
        {d.hairStyle === "gaming" && <GamingHair d={d} mats={{ hair: hairMat, hairAlt: hairAltMat }} seg={seg} />}

      </group>

      {/* ── Ground shadow disc ── */}
      {quality !== "low" && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 24]} />
          <meshBasicMaterial color={d.accentColor} transparent opacity={0.08} />
        </mesh>
      )}
    </group>
  );
}
