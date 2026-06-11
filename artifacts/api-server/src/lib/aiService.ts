import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

// TTS-only client: uses direct api.openai.com (Replit proxy does NOT support POST /audio/speech)
const ttsOpenai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "[TTS] ❌ OPENAI_API_KEY is not set. Voice generation will fail. " +
    "Add your OpenAI API key as the OPENAI_API_KEY secret."
  );
}

const FAST_MODEL = "gpt-4o-mini";
const SMART_MODEL = "gpt-4o";

function getToneGuide(tone: string): string {
  return (
    {
      hype: "extremely energetic, use caps and exclamation marks, pump the crowd up",
      friendly: "warm, welcoming, supportive and encouraging",
      professional: "polished, analytical, and data-driven",
      savage: "bold, edgy, witty and unapologetic",
    }[tone] ?? "enthusiastic and engaging"
  );
}

function getPersonalityGuide(personalityType: string): string {
  return (
    {
      funny: "comedic, uses jokes and humor, keeps things lighthearted and entertaining",
      serious: "focused, professional, serious — no jokes, delivers real value",
      troll: "playfully provocative, edgy banter, witty comebacks — never actually mean",
      motivator: "intensely inspiring, always uplifting, encourages viewers to push harder",
      battle: "intense sports commentator energy, dramatic play-by-play of every stream event",
      friendly: "warm, welcoming, supportive and encouraging",
    }[personalityType] ?? "enthusiastic and engaging"
  );
}

const LANG_INSTRUCTIONS: Record<string, string> = {
  en: "Always respond in English.",
  uk: "Завжди відповідай українською мовою.",
  pl: "Zawsze odpowiadaj po polsku.",
  de: "Antworte immer auf Deutsch.",
  fr: "Réponds toujours en français.",
  es: "Responde siempre en español.",
  it: "Rispondi sempre in italiano.",
  pt: "Responda sempre em português.",
  nl: "Antwoord altijd in het Nederlands.",
  tr: "Her zaman Türkçe yanıt ver.",
  ru: "Всегда отвечай на русском языке.",
  ar: "أجب دائماً باللغة العربية.",
  hi: "हमेशा हिंदी में जवाब दें।",
  ja: "常に日本語で返答してください。",
  ko: "항상 한국어로 답변해 주세요.",
  zh: "请始终用简体中文回复。",
  "zh-TW": "請始終用繁體中文回覆。",
  id: "Selalu jawab dalam bahasa Indonesia.",
  vi: "Luôn trả lời bằng tiếng Việt.",
  th: "ตอบเสมอเป็นภาษาไทย",
  auto: "Detect the language of the viewer's message and respond in the SAME language they used. Match: Ukrainian→Ukrainian, Polish→Polish, German→German, French→French, Spanish→Spanish, Italian→Italian, Portuguese→Portuguese, Dutch→Dutch, Turkish→Turkish, Russian→Russian, Arabic→Arabic, Hindi→Hindi, Japanese→Japanese, Korean→Korean, Chinese→Chinese (match simplified/traditional), Indonesian→Indonesian, Vietnamese→Vietnamese, Thai→Thai. Otherwise respond in English.",
};

export async function generateAnnouncement(event: {
  type: string;
  viewerName?: string;
  amount?: number;
  bossName?: string;
  persona: { name: string; tone: string };
  language?: string;
}): Promise<string> {
  const toneGuide = getToneGuide(event.persona.tone);
  const langInstruction = event.language && event.language !== "auto"
    ? (LANG_INSTRUCTIONS[event.language] ?? "")
    : "";

  let prompt = "";
  if (event.type === "gift") {
    prompt = `${event.viewerName} just sent ${event.amount} coins as a gift! Hype it up in one short sentence (max 60 chars).`;
  } else if (event.type === "level_up") {
    prompt = `${event.viewerName} just leveled up! Celebrate in one short sentence (max 60 chars).`;
  } else if (event.type === "boss_kill") {
    prompt = `The boss "${event.bossName}" has been defeated by the viewers! Announce it (max 60 chars).`;
  } else if (event.type === "quest_complete") {
    prompt = `A live quest was just completed! Hype the viewers (max 60 chars).`;
  } else if (event.type === "share") {
    prompt = `${event.viewerName} just shared the stream with their followers! Give them a hype shoutout (max 60 chars).`;
  } else if (event.type === "like_milestone") {
    prompt = `The stream just hit ${event.amount} total likes! React to this milestone with energy (max 60 chars).`;
  } else if (event.type === "lucky_drop") {
    prompt = `Lucky Drop! ${event.viewerName} just won "${event.bossName ?? "a prize"}"! Make it feel like a jackpot moment (max 60 chars).`;
  } else if (event.type === "achievement") {
    prompt = `${event.viewerName} just unlocked the "${event.bossName ?? "achievement"}" achievement live! Celebrate it (max 60 chars).`;
  } else {
    prompt = `Something exciting just happened on stream! Make a short hype announcement (max 60 chars).`;
  }

  const systemContent = [
    `You are ${event.persona.name}, a TikTok LIVE co-host AI. Style: ${toneGuide}.`,
    langInstruction,
    "Always respond with ONLY the announcement text, no quotes, no explanation.",
  ].filter(Boolean).join(" ");

  try {
    const resp = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
      temperature: 0.9,
    });
    return resp.choices[0]?.message?.content?.trim() ?? "";
  } catch (err: any) {
    console.error("[AI] generateAnnouncement error:", err?.message);
    return "";
  }
}

