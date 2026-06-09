// ── Avatar Asset Registry ─────────────────────────────────────────────────────
// Presenter slots — actual 3D models are supplied via avatarUrl (RPM/Avaturn/VRM).
// These entries define metadata and accent colours only.

export type PresenterSlotKey = "marcus" | "kai" | "aria" | "sofia";

export type RendererType = "rpm" | "vrm" | "avaturn" | "none";

export interface PresenterSlot {
  key: PresenterSlotKey;
  name: string;
  tagline: string;
  role: string;
  gender: "Male" | "Female";
  accentColor: string;
  personality: string;
  isPrimary: boolean;
}

export const PRESENTER_SLOTS: Record<PresenterSlotKey, PresenterSlot> = {
  "marcus": {
    key: "marcus",
    name: "Marcus",
    tagline: "Male Host · Professional",
    role: "Male Host",
    gender: "Male",
    accentColor: "#3b82f6",
    personality: "Polished and charismatic — perfect for product reviews and brand stories",
    isPrimary: true,
  },
  "kai": {
    key: "kai",
    name: "Kai",
    tagline: "Male Streamer · Content Creator",
    role: "Male Streamer",
    gender: "Male",
    accentColor: "#06b6d4",
    personality: "High-energy and community-driven — ideal for gaming and interactive drops",
    isPrimary: false,
  },
  "aria": {
    key: "aria",
    name: "Aria",
    tagline: "Female Host · Professional",
    role: "Female Host",
    gender: "Female",
    accentColor: "#8b5cf6",
    personality: "Elegant and trustworthy — best for interviews and lifestyle content",
    isPrimary: false,
  },
  "sofia": {
    key: "sofia",
    name: "Sofia",
    tagline: "Female Streamer · Content Creator",
    role: "Female Streamer",
    gender: "Female",
    accentColor: "#ec4899",
    personality: "Creative and community-driven — maximises engagement for lifestyle vlogs",
    isPrimary: false,
  },
};

// Derive thumbnail URL from a Ready Player Me GLB URL
export function rpmThumbnailFromGlb(glbUrl: string): string {
  const base = glbUrl.split("?")[0].replace(/\.glb$/, "");
  return `${base}.png?scene=fullbody-portrait-v1-transparent&blendShapes[mouthSmile]=0.2&background=transparent&w=400&h=600`;
}

// Derive RPM GLB URL from a raw RPM URL (strip existing query, add needed params)
export function normalizeRpmGlbUrl(raw: string): string {
  const base = raw.split("?")[0];
  return `${base}?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024`;
}

// Renderer badge text
export function rendererLabel(renderer: RendererType | string): string {
  switch (renderer) {
    case "rpm":     return "Ready Player Me";
    case "avaturn": return "Avaturn";
    case "vrm":     return "Custom VRM";
    default:        return "No Avatar";
  }
}

// ── Background presets ────────────────────────────────────────────────────────

export const BACKGROUND_PRESETS = [
  { id: "studio",      label: "Studio",      gradient: "linear-gradient(160deg, #050c18 0%, #020508 100%)",              icon: "🎥" },
  { id: "gaming-room", label: "Gaming Room",  gradient: "linear-gradient(160deg, #0d0028 0%, #14003a 50%, #001428 100%)", icon: "🎮" },
  { id: "office",      label: "Office",       gradient: "linear-gradient(160deg, #0a0e14 0%, #080c10 100%)",              icon: "🏢" },
  { id: "city-night",  label: "City Night",   gradient: "linear-gradient(160deg, #000814 0%, #00061a 50%, #02000a 100%)", icon: "🌆" },
];

export function getBackgroundGradient(bgId: string): string {
  return BACKGROUND_PRESETS.find((b) => b.id === bgId)?.gradient ?? BACKGROUND_PRESETS[0].gradient;
}

// ── Backward-compat shims (keep old names so other files compile) ─────────────

export type BuiltInAvatarKey = PresenterSlotKey;
export const BUILT_IN_AVATARS = PRESENTER_SLOTS as unknown as Record<PresenterSlotKey, {
  key: PresenterSlotKey;
  name: string;
  tagline: string;
  role: string;
  gender: "Male" | "Female";
  accentColor: string;
  personality: string;
  isPrimary: boolean;
  skinTone?: string;
  hairColor?: string;
  clothingColor?: string;
  eyeColor?: string;
  outfits?: { id: string; label: string; clothingColor: string }[];
  vrmStatus?: string;
  vrmSource?: string;
  vrmPath?: null;
  presenterStyle?: string;
  ageRange?: string;
  styleClass?: string;
}>;
export const BUILT_IN_AVATAR_LIST = Object.values(PRESENTER_SLOTS);
export const HUMAN_PRESENTER_KEYS: PresenterSlotKey[] = ["marcus", "kai", "aria", "sofia"];
export const LEGACY_AVATAR_KEYS: PresenterSlotKey[] = [];

export function isHumanPresenter(key: string): boolean {
  return key in PRESENTER_SLOTS;
}
export function getAvatarVRMPath(_key: string): string | null {
  return null;
}
export function isVRMBacked(_key: string): boolean {
  return false;
}
export function formatVRMSize(bytes?: number): string {
  if (!bytes) return "unknown";
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
