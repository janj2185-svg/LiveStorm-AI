// ── Recognition Engine ────────────────────────────────────────────────────────
// Detects returning/loyal/absent viewers and builds a natural prompt injection
// that tells Storm to acknowledge them in a human, non-robotic way.

export type RecognitionTier =
  | "first_time"   // No profile in DB — never skip silently, just no recognition
  | "returning"    // Known viewer, last seen < 7d, first comment this session
  | "regular"      // totalComments >= 15 OR totalGifts >= 2
  | "loyal"        // totalComments >= 30 OR (totalGifts >= 2 AND comments >= 10)
  | "legend"       // totalGifts >= 10 OR totalComments >= 50
  | "absent_7d"    // Last seen 7–29 days ago (overrides other tier)
  | "absent_30d";  // Last seen 30+ days ago (highest priority)

export type LoyaltyTier = "bronze" | "silver" | "gold" | "legend";

export interface RecognitionProfile {
  firstSeen:        Date;
  lastSeen:         Date;
  totalGifts:       number;
  totalComments:    number;
  vipLevel:         string;
  streakDays:       number;
  totalCoinsSpent:  number;
  personalityTags:  string;
}

export interface RecognitionState {
  recognitionSeenInSession:    Map<number, Set<string>>;   // sessionId → Set<viewerName>
  lastGlobalRecognitionAt:     Map<number, number>;        // sessionId → timestamp
  recognitionWindowTimestamps: Map<number, number[]>;      // sessionId → last N recognition timestamps
}

export interface RecognitionResult {
  triggered:      boolean;
  tier:           RecognitionTier;
  loyaltyTier:    LoyaltyTier;
  title:          string;
  prompt:         string;
  reason:         string;
  skipReason?:    string;
  lastSeenLabel:  string;
  memoriesUsed:   number;
}

// ── Cooldown config ───────────────────────────────────────────────────────────
const GLOBAL_COOLDOWN_MIN_MS      = 3 * 60_000;
const GLOBAL_COOLDOWN_MAX_MS      = 5 * 60_000;
const MAX_RECOGNITIONS_PER_30MIN  = 3;

// ── Private memory blocklist ──────────────────────────────────────────────────
const PRIVATE_KEYS = [
  "phone", "email", "address", "age", "salary", "income",
  "private", "contact", "password", "home_address", "location_home",
];