export async function generateCommentReply(
  comment: string,
  viewerName: string,
  persona: { name: string; tone: string; personalityType?: string },
  language: string = "auto",
  conversationContext?: string,
  defaultLanguage: string = "uk",
): Promise<string> {
  const toneGuide = getToneGuide(persona.tone);
  const personalityGuide = persona.personalityType ? getPersonalityGuide(persona.personalityType) : "";

  let langInstruction: string;
  if (language === "auto") {
    const fallbackLang = LANG_INSTRUCTIONS[defaultLanguage] ?? LANG_INSTRUCTIONS.en;
    const fallbackName = {
      uk: "Ukrainian", en: "English", pl: "Polish", de: "German",
      ru: "Russian", fr: "French", es: "Spanish", it: "Italian",
    }[defaultLanguage] ?? "English";
    langInstruction = `Identify the language of the viewer's comment and reply in THAT SAME language. Detection rules:\n- Cyrillic script (Ukrainian letters іїє, etc.) → Ukrainian\n- Cyrillic (Russian only) → Russian\n- Polish words (cześć, dzięki, jak, się, proszę, witaj, etc.) → Polish\n- German words (hallo, danke, wie, bitte, etc.) → German\n- Clear English words (hi, hey, hello, thanks, how, what, good, nice, cool, ok, etc.) → English\n- Match all other languages by their recognizable vocabulary or script.\n- ONLY fall back to ${fallbackName} when the comment is genuinely undetectable (single emoji, numbers only, or random symbols with no language signal).\nDo NOT override a clearly-detected language with ${fallbackName}.`;
    console.log(`[AI:lang] comment="${comment.slice(0, 40)}" mode=auto defaultLang=${defaultLanguage}(${fallbackName})`);
  } else {
    langInstruction = LANG_INSTRUCTIONS[language] ?? LANG_INSTRUCTIONS.en;
    console.log(`[AI:lang] comment="${comment.slice(0, 40)}" mode=fixed lang=${language}`);
  }

  const systemLines = [
    `You are ${persona.name}, a TikTok LIVE co-host AI with a ${toneGuide} personality.`,
    personalityGuide ? `Additional personality trait: ${personalityGuide}.` : "",
    langInstruction,
    "Keep your reply SHORT — under 80 characters. Make it personal, engaging, and reference the viewer by name.",
    "Never use hashtags. Never explain yourself. Just reply naturally like a real streamer.",
  ].filter(Boolean);

  // Inject conversation context as a separate section if provided
  if (conversationContext) {
    systemLines.push(`\nRecent chat context (use for continuity, don't repeat yourself):\n${conversationContext}`);
  }

  try {
    const resp = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: systemLines.join(" "),
        },
        {
          role: "user",
          content: `Viewer @${viewerName} says in TikTok LIVE chat: "${comment}"\n\nWrite a short, engaging reply to them.`,
        },
      ],
      max_tokens: 100,
      temperature: 0.85,
    });
    return resp.choices[0]?.message?.content?.trim() ?? "";
  } catch (err: any) {
    console.error("[AI] generateCommentReply error:", err?.message);
    return "";
  }
}

