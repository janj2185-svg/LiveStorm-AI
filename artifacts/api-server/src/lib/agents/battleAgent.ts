import OpenAI from "openai";
import { db, battleTranscriptsTable, aiPersonaConfigsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export interface BattleContext {
  opponentLines: string[];
  yourLines: string[];
  viewerEnergy: number;
}

export async function storeBattleTranscript(
  sessionId: number,
  streamerId: number,
  speaker: "streamer" | "opponent" | "ai",
  text: string,
  language = "auto",
): Promise<void> {
  try {
    await db.insert(battleTranscriptsTable).values({
      sessionId,
      streamerId,
      speaker,
      text,
      language,
    });
  } catch (err: any) {
    console.warn("[BattleAgent] storeBattleTranscript error:", err?.message);
  }
}

export async function getBattleContext(
  sessionId: number,
  streamerId: number,
): Promise<BattleContext> {
  try {
    const transcripts = await db.query.battleTranscriptsTable.findMany({
      where: eq(battleTranscriptsTable.sessionId, sessionId),
      orderBy: [desc(battleTranscriptsTable.createdAt)],
      limit: 20,
    });

    const opponentLines = transcripts
      .filter(t => t.speaker === "opponent")
      .reverse()
      .map(t => t.text);

    const yourLines = transcripts
      .filter(t => t.speaker === "ai" || t.speaker === "streamer")
      .reverse()
      .map(t => t.text);

    return { opponentLines, yourLines, viewerEnergy: 7 };
  } catch {
    return { opponentLines: [], yourLines: [], viewerEnergy: 5 };
  }
}

export async function generateBattleReply(
  opponentText: string,
  streamerId: number,
  sessionId: number,
  viewerCount = 0,
  additionalContext = "",
): Promise<string> {
  try {
    const config = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamerId),
    });

    const personaName = config?.personaName ?? "AI Host";
    const tone = config?.tone ?? "hype";
    const battleCtx = await getBattleContext(sessionId, streamerId);

    const historyLines: string[] = [];
    if (battleCtx.opponentLines.length > 0) {
      historyLines.push(
        "Recent battle history:",
        ...battleCtx.opponentLines.slice(-3).map(l => `Opponent: "${l}"`),
        ...battleCtx.yourLines.slice(-3).map(l => `You: "${l}"`),
      );
    }

    const systemPrompt = [
      `You are ${personaName}, an elite TikTok LIVE battle commentator and co-host.`,
      `You are in LIVE BATTLE MODE — this is a real-time rap/verbal battle or streaming competition.`,
      `Viewer count: ${viewerCount}. The crowd is watching. Every word matters.`,
      `Your tone: ${tone}. Be bold, witty, and entertaining. Keep it clean but INTENSE.`,
      `Generate a smart, punchy battle comeback or commentary reply in 1-2 sentences max (under 100 chars).`,
      `Never be genuinely mean or cross into hate speech. This is entertainment.`,
      additionalContext ? `Context: ${additionalContext}` : "",
      historyLines.join("\n"),
    ].filter(Boolean).join("\n");

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Opponent just said: "${opponentText}"\n\nGenerate a sharp battle reply.` },
      ],
      max_tokens: 120,
      temperature: 0.92,
    });

    const reply = resp.choices[0]?.message?.content?.trim() ?? "";

    // Store the AI reply in battle transcripts
    if (reply) {
      void storeBattleTranscript(sessionId, streamerId, "ai", reply);
    }

    return reply;
  } catch (err: any) {
    console.error("[BattleAgent] generateBattleReply error:", err?.message);
    return "";
  }
}

export async function getBattleTranscripts(sessionId: number) {
  try {
    return await db.query.battleTranscriptsTable.findMany({
      where: eq(battleTranscriptsTable.sessionId, sessionId),
      orderBy: [desc(battleTranscriptsTable.createdAt)],
      limit: 50,
    });
  } catch {
    return [];
  }
}