function isSafeMemory(key: string): boolean {
  const lower = key.toLowerCase();
  return !PRIVATE_KEYS.some((k) => lower.includes(k));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatLastSeen(lastSeen: Date): string {
  const ms   = Date.now() - lastSeen.getTime();
  const days = Math.floor(ms / 86_400_000);
  const hrs  = Math.floor(ms / 3_600_000);
  if (days >= 1) return `${days}d ago`;
  return `${hrs}h ago`;
}

function getGlobalCooldownMs(): number {
  return GLOBAL_COOLDOWN_MIN_MS + Math.random() * (GLOBAL_COOLDOWN_MAX_MS - GLOBAL_COOLDOWN_MIN_MS);
}

// ── Tier classification ────────────────────────────────────────────────────────
// absent_* always overrides engagement-based tiers.
export function classifyRecognitionTier(profile: RecognitionProfile): RecognitionTier {
  const daysSinceLast = (Date.now() - profile.lastSeen.getTime()) / 86_400_000;
  if (daysSinceLast >= 30) return "absent_30d";
  if (daysSinceLast >= 7)  return "absent_7d";

  const g = profile.totalGifts;
  const c = profile.totalComments;
  if (g >= 10 || c >= 50)                    return "legend";
  if (c >= 30 || (g >= 2 && c >= 10))        return "loyal";
  if (c >= 15 || g >= 2)                     return "regular";
  return "returning";
}

// ── Loyalty tier (mirrors stormPass.ts) ──────────────────────────────────────
export function computeRecognitionLoyaltyTier(profile: RecognitionProfile): LoyaltyTier {
  const { vipLevel, totalGifts, totalComments } = profile;
  if (vipLevel === "vip"     || totalGifts    >= 10) return "legend";
  if (vipLevel === "gifter"  || totalGifts    >=  3) return "gold";
  if (vipLevel === "regular" || totalComments >= 20) return "silver";
  return "bronze";
}

// ── Title hint (mirrors stormPass.ts, no DB query needed) ─────────────────────
function deriveTitleHint(profile: RecognitionProfile): string | null {
  const tags          = (profile.personalityTags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const streak        = profile.streakDays   ?? 0;
  const gifts         = profile.totalGifts   ?? 0;
  const daysSinceFirst = Math.floor((Date.now() - profile.firstSeen.getTime()) / 86_400_000);

  if (streak >= 30)                   return "Eternal Flame 🔥";
  if (gifts  >= 50)                   return "Storm Patron ⚡";
  if (gifts  >= 20)                   return "Diamond Backer 💎";
  if (gifts  >= 10)                   return "Gold Supporter 🥇";
  if (tags.includes("boss_slayer"))   return "Boss Slayer 🐉";
  if (tags.includes("helpful"))       return "Voice of the Chat 🎙️";
  if (tags.includes("gifter"))        return "Gift Master 🎁";
  if (streak >= 7)                    return "The Devoted 🌟";
  if (daysSinceFirst >= 90)           return "OG Viewer 👑";
  return null;
}

// ── Real-reason gate ─────────────────────────────────────────────────────────
// Don't recognize everyone — require meaningful history.
function hasRealReason(tier: RecognitionTier, profile: RecognitionProfile, safeMemoryCount: number): boolean {
  if (tier === "absent_7d" || tier === "absent_30d") return true;
  if (tier === "legend"    || tier === "loyal")      return true;
  if (tier === "regular") {
    return safeMemoryCount > 0 || profile.streakDays >= 3 || profile.totalGifts >= 2;
  }
  // returning: needs at least memories or solid streak
  return safeMemoryCount > 0 || profile.streakDays >= 5;
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(opts: {
  viewerName:     string;
  tier:           RecognitionTier;
  loyaltyTier:    LoyaltyTier;
  titleHint:      string | null;
  profile:        RecognitionProfile;
  safeMemories:   string[];
  daysSinceLast:  number;
  daysSinceFirst: number;
}): string {
  const { viewerName, tier, loyaltyTier, titleHint, profile, safeMemories, daysSinceLast, daysSinceFirst } = opts;

  const contextParts: string[] = [];
  if (tier === "absent_30d") contextParts.push(`was away for ${daysSinceLast} days`);
  else if (tier === "absent_7d") contextParts.push(`was away for ${daysSinceLast} days`);
  else if (tier === "legend") contextParts.push(`legend — been here ${daysSinceFirst}d, ${profile.totalGifts} gifts`);
  else if (tier === "loyal") contextParts.push(`loyal — here ${daysSinceFirst}d`);
  else contextParts.push(`regular`);

  contextParts.push(`loyalty: ${loyaltyTier}`);
  if (profile.streakDays >= 3) contextParts.push(`streak: ${profile.streakDays}d`);
  if (titleHint)               contextParts.push(`title: ${titleHint}`);
  if (safeMemories.length > 0) contextParts.push(`known: ${safeMemories.join("; ")}`);

  const styleGuide =
    tier === "absent_30d" || tier === "absent_7d"
      ? `React like a live host noticing someone they know came back after a long absence. ONE casual sentence — could be warm, teasing, playful. Human, never stiff.`
      : tier === "legend"
      ? `This person is a fixture. React with genuine respect — a brief offhand acknowledgement, could reference something you know about them.`
      : tier === "loyal"
      ? `Familiar face. Casually acknowledge you know them — a nod, nickname use, or brief moment of recognition.`
      : `Briefly notice you recognise them — one short natural moment.`;

  return [
    "=== RECOGNITION MOMENT ===",
    `Viewer: ${viewerName} | ${contextParts.join(" · ")}`,
    "",
    `DIRECTION: ${styleGuide}`,
    `FORBIDDEN: listing stats ("X comments, Y gifts"), naming tier labels, using phrases like "loyal viewer" or "regular viewer", reciting numbers.`,
    safeMemories.length > 0
      ? `If it fits, weave ONE detail naturally into your tone — don't narrate it, just let it inform you.`
      : "",
    "=== END RECOGNITION ===",
  ].filter(Boolean).join("\n");
}

// ── Main entry point ─────────────────────────────────────────────────────────
export function buildRecognitionInjection(opts: {
  sessionId:    number;
  viewerName:   string;
  profile:      RecognitionProfile | null | undefined;
  memories:     Array<{ key: string; value: string }>;
  hasViewerCard: boolean;
  state:        RecognitionState;
}): RecognitionResult {
  const { sessionId, viewerName, profile, memories, state } = opts;

  const notTriggered = (tier: RecognitionTier, skipReason: string): RecognitionResult => ({
    triggered:     false,
    tier,
    loyaltyTier:   profile ? computeRecognitionLoyaltyTier(profile) : "bronze",
    title:         profile ? (deriveTitleHint(profile) ?? "Storm Newcomer") : "Storm Newcomer",
    prompt:        "",
    reason:        "",
    skipReason,
    lastSeenLabel: profile ? formatLastSeen(profile.lastSeen) : "unknown",
    memoriesUsed:  0,
  });

  if (!profile) return notTriggered("first_time", "no_history");

  const tier = classifyRecognitionTier(profile);
  if (tier === "first_time") return notTriggered("first_time", "tier_first_time");

  // ── Per-session cooldown ───────────────────────────────────────────────────
  if (state.recognitionSeenInSession.get(sessionId)?.has(viewerName)) {
    return notTriggered(tier, "already_recognized_this_session");
  }

  // ── Global cooldown (3–5 min) ─────────────────────────────────────────────
  const lastGlobal   = state.lastGlobalRecognitionAt.get(sessionId) ?? 0;
  const cooldownMs   = getGlobalCooldownMs();
  const elapsed      = Date.now() - lastGlobal;
  if (elapsed < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
    return notTriggered(tier, `global_cooldown (${waitSec}s remaining)`);
  }

  // ── Window limit: max 3 recognitions per 30 min ───────────────────────────
  const windowTs = (state.recognitionWindowTimestamps.get(sessionId) ?? [])
    .filter((t) => Date.now() - t < 30 * 60_000);
  if (windowTs.length >= MAX_RECOGNITIONS_PER_30MIN) {
    return notTriggered(tier, `window_limit (${windowTs.length}/${MAX_RECOGNITIONS_PER_30MIN} in last 30min)`);
  }

  // ── Safe memory filter ────────────────────────────────────────────────────
  const safeMemories = memories.filter((m) => isSafeMemory(m.key)).slice(0, 2).map((m) => m.value);

  // ── Real-reason gate ──────────────────────────────────────────────────────
  if (!hasRealReason(tier, profile, safeMemories.length)) {
    return notTriggered(tier, "no_real_reason (insufficient history/memories/streak)");
  }

  const loyaltyTier    = computeRecognitionLoyaltyTier(profile);
  const titleHint      = deriveTitleHint(profile);
  const lastSeenLabel  = formatLastSeen(profile.lastSeen);
  const daysSinceLast  = Math.floor((Date.now() - profile.lastSeen.getTime())  / 86_400_000);
  const daysSinceFirst = Math.floor((Date.now() - profile.firstSeen.getTime()) / 86_400_000);

  const reason =
    tier === "absent_30d" ? `absent ${daysSinceLast}d` :
    tier === "absent_7d"  ? `absent ${daysSinceLast}d` :
    tier === "legend"     ? `legend (${profile.totalComments}c/${profile.totalGifts}g over ${daysSinceFirst}d)` :
    tier === "loyal"      ? `loyal (${daysSinceFirst}d member)` :
    tier === "regular"    ? `regular viewer` :
                            `returning viewer`;

  const prompt = buildPrompt({
    viewerName,
    tier,
    loyaltyTier,
    titleHint,
    profile,
    safeMemories,
    daysSinceLast,
    daysSinceFirst,
  });

  return {
    triggered:    true,
    tier,
    loyaltyTier,
    title:        titleHint ?? "Storm Newcomer",
    prompt,
    reason,
    lastSeenLabel,
    memoriesUsed: safeMemories.length,
  };
}

// ── State mutation helpers ────────────────────────────────────────────────────
export function markRecognitionFired(
  sessionId:  number,
  viewerName: string,
  state:      RecognitionState,
): void {
  if (!state.recognitionSeenInSession.has(sessionId)) {
    state.recognitionSeenInSession.set(sessionId, new Set());
  }
  state.recognitionSeenInSession.get(sessionId)!.add(viewerName);
  state.lastGlobalRecognitionAt.set(sessionId, Date.now());

  const prev = (state.recognitionWindowTimestamps.get(sessionId) ?? [])
    .filter((t) => Date.now() - t < 30 * 60_000);
  prev.push(Date.now());
  state.recognitionWindowTimestamps.set(sessionId, prev);
}

export function clearRecognitionState(sessionId: number, state: RecognitionState): void {
  state.recognitionSeenInSession.delete(sessionId);
  state.lastGlobalRecognitionAt.delete(sessionId);
  state.recognitionWindowTimestamps.delete(sessionId);
}
