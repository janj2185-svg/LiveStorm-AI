import { db, aiVoiceProfilesTable, aiPersonaConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface VoiceConfig {
  voiceKey: string;
  speed: number;
  description: string;
}

export const VOICE_CATALOG: Record<string, VoiceConfig & { label: string }> = {
  alloy:   { voiceKey: "alloy",   speed: 1.0, description: "Neutral, balanced — works for any style",            label: "Alloy (Neutral)" },
  echo:    { voiceKey: "echo",    speed: 1.0, description: "Deep male broadcaster voice",                         label: "Echo (Male Broadcaster)" },
  fable:   { voiceKey: "fable",   speed: 1.05, description: "British-accented storytelling voice",               label: "Fable (British)" },
  onyx:    { voiceKey: "onyx",    speed: 0.95, description: "Deep authoritative male voice",                      label: "Onyx (Deep Male)" },
  nova:    { voiceKey: "nova",    speed: 1.1,  description: "Young, energetic female — great for streams",        label: "Nova (Energetic Female)" },
  shimmer: { voiceKey: "shimmer", speed: 1.0,  description: "Warm, expressive female voice",                     label: "Shimmer (Warm Female)" },
};

const PERSONALITY_VOICE_MAP: Record<string, string> = {
  friendly:     "nova",
  professional: "onyx",
  funny:        "fable",
  savage:       "echo",
  flirty:       "shimmer",
  motivational: "onyx",
};

export async function getActiveVoice(streamerId: number, personalityKey?: string): Promise<VoiceConfig> {
  try {
    const defaultProfile = await db.query.aiVoiceProfilesTable.findFirst({
      where: and(
        eq(aiVoiceProfilesTable.streamerId, streamerId),
        eq(aiVoiceProfilesTable.isDefault, true),
      ),
    });

    if (defaultProfile) {
      return {
        voiceKey: defaultProfile.voiceKey,
        speed: defaultProfile.speed,
        description: defaultProfile.description ?? "",
      };
    }

    if (personalityKey) {
      const mapped = PERSONALITY_VOICE_MAP[personalityKey];
      if (mapped && VOICE_CATALOG[mapped]) {
        const cat = VOICE_CATALOG[mapped]!;
        return { voiceKey: cat.voiceKey, speed: cat.speed, description: cat.description };
      }
    }

    const config = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamerId),
    });

    const vk = config?.voiceName ?? "nova";
    const cat = VOICE_CATALOG[vk] ?? VOICE_CATALOG.nova!;
    return { voiceKey: vk, speed: config?.voiceSpeed ?? cat.speed, description: cat.description };
  } catch {
    return { voiceKey: "nova", speed: 1.0, description: "Default" };
  }
}

export async function setDefaultVoice(streamerId: number, voiceKey: string, speed: number = 1.0): Promise<void> {
  await db
    .update(aiVoiceProfilesTable)
    .set({ isDefault: false })
    .where(eq(aiVoiceProfilesTable.streamerId, streamerId));

  const existing = await db.query.aiVoiceProfilesTable.findFirst({
    where: and(
      eq(aiVoiceProfilesTable.streamerId, streamerId),
      eq(aiVoiceProfilesTable.voiceKey, voiceKey),
    ),
  });

  const cat = VOICE_CATALOG[voiceKey] ?? VOICE_CATALOG.nova!;

  if (existing) {
    await db
      .update(aiVoiceProfilesTable)
      .set({ isDefault: true, speed })
      .where(eq(aiVoiceProfilesTable.id, existing.id));
  } else {
    await db.insert(aiVoiceProfilesTable).values({
      streamerId,
      profileName: cat.label,
      voiceKey,
      description: cat.description,
      speed,
      isDefault: true,
    });
  }
}

export async function listVoiceProfiles(streamerId: number) {
  const saved = await db.query.aiVoiceProfilesTable.findMany({
    where: eq(aiVoiceProfilesTable.streamerId, streamerId),
    orderBy: (t, { desc }) => [desc(t.isDefault)],
  });
  return saved;
}
