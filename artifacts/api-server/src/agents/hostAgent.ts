import OpenAI from "openai";
import type { TikTokEvent } from "../lib/tiktokSimulator";
import type { PersonalityContext } from "./personalityAgent";
import { buildPersonalityPrompt, getPersonalitySilenceTopics } from "./personalityAgent";
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
  skipAntiRepetition?: boolean; // true for short-circuit intents (greetings, thanks, laughs)
}

// ─── Streamer speech intent classifier ──────────────────────────────────────
// Identifies WHAT the streamer is communicating so Storm responds appropriately
// instead of treating every utterance as a topic to expand or question.
type StreamerIntent = "greeting" | "farewell" | "thanks" | "laugh" | "exclamation" | "affirmation" | "casual" | "question" | "statement";

function classifyStreamerIntent(text: string): { intent: StreamerIntent; shortCircuit: boolean } {
  const t = text.trim().toLowerCase();
  const wc = t.split(/\s+/).filter(Boolean).length;

  if (/^(привіт|вітаю|хай|йо|hey|hello|hi\b|добрий|добридень|доброго|доброї|good morning|good evening|good night|guten tag|hola|bonjour|cześć|ahoj|salut|ciao)\b/i.test(t))
    return { intent: "greeting", shortCircuit: true };

  if (/^(до побачення|бувай|пока|па-па|па\b|bye|goodbye|see you|later|ciao|auf wiedersehen|tschüss|do widzenia|na shledanou|tchau)\b/i.test(t))
    return { intent: "farewell", shortCircuit: true };

  if (wc <= 6 && /\b(дякую|дяк|спасибо|спасиб|thanks|thank you|merci|gracias|danke|dziękuj)\b/i.test(t))
    return { intent: "thanks", shortCircuit: true };

  if (/\b(ха-ха|хаха|хех|хіхі|лол|lol|haha|hehe|ахаха|ахах)\b/i.test(t) || (wc <= 5 && /\b(жарт|прикол|смішн|funny|joke)\b/i.test(t)))
    return { intent: "laugh", shortCircuit: true };

  if (wc <= 4 && /^(вау|ого|боже|оце так|ну і|та ну|нічого собі|wow|omg|whoa|oh my|no way|seriously)\b/i.test(t))
    return { intent: "exclamation", shortCircuit: true };

  if (wc <= 3 && /^(так|точно|ага|угу|звісно|звичайно|авжеж|yes|yep|yeah|sure|right|exactly|ok|okay|ок)\b/i.test(t))
    return { intent: "affirmation", shortCircuit: true };

  if (wc <= 3 && !t.includes("?"))
    return { intent: "casual", shortCircuit: true };

  if (t.endsWith("?") || /^(як |що |хто |чому |коли |де |чи |навіщо |скільки |what |who |why |when |where |how |do you|can you|will you|is it|are you)\b/i.test(t))
    return { intent: "question", shortCircuit: false };

  return { intent: "statement", shortCircuit: false };
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
  recentReplies?: string[];
  personaGender?: string;
  forceAlternative?: boolean;
  intensityMode?: string;
}): Promise<HostAgentResult | null> {
  const { event, personaName, personality, memoryContext, replyLanguage, defaultLanguage, conversationHistory, emotionState, behaviorCtx, recentReplies, personaGender, forceAlternative, intensityMode } = opts;
  const viewerName = event.username ?? "someone";

  let userPrompt = "";
  let emotion: HostAgentResult["emotion"] = "neutral";
  // Streamer speech intent — set inside case "streamer_speech", used for token budget + anti-repeat skip
  let ssIntent: StreamerIntent = "statement";
  let ssShortCircuit = false;

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
      // Hint: addressing viewer by name adds warmth; ask back when it feels right
      const nameHint = viewerName && viewerName !== "someone"
        ? ` [Feel free to address ${viewerName} by name naturally — makes it personal. If the comment invites it, ask them something back.]`
        : "";
      userPrompt = `${viewerName}: "${comment}"${nameHint}`;
      emotion    = "neutral";
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
      // Use personality-specific topics for more character-driven silence fillers
      const personalityTopics = getPersonalitySilenceTopics(personality.modeKey, isExtended);
      const randomTopic = personalityTopics[Math.floor(Math.random() * personalityTopics.length)]
        ?? (isExtended ? "Share a genuine hot take — the more specific, the better." : "Drop a quick question for chat.");
      userPrompt = isExtended
        ? `Chat has been quiet for a while. Stay in character and do this: ${randomTopic}`
        : `Quiet moment in the stream. Stay in character and do this: ${randomTopic}`;
      emotion = "neutral";
      break;
    }

    case "streamer_speech": {
      const transcript = (event.data.text as string) ?? "";
      ({ intent: ssIntent, shortCircuit: ssShortCircuit } = classifyStreamerIntent(transcript));

      // Energy-palette hints — inspire the tone, never copy literally
      const flavorMap: Partial<Record<StreamerIntent, string[]>> = {
        greeting:    ["Йо!", "О, привіт!", "Хай!", "А, вітаю!", "Hey!"],
        farewell:    ["Бувай!", "До зустрічі!", "Давай!", "Take care!"],
        thanks:      ["Та будь ласка.", "Та не питання.", "Звичайно.", "No worries."],
        laugh:       ["Не можу 😂", "Ну ти й дав.", "Ха, справді.", "Okay I'm done 😂"],
        exclamation: ["Ого!", "Серйозно?!", "Та ну!", "Нічого собі!"],
        affirmation: ["Прям так.", "Ось саме.", "Хм, є в цьому щось.", "Agreed."],
      };
      const flavorArr = flavorMap[ssIntent] ?? [];
      const flavorNote = flavorArr.length
        ? ` [React with THIS energy — flavor inspiration, not literally: ${flavorArr.join(" / ")}]`
        : "";
      const noQ = `⛔ DO NOT end your response with a question — just react naturally.`;

      const intentPrompts: Record<StreamerIntent, string> = {
        greeting:    `The streamer just greeted you — "${transcript}"\nGreet them back naturally and warmly. ONE short sentence max. Be genuine.${flavorNote}\n${noQ}`,
        farewell:    `The streamer said goodbye — "${transcript}"\nWarm natural farewell. ONE sentence.${flavorNote}\n${noQ}`,
        thanks:      `The streamer said thanks — "${transcript}"\nAcknowledge it naturally. 1 sentence. Keep it real, not formal.${flavorNote}\n${noQ}`,
        laugh:       `The streamer laughed or joked — "${transcript}"\nReact to the humor. Short and genuine.${flavorNote}\n${noQ}`,
        exclamation: `The streamer reacted with surprise — "${transcript}"\nMatch their energy with a short natural reaction. 1 sentence.${flavorNote}\n${noQ}`,
        affirmation: `The streamer agreed with something — "${transcript}"\nReact naturally. 1 sentence. Add your own micro-take.${flavorNote}\n${noQ}`,
        casual:      `The streamer said something casual — "${transcript}"\nReact naturally, briefly. 1 sentence. ${noQ}`,
        question:    `The streamer asked — "${transcript}"\nAnswer as their co-host. Give your real take. 1-2 sentences. You MAY ask ONE follow-up if it genuinely continues the conversation.`,
        statement:   `[CO-HOST MODE]: The streamer just said — "${transcript}"\nAs their co-host, react naturally. Pick up their thought, add your own angle, or hype the moment. 1-2 sentences. Only ask a question back if it genuinely advances the conversation.${flavorNote}`,
      };

      console.log(`[HostAgent:intent] streamer_speech | intent=${ssIntent} | shortCircuit=${ssShortCircuit} | "${transcript.slice(0, 50)}"`);

      userPrompt = intentPrompts[ssIntent];
      emotion = (ssIntent === "greeting" || ssIntent === "exclamation") ? "excited"
        : ssIntent === "laugh" ? "funny"
        : (ssIntent === "thanks" || ssIntent === "farewell") ? "grateful"
        : "neutral";

      // Store significant streamer statements for memory context
      if (transcript.length > 15 && ssIntent === "statement") {
        void storeMemory({
          streamerId: opts.streamerId,
          memoryType: "stream",
          key:        `streamer_said_${Date.now()}`,
          value:      transcript,
          importance: 3,
        });
      }
      break;
    }

    default:
      return null;
  }

  // Append conversation context — but skip for short-circuit streamer intents
  // (greetings, thanks, laughs don't need history; it adds noise and latency).
  if (conversationHistory && !ssShortCircuit) {
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
    event.type === "streamer_speech"        ? (ssShortCircuit ? 32 : 84) :
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
  const systemPrompt = buildPersonalityPrompt(personality, personaName, emotionState, intensityMode as any);

  const emotionSection = emotionState ? getEmotionPromptContext(emotionState) : "";
  const memorySection  = memoryContext ? `\nMemory context:\n${memoryContext}` : "";

  // ── Gender-aware self-reference instruction ──────────────────────────────────
  let genderSection = "";
  if (personaGender === "male") {
    genderSection = `PERSONA GENDER — ${personaName} is MALE. Use masculine grammatical forms when referring to yourself in Slavic languages.
Ukrainian: "Я радий", "Я готовий", "Я подумав", "Я сказав би", "Я впевнений"
Polish: "Jestem gotowy", "Powiedziałbym", "Jestem pewny", "Cieszę się"
Russian: "Я рад", "Я готов", "Я сказал бы", "Я уверен"
In English/other languages — use he/him framing naturally if relevant.`;
  } else if (personaGender === "female") {
    genderSection = `PERSONA GENDER — ${personaName} is FEMALE. Use feminine grammatical forms when referring to yourself in Slavic languages.
Ukrainian: "Я рада", "Я готова", "Я подумала", "Я сказала б", "Я впевнена"
Polish: "Jestem gotowa", "Powiedziałabym", "Jestem pewna", "Cieszę się"
Russian: "Я рада", "Я готова", "Я сказала бы", "Я уверена"
In English/other languages — use she/her framing naturally if relevant.`;
  }

  // ── Anti-repetition instruction ───────────────────────────────────────────────
  let antiRepeatSection = "";
  if (recentReplies && recentReplies.length > 0) {
    const forbiddenOpeners = recentReplies
      .map((r) => r.trim().split(/\s+/).slice(0, 3).join(" "))
      .filter(Boolean);
    const uniqueOpeners = [...new Set(forbiddenOpeners)];
    antiRepeatSection = `ANTI-REPETITION (mandatory):
• Do NOT start with any of these openers: ${uniqueOpeners.map((o) => `"${o}"`).join(", ")}
• Do NOT reuse the same sentence structure or reaction pattern as recent replies
• Recent replies to avoid repeating: ${recentReplies.slice(-3).map((r) => `"${r.slice(0, 45)}"`).join(" | ")}
• Change your energy, angle, or approach completely — vary between: asking a question, short reaction, playful tease, sharp observation, warm comment, unexpected aside`;
  }
  if (forceAlternative) {
    antiRepeatSection = `REGENERATION — your previous reply was rejected for repetition. MANDATORY requirements:
• Start with a completely different first word than anything you used recently
• Use a totally different sentence structure (e.g. if last was exclamation, now use a question or statement)
• ${antiRepeatSection}`;
  }

  // ── Language instruction — event-type-aware language contract ───────────────
  //
  // The stream has a PRIMARY LANGUAGE (streamer's language = defaultLanguage).
  // Language rules:
  //   comment      → reply in the VIEWER'S language (detect from their text)
  //   follow/gift/ → reply in the STREAMER'S language (addressing the whole stream)
  //   share/like/
  //   silence_filler
  //
  const streamerLangName = LANGUAGE_NAMES[defaultLanguage ?? "uk"] ?? "Ukrainian";
  const replyLangName    = LANGUAGE_NAMES[replyLanguage] ?? replyLanguage;
  const isCommentEvent   = event.type === "comment";

  let langInstruction: string;

  if (replyLanguage !== "auto") {
    // Fixed language: streamer locked Storm to one specific language for everything
    langInstruction = `LANGUAGE RULE (NON-NEGOTIABLE): Always reply in ${replyLangName}. Never switch to another language.`;

  } else if (event.type === "streamer_speech") {
    // Streamer spoke via microphone — reply in the language they were speaking
    const spokenLangCode = ((event.data.lang as string) ?? defaultLanguage ?? "uk").split("-")[0];
    const spokenLangName = LANGUAGE_NAMES[spokenLangCode ?? "uk"] ?? streamerLangName;
    langInstruction = `LANGUAGE RULE (NON-NEGOTIABLE — the STREAMER just spoke in ${spokenLangName}, reply in ${spokenLangName}):
Always reply in ${spokenLangName}. Match the streamer's language exactly.
⛔ Never switch to another language.`;

  } else if (isCommentEvent) {
    // Viewer's comment → detect their language and reply in IT
    // Cyrillic without Ukrainian markers defaults to the stream's primary language
    langInstruction = `LANGUAGE RULE (NON-NEGOTIABLE — replying to a VIEWER comment, use THEIR language):
• Viewer used Ukrainian letters (і, ї, є, ґ) or words (привіт, дякую, що, як, хто) → reply in Ukrainian
• Viewer used Cyrillic but no clear Ukrainian markers → reply in ${streamerLangName} (stream's primary language)
• Viewer used Polish diacritics (ą, ę, ó, ś, ź, ż, ć, ł, ń) → reply in Polish
• Viewer used English (Latin alphabet, no special diacritics) → reply in English
• Viewer used German diacritics (ä, ö, ü, ß) → reply in German
• Unclear or no text → reply in ${streamerLangName}
⛔ DO NOT default to English unless the viewer clearly wrote in English.
⛔ DO NOT switch languages mid-reply.`;

  } else {
    // Non-comment event: Storm is speaking to the WHOLE STREAM → use streamer's language
    langInstruction = `LANGUAGE RULE (NON-NEGOTIABLE — addressing the WHOLE STREAM, not a single viewer):
Always reply in ${streamerLangName}. This is the stream's primary language.
⛔ Never use English or any other language. ${streamerLangName} only.`;
  }

  const langContext = isCommentEvent ? "viewer-reply" : "stream-address";
  console.log(`[HostAgent:lang] event=${event.type} ctx=${langContext} | fixed=${replyLanguage !== "auto" ? replyLangName : "no"} | streamerLang=${streamerLangName}`);

  // Natural speech fillers — multilingual, injected occasionally to sound human
  const speechFillers = [
    // Ukrainian
    "До речі...", "Слухай...", "Оце цікаво...", "Зараз подумав...", "Хвилинку...",
    "Між іншим...", "Ось що думаю...", "Хоча...", "Стривай...", "Взагалі-то...",
    // English
    "Actually...", "Wait—", "Here's the thing...", "You know what...", "Okay but—",
    "Hmm, actually...", "Hold on—", "Low key though...",
    // Polish
    "Słuchaj...", "Właściwie...", "Chwileczkę...",
  ];
  const useFiller = Math.random() < 0.22; // 22% chance of natural filler opening
  const fillerHint = useFiller
    ? `NATURAL OPENER OPTION: You MAY start with a natural filler like "${speechFillers[Math.floor(Math.random() * speechFillers.length)]}" if it fits the moment — but only if it genuinely sounds right in the reply language. Don't force it.`
    : "";

  // ── Viewer recognition signal — explicit cue when we have history with this person ──
  // The memory context already contains the data; this signal tells Storm to USE it
  // in a natural, human way (not a formal acknowledgement).
  const hasViewerHistory = event.type === "comment" && memoryContext.includes(`[Viewer:${viewerName}]`);
  const recognitionSignal = hasViewerHistory
    ? `[Viewer Recognition Signal] You have real history with ${viewerName} — it's in your memory above. Reference it naturally. Don't be formal: say "welcome back", call out how long they've been around, mention a past gift, or just show you KNOW them. Real streamers remember their regulars.`
    : "";

  // Structural variety guard — prevents templated 3-part response patterns
  const varietyInstruction = `VARIETY: Change your response structure EVERY reply.
Options: sharp one-liner | genuine question | playful tease | short observation | strong opinion | skeptical pushback | callback to earlier | admit uncertainty
Never use the same structure twice in a row. Mix short punchy replies with slightly longer natural ones.
${fillerHint}`;

  // ── Prompt assembly — emotion section LAST before variety for maximum LLM attention ──
  const fullSystem = [
    systemPrompt,
    genderSection,
    behaviorCtx || "",
    memorySection,
    recognitionSignal,    // viewer history cue — near memory for contextual proximity
    langInstruction,
    emotionSection,       // near the end = highest attention weight from the model
    antiRepeatSection,    // right before variety = freshness enforced at last moment
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

    return { text, emotion, skipAntiRepetition: ssShortCircuit };
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
