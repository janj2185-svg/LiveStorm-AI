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
import { eq, desc, asc, and } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "./users";
import {
  chatWithAssistant,
  generateQuests,
  generateEvent,
  generateVoice,
  generateCommentReply,
} from "../lib/aiService";
import { getIO } from "../lib/socketServer";

const router = Router();

const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type VoiceOption = (typeof VALID_VOICES)[number];

const VALID_LANGUAGES = ["auto", "en", "uk", "pl", "ru"] as const;
type LangOption = (typeof VALID_LANGUAGES)[number];

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

// ── GET /ai/config ─────────────────────────────────────────────────────────────
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

// ── PUT /ai/config ─────────────────────────────────────────────────────────────
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
      autoReplyEnabled,
      replyLanguage,
      spamProtectionEnabled,
      spamCooldownSeconds,
      voiceEnabled,
      voiceName,
    } = req.body;

    const existing = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamer.id),
    });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (personaName !== undefined) updates.personaName = String(personaName).slice(0, 50);
    if (tone !== undefined) updates.tone = tone;
    if (announceGifts !== undefined) updates.announceGifts = Boolean(announceGifts);
    if (announceGiftThreshold !== undefined) updates.announceGiftThreshold = Math.max(0, Number(announceGiftThreshold));
    if (announceLevelUp !== undefined) updates.announceLevelUp = Boolean(announceLevelUp);
    if (announceBossKill !== undefined) updates.announceBossKill = Boolean(announceBossKill);
    if (moderationEnabled !== undefined) updates.moderationEnabled = Boolean(moderationEnabled);
    if (autoReplyEnabled !== undefined) updates.autoReplyEnabled = Boolean(autoReplyEnabled);
    if (replyLanguage !== undefined && VALID_LANGUAGES.includes(replyLanguage)) {
      updates.replyLanguage = replyLanguage as LangOption;
    }
    if (spamProtectionEnabled !== undefined) updates.spamProtectionEnabled = Boolean(spamProtectionEnabled);
    if (spamCooldownSeconds !== undefined) {
      updates.spamCooldownSeconds = Math.max(5, Math.min(300, Number(spamCooldownSeconds)));
    }
    if (voiceEnabled !== undefined) updates.voiceEnabled = Boolean(voiceEnabled);
    if (voiceName !== undefined && VALID_VOICES.includes(voiceName)) {
      updates.voiceName = voiceName as VoiceOption;
    }

    let result;
    if (existing) {
      [result] = await db
        .update(aiPersonaConfigsTable)
        .set(updates)
        .where(eq(aiPersonaConfigsTable.streamerId, streamer.id))
        .returning();
    } else {
      [result] = await db
        .insert(aiPersonaConfigsTable)
        .values({ streamerId: streamer.id, ...updates })
        .returning();
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to update AI config" });
  }
});

// ── POST /ai/reply-to-comment ──────────────────────────────────────────────────
// Manual one-shot reply: streamer clicks a specific viewer comment to reply
router.post("/ai/reply-to-comment", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { comment, viewerName, sessionId, language } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: "comment is required" });
    if (!viewerName?.trim()) return res.status(400).json({ error: "viewerName is required" });

    const persona = await getOrCreatePersona(streamer.id);
    const safeLanguage = VALID_LANGUAGES.includes(language) ? language : (persona.replyLanguage ?? "auto");

    const reply = await generateCommentReply(
      String(comment).trim(),
      String(viewerName).trim(),
      { name: persona.personaName, tone: persona.tone },
      safeLanguage,
    );

    if (!reply) {
      return res.status(503).json({ error: "AI reply generation failed" });
    }

    // Emit to the session room so OBS overlays + other clients see it
    if (sessionId) {
      const session = await db.query.sessionsTable.findFirst({
        where: eq(sessionsTable.id, Number(sessionId)),
      });
      if (session && session.streamerId === streamer.id && !session.endedAt) {
        const io = getIO();
        if (io) {
          io.to(`session:${session.id}`).emit("ai:announcement", {
            text: reply,
            type: "comment_reply",
            viewerName: String(viewerName).trim(),
          });
        }
      }
    }

    res.json({ reply, viewerName: String(viewerName).trim(), language: safeLanguage });
  } catch {
    res.status(500).json({ error: "Failed to generate reply" });
  }
});

// ── GET /ai/messages ───────────────────────────────────────────────────────────
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

// ── DELETE /ai/messages ────────────────────────────────────────────────────────
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

// ── POST /ai/chat ──────────────────────────────────────────────────────────────
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

// ── POST /ai/generate-quests ───────────────────────────────────────────────────
router.post("/ai/generate-quests", requireAuth, async (req: any, res: any) => {
  try {
    const { streamer } = await getStreamer(req.clerkUserId);
    if (!streamer) return res.status(404).json({ error: "Streamer profile not found" });

    const { sessionId, viewerCount, sessionStats } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

    const session = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.id, Number(sessionId)),
    });
    if (!session || session.streamerId !== streamer.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const persona = await getOrCreatePersona(streamer.id);

    const quests = await generateQuests({
      sessionStats: sessionStats ?? { gifts: 0, comments: 0, likes: 0, followers: 0 },
      viewerCount: viewerCount ?? streamer.viewerCount ?? 10,
      persona: { name: persona.personaName, tone: persona.tone },
    });

    await db
      .delete(aiQuestsTable)
      .where(
        and(
          eq(aiQuestsTable.sessionId, Number(sessionId)),
          eq(aiQuestsTable.streamerId, streamer.id),
        ),
      );

    const inserted = await db
      .insert(aiQuestsTable)
      .values(quests.map((q) => ({ sessionId: Number(sessionId), streamerId: streamer.id, ...q })))
      .returning();

    res.json(inserted);
  } catch {
    res.status(500).json({ error: "Failed to generate quests" });
  }
});

// ── GET /ai/quests ─────────────────────────────────────────────────────────────
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

// ── POST /ai/generate-event ────────────────────────────────────────────────────
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

// ── POST /ai/voice ─────────────────────────────────────────────────────────────
router.post("/ai/voice", requireAuth, async (req: any, res: any) => {
  try {
    const { text, voice } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });

    const safeVoice: VoiceOption = VALID_VOICES.includes(voice) ? voice : "nova";
    const audioBuffer = await generateVoice(text.trim(), safeVoice);

    if (!audioBuffer) {
      return res.status(503).json({ error: "Voice generation failed. Check OpenAI configuration." });
    }

    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", String(audioBuffer.length));
    res.set("Cache-Control", "no-store");
    res.send(audioBuffer);
  } catch (err: any) {
    console.error("[AI] /ai/voice error:", err?.message);
    res.status(500).json({ error: "Failed to generate voice" });
  }
});

// ── GET /ai/moderation-log ─────────────────────────────────────────────────────
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
