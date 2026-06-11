import OpenAI from "openai";
import { db, battleTranscriptsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { PersonalityContext } from "./personalityAgent";
import { buildPersonalityPrompt } from "./personalityAgent";
import type { EmotionalState } from "./emotionEngine";
import { getEmotionPromptContext } from "./emotionEngine";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export interface BattleAgentResult {
  suggestedReply: string;
  context: string;
  shouldSpeak: boolean;
}

const activeBattles = new Map<number, { active: boolean; opponentContext: string[] }>();

export function setBattleMode(sessionId: number, active: boolean): void {
  if (active) {
    activeBattles.set(sessionId, { active: true, opponentContext: [] });
    console.log(`[BattleAgent] Battle mode ACTIVATED for session ${sessionId}`);
  } else {
    activeBattles.delete(sessionId);
    console.log(`[BattleAgent] Battle mode DEACTIVATED for session ${sessionId}`);
  }
}

export function isBattleActive(sessionId: number): boolean {
  return activeBattles.get(sessionId)?.active === true;
}

export async function addBattleTranscript(opts: {
  sessionId: number;
  streamerId: number;
  speaker: "us" | "opponent";
  text: string;
  language?: string;
}): Promise<{ suggestedReply?: string }> {
  const battle = activeBattles.get(opts.sessionId);
  if (!battle) return {};

  if (opts.speaker === "opponent") {
    battle.opponentContext.push(opts.text);
    if (battle.opponentContext.length > 10) battle.opponentContext.shift();
  }

  const [transcript] = await db
    .insert(battleTranscriptsTable)
    .values({
      sessionId:  opts.sessionId,
      streamerId: opts.streamerId,
      speaker:    opts.speaker,
      text:       opts.text,
      language:   opts.language ?? "auto",
    })
    .returning();

  return { suggestedReply: transcript?.suggestedReply ?? undefined };
}

export async function generateBattleReply(opts: {
  sessionId: number;
  streamerId: number;
  opponentStatement: string;
  personaName: string;
  personality: PersonalityContext;
  replyLanguage?: string;
  emotionState?: EmotionalState;
}): Promise<BattleAgentResult> {
  const battle         = activeBattles.get(opts.sessionId);
  const recentOpponent = battle?.opponentContext.slice(-3).join(" | ") ?? opts.opponentStatement;

  // Personality × emotion matrix fires during battle — adds competitive expression
  const basePrompt = buildPersonalityPrompt(opts.personality, opts.personaName, opts.emotionState);

  // Emotion context for battle intensifies competitive edge
  const emotionCtx = opts.emotionState ? getEmotionPromptContext(opts.emotionState) : "";

  const systemPrompt = [
    basePrompt,
    emotionCtx,
    `You are in a TikTok LIVE battle. Help our streamer respond to the opponent.`,
    `Battle strategy: be confident, entertaining, crowd-pleasing. Maximum impact in 1-2 punchy sentences.`,
    `The crowd is watching — make every word count.`,
  ].filter(Boolean).join("\n");

  const userPrompt = `Opponent just said: "${opts.opponentStatement}"
Context from opponent: ${recentOpponent}
Generate a smart, crowd-pleasing comeback for our streamer to say.`;

  try {
    const resp = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 80,
      messages:   [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    });

    const suggestedReply = resp.choices[0]?.message?.content?.trim() ?? "";

    await db
      .insert(battleTranscriptsTable)
      .values({
        sessionId:     opts.sessionId,
        streamerId:    opts.streamerId,
        speaker:       "opponent",
        text:          opts.opponentStatement,
        language:      opts.replyLanguage ?? "auto",
        suggestedReply,
      })
      .catch(() => {});

    return {
      suggestedReply,
      context:     recentOpponent,
      shouldSpeak: suggestedReply.length > 0,
    };
  } catch (err: unknown) {
    console.error("[BattleAgent] error:", (err as Error)?.message);
    return { suggestedReply: "", context: "", shouldSpeak: false };
  }
}

export async function getBattleTranscripts(sessionId: number, streamerId: number) {
  return db.query.battleTranscriptsTable.findMany({
    where:   eq(battleTranscriptsTable.sessionId, sessionId),
    orderBy: [desc(battleTranscriptsTable.createdAt)],
    limit:   50,
  });
}

export async function summarizeBattle(sessionId: number, streamerId: number): Promise<string> {
  const transcripts = await getBattleTranscripts(sessionId, streamerId);
  if (transcripts.length === 0) return "No battle transcript available.";

  const formatted = transcripts
    .slice(0, 20)
    .map((t) => `[${t.speaker.toUpperCase()}] ${t.text}`)
    .join("\n");

  try {
    const resp = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 100,
      messages:   [
        { role: "system", content: "Summarize this TikTok LIVE battle transcript in 2 sentences. Who had the better performance?" },
        { role: "user",   content: formatted },
      ],
    });
    return resp.choices[0]?.message?.content?.trim() ?? "Battle completed.";
  } catch {
    return `Battle with ${transcripts.length} exchanges recorded.`;
  }
}
