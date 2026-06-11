import { db, aiVoiceProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface VoiceProfile {
  voice: OpenAIVoice;
  speed: number;
  volume: number;
  label: string;
  description: string;
}

// Named voice profiles that map to OpenAI voices
const NAMED_PROFILES: Record<string, VoiceProfile> = {
  female:      { voice: "nova",    speed: 1.0,  volume: 1.0, label: "Female",      description: "Warm natural female voice" },
  male:        { voice: "onyx",    speed: 1.0,  volume: 1.0, label: "Male",        description: "Deep authoritative male voice" },
  young:       { voice: "shimmer", speed: 1.1,  volume: 1.0, label: "Young",       description: "Light expressive youthful voice" },
  broadcaster: { voice: "fable",   speed: 0.95, volume: 1.0, label: "Broadcaster", description: "British accent broadcaster voice" },
  gamer:       { voice: "echo",    speed: 1.05, volume: 1.0, label: "Gamer",       description: "Clear direct gamer voice" },
  robot:       { voice: "alloy",   speed: 0.9,  volume: 1.0, label: "Robot",       description: "Neutral balanced robotic voice" },
  // Direct OpenAI voice name pass-throughs
  nova:        { voice: "nova",    speed: 1.0,  volume: 1.0, label: "Nova",        description: "Warm & natural" },
  alloy:       { voice: "alloy",   speed: 1.0,  volume: 1.0, label: "Alloy",       description: "Neutral & balanced" },
  echo:        { voice: "echo",    speed: 1.0,  volume: 1.0, label: "Echo",        description: "Clear & direct" },
  fable:       { voice: "fable",   speed: 1.0,  volume: 1.0, label: "Fable",       description: "British accent" },
  onyx:        { voice: "onyx",    speed: 1.0,  volume: 1.0, label: "Onyx",        description: "Deep & authoritative" },
  shimmer:     { voice: "shimmer", speed: 1.0,  volume: 1.0, label: "Shimmer",     description: "Light & expressive" },
};

// Auto-select voice based on tone/personality
function autoSelectVoice(tone: string, personalityType?: string): OpenAIVoice {
  const key = `${tone}:${personalityType ?? ""}`;
  const map: Record<string, OpenAIVoice> = {
    "hype:battle":       "echo",
    "hype:funny":        "shimmer",
    "hype:":             "nova",
    "savage:":           "onyx",
    "savage:troll":      "onyx",
    "professional:":     "fable",
    "professional:serious": "fable",
    "friendly:":         "nova",
    "friendly:flirty":   "shimmer",
    "friendly:motivator": "nova",
  };
  return map[key] ?? map[`${tone}:`] ?? "nova";
}

export async function resolveVoiceProfile(
  streamerId: number,
  config: { voiceName?: string; voiceSpeed?: number; voiceVolume?: number; tone?: string; personalityType?: string },
): Promise<VoiceProfile> {
  // 1. Check for a custom DB voice profile marked as default
  try {
    const dbProfile = await db.query.aiVoiceProfilesTable.findFirst({
      where: and(eq(aiVoiceProfilesTable.streamerId, streamerId), eq(aiVoiceProfilesTable.isDefault, true)),
    });
    if (dbProfile) {
      const base = NAMED_PROFILES[dbProfile.voiceKey] ?? NAMED_PROFILES.female;
      return {
        ...base,
        voice: (NAMED_PROFILES[dbProfile.voiceKey]?.voice ?? "nova") as OpenAIVoice,
        speed: dbProfile.speed,
        label: dbProfile.profileName,
        description: dbProfile.description ?? base.description,
      };
    }
  } catch {}

  // 2. Fall back to config.voiceName
  const voiceKey = config.voiceName ?? "nova";
  const named = NAMED_PROFILES[voiceKey];
  if (named) {
    return {
      ...named,
      speed: config.voiceSpeed ?? named.speed,
      volume: config.voiceVolume ?? named.volume,
    };
  }

  // 3. Auto-select based on tone + personality
  const autoVoice = autoSelectVoice(config.tone ?? "friendly", config.personalityType);
  return {
    voice: autoVoice,
    speed: config.voiceSpeed ?? 1.0,
    volume: config.voiceVolume ?? 1.0,
    label: "Auto",
    description: "Auto-selected voice",
  };
}

export async function getVoiceProfiles(streamerId: number) {
  try {
    return await db.query.aiVoiceProfilesTable.findMany({
      where: eq(aiVoiceProfilesTable.streamerId, streamerId),
    });
  } catch {
    return [];
  }
}

export async function upsertVoiceProfile(
  streamerId: number,
  data: {
    profileName: string;
    voiceKey: string;
    description?: string;
    speed?: number;
    personalityTag?: string;
    isDefault?: boolean;
  },
) {
  const existing = await db.query.aiVoiceProfilesTable.findFirst({
    where: and(
      eq(aiVoiceProfilesTable.streamerId, streamerId),
      eq(aiVoiceProfilesTable.profileName, data.profileName),
    ),
  });

  if (data.isDefault) {
    await db
      .update(aiVoiceProfilesTable)
      .set({ isDefault: false })
      .where(eq(aiVoiceProfilesTable.streamerId, streamerId));
  }

  if (existing) {
    const [updated] = await db
      .update(aiVoiceProfilesTable)
      .set({ ...data })
      .where(eq(aiVoiceProfilesTable.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(aiVoiceProfilesTable)
      .values({ streamerId, speed: 1.0, isDefault: false, ...data })
      .returning();
    return created;
  }
}

export { NAMED_PROFILES };