export async function moderateComment(text: string): Promise<{ flagged: boolean; reason: string }> {
  try {
    const resp = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a TikTok LIVE content moderator. Analyze the comment for violations: hate speech, harassment, spam, explicit content, self-harm promotion. Respond with JSON only: {"flagged": boolean, "reason": "brief reason or empty string"}`,
        },
        { role: "user", content: `Comment: "${text}"` },
      ],
      max_tokens: 60,
      temperature: 0,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    return { flagged: !!result.flagged, reason: result.reason ?? "" };
  } catch {
    return { flagged: false, reason: "" };
  }
}

export async function generateQuests(context: {
  sessionStats: { gifts: number; comments: number; likes: number; followers: number };
  viewerCount: number;
  persona: { name: string; tone: string };
}): Promise<Array<{ questText: string; metric: string; target: number; xpReward: number }>> {
  try {
    const resp = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You are ${context.persona.name}, a TikTok LIVE co-host AI. Generate exactly 3 exciting viewer challenges. Return a JSON object with key "quests" containing an array of 3 items: [{"questText": "string under 50 chars", "metric": "gifts|comments|likes|followers|shares", "target": number, "xpReward": number}]. Make targets realistic for the viewer count.`,
        },
        {
          role: "user",
          content: `Viewer count: ${context.viewerCount}. Current session stats: ${JSON.stringify(context.sessionStats)}. Generate 3 varied, exciting quests.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.85,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    const quests: any[] = Array.isArray(raw) ? raw : (raw.quests ?? []);
    const validMetrics = ["gifts", "comments", "likes", "followers", "shares"];

    return quests.slice(0, 3).map((q: any) => ({
      questText: String(q.questText ?? "Complete the challenge!").slice(0, 60),
      metric: validMetrics.includes(q.metric) ? q.metric : "comments",
      target: Math.max(1, Math.min(10000, Number(q.target) || 10)),
      xpReward: Math.max(50, Math.min(1000, Number(q.xpReward) || 100)),
    }));
  } catch {
    return [
      { questText: "Get 10 comments from viewers!", metric: "comments", target: 10, xpReward: 100 },
      { questText: "Collect 5 gifts this session!", metric: "gifts", target: 5, xpReward: 200 },
      { questText: "Gain 3 new followers!", metric: "followers", target: 3, xpReward: 150 },
    ];
  }
}

export async function generateEvent(context: {
  currentViewers: number;
  sessionStats: { gifts: number; comments: number; likes: number };
  persona: { name: string; tone: string };
}): Promise<{ title: string; description: string; duration: string; mechanic: string }> {
  try {
    const resp = await openai.chat.completions.create({
      model: SMART_MODEL,
      messages: [
        {
          role: "system",
          content: `You are ${context.persona.name}, a TikTok LIVE co-host AI. Create a fun interactive live event idea for a streamer. Return JSON: {"title": "string", "description": "2-3 sentences describing what happens", "duration": "e.g. 5 minutes", "mechanic": "how viewers participate"}`,
        },
        {
          role: "user",
          content: `Current viewers: ${context.currentViewers}. Session stats: ${JSON.stringify(context.sessionStats)}. Create a creative, engaging themed event.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    return {
      title: String(raw.title ?? "Special Event"),
      description: String(raw.description ?? "An exciting event is happening on stream!"),
      duration: String(raw.duration ?? "5 minutes"),
      mechanic: String(raw.mechanic ?? "Participate in the chat to join!"),
    };
  } catch {
    return {
      title: "Gift Storm ⚡",
      description:
        "The next 5 minutes are CRITICAL! Every gift earns double XP. Viewers battle to claim the top gifter spot on the leaderboard.",
      duration: "5 minutes",
      mechanic: "Send gifts to earn double XP and dominate the leaderboard!",
    };
  }
}

