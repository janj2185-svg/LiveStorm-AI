import { Router } from "express";
import { ingestLiveEvent } from "../lib/socketServer";
import { db, usersTable, streamersTable, aiMemoriesTable, agentViewerProfilesTable, aiResponseScoresTable, aiAgentTasksTable, battleTranscriptsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getActivePersonality, setActivePersonality, BUILT_IN_PERSONALITIES } from "../agents/personalityAgent";
import { getActiveVoice, VOICE_CATALOG } from "../agents/voiceAgent";
import { getMemoryContext, storeMemory } from "../agents/memoryAgent";
import { runHostAgent } from "../agents/hostAgent";
import { runLearningAgent } from "../agents/learningAgent";
import { setBattleMode, generateBattleReply, getBattleScore } from "../agents/battleAgent";
import { triggerLearningAgent } from "../agents/agentOrchestrator";
import { classifyEvent } from "../agents/chatAgent";

const router = Router();

if (process.env.NODE_ENV !== "production") {

  // ── Inject TikTok event (existing) ──────────────────────────────────────────
  router.post("/dev/inject-event", async (req: any, res: any) => {
    try {
      const { sessionId, userId, type, username, text, giftName, coins, likeCount } = req.body;
      if (!sessionId || !userId || !type) {
        return res.status(400).json({ error: "sessionId, userId, type required" });
      }
      const validTypes = ["comment", "gift", "like", "follow", "share", "viewerCount"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
      }

      let data: Record<string, unknown> = {};
      if (type === "comment") data = { text: text ?? "test comment" };
      else if (type === "gift") data = { giftName: giftName ?? "Rose", coins: coins ?? 1, count: 1 };
      else if (type === "like") data = { likeCount: likeCount ?? 1 };
      else if (type === "viewerCount") data = { count: likeCount ?? 10 };

      await ingestLiveEvent({
        type,
        sessionId: Number(sessionId),
        username: username ?? "test_user",
        data,
        timestamp: Date.now(),
      }, Number(userId));

      res.json({ ok: true, type, sessionId: Number(sessionId), username: username ?? "test_user", data });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Dev login ────────────────────────────────────────────────────────────────
  router.get("/dev/login", async (_req: any, res: any) => {
    try {
      const streamer = await db.query.streamersTable.findFirst({
        where: eq(streamersTable.id, 4),
      });
      if (!streamer) return res.status(404).json({ error: "Dev streamer not found" });

      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, streamer.userId),
      });
      if (!user) return res.status(404).json({ error: "Dev user not found" });

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      };
      res.cookie("dev_auth_clerk_id", user.clerkId, cookieOpts);
      res.json({ ok: true, streamerId: streamer.id, userId: user.id });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get("/dev/logout", (_req: any, res: any) => {
    res.clearCookie("dev_auth_clerk_id", { path: "/" });
    res.json({ ok: true });
  });

  // ── AGENT PROOF: Personality test ────────────────────────────────────────────
  // Tests the same comment through all 4 personalities and returns each reply.
  router.post("/dev/personality-test", async (req: any, res: any) => {
    try {
      const { streamerId = 4, sessionId = 50, comment = "What's your best advice for beginners?" } = req.body;

      const results: Record<string, { personality: string; tone: string; reply: string; emotion: string }> = {};
      const modes = ["friendly", "professional", "funny", "savage"] as const;

      for (const mode of modes) {
        await setActivePersonality(streamerId, mode);
        const personality = await getActivePersonality(streamerId);

        const fakeEvent = {
          type: "comment" as const,
          sessionId: Number(sessionId),
          username: "test_viewer",
          data: { text: comment },
          timestamp: Date.now(),
        };

        const hostResult = await runHostAgent({
          event: fakeEvent,
          streamerId: Number(streamerId),
          personaName: "LiveStorm AI",
          personality,
          memoryContext: "",
          replyLanguage: "auto",
        });

        results[mode] = {
          personality: personality.modeName,
          tone: personality.toneGuide,
          reply: hostResult?.text ?? "(no reply)",
          emotion: hostResult?.emotion ?? "neutral",
        };
      }

      res.json({ ok: true, comment, results });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Priority classification test ─────────────────────────────────
  // Sends multiple comments and shows priority score + shouldReply for each.
  router.post("/dev/priority-test", async (req: any, res: any) => {
    try {
      const { streamerId = 4, sessionId = 50 } = req.body;

      const testComments = [
        { username: "fan123", text: "lol" },
        { username: "superfan", text: "How do you stay so motivated every day? Serious question!" },
        { username: "spammer", text: "follow me follow me follow me follow me" },
        { username: "vip_viewer", text: "What's the secret to your success?" },
        { username: "gift_fan", text: "I sent you a gift!" },
        { username: "newbie", text: "First time watching, this is amazing!!!" },
        { username: "troll", text: "you suck lmao" },
        { username: "loyal", text: "Been here since day 1, you're the best!" },
      ];

      const results = [];

      for (const c of testComments) {
        const fakeEvent = {
          type: "comment" as const,
          sessionId: Number(sessionId),
          username: c.username,
          data: { text: c.text },
          timestamp: Date.now(),
        };
        const classification = await classifyEvent(fakeEvent, Number(streamerId));
        results.push({
          username: c.username,
          comment: c.text,
          priority: classification.priority,
          priorityReason: classification.reason,
          agentType: classification.agentType,
          isQuestion: classification.isQuestion,
          isVip: classification.isVip,
          willReply: classification.agentType !== "moderation" && classification.priority <= 4,
        });
      }

      results.sort((a, b) => a.priority - b.priority);
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Voice catalog ────────────────────────────────────────────────
  // Shows all available voices and the active voice for the streamer.
  router.get("/dev/voice-catalog", async (req: any, res: any) => {
    try {
      const streamerId = Number(req.query.streamerId ?? 4);
      const personality = await getActivePersonality(streamerId);
      const activeVoice = await getActiveVoice(streamerId, personality.modeKey);

      res.json({
        ok: true,
        availableVoices: Object.values(VOICE_CATALOG),
        activeVoice,
        activePersonality: { mode: personality.modeKey, modeName: personality.modeName },
        ttsProvider: "OpenAI",
        voiceKeys: Object.keys(VOICE_CATALOG),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Memory agent ─────────────────────────────────────────────────
  // Writes a test memory, then reads it back. Also returns DB records.
  router.post("/dev/memory-test", async (req: any, res: any) => {
    try {
      const { streamerId = 4, viewerName = "test_viewer" } = req.body;

      await storeMemory({
        streamerId: Number(streamerId),
        memoryType: "viewer",
        key: `viewer_${viewerName}_test`,
        value: `${viewerName} is a loyal fan who loves coding tips. VIP gifter. First visited: ${new Date().toISOString()}`,
        viewerName,
        importance: 4,
      });

      const context = await getMemoryContext(Number(streamerId), viewerName);

      const dbMemories = await db.query.aiMemoriesTable.findMany({
        where: eq(aiMemoriesTable.streamerId, Number(streamerId)),
        orderBy: [desc(aiMemoriesTable.updatedAt)],
        limit: 10,
      });

      const viewerProfiles = await db.query.agentViewerProfilesTable.findMany({
        where: eq(agentViewerProfilesTable.streamerId, Number(streamerId)),
        orderBy: [desc(agentViewerProfilesTable.createdAt)],
        limit: 10,
      }).catch(() => []);

      res.json({
        ok: true,
        stored: true,
        memoryContext: context,
        dbMemories: dbMemories.map((m) => ({
          id: m.id,
          type: m.memoryType,
          key: m.key,
          value: m.value,
          viewerName: m.viewerName,
          importance: m.importance,
          updatedAt: m.updatedAt,
        })),
        viewerProfiles,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Battle agent ─────────────────────────────────────────────────
  // Activates battle mode for a session and generates a battle reply.
  router.post("/dev/battle-test", async (req: any, res: any) => {
    try {
      const {
        streamerId = 4,
        sessionId = 50,
        opponentStatement = "My viewers love me way more than yours!",
      } = req.body;

      setBattleMode(Number(sessionId), true);

      const personality = await getActivePersonality(Number(streamerId));

      const battleResult = await generateBattleReply({
        sessionId: Number(sessionId),
        streamerId: Number(streamerId),
        opponentStatement,
        personaName: "LiveStorm AI",
        personality,
        replyLanguage: "auto",
      });

      const transcripts = await db.query.battleTranscriptsTable.findMany({
        where: eq(battleTranscriptsTable.sessionId, Number(sessionId)),
        orderBy: [desc(battleTranscriptsTable.createdAt)],
        limit: 10,
      });

      res.json({
        ok: true,
        battleActive: true,
        sessionId: Number(sessionId),
        opponentStatement,
        battleReply: battleResult.suggestedReply,
        shouldSpeak: battleResult.shouldSpeak,
        context: battleResult.context,
        personality: personality.modeKey,
        score: getBattleScore(Number(sessionId)),
        dbTranscripts: transcripts,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Learning agent ───────────────────────────────────────────────
  // Triggers the learning agent for a session and returns the report.
  router.post("/dev/learning-test", async (req: any, res: any) => {
    try {
      const { streamerId = 4, sessionId = 50 } = req.body;

      const scores = await db.query.aiResponseScoresTable.findMany({
        where: and(
          eq(aiResponseScoresTable.sessionId, Number(sessionId)),
          eq(aiResponseScoresTable.streamerId, Number(streamerId)),
        ),
        orderBy: [desc(aiResponseScoresTable.createdAt)],
        limit: 20,
      });

      const report = await runLearningAgent({
        sessionId: Number(sessionId),
        streamerId: Number(streamerId),
      });

      res.json({
        ok: true,
        sessionId: Number(sessionId),
        scoredResponseCount: scores.length,
        sampleScores: scores.slice(0, 5).map((s) => ({
          agentType: s.agentType,
          triggerEvent: s.triggerEvent,
          aiResponse: s.aiResponse.slice(0, 80),
          score: s.score,
          createdAt: s.createdAt,
        })),
        report: report ?? { note: "No scored responses yet — inject events first to build score data" },
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Orchestrator task log ────────────────────────────────────────
  // Returns recent agent task log records from the DB.
  router.get("/dev/agent-tasks", async (req: any, res: any) => {
    try {
      const streamerId = Number(req.query.streamerId ?? 4);
      const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;
      const limit = Number(req.query.limit ?? 20);

      const where = sessionId
        ? and(eq(aiAgentTasksTable.streamerId, streamerId), eq(aiAgentTasksTable.sessionId, sessionId))
        : eq(aiAgentTasksTable.streamerId, streamerId);

      const tasks = await db.query.aiAgentTasksTable.findMany({
        where,
        orderBy: [desc(aiAgentTasksTable.createdAt)],
        limit,
      });

      res.json({
        ok: true,
        count: tasks.length,
        tasks: tasks.map((t) => ({
          id: t.id,
          agentType: t.agentType,
          eventType: t.eventType,
          priority: t.priority,
          status: t.status,
          input: t.input,
          output: t.output,
          processedAt: t.processedAt,
          createdAt: t.createdAt,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── AGENT PROOF: Full pipeline test ──────────────────────────────────────────
  // Runs orchestrator + all agents with a single test comment, returns full trace.
  router.post("/dev/full-pipeline-test", async (req: any, res: any) => {
    try {
      const { streamerId = 4, sessionId = 50, comment = "You're amazing! What's your top tip for growing on TikTok?" } = req.body;

      const trace: string[] = [];

      const fakeEvent = {
        type: "comment" as const,
        sessionId: Number(sessionId),
        username: "pipeline_tester",
        data: { text: comment },
        timestamp: Date.now(),
      };

      trace.push(`[1] Event: ${comment}`);

      const classification = await classifyEvent(fakeEvent, Number(streamerId));
      trace.push(`[2] Priority: ${classification.priority} | reason: ${classification.reason} | agent: ${classification.agentType}`);

      const personality = await getActivePersonality(Number(streamerId));
      trace.push(`[3] Personality: ${personality.modeKey} — ${personality.toneGuide}`);

      const voice = await getActiveVoice(Number(streamerId), personality.modeKey);
      trace.push(`[4] Voice: ${voice.voiceKey} (speed=${voice.speed}) — ${voice.description}`);

      const memoryCtx = await getMemoryContext(Number(streamerId), "pipeline_tester");
      trace.push(`[5] Memory: ${memoryCtx.length > 0 ? `${memoryCtx.length} chars loaded` : "no prior memory"}`);

      const hostResult = await runHostAgent({
        event: fakeEvent,
        streamerId: Number(streamerId),
        personaName: "LiveStorm AI",
        personality,
        memoryContext: memoryCtx,
        replyLanguage: "auto",
      });

      trace.push(`[6] Host Agent reply: "${hostResult?.text ?? "(none)"}"`);
      trace.push(`[7] Emotion: ${hostResult?.emotion ?? "neutral"}`);

      res.json({
        ok: true,
        comment,
        sessionId: Number(sessionId),
        streamerId: Number(streamerId),
        trace,
        classification,
        personality: { mode: personality.modeKey, modeName: personality.modeName, tone: personality.toneGuide },
        voice: { voiceKey: voice.voiceKey, speed: voice.speed, description: voice.description },
        memoryContextLength: memoryCtx.length,
        reply: hostResult?.text,
        emotion: hostResult?.emotion,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}

export default router;
