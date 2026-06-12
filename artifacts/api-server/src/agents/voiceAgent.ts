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

// Maps named profiles (calm_male, warm_female etc.) to their underlying OpenAI voice + speed
const NAMED_PROFILE_MAP: Record<string, { voice: string; speed: number; description: string }> = {
  calm_male:        { voice: "alloy",   speed: 0.9,  description: "Calm Male Host — balanced & composed" },
  deep_male:        { voice: "onyx",    speed: 0.85, description: "Deep Broadcaster — powerful & authoritative" },
  energetic_male:   { voice: "echo",    speed: 1.1,  description: "Energetic Streamer — fast-paced & direct" },
  funny_male:       { voice: "fable",   speed: 1.05, description: "Funny Commentator — expressive & playful" },
  warm_female:      { voice: "nova",    speed: 0.95, description: "Warm Female Host — natural & inviting" },
  confident_female: { voice: "shimmer", speed: 1.0,  description: "Confident Streamer — bold & expressive" },
  soft_female:      { voice: "nova",    speed: 0.85, description: "Soft Assistant — gentle & clear" },
  energetic_female: { voice: "shimmer", speed: 1.1,  description: "Energetic Creator — upbeat & vibrant" },
  playful:          { voice: "shimmer", speed: 1.2,  description: "Playful & Youthful — light & bouncy" },
  robot:            { voice: "alloy",   speed: 0.8,  description: "Robot Voice — flat & synthetic" },
  news:             { voice: "fable",   speed: 0.9,  description: "News Presenter — formal & clear" },
  caster:           { voice: "echo",    speed: 1.15, description: "Gaming Caster — fast & energetic" },
};

export async function getActiveVoice(streamerId: number, _personalityKey?: string): Promise<VoiceConfig> {
  try {
    // 1. Check for explicitly saved default DB profile
    const defaultProfile = await db.query.aiVoiceProfilesTable.findFirst({
      where: and(
        eq(aiVoiceProfilesTable.streamerId, streamerId),
        eq(aiVoiceProfilesTable.isDefault, true),
      ),
    });

    if (defaultProfile) {
      const resolved = NAMED_PROFILE_MAP[defaultProfile.voiceKey];
      if (resolved) {
        return { voiceKey: resolved.voice, speed: defaultProfile.speed, description: resolved.description };
      }
      return {
        voiceKey: defaultProfile.voiceKey,
        speed: defaultProfile.speed,
        description: defaultProfile.description ?? "",
      };
    }

    // 2. Always respect the user's explicit voiceName selection from persona config
    const config = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamerId),
    });

    const voiceKey = config?.voiceName ?? "nova";
    const speed    = config?.voiceSpeed ?? 1.0;

    // 3. Resolve named profile → underlying OpenAI voice
    const named = NAMED_PROFILE_MAP[voiceKey];
    if (named) {
      return { voiceKey: named.voice, speed, description: named.description };
    }

    // 4. Direct OpenAI voice in catalog
    const cat = VOICE_CATALOG[voiceKey] ?? VOICE_CATALOG.nova!;
    return { voiceKey: cat.voiceKey, speed, description: cat.description };

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
