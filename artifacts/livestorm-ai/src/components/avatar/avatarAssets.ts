// ── Avatar Asset Registry ─────────────────────────────────────────────────────
// Defines built-in avatar metadata, VRM asset paths, and quality settings.
// Phase 3: storm-default and storm-serious backed by real VRM 1.0 files.
//           storm-cute uses ProceduralAvatar (chibi VRM file in roadmap).

export type BuiltInAvatarKey = "storm-default" | "storm-serious" | "storm-cute";
export type AvatarStyleClass = "anime" | "realistic" | "chibi";
export type VRMStatus = "vrm" | "procedural";

export interface AvatarAsset {
  key: BuiltInAvatarKey;
  name: string;
  tagline: string;
  styleClass: AvatarStyleClass;
  accentColor: string;
  /** Path relative to /public — null means use ProceduralAvatar */
  vrmPath: string | null;
  vrmStatus: VRMStatus;
  vrmSource: string;
  /** Approximate file size in bytes for UI display */
  vrmSizeBytes?: number;
  /** Miku-style personality hint */
  personality: string;
}

// Registry of all built-in avatars.
// vrmPath is a Vite public-folder path → served at runtime from /avatars/<file>
export const BUILT_IN_AVATARS: Record<BuiltInAvatarKey, AvatarAsset> = {
  "storm-default": {
    key: "storm-default",
    name: "Storm",
    tagline: "Anime · Energetic",
    styleClass: "anime",
    accentColor: "#8b5cf6",
    vrmPath: "/avatars/storm-default.vrm",
    vrmStatus: "vrm",
    vrmSource: "VRM 1.0 specification — Seed-san (vrm-c/vrm-specification)",
    vrmSizeBytes: 10_917_800,
    personality: "Enthusiastic and engaging — perfect for high-energy streams",
  },
  "storm-serious": {
    key: "storm-serious",
    name: "Atlas",
    tagline: "Realistic · Professional",
    styleClass: "realistic",
    accentColor: "#3080f5",
    vrmPath: "/avatars/storm-serious.vrm",
    vrmStatus: "vrm",
    vrmSource: "VRM 1.0 specification — Constraint Twist Sample (vrm-c/vrm-specification)",
    vrmSizeBytes: 10_776_032,
    personality: "Calm and authoritative — ideal for tutorial or educational content",
  },
  "storm-cute": {
    key: "storm-cute",
    name: "Mochi",
    tagline: "Chibi · Playful",
    styleClass: "chibi",
    accentColor: "#eb80d8",
    vrmPath: null, // Procedural chibi — dedicated VRM file in Phase 4 roadmap
    vrmStatus: "procedural",
    vrmSource: "Procedural Three.js geometry (chibi VRM in Phase 4 roadmap)",
    personality: "Sweet and bouncy — maximises gifting and viewer engagement",
  },
};

export const BUILT_IN_AVATAR_LIST = Object.values(BUILT_IN_AVATARS);

/** Returns the VRM URL for an avatar key: public-folder asset or null for procedural. */
export function getAvatarVRMPath(key: string): string | null {
  return BUILT_IN_AVATARS[key as BuiltInAvatarKey]?.vrmPath ?? null;
}

/** Returns true if this avatar key is backed by a real VRM file. */
export function isVRMBacked(key: string): boolean {
  return (BUILT_IN_AVATARS[key as BuiltInAvatarKey]?.vrmStatus ?? "procedural") === "vrm";
}

/** Human-readable file size */
export function formatVRMSize(bytes?: number): string {
  if (!bytes) return "unknown";
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