export async function chatWithAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  message: string,
  persona: { name: string; tone: string; personalityType?: string },
  sessionContext?: string,
): Promise<string> {
  const toneGuide = getToneGuide(persona.tone);
  const personalityGuide = persona.personalityType ? getPersonalityGuide(persona.personalityType) : "";
  const systemPrompt = [
    `You are ${persona.name}, an AI co-host and strategy assistant for TikTok LIVE streamers.`,
    `Your tone is ${toneGuide}.`,
    personalityGuide ? `Your personality is ${personalityGuide}.` : "",
    `You help streamers grow their audience, plan engaging content, understand their analytics, run games, manage boss battles, and optimize their LIVE sessions.`,
    `Keep responses concise and actionable (under 200 words). Use line breaks for readability.`,
    sessionContext ? `\nCurrent session context:\n${sessionContext}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const resp = await openai.chat.completions.create({
      model: SMART_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-20),
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    return (
      resp.choices[0]?.message?.content?.trim() ??
      "I'm having trouble responding right now. Please try again."
    );
  } catch {
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

export async function generateVoice(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova",
  speed = 1.0,
): Promise<Buffer | null> {
  if (!ttsOpenai) {
    console.error("[TTS] ❌ generateVoice: OPENAI_API_KEY not set — OpenAI API key required for TTS");
    return null;
  }
  try {
    const truncated = text.slice(0, 500);
    const safeSpeed = Math.max(0.25, Math.min(4.0, speed));
    console.log(`[TTS] 🎙️ OpenAI direct speech | voice=${voice} speed=${safeSpeed} chars=${truncated.length}`);
    const mp3 = await ttsOpenai.audio.speech.create({
      model: "tts-1",
      voice,
      input: truncated,
      speed: safeSpeed,
    });
    const arrayBuffer = await mp3.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    console.log(`[TTS] ✅ audio buffer | bytes=${buf.length}`);
    return buf;
  } catch (err: any) {
    console.error("[TTS] generateVoice error:", err?.message);
    return null;
  }
}

// ── Chat Translation ───────────────────────────────────────────────────────────
const TRANSLATION_CACHE_MAX = 2000;
const translationCache = new Map<string, string>();
const SKIP_SENTINEL = "\0SKIP";

function translationCacheStore(key: string, value: string): void {
  if (translationCache.size >= TRANSLATION_CACHE_MAX) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey !== undefined) translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

const TRANSLATE_TARGET_NAMES: Record<string, string> = {
  uk: "Ukrainian", en: "English", pl: "Polish", de: "German",
  ru: "Russian", fr: "French", es: "Spanish", it: "Italian",
  pt: "Portuguese", nl: "Dutch", tr: "Turkish", ar: "Arabic",
  ja: "Japanese", ko: "Korean", zh: "Chinese",
};

/**
 * Translate a viewer comment to the target language.
 * Returns null if the text is already in the target language, or on failure.
 * Uses an in-memory LRU cache so repeated identical messages are free.
 */
export async function translateComment(text: string, targetLang: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const cacheKey = `${trimmed}\0${targetLang}`;
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey)!;
    return cached === SKIP_SENTINEL ? null : cached;
  }

  const targetName = TRANSLATE_TARGET_NAMES[targetLang] ?? targetLang;

  try {
    const response = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content:
            `You are a translator. Detect the language of the message.\n` +
            `If it is already ${targetName}, respond with exactly: SKIP\n` +
            `Otherwise translate it to ${targetName}.\n` +
            `Return ONLY the translated text — no explanations, no quotes, no notes.`,
        },
        { role: "user", content: trimmed },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim() ?? null;

    if (!result || result === "SKIP") {
      translationCacheStore(cacheKey, SKIP_SENTINEL);
      return null;
    }

    translationCacheStore(cacheKey, result);
    console.log(`[AI:translate] "${trimmed.slice(0, 40)}" → ${targetLang}: "${result.slice(0, 60)}"`);
    return result;
  } catch (err: any) {
    console.error("[AI:translate] error:", err?.message);
    return null;
  }
}

/**
 * Fast local spam/pattern check — runs in <1ms, no API call.
 * Catches obvious junk before spending an AI moderation call.
 */
export function fastSpamCheck(comment: string): { flagged: boolean; reason: string } {
  const text = comment.trim();
  if (!text) return { flagged: false, reason: "" };

  // Repetitive single-character sequences (aaaaaaa, !!!!!!, .......)
  if (text.length > 4 && /^(.)\1{7,}$/.test(text)) {
    return { flagged: true, reason: "Repetitive character spam" };
  }

  // Promotional URL links (unsolicited links are almost always spam/self-promo)
  if (/https?:\/\/\S{5,}/i.test(text)) {
    return { flagged: true, reason: "Contains promotional URL" };
  }

  // Copy-paste word spam: same word ≥4 times in a short message
  const words = text.toLowerCase().split(/\s+/);
  if (words.length >= 4 && words.length <= 10) {
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    const maxFreq = Math.max(...freq.values());
    if (maxFreq >= 4) return { flagged: true, reason: "Repetitive word spam" };
  }

  return { flagged: false, reason: "" };
}

export async function generateAnalyticsInsights(data: {
  sessionData: Array<{
    date: string;
    duration_minutes: number | null;
    peak_viewers: number;
    gifts: number;
    likes: number;
    comments: number;
    follows: number;
    shares: number;
  }>;
  summaryStats: {
    total_sessions_analyzed: number;
    avg_peak_viewers: number;
    total_gifts_earned: number;
    avg_session_duration_minutes: number | null;
    best_session_date: string | undefined;
    best_session_peak_viewers: number | undefined;
  };
}): Promise<string[]> {
  try {
    const resp = await openai.chat.completions.create({
      model: SMART_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a TikTok LIVE growth expert and analytics coach. Analyze streaming performance data and provide specific, actionable recommendations. Be concise, data-driven, and constructive. Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Analyze this TikTok LIVE streamer's recent performance and provide 3-5 actionable insights.

Session data (most recent first):
${JSON.stringify(data.sessionData, null, 2)}

Summary:
${JSON.stringify(data.summaryStats, null, 2)}

Return JSON: {"insights": ["insight1", "insight2", "insight3"]}

Rules:
- Reference specific numbers from the data
- Each insight must be actionable (what to do, not just what happened)
- Keep each insight under 180 characters
- Focus on patterns: best times, engagement drop-offs, gift conversion, audience retention`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    const insights: string[] = Array.isArray(raw.insights)
      ? raw.insights.map(String).slice(0, 5)
      : [];
    return insights.length > 0 ? insights : ["Keep streaming consistently to generate personalized insights based on your data."];
  } catch (err: any) {
    console.error("[AI] generateAnalyticsInsights error:", err?.message);
    return ["Keep streaming consistently to build enough data for personalized recommendations."];
  }
}

