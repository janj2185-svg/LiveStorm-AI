import OpenAI from "openai";
import type { TikTokEvent } from "../lib/tiktokSimulator";
import type { PersonalityContext } from "./personalityAgent";
import { buildPersonalityPrompt } from "./personalityAgent";
import { storeMemory } from "./memoryAgent";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export interface HostAgentResult {
  text: string;
  emotion: "neutral" | "excited" | "grateful" | "funny" | "hype";
}

export async function runHostAgent(opts: {
  event: TikTokEvent;
  streamerId: number;
  personaName: string;
  personality: PersonalityContext;
  memoryContext: string;
  replyLanguage: string;
  conversationHistory?: string;
}): Promise<HostAgentResult | null> {
  const { event, personaName, personality, memoryContext, replyLanguage, conversationHistory } = opts;
  const viewerName = event.username ?? "someone";

  let userPrompt = "";
  let emotion: HostAgentResult["emotion"] = "neutral";

  switch (event.type) {
    case "gift": {
      const coins = (event.data.coins as number) ?? 0;
      const giftName = (event.data.giftName as string) ?? "a gift";
      userPrompt = `${viewerName} just sent a ${giftName} worth ${coins} coins! React with genuine excitement and thank them specifically.`;
      emotion = "grateful";
      await storeMemory({
        streamerId: opts.streamerId,
        memoryType: "viewer",
        key: `${viewerName}_last_gift`,
        value: `${viewerName} sent ${giftName} (${coins} coins)`,
        viewerName,
        importance: 4,
      });
      break;
    }
    case "follow": {
      userPrompt = `${viewerName} just followed the stream! Welcome them warmly and encourage them to stay.`;
      emotion = "excited";
      break;
    }
    case "comment": {
      const comment = (event.data.text as string) ?? "";
      userPrompt = `${viewerName} says: "${comment}"${conversationHistory ? `\n\nRecent conversation:\n${conversationHistory}` : ""}`;
      emotion = "neutral";
      break;
    }
    case "share": {
      userPrompt = `${viewerName} just shared the stream! Thank them and hype up the moment.`;
      emotion = "hype";
      break;
    }
    case "like": {
      const count = (event.data.likeCount as number) ?? 1;
      userPrompt = `${viewerName} sent ${count} likes! Acknowledge the love.`;
      emotion = "excited";
      break;
    }
    default:
      return null;
  }

  const systemPrompt = buildPersonalityPrompt(personality, personaName);
  const memorySection = memoryContext ? `\nMemory context:\n${memoryContext}` : "";
  const langInstruction = replyLanguage === "auto"
    ? "Respond in the SAME language the viewer used. Detect it carefully. Only fall back to Ukrainian if the language is completely unclear."
    : `Always respond in ${replyLanguage}.`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 80,
      messages: [
        { role: "system", content: `${systemPrompt}${memorySection}\n${langInstruction}` },
        { role: "user", content: userPrompt },
      ],
    });

    const text = resp.choices[0]?.message?.content?.trim() ?? "";
    if (!text) return null;

    return { text, emotion };
  } catch (err: unknown) {
    console.error("[HostAgent] error:", (err as Error)?.message);
    return null;
  }
}

export async function generateWelcomeMessage(opts: {
  personaName: string;
  personality: PersonalityContext;
  streamTitle?: string;
}): Promise<string> {
  const systemPrompt = buildPersonalityPrompt(opts.personality, opts.personaName);
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a short welcome message to kick off the stream${opts.streamTitle ? ` titled "${opts.streamTitle}"` : ""}. Keep it under 20 words.`,
        },
      ],
    });
    return resp.choices[0]?.message?.content?.trim() ?? "Welcome to the stream! Let's go!";
  } catch {
    return "Welcome to the stream! Let's go!";
  }
}
