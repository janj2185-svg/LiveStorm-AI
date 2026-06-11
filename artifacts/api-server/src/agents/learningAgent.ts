import OpenAI from "openai";
import { db, aiLearningReportsTable, aiResponseScoresTable, aiPersonaConfigsTable } from "@workspace/db";
import { eq, and, avg, count } from "drizzle-orm";
import { storeMemory } from "./memoryAgent";

const PERSONALITY_KEYWORDS: Record<string, string[]> = {
  savage:       ["more aggressive", "sharper", "edgier", "bolder", "savage", "ruthless wit"],
  funny:        ["more humor", "funnier", "comedic", "jokes", "playful", "witty"],
  motivational: ["more energetic", "motivational", "uplifting", "inspiring", "hype"],
  professional: ["more professional", "authoritative", "concise", "analytical"],
  flirty:       ["more charming", "flirty", "playful banter", "charismatic"],
  friendly:     ["warmer", "friendlier", "welcoming", "inclusive", "friendly"],
};

function detectPersonalityAdjustment(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [mode, keywords] of Object.entries(PERSONALITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return mode;
  }
  return null;
}

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

  interface LearningAnalysis {
    recommendations: string;
    personalityAdjustments: string;
    suggestedMode: "savage" | "funny" | "motivational" | "professional" | "flirty" | "friendly" | null;
    confidenceScore: number; // 0-10: how confident the model is in the suggested mode change
    keyAdjustments: {
      energyLevel?: "lower" | "higher" | "maintain";
      responseLength?: "shorter" | "longer" | "maintain";
      humorLevel?: "increase" | "decrease" | "maintain";
    };
  }

  let analysis: LearningAnalysis = {
    recommendations: `Session completed with ${scores.length} AI responses. Average engagement score: ${avgScore.toFixed(1)}/10.`,
    personalityAdjustments: "Maintain current personality settings.",
    suggestedMode: null,
    confidenceScore: 0,
    keyAdjustments: {},
  };

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are an AI performance analyst for a TikTok LIVE stream AI co-host.
Analyze the session data and return a JSON object with these exact fields:
- "recommendations": string — 3 specific, actionable improvements for future sessions
- "personalityAdjustments": string — freeform explanation of what to adjust in the AI's style
- "suggestedMode": one of "savage" | "funny" | "motivational" | "professional" | "flirty" | "friendly" | null — only suggest a mode change if you are highly confident it would improve engagement; null means keep current mode
- "confidenceScore": number 0-10 — your confidence in the suggestedMode change (0 = no change needed, 10 = very certain)
- "keyAdjustments": object with optional fields "energyLevel" ("lower"|"higher"|"maintain"), "responseLength" ("shorter"|"longer"|"maintain"), "humorLevel" ("increase"|"decrease"|"maintain")

Only suggest a non-null suggestedMode when confidenceScore >= 7 AND avgScore < 6.5 AND you have >= 10 responses.`,
        },
        {
          role: "user",
          content: `Session ${opts.sessionId} analysis:\n- Total responses: ${scores.length}\n- Avg score: ${avgScore.toFixed(2)}/10\n- Best response: "${bestResponse.slice(0, 100)}"\n- Worst: "${worstResponse.slice(0, 100)}"\n\nSample responses:\n${responseSample}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as Partial<LearningAnalysis>;
    analysis = {
      recommendations:     parsed.recommendations     ?? analysis.recommendations,
      personalityAdjustments: parsed.personalityAdjustments ?? analysis.personalityAdjustments,
      suggestedMode:       parsed.suggestedMode        ?? null,
      confidenceScore:     typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0,
      keyAdjustments:      parsed.keyAdjustments       ?? {},
    };
  } catch {
    // analysis stays as default fallback
  }

  recommendations     = analysis.recommendations;
  personalityAdjustments = analysis.personalityAdjustments;

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

  // Auto-apply personality adjustment when the model is highly confident:
  // - suggestedMode returned directly by GPT (no keyword fallback needed)
  // - confidenceScore >= 7 (model is sure)
  // - minimum 10 responses (avoids drift from tiny samples)
  // - average score below 6.5 (AI is underperforming — adjustment is warranted)
  const { suggestedMode, confidenceScore, keyAdjustments } = analysis;
  const enoughData      = scores.length >= 10;
  const underperforming = avgScore < 6.5;
  const highConfidence  = confidenceScore >= 7;

  if (suggestedMode && enoughData && underperforming && highConfidence) {
    try {
      await db
        .update(aiPersonaConfigsTable)
        .set({ personalityType: suggestedMode })
        .where(eq(aiPersonaConfigsTable.streamerId, opts.streamerId));
      console.log(
        `[LearningAgent] ✅ auto-applied personality → mode="${suggestedMode}" confidence=${confidenceScore}/10 | responses=${scores.length} avgScore=${avgScore.toFixed(2)} streamer=${opts.streamerId}`,
      );
    } catch (err) {
      console.error("[LearningAgent] personality auto-apply error:", (err as Error)?.message);
    }
  } else if (suggestedMode) {
    console.log(
      `[LearningAgent] ⏭ personality adjustment "${suggestedMode}" skipped — confidence=${confidenceScore}/10 responses=${scores.length} avgScore=${avgScore.toFixed(2)} (need: conf≥7 + data≥10 + score<6.5)`,
    );
  }

  // Apply key behavioral adjustments to ai_persona_configs even without a mode change
  if (Object.keys(keyAdjustments).length > 0) {
    console.log(
      `[LearningAgent] 🔧 keyAdjustments: energy=${keyAdjustments.energyLevel ?? "—"} length=${keyAdjustments.responseLength ?? "—"} humor=${keyAdjustments.humorLevel ?? "—"}`,
    );
    // Store as a stream memory so the next session's prompt can reference recent coaching
    await storeMemory({
      streamerId: opts.streamerId,
      memoryType: "preference",
      key:        "last_session_coaching",
      value:      `energy:${keyAdjustments.energyLevel ?? "maintain"} responseLength:${keyAdjustments.responseLength ?? "maintain"} humor:${keyAdjustments.humorLevel ?? "maintain"} (session ${opts.sessionId}, avgScore ${avgScore.toFixed(1)})`,
      importance: 4,
    });
  }

  console.log(`[LearningAgent] Report generated for session ${opts.sessionId}: ${scores.length} responses, avg ${avgScore.toFixed(2)}${suggestedMode ? ` | auto-adjusted personality → ${suggestedMode}` : ""}`);

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
