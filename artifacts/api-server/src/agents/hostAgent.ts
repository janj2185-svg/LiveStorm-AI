import OpenAI from "openai";
import type { TikTokEvent } from "../lib/tiktokSimulator";
import type { PersonalityContext } from "./personalityAgent";
import { buildPersonalityPrompt } from "./personalityAgent";
import { storeMemory } from "./memoryAgent";
import type { EmotionalState } from "./emotionEngine";
import { getEmotionPromptContext } from "./emotionEngine";

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
  emotionState?: EmotionalState;
  behaviorCtx?: string;
}): Promise<HostAgentResult | null> {
  const { event, personaName, personality, memoryContext, replyLanguage, conversationHistory, emotionState, behaviorCtx } = opts;
  const viewerName = event.username ?? "someone";

  let userPrompt = "";
  let emotion: HostAgentResult["emotion"] = "neutral";

  switch (event.type) {
    case "gift": {
      const coins    = (event.data.coins as number) ?? 0;
      const giftName = (event.data.giftName as string) ?? "a gift";
      userPrompt = coins > 0
        ? `${viewerName} just sent ${giftName} — ${coins} coins.`
        : `${viewerName} just sent ${giftName}.`;
      emotion = "grateful";
      await storeMemory({
        streamerId: opts.streamerId,
        memoryType: "viewer",
        key:        `${viewerName}_last_gift`,
        value:      `${viewerName} sent ${giftName} (${coins} coins)`,
        viewerName,
        importance: 4,
      });
      break;
    }

    case "follow": {
      userPrompt = `${viewerName} just followed.`;
      emotion    = "excited";
      break;
    }

    case "comment": {
      const comment = (event.data.text as string) ?? "";
      userPrompt    = `${viewerName}: "${comment}"`;
      emotion       = "neutral";
      break;
    }

    case "share": {
      userPrompt = `${viewerName} just shared the stream.`;
      emotion    = "hype";
      break;
    }

    case "like": {
      const milestone = (event.data.milestone as number) ?? (event.data.likeCount as number) ?? 100;
      userPrompt = `The stream just hit ${milestone} total likes.`;
      emotion    = "excited";
      break;
    }

    case "silence_filler": {
      const isExtended = (event.data.silenceDuration as string) === "extended";
      userPrompt = isExtended
        ? "Chat has been quiet for a while. Think out loud — share something genuine you've been noticing, a question you're actually curious about, or a passing thought."
        : "A quiet moment in the stream. Say something natural and present — a brief thought, a check-in, or a passing observation. Keep it short.";
      emotion = "neutral";
      break;
    }

    default:
      return null;
  }

  // Append conversation context to ALL event types when available.
  // A gift arriving mid-conversation, or a follow from someone who was just chatting,
  // should reference the thread — real hosts always acknowledge things in context.
  if (conversationHistory) {
    const contextLabel = event.type === "comment"
      ? "\n\nRecent conversation:"
      : "\n\nStream was just talking about:";
    userPrompt += `${contextLabel}\n${conversationHistory}`;
  }

  // ── Token budget — vary by event so responses feel naturally sized ────────────
  // Short events (follows, likes) get brief reactions.
  // Long personal comments get space to match depth.
  // 18% chance of a shorter-than-normal response — real people sometimes just react.
  const commentLen  = event.type === "comment" ? ((event.data.text as string) ?? "").length : 0;
  const isCrowdText = event.type === "comment" && ((event.data.text as string) ?? "").startsWith("A lot of");
  const baseTokens  =
    event.type === "silence_filler" ? 58 :
    event.type === "follow"         ? 38 :
    event.type === "share"          ? 46 :
    event.type === "like"           ? 44 :
    event.type === "gift"           ? 60 :
    isCrowdText                     ? 76 :
    commentLen > 60                 ? 88 :
    commentLen > 30                 ? 68 :
                                      60;
  const jitter    = Math.random() < 0.18 ? -Math.floor(Math.random() * 18 + 6) : 0;
  const maxTokens = Math.max(22, baseTokens + jitter);

  // ── Temperature — slightly higher for hype/emotional peaks ───────────────────
  const temperature =
    (emotionState?.intensity ?? 5) >= 8 ? 0.92 :
    event.type === "silence_filler"      ? 0.95 :
    event.type === "gift"                ? 0.85 :
                                           0.80;

  // Build system prompt with full personality × emotion direction
  const systemPrompt = buildPersonalityPrompt(personality, personaName, emotionState);

  const emotionSection  = emotionState ? getEmotionPromptContext(emotionState) : "";
  const memorySection   = memoryContext ? `\nMemory context:\n${memoryContext}` : "";
  const langInstruction = replyLanguage === "auto"
    ? "Respond in the SAME language the viewer used. Detect it carefully. Only fall back to Ukrainian if the language is completely unclear."
    : `Always respond in ${replyLanguage}.`;

  // Structural variety guard — prevents templated 3-part response patterns
  const varietyInstruction = "VARIETY: Change your response structure each time — sometimes just react, sometimes ask a question, sometimes make a quick observation. Never open the same way twice in a row.";

  const fullSystem = [
    systemPrompt,
    emotionSection,
    behaviorCtx || "",
    memorySection,
    langInstruction,
    varietyInstruction,
  ].filter(Boolean).join("\n");

  try {
    const resp = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      max_tokens:  maxTokens,
      temperature,
      messages:    [
        { role: "system", content: fullSystem },
        { role: "user",   content: userPrompt },
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
  emotionState?: EmotionalState;
}): Promise<string> {
  const systemPrompt = buildPersonalityPrompt(opts.personality, opts.personaName, opts.emotionState);
  try {
    const resp = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 60,
      messages:   [
        { role: "system", content: systemPrompt },
        {
          role:    "user",
          content: `Generate a short welcome message to kick off the stream${opts.streamTitle ? ` titled "${opts.streamTitle}"` : ""}. Keep it under 20 words.`,
        },
      ],
    });
    return resp.choices[0]?.message?.content?.trim() ?? "Welcome to the stream! Let's go!";
  } catch {
    return "Welcome to the stream! Let's go!";
  }
}
