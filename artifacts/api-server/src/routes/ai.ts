import { Router } from "express";
import { db } from "@workspace/db";
import {
  streamersTable,
  aiPersonaConfigsTable,
  aiMessagesTable,
  aiQuestsTable,
  aiModerationLogsTable,
  sessionsTable,
} from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";
import {
  chatWithAssistant,
  generateQuests,
  generateEvent,
} from "../lib/aiService";

const router = Router();

async function getStreamer(clerkId: string) {
  const user = await getOrCreateUser(clerkId);
  const streamer = await db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, user.id),
  });
  return { user, streamer };
}

async function getOrCreatePersona(streamerId: number) {
  let persona = await db.query.aiPersonaConfigsTable.findFirst({
    where: eq(aiPersonaConfigsTable.streamerId, streamerId),
  });
  if (!persona) {
    [persona] = await db
      .insert(aiPersonaConfigsTable)
      .values({ streamerId })
      .returning();
  }
  return persona!;
}

router.get("/ai/config", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });
    const persona = await getOrCreatePersona(streamer.id);
    res.json(persona);
  } catch {
    res.status(500).json({ error: "Failed to get AI config" });
  }
});

router.put("/ai/config", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const {
      personaName,
      tone,
      announceGifts,
      announceGiftThreshold,
      announceLevelUp,
      announceBossKill,
      moderationEnabled,
    } = req.body;

    const existing = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamer.id),
    });

    const updates: any = { updatedAt: new Date() };
    if (personaName !== undefined) updates.personaName = personaName;
    if (tone !== undefined) updates.tone = tone;
    if (announceGifts !== undefined) updates.announceGifts = announceGifts;
    if (announceGiftThreshold !== undefined) updates.announceGiftThreshold = announceGiftThreshold;
    if (announceLevelUp !== undefined) updates.announceLevelUp = announceLevelUp;
    if (announceBossKill !== undefined) updates.announceBossKill = announceBossKill;
    if (moderationEnabled !== undefined) updates.moderationEnabled = moderationEnabled;

    if (existing) {
      const [updated] = await db
        .update(aiPersonaConfigsTable)
        .set(updates)
        .where(eq(aiPersonaConfigsTable.streamerId, streamer.id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(aiPersonaConfigsTable)
        .values({ streamerId: streamer.id, ...updates })
        .returning();
      res.json(created);
    }
  } catch {
    res.status(500).json({ error: "Failed to update AI config" });
  }
});

router.get("/ai/messages", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const messages = await db
      .select()
      .from(aiMessagesTable)
      .where(eq(aiMessagesTable.streamerId, streamer.id))
      .orderBy(asc(aiMessagesTable.createdAt))
      .limit(100);

    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to get messages" });
  }
});

router.delete("/ai/messages", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });
    await db.delete(aiMessagesTable).where(eq(aiMessagesTable.streamerId, streamer.id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear messages" });
  }
});

router.post("/ai/chat", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { message, sessionContext } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    const persona = await getOrCreatePersona(streamer.id);

    const history = await db
      .select()
      .from(aiMessagesTable)
      .where(eq(aiMessagesTable.streamerId, streamer.id))
      .orderBy(desc(aiMessagesTable.createdAt))
      .limit(20);

    const orderedHistory = history
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    await db
      .insert(aiMessagesTable)
      .values({ streamerId: streamer.id, role: "user", content: message.trim() });

    const reply = await chatWithAssistant(
      orderedHistory,
      message.trim(),
      { name: persona.personaName, tone: persona.tone },
      sessionContext,
    );

    await db
      .insert(aiMessagesTable)
      .values({ streamerId: streamer.id, role: "assistant", content: reply });

    res.json({ reply, personaName: persona.personaName });
  } catch {
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

router.post("/ai/generate-quests", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { sessionId, viewerCount, sessionStats } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const persona = await getOrCreatePersona(streamer.id);

    const quests = await generateQuests({
      sessionStats: sessionStats ?? { gifts: 0, comments: 0, likes: 0, followers: 0 },
      viewerCount: viewerCount ?? streamer.viewerCount ?? 10,
      persona: { name: persona.personaName, tone: persona.tone },
    });

    const inserted = await db
      .insert(aiQuestsTable)
      .values(quests.map((q) => ({ sessionId: Number(sessionId), streamerId: streamer.id, ...q })))
      .returning();

    res.json(inserted);
  } catch {
    res.status(500).json({ error: "Failed to generate quests" });
  }
});

router.get("/ai/quests", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const session = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.id, Number(sessionId)),
    });
    if (!session || session.streamerId !== streamer.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const quests = await db
      .select()
      .from(aiQuestsTable)
      .where(eq(aiQuestsTable.sessionId, Number(sessionId)))
      .orderBy(asc(aiQuestsTable.createdAt));

    res.json(quests);
  } catch {
    res.status(500).json({ error: "Failed to get quests" });
  }
});

router.post("/ai/generate-event", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { currentViewers, sessionStats } = req.body;
    const persona = await getOrCreatePersona(streamer.id);

    const event = await generateEvent({
      currentViewers: currentViewers ?? streamer.viewerCount ?? 0,
      sessionStats: sessionStats ?? { gifts: 0, comments: 0, likes: 0 },
      persona: { name: persona.personaName, tone: persona.tone },
    });

    res.json(event);
  } catch {
    res.status(500).json({ error: "Failed to generate event" });
  }
});

router.get("/ai/moderation-log", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { sessionId } = req.query;

    if (sessionId) {
      const session = await db.query.sessionsTable.findFirst({
        where: eq(sessionsTable.id, Number(sessionId)),
      });
      if (!session || session.streamerId !== streamer.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const logs = await db
      .select()
      .from(aiModerationLogsTable)
      .where(
        sessionId
          ? eq(aiModerationLogsTable.sessionId, Number(sessionId))
          : eq(aiModerationLogsTable.streamerId, streamer.id),
      )
      .orderBy(desc(aiModerationLogsTable.flaggedAt))
      .limit(50);

    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed to get moderation log" });
  }
});

export default router;
