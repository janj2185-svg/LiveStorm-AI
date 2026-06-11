import OpenAI from "openai";
import { db, aiResponseScoresTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { storeMemory } from "./memoryAgent";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export interface StreamMetrics {
  totalGifts: number;
  totalComments: number;
  totalFollows: number;
  totalLikes: number;
  totalShares: number;
  peakViewers: number;
  currentViewers: number;
  sessionDurationMinutes: number;
}

export interface StrategySuggestion {
  type: "topic" | "game" | "engagement" | "joke" | "callout";
  suggestion: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
}

const sessionMetricsCache = new Map<number, { metrics: StreamMetrics; lastSuggestion: number; recentEvents: string[] }>();
const STRATEGY_COOLDOWN = 5 * 60 * 1000;

export function trackStreamEvent(sessionId: number, eventType: string, value: number = 1): void {
  let entry = sessionMetricsCache.get(sessionId);
  if (!entry) {
    entry = {
      metrics: { totalGifts: 0, totalComments: 0, totalFollows: 0, totalLikes: 0, totalShares: 0, peakViewers: 0, currentViewers: 0, sessionDurationMinutes: 0 },
      lastSuggestion: 0,
      recentEvents: [],
    };
    sessionMetricsCache.set(sessionId, entry);
  }

  const m = entry.metrics;
  switch (eventType) {
    case "gift":    m.totalGifts += value; break;
    case "comment": m.totalComments += value; break;
    case "follow":  m.totalFollows += value; break;
    case "like":    m.totalLikes += value; break;
    case "share":   m.totalShares += value; break;
    case "viewer":  m.currentViewers = value; m.peakViewers = Math.max(m.peakViewers, value); break;
  }

  entry.recentEvents.push(`${eventType}:${value}`);
  if (entry.recentEvents.length > 30) entry.recentEvents.shift();
}

export async function shouldGenerateSuggestion(sessionId: number): Promise<boolean> {
  const entry = sessionMetricsCache.get(sessionId);
  if (!entry) return false;
  return Date.now() - entry.lastSuggestion > STRATEGY_COOLDOWN;
}

export async function generateStrategySuggestion(opts: {
  sessionId: number;
  streamerId: number;
  personaName: string;
}): Promise<StrategySuggestion | null> {
  const entry = sessionMetricsCache.get(opts.sessionId);
  if (!entry) return null;

  entry.lastSuggestion = Date.now();
  const m = entry.metrics;

  const prompt = `Stream performance for session ${opts.sessionId}:
- Gifts: ${m.totalGifts}, Comments: ${m.totalComments}, Follows: ${m.totalFollows}
- Likes: ${m.totalLikes}, Shares: ${m.totalShares}
- Viewers: ${m.currentViewers} (peak: ${m.peakViewers})
- Recent events: ${entry.recentEvents.slice(-10).join(", ")}

The AI co-host is "${opts.personaName}". Suggest ONE specific action to boost engagement right now.
Return JSON: {"type": "topic|game|engagement|joke|callout", "suggestion": "...", "reasoning": "...", "priority": "high|medium|low"}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      messages: [
        { role: "system", content: "You are a TikTok LIVE strategy coach. Analyze stream performance and suggest specific engagement tactics." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as StrategySuggestion;

    await storeMemory({
      streamerId: opts.streamerId,
      memoryType: "stream",
      key: `strategy_${Date.now()}`,
      value: `Strategy suggestion: ${parsed.suggestion}`,
      importance: 2,
    });

    return parsed;
  } catch (err: unknown) {
    console.error("[StrategyAgent] error:", (err as Error)?.message);
    return null;
  }
}

export async function scoreResponse(opts: {
  sessionId: number;
  streamerId: number;
  agentType: string;
  triggerEvent: string;
  aiResponse: string;
  engagementDelta?: number;
}): Promise<void> {
  await db.insert(aiResponseScoresTable).values({
    sessionId: opts.sessionId,
    streamerId: opts.streamerId,
    agentType: opts.agentType,
    triggerEvent: opts.triggerEvent,
    aiResponse: opts.aiResponse,
    score: 5.0,
    engagementDelta: opts.engagementDelta ?? 0,
  }).catch(() => {});
}

export async function getRecentScores(streamerId: number, sessionId?: number) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = sessionId
    ? and(eq(aiResponseScoresTable.streamerId, streamerId), eq(aiResponseScoresTable.sessionId, sessionId))
    : and(eq(aiResponseScoresTable.streamerId, streamerId), gte(aiResponseScoresTable.createdAt, since));

  return db.query.aiResponseScoresTable.findMany({
    where,
    orderBy: [desc(aiResponseScoresTable.createdAt)],
    limit: 100,
  });
}

export function clearSessionMetrics(sessionId: number): void {
  sessionMetricsCache.delete(sessionId);
}
