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

// Map short language codes → full English names the LLM understands
const LANGUAGE_NAMES: Record<string, string> = {
  "auto": "auto",
  "uk":   "Ukrainian",
  "en":   "English",
  "pl":   "Polish",
  "de":   "German",
  "ru":   "Russian",
  "fr":   "French",
  "es":   "Spanish",
  "pt":   "Portuguese",
  "it":   "Italian",
  "nl":   "Dutch",
  "tr":   "Turkish",
  "cs":   "Czech",
  "ro":   "Romanian",
  "sv":   "Swedish",
  "ar":   "Arabic",
  "ja":   "Japanese",
  "ko":   "Korean",
  "zh":   "Chinese",
  "hi":   "Hindi",
};

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
  defaultLanguage?: string;
  conversationHistory?: string;
  emotionState?: EmotionalState;
  behaviorCtx?: string;
}): Promise<HostAgentResult | null> {
  const { event, personaName, personality, memoryContext, replyLanguage, defaultLanguage, conversationHistory, emotionState, behaviorCtx } = opts;
  const viewerName = event.username ?? "someone";

  let userPrompt = "";
  let emotion: HostAgentResult["emotion"] = "neutral";

  switch (event.type) {
    case "gift": {
      const coins    = (event.data.coins as number) ?? 0;
      const giftName = (event.data.giftName as string) ?? "a gift";
      // Tier label gives the LLM a clear signal about the emotional weight of the gift
      const giftTier =
        coins >= 1000 ? "LEGENDARY gift — absolutely insane" :
        coins >= 500  ? "MASSIVE gift — wow" :
        coins >= 100  ? "generous gift — that's real support" :
        coins >= 20   ? "nice gift" : "";
      userPrompt = coins > 0
        ? `${viewerName} just sent ${giftName} — ${coins} coins.${giftTier ? ` [${giftTier}]` : ""}`
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
      userPrompt = `${viewerName} just followed. [React with genuine energy — a new member of the community just showed up]`;
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
      userPrompt = `${viewerName} just shared the stream with their friends. [That grows the community — acknowledge it]`;
      emotion    = "hype";
      break;
    }

    case "like": {
      const milestone = (event.data.milestone as number) ?? (event.data.likeCount as number) ?? 100;
      const likeEnergy =
        milestone >= 10000 ? "MASSIVE milestone — celebrate it" :
        milestone >= 1000  ? "big milestone" :
        milestone >= 500   ? "solid milestone" : "milestone";
      userPrompt = `The stream just hit ${milestone} total likes. [${likeEnergy}]`;
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
  const coins       = event.type === "gift" ? ((event.data.coins as number) ?? 0) : 0;
  const baseTokens  =
    event.type === "silence_filler"         ? 72 :
    event.type === "follow"                 ? 52 :
    event.type === "share"                  ? 56 :
    event.type === "like"                   ? 52 :
    (event.type === "gift" && coins >= 500) ? 90 :
    (event.type === "gift" && coins >= 100) ? 78 :
    event.type === "gift"                   ? 68 :
    isCrowdText                             ? 84 :
    commentLen > 60                         ? 96 :
    commentLen > 30                         ? 76 :
                                              68;
  const jitter    = Math.random() < 0.18 ? -Math.floor(Math.random() * 18 + 6) : 0;
  const maxTokens = Math.max(28, baseTokens + jitter);

  // ── Temperature — rises with emotional intensity; high for expressive events ──
  const emotionIntensity = emotionState?.intensity ?? 5;
  const temperature =
    emotionIntensity >= 8                ? 0.96 :
    emotionIntensity >= 6                ? 0.92 :
    event.type === "silence_filler"      ? 0.95 :
    (event.type === "gift" && coins >= 100) ? 0.92 :
    event.type === "gift"                ? 0.88 :
    event.type === "follow"              ? 0.88 :
                                           0.85;

  // Build system prompt with full personality × emotion direction
  const systemPrompt = buildPersonalityPrompt(personality, personaName, emotionState);

  const emotionSection = emotionState ? getEmotionPromptContext(emotionState) : "";
  const memorySection  = memoryContext ? `\nMemory context:\n${memoryContext}` : "";

  // ── Language instruction — map short codes to full names the LLM understands ─
  const fallbackLangName = LANGUAGE_NAMES[defaultLanguage ?? "uk"] ?? "Ukrainian";
  const replyLangName    = LANGUAGE_NAMES[replyLanguage] ?? replyLanguage;

  // Auto mode: strong, explicit, non-negotiable language matching.
  // Single-line soft hints get ignored; a rule table with examples does not.
  const langInstruction = replyLanguage === "auto"
    ? `LANGUAGE RULE (NON-NEGOTIABLE — follow this exactly):
- Viewer wrote Cyrillic (е, х, к, д, з…) → they are likely writing in ${fallbackLangName}. Reply in ${fallbackLangName}.
- Viewer wrote Polish diacritics (ą, ę, ó, ś…) → reply in Polish.
- Viewer wrote English → reply in English.
- Viewer wrote German diacritics (ä, ö, ü) → reply in German.
- Default/unclear → reply in ${fallbackLangName}.
DO NOT reply in English unless the viewer clearly wrote in English.
DO NOT change languages mid-reply.`
    : `LANGUAGE RULE (NON-NEGOTIABLE): Always reply in ${replyLangName}. Never switch to another language, even if the viewer writes in a different language.`;

  console.log(`[HostAgent:lang] replyLang="${replyLanguage}"→"${replyLangName}" | fallback="${fallbackLangName}" | event=${event.type}`);

  // Structural variety guard — prevents templated 3-part response patterns
  const varietyInstruction = "VARIETY: Change your response structure each time — sometimes just react, sometimes ask a question, sometimes make a quick observation. Never open the same way twice in a row.";

  // ── Prompt assembly — emotion section LAST before variety for maximum LLM attention ──
  const fullSystem = [
    systemPrompt,
    behaviorCtx || "",
    memorySection,
    langInstruction,
    emotionSection,    // near the end = highest attention weight from the model
    varietyInstruction,
  ].filter(Boolean).join("\n");

  console.log(`[HostAgent:params] event=${event.type} | emotion=${emotionState?.primary ?? "none"}(${emotionIntensity}) | maxTokens=${maxTokens} | temp=${temperature}`);

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
