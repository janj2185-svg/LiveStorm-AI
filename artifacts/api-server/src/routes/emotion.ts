import { Router } from "express";
import { db, sessionsTable, streamersTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireAuth } from "./users";
import { getEmotionalState, EMOTION_META } from "../agents/emotionEngine";

const router = Router();

router.get("/emotion/state", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const streamer = await db.query.streamersTable.findFirst({
      where: eq(streamersTable.clerkUserId, userId),
    });
    if (!streamer) return res.status(404).json({ error: "Streamer not found" });

    const activeSession = await db.query.sessionsTable.findFirst({
      where: and(
        eq(sessionsTable.streamerId, streamer.id),
        isNull(sessionsTable.endedAt),
      ),
      orderBy: [desc(sessionsTable.startedAt)],
    });

    if (!activeSession) {
      return res.json({
        active: false,
        state:  null,
      });
    }

    const state = getEmotionalState(activeSession.id);
    const meta  = EMOTION_META[state.primary];

    return res.json({
      active: true,
      state: {
        ...state,
        emoji:    meta.emoji,
        label:    meta.label,
        color:    meta.color,
        bgClass:  meta.bgClass,
      },
    });
  } catch (err: unknown) {
    console.error("[Emotion:Route] error:", (err as Error)?.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
