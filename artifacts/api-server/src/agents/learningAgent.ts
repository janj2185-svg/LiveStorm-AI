import OpenAI from "openai";
import { db, aiLearningReportsTable, aiResponseScoresTable } from "@workspace/db";
import { eq, and, avg, count } from "drizzle-orm";
import { storeMemory } from "./memoryAgent";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export interface LearningReport {
  sessionId: number;
  totalResponses: number;
  avgScore: number;
  bestResponse: string;
  worstResponse: string;
  recommendations: string;
  personalityAdjustments: string;
}

export async function runLearningAgent(opts: {
  sessionId: number;
  streamerId: number;
}): Promise<LearningReport | null> {
  console.log(`[LearningAgent] Starting post-stream analysis for session ${opts.sessionId}`);

  const scores = await db.query.aiResponseScoresTable.findMany({
    where: and(
      eq(aiResponseScoresTable.sessionId, opts.sessionId),
      eq(aiResponseScoresTable.streamerId, opts.streamerId),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 200,
  });

  if (scores.length === 0) {
    console.log(`[LearningAgent] No scored responses found for session ${opts.sessionId}`);
    return null;
  }

  const validScores = scores.filter((s) => s.score !== null) as Array<typeof scores[0] & { score: number }>;
  const avgScore = validScores.length > 0
    ? validScores.reduce((a, b) => a + b.score, 0) / validScores.length
    : 5.0;

  const sorted = [...validScores].sort((a, b) => b.score - a.score);
  const bestResponse = sorted[0]?.aiResponse ?? "";
  const worstResponse = sorted[sorted.length - 1]?.aiResponse ?? "";

  const responseSample = scores
    .slice(0, 20)
    .map((s) => `[${s.agentType}] trigger="${s.triggerEvent}" → "${s.aiResponse.slice(0, 60)}" score=${s.score?.toFixed(1) ?? "?"}`)
    .join("\n");

  let recommendations = "";
  let personalityAdjustments = "";

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are an AI performance analyst for a TikTok LIVE stream AI co-host. 
Analyze the session responses and provide:
1. 3 specific recommendations to improve the AI's performance
2. Personality adjustments to make the AI more engaging

Return JSON: {"recommendations": "...", "personalityAdjustments": "..."}`,
        },
        {
          role: "user",
          content: `Session ${opts.sessionId} analysis:\n- Total responses: ${scores.length}\n- Avg score: ${avgScore.toFixed(2)}/10\n- Best response: "${bestResponse.slice(0, 100)}"\n- Worst: "${worstResponse.slice(0, 100)}"\n\nSample responses:\n${responseSample}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as { recommendations?: string; personalityAdjustments?: string };
    recommendations = parsed.recommendations ?? "Continue current strategy. Monitor engagement patterns.";
    personalityAdjustments = parsed.personalityAdjustments ?? "No major adjustments needed.";
  } catch {
    recommendations = `Session completed with ${scores.length} AI responses. Average engagement score: ${avgScore.toFixed(1)}/10.`;
    personalityAdjustments = "Maintain current personality settings.";
  }

  const [report] = await db
    .insert(aiLearningReportsTable)
    .values({
      sessionId: opts.sessionId,
      streamerId: opts.streamerId,
      totalResponses: scores.length,
      avgScore,
      bestResponse: bestResponse.slice(0, 500),
      worstResponse: worstResponse.slice(0, 500),
      recommendations,
      personalityAdjustments,
    })
    .returning();

  await storeMemory({
    streamerId: opts.streamerId,
    memoryType: "stream",
    key: `session_${opts.sessionId}_learning`,
    value: `Session ${opts.sessionId}: ${scores.length} responses, avg score ${avgScore.toFixed(1)}. Key recommendation: ${recommendations.slice(0, 100)}`,
    importance: 3,
  });

  console.log(`[LearningAgent] Report generated for session ${opts.sessionId}: ${scores.length} responses, avg ${avgScore.toFixed(2)}`);

  return {
    sessionId: opts.sessionId,
    totalResponses: scores.length,
    avgScore,
    bestResponse,
    worstResponse,
    recommendations,
    personalityAdjustments,
  };
}

export async function getLearningReports(streamerId: number, limit = 10) {
  return db.query.aiLearningReportsTable.findMany({
    where: eq(aiLearningReportsTable.streamerId, streamerId),
    orderBy: (t, { desc }) => [desc(t.generatedAt)],
    limit,
  });
}
