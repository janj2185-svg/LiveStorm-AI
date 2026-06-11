import type { Server as SocketServer } from "socket.io";
import { db, aiAgentsTable, aiAgentTasksTable, aiPersonaConfigsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { TikTokEvent } from "../lib/tiktokSimulator";
import { classifyEvent, savePriorityDecision, PRIORITY_LEVELS } from "./chatAgent";
import { runHostAgent } from "./hostAgent";
import { runModerationAgent } from "./moderationAgent";
import { getActivePersonality } from "./personalityAgent";
import { getActiveVoice } from "./voiceAgent";
import { getMemoryContext, upsertViewerProfile } from "./memoryAgent";
import { trackStreamEvent, generateStrategySuggestion, shouldGenerateSuggestion, scoreResponse } from "./strategyAgent";
import { runLearningAgent } from "./learningAgent";
import { generateVoice } from "../lib/aiService";

const GLOBAL_TTS_COOLDOWN_MS = 8_000;
const MAX_QUEUE_SIZE = 50;

interface QueueItem {
  priority: number;
  sessionId: number;
  streamerId: number;
  event: TikTokEvent;
  agentType: string;
  priorityReason: string;
  enqueuedAt: number;
}

interface OrchestratorState {
  queue: QueueItem[];
  lastTtsTime: number;
  processing: boolean;
  enabledAgents: Set<string>;
  conversationHistory: Map<number, Array<{ viewer: string; comment: string; reply: string; ts: number }>>;
}

const state: OrchestratorState = {
  queue: [],
  lastTtsTime: 0,
  processing: false,
  enabledAgents: new Set(["host", "chat", "memory", "personality", "voice", "moderation", "strategy", "learning"]),
  conversationHistory: new Map(),
};

let ioRef: SocketServer | null = null;

export function initOrchestrator(io: SocketServer): void {
  ioRef = io;
  setInterval(processQueue, 200);
  setInterval(cleanQueue, 30_000);
  console.log("[Orchestrator] Multi-Agent Core initialized");
}

function cleanQueue(): void {
  const now = Date.now();
  const MAX_AGE = 30_000;
  state.queue = state.queue.filter((item) => now - item.enqueuedAt < MAX_AGE);
  if (state.queue.length > MAX_QUEUE_SIZE) {
    state.queue = state.queue.slice(0, MAX_QUEUE_SIZE);
  }
}

export async function enqueueEvent(event: TikTokEvent, streamerId: number): Promise<void> {
  if (!ioRef) return;

  const classification = await classifyEvent(event, streamerId);

  const item: QueueItem = {
    priority: classification.priority,
    sessionId: event.sessionId,
    streamerId,
    event,
    agentType: classification.agentType,
    priorityReason: classification.reason,
    enqueuedAt: Date.now(),
  };

  state.queue.push(item);
  state.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);

  if (event.type === "comment") {
    const text = (event.data.text as string) ?? "";
    await savePriorityDecision({
      sessionId: event.sessionId,
      streamerId,
      viewerName: event.username ?? "Unknown",
      message: text,
      priorityLevel: classification.priority,
      priorityReason: classification.reason,
      agentType: classification.agentType,
    });

    ioRef.to(`session:${event.sessionId}`).emit("agent:chat:priority", {
      viewerName: event.username,
      message: text,
      priorityLevel: classification.priority,
      priorityReason: classification.reason,
      agentType: classification.agentType,
      isQuestion: classification.isQuestion,
      isVip: classification.isVip,
    });
  }

  trackStreamEvent(event.sessionId, event.type, event.type === "like" ? ((event.data.likeCount as number) ?? 1) : 1);
}

async function processQueue(): Promise<void> {
  if (state.processing || state.queue.length === 0 || !ioRef) return;

  const now = Date.now();
  const timeSinceLastTts = now - state.lastTtsTime;

  if (timeSinceLastTts < GLOBAL_TTS_COOLDOWN_MS) return;

  const item = state.queue.shift();
  if (!item) return;

  state.processing = true;

  try {
    await dispatch(item, ioRef);
  } catch (err: unknown) {
    console.error("[Orchestrator] dispatch error:", (err as Error)?.message);
  } finally {
    state.processing = false;
  }
}

