import { db, aiPersonalityModesTable, aiPersonaConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface PersonalityContext {
  modeKey: string;
  modeName: string;
  systemPromptAddon: string;
  toneGuide: string;
  exampleStyle: string;
}

const BUILT_IN_PERSONALITIES: Record<string, Omit<PersonalityContext, "modeName">> = {
  friendly: {
    modeKey: "friendly",
    systemPromptAddon: "You are warm, welcoming, and supportive. You make every viewer feel included and valued. Use friendly language and celebrate small wins.",
    toneGuide: "warm, supportive, inclusive, encouraging",
    exampleStyle: "Welcome! So glad you're here! That's awesome!",
  },
  professional: {
    modeKey: "professional",
    systemPromptAddon: "You are polished, authoritative, and data-driven. Deliver insights concisely. Maintain a business-like but engaging tone.",
    toneGuide: "polished, concise, authoritative, analytical",
    exampleStyle: "Great question. Here's what the data shows... Excellent contribution.",
  },
  funny: {
    modeKey: "funny",
    systemPromptAddon: "You are a natural comedian. Use jokes, puns, witty observations, and playful teasing. Keep it lighthearted and never mean-spirited.",
    toneGuide: "comedic, playful, witty, lighthearted",
    exampleStyle: "Why did the viewer cross the road? To send me a gift, obviously!",
  },
  savage: {
    modeKey: "savage",
    systemPromptAddon: "You are bold, edgy, and unapologetically direct. Use sharp wit and confident comebacks. Never actually mean — always entertaining and self-aware.",
    toneGuide: "bold, edgy, sharp, confident, entertaining",
    exampleStyle: "Oh you really went there? Respect. That's actually impressive.",
  },
  flirty: {
    modeKey: "flirty",
    systemPromptAddon: "You are charming, playful, and slightly flirtatious. Use compliments and banter. Keep it fun and appropriate for all audiences.",
    toneGuide: "charming, playful, banter-y, complimentary",
    exampleStyle: "Oh stop it, you're making me blush! You're too kind.",
  },
  motivational: {
    modeKey: "motivational",
    systemPromptAddon: "You are an intense motivational coach. Inspire viewers to push harder, believe in themselves, and achieve greatness. High energy, uplifting, powerful.",
    toneGuide: "intense, inspiring, uplifting, powerful",
    exampleStyle: "YES! That's what I'm talking about! You've got this! LETS GOOO!",
  },
};

export async function getActivePersonality(streamerId: number): Promise<PersonalityContext> {
  try {
    const active = await db.query.aiPersonalityModesTable.findFirst({
      where: and(
        eq(aiPersonalityModesTable.streamerId, streamerId),
        eq(aiPersonalityModesTable.isActive, true),
      ),
    });

    if (active) {
      const builtin = BUILT_IN_PERSONALITIES[active.modeKey];
      return {
        modeKey: active.modeKey,
        modeName: active.modeName,
        systemPromptAddon: active.systemPromptAddon ?? builtin?.systemPromptAddon ?? "",
        toneGuide: builtin?.toneGuide ?? active.toneOverride ?? "engaging",
        exampleStyle: active.exampleReplies ?? builtin?.exampleStyle ?? "",
      };
    }

    const config = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamerId),
    });

    const fallbackKey = config?.personalityType ?? "friendly";
    const builtin = BUILT_IN_PERSONALITIES[fallbackKey] ?? BUILT_IN_PERSONALITIES.friendly!;
    return {
      ...builtin,
      modeKey: fallbackKey,
      modeName: fallbackKey.charAt(0).toUpperCase() + fallbackKey.slice(1),
    };
  } catch {
    return {
      ...BUILT_IN_PERSONALITIES.friendly!,
      modeKey: "friendly",
      modeName: "Friendly",
    };
  }
}

export async function setActivePersonality(streamerId: number, modeKey: string): Promise<void> {
  await db
    .update(aiPersonalityModesTable)
    .set({ isActive: false })
    .where(eq(aiPersonalityModesTable.streamerId, streamerId));

  const existing = await db.query.aiPersonalityModesTable.findFirst({
    where: and(
      eq(aiPersonalityModesTable.streamerId, streamerId),
      eq(aiPersonalityModesTable.modeKey, modeKey),
    ),
  });

  if (existing) {
    await db
      .update(aiPersonalityModesTable)
      .set({ isActive: true })
      .where(eq(aiPersonalityModesTable.id, existing.id));
  } else {
    const builtin = BUILT_IN_PERSONALITIES[modeKey] ?? BUILT_IN_PERSONALITIES.friendly!;
    await db.insert(aiPersonalityModesTable).values({
      streamerId,
      modeKey,
      modeName: modeKey.charAt(0).toUpperCase() + modeKey.slice(1),
      systemPromptAddon: builtin.systemPromptAddon,
      toneOverride: builtin.toneGuide,
      exampleReplies: builtin.exampleStyle,
      isActive: true,
    });
  }
}

export function buildPersonalityPrompt(personality: PersonalityContext, personaName: string): string {
  return `You are ${personaName}, an AI co-host for a TikTok LIVE stream.
Personality mode: ${personality.modeName} — ${personality.toneGuide}.
${personality.systemPromptAddon}
Keep responses SHORT (1-2 sentences max). Be natural and engaging.`;
}

export { BUILT_IN_PERSONALITIES };
