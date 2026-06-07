import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

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

const LANG_INSTRUCTIONS: Record<string, string> = {
  en: "Always respond in English.",
  uk: "Завжди відповідай українською мовою.",
  pl: "Zawsze odpowiadaj po polsku.",
  ru: "Всегда отвечай на русском языке.",
  auto: "Detect the language of the viewer's message and respond in the SAME language they used. If the message is in Ukrainian (uk), respond in Ukrainian. If Polish (pl), respond in Polish. If Russian (ru), respond in Russian. Otherwise, respond in English.",
};

export async function generateAnnouncement(event: {
  type: string;
  viewerName?: string;
  amount?: number;
  bossName?: string;
  persona: { name: string; tone: string };
}): Promise<string> {
  const toneGuide = getToneGuide(event.persona.tone);

  let prompt = "";
  if (event.type === "gift") {
    prompt = `${event.viewerName} just sent ${event.amount} coins as a gift! Hype it up in one short sentence (max 60 chars).`;
  } else if (event.type === "level_up") {
    prompt = `${event.viewerName} just leveled up! Celebrate in one short sentence (max 60 chars).`;
  } else if (event.type === "boss_kill") {
    prompt = `The boss "${event.bossName}" has been defeated by the viewers! Announce it (max 60 chars).`;
  } else if (event.type === "quest_complete") {
    prompt = `A live quest was just completed! Hype the viewers (max 60 chars).`;
  } else {
    prompt = `Something exciting just happened on stream! Make a short hype announcement (max 60 chars).`;
  }

  try {
    const resp = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: `You are ${event.persona.name}, a TikTok LIVE co-host AI. Style: ${toneGuide}. Always respond with ONLY the announcement text, no quotes, no explanation.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
      temperature: 0.9,
    });
    return resp.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function generateCommentReply(
  comment: string,
  viewerName: string,
  persona: { name: string; tone: string },
  language: string = "auto",
): Promise<string> {
  const toneGuide = getToneGuide(persona.tone);
  const langInstruction = LANG_INSTRUCTIONS[language] ?? LANG_INSTRUCTIONS.auto;

  try {
    const resp = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content: [
            `You are ${persona.name}, a TikTok LIVE co-host AI with a ${toneGuide} personality.`,
            langInstruction,
            "Keep your reply SHORT — under 80 characters. Make it personal, engaging, and reference the viewer by name.",
            "Never use hashtags. Never explain yourself. Just reply naturally like a real streamer.",
          ].join(" "),
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
  persona: { name: string; tone: string },
  sessionContext?: string,
): Promise<string> {
  const toneGuide = getToneGuide(persona.tone);
  const systemPrompt = [
    `You are ${persona.name}, an AI co-host and strategy assistant for TikTok LIVE streamers.`,
    `Your tone is ${toneGuide}.`,
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
): Promise<Buffer | null> {
  try {
    const truncated = text.slice(0, 500);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: truncated,
      speed: 1.1,
    });
    const arrayBuffer = await mp3.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error("[TTS] generateVoice error:", err?.message);
    return null;
  }
}
