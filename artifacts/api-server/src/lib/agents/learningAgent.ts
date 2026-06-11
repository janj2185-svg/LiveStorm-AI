import OpenAI from "openai";
import { db, aiResponseScoresTable, aiLearningReportsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export async function updateEngagementDelta(
  scoreId: number,
  delta: number,
): Promise<void> {
  try {
    const row = await db.query.aiResponseScoresTable.findFirst({
      where: eq(aiResponseScoresTable.id, scoreId),
    });
    if (!row) return;
    const newScore = Math.max(1, Math.min(10, (row.score ?? 5) + delta * 0.5));
    await db
      .update(aiResponseScoresTable)
      .set({ score: newScore, engagementDelta: (row.engagementDelta ?? 0) + delta })
      .where(eq(aiResponseScoresTable.id, scoreId));
  } catch (err: any) {
    console.warn("[LearningAgent] updateEngagementDelta error:", err?.message);
  }
}

export async function generateLearningReport(
  sessionId: number,
  streamerId: number,
): Promise<{ report: typeof aiLearningReportsTable.$inferSelect | null; generated: boolean }> {
  // Check if report already exists
  const existing = await db.query.aiLearningReportsTable.findFirst({
    where: and(
      eq(aiLearningReportsTable.sessionId, sessionId),
      eq(aiLearningReportsTable.streamerId, streamerId),
    ),
  });
  if (existing) return { report: existing, generated: false };

  // Fetch all response scores for this session
  const scores = await db.query.aiResponseScoresTable.findMany({
    where: and(
      eq(aiResponseScoresTable.sessionId, sessionId),
      eq(aiResponseScoresTable.streamerId, streamerId),
    ),
    orderBy: [desc(aiResponseScoresTable.score)],
  });

  if (scores.length === 0) {
    const [report] = await db
      .insert(aiLearningReportsTable)
      .values({
        sessionId,
        streamerId,
        totalResponses: 0,
        avgScore: 5.0,
        bestResponse: null,
        worstResponse: null,
        recommendations: "No AI responses recorded for this session. Enable Auto-Reply or use Semi-Auto mode to collect data.",
        personalityAdjustments: null,
      })
      .returning();
    return { report: report ?? null, generated: true };
  }

  const totalResponses = scores.length;
  const avgScore = scores.reduce((s, r) => s + (r.score ?? 5), 0) / totalResponses;
  const bestResponse = scores[0]?.aiResponse ?? "";
  const worstResponse = scores[scores.length - 1]?.aiResponse ?? "";

  // Sample of responses for AI analysis
  const sample = scores.slice(0, 15).map(s => ({
    event: s.triggerEvent,
    response: s.aiResponse.slice(0, 100),
    score: s.score,
    engagement: s.engagementDelta,
  }));

  let recommendations = "";
  let personalityAdjustments = "";

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI performance coach analyzing a TikTok LIVE AI co-host's performance. 
          Analyze the AI responses from a stream session and provide actionable recommendations.
          Return valid JSON only: {"recommendations": "string with 3-4 bullet points", "personality_adjustments": "string with 2-3 adjustments"}`,
        },
        {
          role: "user",
          content: `Session had ${totalResponses} AI responses. Average score: ${avgScore.toFixed(1)}/10.
          
Sample responses (highest to lowest scoring):
${JSON.stringify(sample, null, 2)}

Best response: "${bestResponse}"
Weakest response: "${worstResponse}"

Analyze what worked, what didn't, and give specific improvement suggestions for next stream.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    recommendations = raw.recommendations ?? "";
    personalityAdjustments = raw.personality_adjustments ?? "";
  } catch (err: any) {
    console.warn("[LearningAgent] AI analysis error:", err?.message);
    recommendations = `• ${totalResponses} total responses generated\n• Average quality score: ${avgScore.toFixed(1)}/10\n• Keep streaming to build more data for personalized recommendations`;
  }

  const [report] = await db
    .insert(aiLearningReportsTable)
    .values({
      sessionId,
      streamerId,
      totalResponses,
      avgScore,
      bestResponse,
      worstResponse,
      recommendations,
      personalityAdjustments,
    })
    .returning();

  return { report: report ?? null, generated: true };
}

export async function getLatestLearningReport(streamerId: number) {
  try {
    return await db.query.aiLearningReportsTable.findFirst({
      where: eq(aiLearningReportsTable.streamerId, streamerId),
      orderBy: [desc(aiLearningReportsTable.generatedAt)],
    });
  } catch {
    return null;
  }
}

export async function getLearningReports(streamerId: number) {
  try {
    return await db.query.aiLearningReportsTable.findMany({
      where: eq(aiLearningReportsTable.streamerId, streamerId),
      orderBy: [desc(aiLearningReportsTable.generatedAt)],
      limit: 10,
    });
  } catch {
    return [];
  }
}
