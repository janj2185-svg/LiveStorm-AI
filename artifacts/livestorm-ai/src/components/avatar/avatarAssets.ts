// ── Avatar Asset Registry ─────────────────────────────────────────────────────

export type BuiltInAvatarKey =
  | "storm-default"
  | "storm-serious"
  | "storm-cute"
  | "presenter-male"
  | "presenter-female"
  | "streamer-friendly"
  | "creator-gaming";

export type AvatarStyleClass =
  | "anime"
  | "realistic"
  | "chibi"
  | "human-male"
  | "human-female"
  | "streamer"
  | "gaming";

export type VRMStatus = "vrm" | "procedural" | "human-procedural";

export interface AvatarAsset {
  key: BuiltInAvatarKey;
  name: string;
  tagline: string;
  styleClass: AvatarStyleClass;
  accentColor: string;
  skinTone: string;
  hairColor: string;
  clothingColor: string;
  /** Path relative to /public — null means use ProceduralAvatar / HumanPresenterAvatar */
  vrmPath: string | null;
  vrmStatus: VRMStatus;
  vrmSource: string;
  vrmSizeBytes?: number;
  personality: string;
  presenterStyle?: "male-professional" | "female-professional" | "friendly-streamer" | "gaming-creator";
}

export const BUILT_IN_AVATARS: Record<BuiltInAvatarKey, AvatarAsset> = {
  "presenter-male": {
    key: "presenter-male",
    name: "Marcus",
    tagline: "Male Host · Professional",
    styleClass: "human-male",
    accentColor: "#2563eb",
    skinTone: "#d4956a",
    hairColor: "#1a1008",
    clothingColor: "#1e3a5f",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Confident and authoritative — ideal for product launches and professional content",
    presenterStyle: "male-professional",
  },
  "presenter-female": {
    key: "presenter-female",
    name: "Aria",
    tagline: "Female Host · Professional",
    styleClass: "human-female",
    accentColor: "#7c3aed",
    skinTone: "#f0c4a0",
    hairColor: "#2d1810",
    clothingColor: "#4c1d95",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Warm and engaging — perfect for lifestyle, beauty and brand content",
    presenterStyle: "female-professional",
  },
  "streamer-friendly": {
    key: "streamer-friendly",
    name: "Kai",
    tagline: "Streamer · Casual Friendly",
    styleClass: "streamer",
    accentColor: "#10b981",
    skinTone: "#e8b896",
    hairColor: "#1c6b3a",
    clothingColor: "#064e3b",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Energetic and approachable — maximises viewer retention and engagement",
    presenterStyle: "friendly-streamer",
  },
  "creator-gaming": {
    key: "creator-gaming",
    name: "Zara",
    tagline: "Gaming Creator · Dynamic",
    styleClass: "gaming",
    accentColor: "#f59e0b",
    skinTone: "#c8956a",
    hairColor: "#7c2d12",
    clothingColor: "#78350f",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Bold and expressive — built for gaming streams, reactions and high-energy moments",
    presenterStyle: "gaming-creator",
  },
  "storm-default": {
    key: "storm-default",
    name: "Storm",
    tagline: "Anime · Energetic",
    styleClass: "anime",
    accentColor: "#8b5cf6",
    skinTone: "#f5e6d3",
    hairColor: "#8b5cf6",
    clothingColor: "#8b5cf6",
    vrmPath: "/avatars/storm-default.vrm",
    vrmStatus: "vrm",
    vrmSource: "VRM 1.0 — Seed-san (vrm-c/vrm-specification)",
    vrmSizeBytes: 10_917_800,
    personality: "Enthusiastic and engaging — perfect for high-energy streams",
  },
  "storm-serious": {
    key: "storm-serious",
    name: "Atlas",
    tagline: "Anime · Professional",
    styleClass: "realistic",
    accentColor: "#3080f5",
    skinTone: "#e8d5c0",
    hairColor: "#3080f5",
    clothingColor: "#3080f5",
    vrmPath: "/avatars/storm-serious.vrm",
    vrmStatus: "vrm",
    vrmSource: "VRM 1.0 — Constraint Twist Sample (vrm-c/vrm-specification)",
    vrmSizeBytes: 10_776_032,
    personality: "Calm and authoritative — ideal for tutorial or educational content",
  },
  "storm-cute": {
    key: "storm-cute",
    name: "Mochi",
    tagline: "Chibi · Playful",
    styleClass: "chibi",
    accentColor: "#eb80d8",
    skinTone: "#f5e6d3",
    hairColor: "#eb80d8",
    clothingColor: "#eb80d8",
    vrmPath: null,
    vrmStatus: "procedural",
    vrmSource: "Procedural Three.js geometry",
    personality: "Sweet and bouncy — maximises gifting and viewer engagement",
  },
};

export const BUILT_IN_AVATAR_LIST = Object.values(BUILT_IN_AVATARS);

export const HUMAN_PRESENTER_KEYS: BuiltInAvatarKey[] = [
  "presenter-male",
  "presenter-female",
  "streamer-friendly",
  "creator-gaming",
];

export const LEGACY_AVATAR_KEYS: BuiltInAvatarKey[] = [
  "storm-default",
  "storm-serious",
  "storm-cute",
];

export function getAvatarVRMPath(key: string): string | null {
  return BUILT_IN_AVATARS[key as BuiltInAvatarKey]?.vrmPath ?? null;
}

export function isVRMBacked(key: string): boolean {
  return (BUILT_IN_AVATARS[key as BuiltInAvatarKey]?.vrmStatus ?? "procedural") === "vrm";
}

export function isHumanPresenter(key: string): boolean {
  return (BUILT_IN_AVATARS[key as BuiltInAvatarKey]?.vrmStatus ?? "procedural") === "human-procedural";
}

export function formatVRMSize(bytes?: number): string {
  if (!bytes) return "unknown";
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
