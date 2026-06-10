import { Router } from "express";
import { db, sessionsTable, streamersTable, aiGeneratedContentTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";
import { generateAnalyticsInsights } from "../lib/aiService";

const router = Router();

const INSIGHTS_TYPE = "analytics_insights";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── GET /analytics/insights ───────────────────────────────────────────────────
router.get("/analytics/insights", requireAuth, async (req: any, res: any) => {
  try {
    const user = await getOrCreateUser(req.clerkUserId);
    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.userId, user.id),
    });
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const forceRefresh = req.query.refresh === "true";

    // Fetch last 7 completed sessions for this streamer
    const sessions = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.streamerId, streamer.id))
      .orderBy(desc(sessionsTable.startedAt))
      .limit(7);

    if (sessions.length < 2) {
      return res.json({ insights: null, tooFewSessions: true, sessionCount: sessions.length });
    }

    // Check cache unless refresh is forced
    if (!forceRefresh) {
      const cached = await db.query.aiGeneratedContentTable.findFirst({
        where: and(
          eq(aiGeneratedContentTable.streamerId, streamer.id),
          eq(aiGeneratedContentTable.contentType, INSIGHTS_TYPE),
        ),
        orderBy: [desc(aiGeneratedContentTable.createdAt)],
      });

      if (cached) {
        const age = Date.now() - new Date(cached.createdAt).getTime();
        if (age < CACHE_TTL_MS) {
          try {
            const insights = JSON.parse(cached.content);
            return res.json({
              insights,
              tooFewSessions: false,
              cachedAt: cached.createdAt,
              fromCache: true,
            });
          } catch {
            // Corrupt cache — fall through to regenerate
          }
        }
      }
    }

    // Compute summary stats for the prompt
    const sessionData = sessions.map((s) => {
      const durationMin = s.endedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
        : null;
      return {
        date: new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        duration_minutes: durationMin,
        peak_viewers: s.peakViewers,
        gifts: s.totalGifts,
        likes: s.totalLikes,
        comments: s.totalComments,
        follows: s.totalFollowers,
        shares: s.totalShares,
      };
    });

    const avgPeakViewers = Math.round(
      sessionData.reduce((s, x) => s + x.peak_viewers, 0) / sessionData.length,
    );
    const totalGifts = sessionData.reduce((s, x) => s + x.gifts, 0);
    const avgDuration = sessionData.filter((x) => x.duration_minutes !== null).length
      ? Math.round(
          sessionData.filter((x) => x.duration_minutes !== null).reduce((s, x) => s + (x.duration_minutes ?? 0), 0) /
            sessionData.filter((x) => x.duration_minutes !== null).length,
        )
      : null;
    const bestSession = [...sessionData].sort((a, b) => b.peak_viewers - a.peak_viewers)[0];

    const summaryStats = {
      total_sessions_analyzed: sessionData.length,
      avg_peak_viewers: avgPeakViewers,
      total_gifts_earned: totalGifts,
      avg_session_duration_minutes: avgDuration,
      best_session_date: bestSession?.date,
      best_session_peak_viewers: bestSession?.peak_viewers,
    };

    // Generate insights via OpenAI
    const insights = await generateAnalyticsInsights({ sessionData, summaryStats });

    // Store in cache
    const contentJson = JSON.stringify(insights);
    const promptSummary = `streamer_id:${streamer.id}|sessions:${sessions.length}|avg_viewers:${avgPeakViewers}`;
    await db.insert(aiGeneratedContentTable).values({
      streamerId: streamer.id,
      contentType: INSIGHTS_TYPE,
      prompt: promptSummary.slice(0, 500),
      content: contentJson.slice(0, 20000),
    });

    res.json({ insights, tooFewSessions: false, fromCache: false });
  } catch (err: any) {
    console.error("[Analytics] insights error:", err?.message);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

export default router;
