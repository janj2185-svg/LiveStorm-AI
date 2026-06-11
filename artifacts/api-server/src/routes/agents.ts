import { Router } from "express";
import { requireAuth, getOrCreateUser } from "./users";
import { db, streamersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getAgentConfigs,
  updateAgentEnabled,
  getRecentTasks,
  AGENT_TYPES,
  AGENT_DESCRIPTIONS,
  triggerLearningAgent,
} from "../agents/agentOrchestrator";
import {
  getActivePersonality,
  setActivePersonality,
  BUILT_IN_PERSONALITIES,
} from "../agents/personalityAgent";
import {
  getActiveVoice,
  setDefaultVoice,
  listVoiceProfiles,
  VOICE_CATALOG,
} from "../agents/voiceAgent";
import {
  listMemories,
  storeMemory,
} from "../agents/memoryAgent";
import {
  getLearningReports,
} from "../agents/learningAgent";
import {
  getRecentScores,
} from "../agents/strategyAgent";
import {
  setBattleMode,
  isBattleActive,
  generateBattleReply,
  getBattleTranscripts,
  addBattleTranscript,
} from "../agents/battleAgent";
import { getActivePersonality as getPersonality } from "../agents/personalityAgent";
import { db as dbInstance, chatPriorityQueueTable, aiPersonalityModesTable, agentViewerProfilesTable as viewerProfilesTable } from "@workspace/db";
import { desc, and } from "drizzle-orm";

const router = Router();

async function getStreamerId(userId: number): Promise<number | null> {
  const streamer = await db.query.streamersTable.findFirst({
    where: eq(streamersTable.userId, userId),
  });
  return streamer?.id ?? null;
}

router.get("/agents", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const savedConfigs = await getAgentConfigs(streamerId);
  const configMap = Object.fromEntries(savedConfigs.map((c) => [c.agentType, c]));

  const agents = AGENT_TYPES.map((type) => ({
    type,
    ...(AGENT_DESCRIPTIONS[type] ?? {}),
    isEnabled: configMap[type]?.isEnabled ?? true,
    priority: configMap[type]?.priority ?? 5,
    config: configMap[type]?.config ?? {},
  }));

  return res.json({ agents });
});

router.put("/agents/:agentType", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { agentType } = req.params as { agentType: string };
  const { isEnabled } = req.body as { isEnabled: boolean };

  if (!AGENT_TYPES.includes(agentType as (typeof AGENT_TYPES)[number])) {
    return res.status(400).json({ error: "Invalid agent type" });
  }

  await updateAgentEnabled(streamerId, agentType, Boolean(isEnabled));
  return res.json({ ok: true });
});

router.get("/agents/tasks", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;
  const tasks = await getRecentTasks(streamerId, sessionId, 50);
  return res.json({ tasks });
});

router.get("/agents/memories", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const memoryType = req.query.type as string | undefined;
  const memories = await listMemories(streamerId, memoryType, 100);
  return res.json({ memories });
});

router.post("/agents/memories", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { memoryType, key, value, viewerName, importance } = req.body as Record<string, string | number>;
  await storeMemory({
    streamerId,
    memoryType: (memoryType as "viewer" | "stream" | "global" | "joke" | "preference") ?? "global",
    key: String(key),
    value: String(value),
    viewerName: viewerName ? String(viewerName) : undefined,
    importance: importance ? Number(importance) : 3,
  });
  return res.json({ ok: true });
});

router.delete("/agents/memories/:id", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { aiMemoriesTable } = await import("@workspace/db");
  await db.delete(aiMemoriesTable).where(
    and(eq(aiMemoriesTable.id, Number(req.params.id)), eq(aiMemoriesTable.streamerId, streamerId)),
  );
  return res.json({ ok: true });
});

router.get("/agents/learning-reports", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const reports = await getLearningReports(streamerId, 10);
  return res.json({ reports });
});

router.post("/agents/learning-reports/generate", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { sessionId } = req.body as { sessionId: number };
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  void triggerLearningAgent(Number(sessionId), streamerId);
  return res.json({ ok: true, message: "Learning analysis started" });
});