async function dispatch(item: QueueItem, io: SocketServer): Promise<void> {
  const { event, streamerId, sessionId, agentType } = item;

  const isAgentEnabled = await checkAgentEnabled(streamerId, agentType);
  if (!isAgentEnabled) return;

  const config = await db.query.aiPersonaConfigsTable.findFirst({
    where: eq(aiPersonaConfigsTable.streamerId, streamerId),
  });
  if (!config) return;

  const viewerId = (event.data.uniqueId as string) ?? event.username ?? "anon";

  if (state.enabledAgents.has("memory")) {
    const eventTypeForProfile = event.type as "comment" | "gift" | "follow" | "like";
    if (["comment", "gift", "follow", "like"].includes(event.type)) {
      void upsertViewerProfile({
        streamerId,
        tiktokViewerId: viewerId,
        viewerName: event.username ?? "Unknown",
        eventType: eventTypeForProfile,
      });
    }
  }

  if (agentType === "moderation" && state.enabledAgents.has("moderation")) {
    const result = await runModerationAgent({ event, streamerId, sessionId, useAI: config.moderationEnabled });
    if (result.flagged) {
      io.to(`session:${sessionId}`).emit("agent:task", {
        agentType: "moderation",
        action: "flagged",
        viewerName: event.username,
        reason: result.reason,
        severity: result.severity,
      });
    }
    return;
  }

  if (!state.enabledAgents.has("host")) return;

  const personality = await getActivePersonality(streamerId);
  const voice = await getActiveVoice(streamerId, personality.modeKey);
  const memoryCtx = state.enabledAgents.has("memory")
    ? await getMemoryContext(streamerId, event.username ?? undefined)
    : "";

  const history = state.conversationHistory.get(sessionId) ?? [];
  const conversationHistory = history.length > 0
    ? history.slice(-5).map((h) => `@${h.viewer}: "${h.comment}" → AI: "${h.reply}"`).join("\n")
    : undefined;

  const hostResult = await runHostAgent({
    event,
    streamerId,
    personaName: config.personaName,
    personality,
    memoryContext: memoryCtx,
    replyLanguage: config.replyLanguage ?? "auto",
    conversationHistory,
  });

  if (!hostResult?.text) return;

  state.lastTtsTime = Date.now();

  const roomId = `session:${sessionId}`;

  io.to(roomId).emit("ai:announcement", {
    text: hostResult.text,
    type: event.type,
    viewerName: event.username,
    emotion: hostResult.emotion,
    agentType: "host",
    personality: personality.modeKey,
  });

  io.to(roomId).emit("agent:task", {
    agentType: "host",
    action: "spoke",
    text: hostResult.text,
    emotion: hostResult.emotion,
    trigger: event.type,
    viewerName: event.username,
    personality: personality.modeKey,
  });

  await logTask({
    sessionId,
    streamerId,
    agentType: "host",
    eventType: event.type,
    priority: item.priority,
    input: { viewerName: event.username, eventType: event.type },
    output: { text: hostResult.text, emotion: hostResult.emotion },
  });

  if (event.type === "comment") {
    const comment = (event.data.text as string) ?? "";
    const updated = [...history, { viewer: event.username ?? "Unknown", comment, reply: hostResult.text, ts: Date.now() }];
    state.conversationHistory.set(sessionId, updated.slice(-10));
  }

  void scoreResponse({
    sessionId,
    streamerId,
    agentType: "host",
    triggerEvent: event.type,
    aiResponse: hostResult.text,
  });

  if (config.voiceEnabled && state.enabledAgents.has("voice")) {
    try {
      const audioBuffer = await generateVoice(hostResult.text, voice.voiceKey, voice.speed);
      if (audioBuffer) {
        io.to(roomId).emit("tts:audio", { audio: audioBuffer, text: hostResult.text });
      }
    } catch (err: unknown) {
      console.error("[Orchestrator] TTS error:", (err as Error)?.message);
    }
  }

  if (state.enabledAgents.has("strategy") && await shouldGenerateSuggestion(sessionId)) {
    const suggestion = await generateStrategySuggestion({ sessionId, streamerId, personaName: config.personaName });
    if (suggestion) {
      io.to(roomId).emit("agent:strategy:suggest", suggestion);
    }
  }
}

