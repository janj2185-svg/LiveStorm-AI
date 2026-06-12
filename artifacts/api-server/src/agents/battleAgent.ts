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

export interface BattleScore {
  us: number;
  opponent: number;
  coinUs: number;
  coinOpponent: number;
  exchanges: number;
  lastLeadChange?: number;
}

interface BattleState {
  active: boolean;
  opponentContext: string[];
  score: BattleScore;
  startedAt: number;
}

const activeBattles = new Map<number, BattleState>();

export function setBattleMode(sessionId: number, active: boolean): void {
  if (active) {
    activeBattles.set(sessionId, {
      active: true,
      opponentContext: [],
      score: { us: 0, opponent: 0, coinUs: 0, coinOpponent: 0, exchanges: 0 },
      startedAt: Date.now(),
    });
    console.log(`[BattleAgent] Battle mode ACTIVATED for session ${sessionId}`);
  } else {
    activeBattles.delete(sessionId);
    console.log(`[BattleAgent] Battle mode DEACTIVATED for session ${sessionId}`);
  }
}

export function isBattleActive(sessionId: number): boolean {
  return activeBattles.get(sessionId)?.active === true;
}

export function getBattleScore(sessionId: number): BattleScore | null {
  return activeBattles.get(sessionId)?.score ?? null;
}

export function updateBattleScore(
  sessionId: number,
  side: "us" | "opponent",
  coins: number,
): BattleScore | null {
  const battle = activeBattles.get(sessionId);
  if (!battle) return null;

  const prevLeader = battle.score.us > battle.score.opponent ? "us" : battle.score.opponent > battle.score.us ? "opponent" : "tied";

  if (side === "us") {
    battle.score.coinUs += coins;
    battle.score.us += coins;
  } else {
    battle.score.coinOpponent += coins;
    battle.score.opponent += coins;
  }

  const newLeader = battle.score.us > battle.score.opponent ? "us" : battle.score.opponent > battle.score.us ? "opponent" : "tied";
  if (prevLeader !== newLeader && newLeader !== "tied") {
    battle.score.lastLeadChange = Date.now();
    console.log(`[BattleAgent] 🔄 Lead change → ${newLeader} is now ahead | session=${sessionId}`);
  }

  console.log(`[BattleAgent] 💰 Score update | us=${battle.score.us} vs opponent=${battle.score.opponent} | session=${sessionId}`);
  return { ...battle.score };
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
  intensityMode?: string;
}): Promise<BattleAgentResult> {
  const battle         = activeBattles.get(opts.sessionId);
  const recentOpponent = battle?.opponentContext.slice(-3).join(" | ") ?? opts.opponentStatement;
  const score          = battle?.score ?? { us: 0, opponent: 0, coinUs: 0, coinOpponent: 0, exchanges: 0 };

  battle && battle.score.exchanges++;

  const battleDuration = battle ? Math.round((Date.now() - battle.startedAt) / 1000 / 60) : 0;

  // ── Score-aware context ────────────────────────────────────────────────────
  const gap = Math.abs(score.us - score.opponent);
  const weAreLeading  = score.us > score.opponent;
  const theyAreLeading = score.opponent > score.us;
  const isTied        = score.us === score.opponent;
  const isFinale      = battleDuration >= 8; // last stretch of battle
  const recentLeadChange = battle?.score.lastLeadChange
    ? (Date.now() - battle.score.lastLeadChange < 60_000)
    : false;

  const scoreContext = score.us === 0 && score.opponent === 0
    ? "Battle just started. Set the tone — establish dominance from word one."
    : weAreLeading
      ? `We are LEADING by ${gap} coins. Maintain pressure — don't let them breathe.`
      : theyAreLeading
        ? `We are BEHIND by ${gap} coins. Time to turn this around — this is where legends are made.`
        : `TIED battle — this is anyone's game. The next big push decides it.`;

  const leadChangeCtx = recentLeadChange
    ? (weAreLeading
        ? "We JUST took the lead — this is the moment. EXPLODE with energy."
        : "They JUST took the lead. Time to fight back — call on the community NOW.")
    : "";

  const finaleCtx = isFinale
    ? "⚡ FINALE TIME — build maximum tension. Every comment matters. Beg, demand, inspire — whatever it takes for the win."
    : "";

  const exchangeCtx = score.exchanges >= 5
    ? `This is exchange #${score.exchanges} — the crowd is heated. Don't just reply, PERFORM.`
    : "";

  // Personality × emotion matrix fires during battle
  const basePrompt = buildPersonalityPrompt(opts.personality, opts.personaName, opts.emotionState, opts.intensityMode as any);
  const emotionCtx = opts.emotionState ? getEmotionPromptContext(opts.emotionState) : "";

  const systemPrompt = [
    basePrompt,
    emotionCtx,
    `You are in a TikTok LIVE battle. Your job: make our streamer WIN.`,
    ``,
    `=== BATTLE SITUATION ===`,
    scoreContext,
    leadChangeCtx,
    finaleCtx,
    exchangeCtx,
    ``,
    `=== BATTLE TACTICS ===`,
    `• Respond to what the opponent said — directly counter their point`,
    `• Hype the crowd — "Chat, let's GO!", "Are you seeing this?", "Show them who runs this"`,
    `• Taunt the opponent's weakness (viewer count, energy, gifts) — keep it entertaining, not hateful`,
    `• Build tension — make every reply feel like a heavyweight boxing round`,
    `• Be confident, sharp, crowd-pleasing. Maximum impact in 1-2 punchy sentences.`,
  ].filter(Boolean).join("\n");

  const userPrompt = `Opponent just said: "${opts.opponentStatement}"
Recent opponent context: ${recentOpponent}
Score: Us ${score.us} coins vs Them ${score.opponent} coins (${score.exchanges} exchanges in, ${battleDuration} min)

Generate a devastating, crowd-pleasing comeback. Make it unforgettable.`;

  try {
    const resp = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 100,
      temperature: 1.0,
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

  const score = activeBattles.get(sessionId)?.score;
  const scoreStr = score
    ? `Final score: Us ${score.us} vs Opponent ${score.opponent} coins, ${score.exchanges} exchanges.`
    : "";

  const formatted = transcripts
    .slice(0, 20)
    .map((t) => `[${t.speaker.toUpperCase()}] ${t.text}`)
    .join("\n");

  try {
    const resp = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 120,
      messages:   [
        { role: "system", content: "Summarize this TikTok LIVE battle in 2 sentences. Who had the better performance? Include final score if provided." },
        { role: "user",   content: `${scoreStr}\n\n${formatted}` },
      ],
    });
    return resp.choices[0]?.message?.content?.trim() ?? "Battle completed.";
  } catch {
    return `Battle with ${transcripts.length} exchanges recorded. ${scoreStr}`;
  }
}