router.get("/agents/personality", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const active = await getActivePersonality(streamerId);
  const savedModes = await dbInstance.query.aiPersonalityModesTable.findMany({
    where: eq(aiPersonalityModesTable.streamerId, streamerId),
    orderBy: [desc(aiPersonalityModesTable.createdAt)],
  });

  const allModes = Object.entries(BUILT_IN_PERSONALITIES).map(([key, p]) => ({
    modeKey: key,
    modeName: key.charAt(0).toUpperCase() + key.slice(1),
    toneGuide: p.toneGuide,
    exampleStyle: p.exampleStyle,
    isActive: active.modeKey === key,
  }));

  return res.json({ active, modes: allModes, savedModes });
});

router.put("/agents/personality", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { modeKey } = req.body as { modeKey: string };
  if (!modeKey) return res.status(400).json({ error: "modeKey required" });

  await setActivePersonality(streamerId, modeKey);
  return res.json({ ok: true });
});

router.get("/agents/voices", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const activeVoice = await getActiveVoice(streamerId);
  const profiles = await listVoiceProfiles(streamerId);
  const catalog = Object.values(VOICE_CATALOG);

  return res.json({ activeVoice, profiles, catalog });
});

router.put("/agents/voices", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { voiceKey, speed } = req.body as { voiceKey: string; speed?: number };
  if (!voiceKey) return res.status(400).json({ error: "voiceKey required" });

  await setDefaultVoice(streamerId, voiceKey, speed ?? 1.0);
  return res.json({ ok: true });
});

router.get("/agents/chat-priority", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;
  const where = sessionId
    ? and(eq(chatPriorityQueueTable.streamerId, streamerId), eq(chatPriorityQueueTable.sessionId, sessionId))
    : eq(chatPriorityQueueTable.streamerId, streamerId);

  const entries = await dbInstance.query.chatPriorityQueueTable.findMany({
    where,
    orderBy: [desc(chatPriorityQueueTable.createdAt)],
    limit: 100,
  });
  return res.json({ entries });
});

router.get("/agents/viewer-profiles", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const profiles = await dbInstance.query.agentViewerProfilesTable.findMany({
    where: eq(viewerProfilesTable.streamerId, streamerId),
    orderBy: [desc(viewerProfilesTable.lastSeen)],
    limit: 100,
  });
  return res.json({ profiles });
});

router.get("/agents/battle/status", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : 0;
  return res.json({ active: isBattleActive(sessionId), sessionId });
});

router.post("/agents/battle/activate", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { sessionId, active } = req.body as { sessionId: number; active: boolean };
  setBattleMode(Number(sessionId), Boolean(active));
  return res.json({ ok: true, active: Boolean(active) });
});

router.post("/agents/battle/reply", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { sessionId, opponentStatement } = req.body as { sessionId: number; opponentStatement: string };
  const config = await db.query.aiPersonaConfigsTable?.findFirst?.({ where: eq(require("@workspace/db").aiPersonaConfigsTable.streamerId, streamerId) });
  const personality = await getPersonality(streamerId);

  const result = await generateBattleReply({
    sessionId: Number(sessionId),
    streamerId,
    opponentStatement: String(opponentStatement),
    personaName: config?.personaName ?? "Storm",
    personality,
  });
  return res.json(result);
});

router.get("/agents/battle/transcripts", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : 0;
  const transcripts = await getBattleTranscripts(sessionId, streamerId);
  return res.json({ transcripts });
});

router.post("/agents/battle/transcript", requireAuth, async (req, res) => {
  const user = await getOrCreateUser((req as any).clerkUserId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const streamerId = await getStreamerId(user.id);
  if (!streamerId) return res.status(404).json({ error: "Streamer not found" });

  const { sessionId, speaker, text, language } = req.body as { sessionId: number; speaker: "us" | "opponent"; text: string; language?: string };
  const result = await addBattleTranscript({ sessionId: Number(sessionId), streamerId, speaker, text, language });
  return res.json(result);
});

export default router;
