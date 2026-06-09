// ── Avatar Asset Registry ─────────────────────────────────────────────────────

export type BuiltInAvatarKey =
  | "ivan-host"
  | "marcus"
  | "aria"
  | "sofia";

export type AvatarStyleClass =
  | "realistic-bald-male"
  | "realistic-dark-male"
  | "realistic-professional-female"
  | "realistic-streamer-female";

export type VRMStatus = "human-procedural";

export interface OutfitOption {
  id: string;
  label: string;
  clothingColor: string;
}

export interface AvatarAsset {
  key: BuiltInAvatarKey;
  name: string;
  tagline: string;
  role: string;
  gender: "Male" | "Female";
  ageRange: string;
  styleClass: AvatarStyleClass;
  accentColor: string;
  skinTone: string;
  hairColor: string;
  clothingColor: string;
  eyeColor: string;
  vrmPath: null;
  vrmStatus: VRMStatus;
  vrmSource: string;
  personality: string;
  isPrimary: boolean;
  presenterStyle: "bald-host" | "male-professional" | "female-professional" | "female-streamer";
  outfits: OutfitOption[];
}

export const BUILT_IN_AVATARS: Record<BuiltInAvatarKey, AvatarAsset> = {
  "ivan-host": {
    key: "ivan-host",
    name: "Ivan Host",
    tagline: "Primary Host · Professional",
    role: "Main Presenter",
    gender: "Male",
    ageRange: "35–45",
    styleClass: "realistic-bald-male",
    accentColor: "#2563eb",
    skinTone: "#c8906a",
    hairColor: "#1a1a1a",
    clothingColor: "#1e3a5f",
    eyeColor: "#4a7ab5",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Confident and authoritative — ideal for product launches, professional hosting and high-stakes streams",
    isPrimary: true,
    presenterStyle: "bald-host",
    outfits: [
      { id: "casual",   label: "Casual",       clothingColor: "#1e3a5f" },
      { id: "business", label: "Business",     clothingColor: "#0f1f38" },
      { id: "smart",    label: "Smart Casual", clothingColor: "#4a3728" },
      { id: "black",    label: "All Black",    clothingColor: "#111111" },
    ],
  },
  "marcus": {
    key: "marcus",
    name: "Marcus",
    tagline: "TV Host · Professional",
    role: "News / TV Style",
    gender: "Male",
    ageRange: "30–40",
    styleClass: "realistic-dark-male",
    accentColor: "#3b82f6",
    skinTone: "#c47050",
    hairColor: "#1a1008",
    clothingColor: "#1a2a44",
    eyeColor: "#3a4a60",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Polished and charismatic — the go-to host for news-style content, product reviews and brand stories",
    isPrimary: false,
    presenterStyle: "male-professional",
    outfits: [
      { id: "suit",     label: "Suit",         clothingColor: "#1a2a44" },
      { id: "business", label: "Business",     clothingColor: "#0f1a2e" },
      { id: "smart",    label: "Smart",        clothingColor: "#2d4a6e" },
      { id: "casual",   label: "Casual",       clothingColor: "#2d3a4a" },
    ],
  },
  "aria": {
    key: "aria",
    name: "Aria",
    tagline: "Presenter · Professional",
    role: "Female Host",
    gender: "Female",
    ageRange: "28–38",
    styleClass: "realistic-professional-female",
    accentColor: "#8b5cf6",
    skinTone: "#e8b896",
    hairColor: "#2d1810",
    clothingColor: "#1a1a2a",
    eyeColor: "#4a3060",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Elegant and trustworthy — ideal for interviews, brand stories and professional lifestyle content",
    isPrimary: false,
    presenterStyle: "female-professional",
    outfits: [
      { id: "blazer",   label: "Blazer",       clothingColor: "#1a1a2a" },
      { id: "business", label: "Business",     clothingColor: "#2d1444" },
      { id: "smart",    label: "Smart",        clothingColor: "#8b6530" },
      { id: "casual",   label: "Casual",       clothingColor: "#2a2a2a" },
    ],
  },
  "sofia": {
    key: "sofia",
    name: "Sofia",
    tagline: "Streamer · Content Creator",
    role: "Female Streamer",
    gender: "Female",
    ageRange: "25–35",
    styleClass: "realistic-streamer-female",
    accentColor: "#ec4899",
    skinTone: "#e8c4a0",
    hairColor: "#8b5530",
    clothingColor: "#1a1a1a",
    eyeColor: "#3a6030",
    vrmPath: null,
    vrmStatus: "human-procedural",
    vrmSource: "HumanPresenterAvatar — parametric human geometry",
    personality: "Creative and community-driven — maximises engagement for gaming streams, lifestyle vlogs and interactive shows",
    isPrimary: false,
    presenterStyle: "female-streamer",
    outfits: [
      { id: "hoodie",     label: "Hoodie",       clothingColor: "#1a1a1a" },
      { id: "casual",     label: "Casual",       clothingColor: "#2d1a2a" },
      { id: "gaming",     label: "Gaming",       clothingColor: "#0d1a2a" },
      { id: "streetwear", label: "Street",       clothingColor: "#1a2d1a" },
    ],
  },
};

export const BUILT_IN_AVATAR_LIST = Object.values(BUILT_IN_AVATARS);

export const HUMAN_PRESENTER_KEYS: BuiltInAvatarKey[] = [
  "ivan-host",
  "marcus",
  "aria",
  "sofia",
];

export const LEGACY_AVATAR_KEYS: BuiltInAvatarKey[] = [];

export const BACKGROUND_PRESETS = [
  { id: "studio",      label: "Studio",      gradient: "linear-gradient(160deg, #050c18 0%, #020508 100%)",          icon: "🎥" },
  { id: "gaming-room", label: "Gaming Room", gradient: "linear-gradient(160deg, #0d0028 0%, #14003a 50%, #001428 100%)", icon: "🎮" },
  { id: "office",      label: "Office",      gradient: "linear-gradient(160deg, #0a0e14 0%, #080c10 100%)",            icon: "🏢" },
  { id: "city-night",  label: "City Night",  gradient: "linear-gradient(160deg, #000814 0%, #00061a 50%, #02000a 100%)", icon: "🌆" },
];

export function getAvatarVRMPath(_key: string): string | null {
  return null;
}

export function isVRMBacked(_key: string): boolean {
  return false;
}

export function isHumanPresenter(key: string): boolean {
  return key in BUILT_IN_AVATARS;
}

export function formatVRMSize(bytes?: number): string {
  if (!bytes) return "unknown";
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function getBackgroundGradient(bgId: string): string {
  return BACKGROUND_PRESETS.find((b) => b.id === bgId)?.gradient ?? BACKGROUND_PRESETS[0].gradient;
}