export async function generateContent(params: {
  type: string;
  topic: string;
  style?: string;
  audience?: string;
  language?: string;
}): Promise<{ items?: string[]; script?: string }> {
  const langInstruction = LANG_INSTRUCTIONS[params.language ?? "en"] ?? LANG_INSTRUCTIONS.en;

  const styleNote = params.style ? ` in ${params.style} style` : "";
  const audienceNote = params.audience ? ` for ${params.audience}` : "";

  const typePrompts: Record<string, string> = {
    ideas: `Generate 6 creative and viral TikTok LIVE stream ideas about "${params.topic}"${styleNote}${audienceNote}. Each idea should be unique, actionable, and engaging. Return JSON: {"items": ["idea1", "idea2", ...]}`,
    titles: `Generate 8 catchy TikTok LIVE stream titles about "${params.topic}"${audienceNote}. Make them attention-grabbing and click-worthy with emojis where appropriate. Return JSON: {"items": ["title1", "title2", ...]}`,
    descriptions: `Generate 5 compelling TikTok LIVE stream descriptions about "${params.topic}"${styleNote}. Each description is 2-3 sentences. Include a hook and call-to-action. Return JSON: {"items": ["desc1", "desc2", ...]}`,
    hashtags: `Generate 20 TikTok hashtags for a LIVE stream about "${params.topic}"${audienceNote}. Mix very popular (#fyp, #viral), niche-specific, and topic-specific hashtags. Return JSON: {"items": ["#tag1", "#tag2", ...]}`,
    script: `Write a 90-second TikTok LIVE stream opening script about "${params.topic}"${styleNote}${audienceNote}. Include: energetic greeting, attention hook, what viewers will experience, interactive element prompt, and follow/subscribe call-to-action. Make it natural and conversational. Return JSON: {"script": "full script text here with natural paragraph breaks"}`,
  };

  const prompt = typePrompts[params.type] ?? typePrompts.ideas;

  try {
    const resp = await openai.chat.completions.create({
      model: SMART_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert TikTok content strategist and viral content creator. ${langInstruction} Always return valid JSON only — no text outside JSON.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.87,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(resp.choices[0]?.message?.content ?? "{}");

    if (params.type === "script") {
      return { script: String(raw.script ?? "") };
    }

    const items = Array.isArray(raw.items) ? raw.items.map(String) : [];
    return { items };
  } catch (err: any) {
    console.error("[AI] generateContent error:", err?.message);
    if (params.type === "script") return { script: "" };
    return { items: [] };
  }
}