async function checkAgentEnabled(streamerId: number, agentType: string): Promise<boolean> {
  try {
    const agent = await db.query.aiAgentsTable.findFirst({
      where: and(eq(aiAgentsTable.streamerId, streamerId), eq(aiAgentsTable.agentType, agentType)),
    });
    return agent === undefined || agent.isEnabled;
  } catch {
    return true;
  }
}

async function logTask(opts: {
  sessionId: number;
  streamerId: number;
  agentType: string;
  eventType: string;
  priority: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}): Promise<void> {
  await db.insert(aiAgentTasksTable).values({
    ...opts,
    status: "done",
    processedAt: new Date(),
  }).catch(() => {});
}

export async function triggerLearningAgent(sessionId: number, streamerId: number): Promise<void> {
  if (!state.enabledAgents.has("learning")) return;
  if (!ioRef) return;

  console.log(`[Orchestrator] Triggering LearningAgent for session ${sessionId}`);
  const report = await runLearningAgent({ sessionId, streamerId });
  if (report && ioRef) {
    ioRef.to(`session:${sessionId}`).emit("agent:learning:report", {
      sessionId,
      totalResponses: report.totalResponses,
      avgScore: report.avgScore,
      recommendations: report.recommendations,
      personalityAdjustments: report.personalityAdjustments,
    });
  }
}

export async function updateAgentEnabled(streamerId: number, agentType: string, enabled: boolean): Promise<void> {
  const existing = await db.query.aiAgentsTable.findFirst({
    where: and(eq(aiAgentsTable.streamerId, streamerId), eq(aiAgentsTable.agentType, agentType)),
  });

  if (existing) {
    await db.update(aiAgentsTable).set({ isEnabled: enabled, updatedAt: new Date() }).where(eq(aiAgentsTable.id, existing.id));
  } else {
    await db.insert(aiAgentsTable).values({ streamerId, agentType, isEnabled: enabled });
  }
}

export async function getAgentConfigs(streamerId: number) {
  return db.query.aiAgentsTable.findMany({
    where: eq(aiAgentsTable.streamerId, streamerId),
    orderBy: [desc(aiAgentsTable.updatedAt)],
  });
}

export async function getRecentTasks(streamerId: number, sessionId?: number, limit = 50) {
  const where = sessionId
    ? and(eq(aiAgentTasksTable.streamerId, streamerId), eq(aiAgentTasksTable.sessionId, sessionId))
    : eq(aiAgentTasksTable.streamerId, streamerId);

  return db.query.aiAgentTasksTable.findMany({
    where,
    orderBy: [desc(aiAgentTasksTable.createdAt)],
    limit,
  });
}

export function clearSessionHistory(sessionId: number): void {
  state.conversationHistory.delete(sessionId);
}

export const AGENT_TYPES = ["host", "chat", "battle", "memory", "personality", "voice", "strategy", "moderation", "learning"] as const;

export const AGENT_DESCRIPTIONS: Record<string, { label: string; description: string; icon: string }> = {
  host:         { label: "Host Agent",        description: "Main AI co-host voice. Speaks to viewers, welcomes people, reacts to gifts and follows.", icon: "🎙️" },
  chat:         { label: "Chat Agent",         description: "Reads high-volume chat, groups similar comments, detects questions, prioritizes VIPs.", icon: "💬" },
  battle:       { label: "Battle Agent",       description: "Activates during TikTok battles, suggests smart replies, supports the streamer.", icon: "⚔️" },
  memory:       { label: "Memory Agent",       description: "Stores long-term viewer memories, preferences, gifts, and streamer style.", icon: "🧠" },
  personality:  { label: "Personality Agent",  description: "Controls tone and character. Switches between Friendly, Savage, Funny, and more.", icon: "🎭" },
  voice:        { label: "Voice Agent",        description: "Manages voice profiles and connects selected voice to TTS output.", icon: "🎵" },
  strategy:     { label: "Strategy Agent",     description: "Watches stream performance and recommends what the AI should do next.", icon: "📊" },
  moderation:   { label: "Moderation Agent",   description: "Detects spam, hate, harassment. Protects the stream from bad behavior.", icon: "🛡️" },
  learning:     { label: "Learning Agent",     description: "After each stream, reviews AI replies, scores them, and generates improvement tips.", icon: "📈" },
};
