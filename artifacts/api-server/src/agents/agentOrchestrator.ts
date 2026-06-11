import type { Server as SocketServer } from "socket.io";
import { db, aiAgentsTable, aiAgentTasksTable, aiPersonaConfigsTable, agentViewerProfilesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { TikTokEvent } from "../lib/tiktokSimulator";
import { classifyEvent, savePriorityDecision, PRIORITY_LEVELS, batchSimilarMessages } from "./chatAgent";
import { runHostAgent } from "./hostAgent";
import { runModerationAgent } from "./moderationAgent";
import { getActivePersonality } from "./personalityAgent";
import { getActiveVoice } from "./voiceAgent";
import { getMemoryContext, upsertViewerProfile } from "./memoryAgent";
import { trackStreamEvent, generateStrategySuggestion, shouldGenerateSuggestion, scoreResponse } from "./strategyAgent";
import { runLearningAgent } from "./learningAgent";
import { isBattleActive, generateBattleReply } from "./battleAgent";
import { generateVoice, fastSpamCheck } from "../lib/aiService";
import {
  applyEmotionalTrigger,
  getEmotionalState,
  getVoiceSpeedModifier,
  decayAllEmotions,
  checkSilentSessions,
  clearEmotionalState,
  recordActivity,
  giftTierTrigger,
  EMOTION_META,
} from "./emotionEngine";
import {
  recordSessionStart,
  clearBehaviorState,
  detectHumor,
  detectQuestionComplexity,
  recordGiftVelocity,
  getGiftVelocityAmplification,
  recordCommentForBurst,
  recordBattleAftermath,
  getBattleAftermathContext,
  getStreamFatiguePromptContext,
  getBehaviorPromptContext,
  injectParalinguistics,
  getStreamFatigue,
} from "./behaviorEngine";

const MAX_QUEUE_SIZE = 50;
const MAX_GENERAL_ITEM_AGE_MS = 15_000;

// ─── Announcement cooldowns (migrated from old processAiAnnouncements) ────────
// These mirror the old pipeline exactly so no behaviour is lost after migration.
const ANNOUNCEMENT_COOLDOWN_MS: Record<string, number> = {
  gift:           30_000,
  share:          45_000,
  follow:         60_000,
  like_milestone: 120_000,
};

// Priority-aware TTS cooldowns — high-value events respond faster
const TTS_COOLDOWN_MS: Record<number, number> = {
  1: 2_000,   // gift — react immediately
  2: 4_000,   // follow / share
  3: 3_000,   // battle
  4: 5_000,   // direct question
  5: 6_000,   // vip viewer
  6: 8_000,   // general chat
};

function ttsCooldown(priority: number): number {
  return TTS_COOLDOWN_MS[priority] ?? 8_000;
}

// Engagement scores by priority / event type for the learning system
function computeBaseScore(priority: number, eventType: string): number {
  if (eventType === "gift")   return 8.5;
  if (eventType === "follow") return 7.5;
  if (eventType === "share")  return 7.0;
  switch (priority) {
    case 4: return 7.0;  // direct question answered
    case 5: return 6.5;  // vip viewer
    default: return 5.0; // general
  }
}

interface QueueItem {
  priority: number;
  sessionId: number;
  streamerId: number;
  event: TikTokEvent;
  agentType: string;
  priorityReason: string;
  enqueuedAt: number;
  groupKey?: string;
  batchCount?: number;
}

interface OrchestratorState {
  queue: QueueItem[];
  lastTtsTime: number;
  processing: boolean;
  enabledAgents: Set<string>;
  conversationHistory: Map<number, Array<{ viewer: string; comment: string; reply: string; ts: number }>>;
  // Migrated from old processAiAnnouncements pipeline:
  sessionLikeTotals: Map<number, number>;       // cumulative likes per session for milestone detection
  announcementCooldowns: Map<string, number>;   // "sessionId:eventType" → last-fired timestamp
  perViewerReplyCooldown: Map<string, number>;  // "sessionId:viewerName" → last-reply timestamp
}

const state: OrchestratorState = {
  queue: [],
  lastTtsTime: 0,
  processing: false,
  enabledAgents: new Set(["host", "chat", "memory", "personality", "voice", "moderation", "strategy", "learning", "battle"]),
  conversationHistory: new Map(),
  sessionLikeTotals: new Map(),
  announcementCooldowns: new Map(),
  perViewerReplyCooldown: new Map(),
};

let ioRef: SocketServer | null = null;

export function initOrchestrator(io: SocketServer): void {
  ioRef = io;
  setInterval(processQueue, 200);
  setInterval(cleanQueue, 30_000);
  setInterval(decayAllEmotions, 30_000);

  // Silence detection: check every 15s, emit emotion:state when a session goes quiet
  setInterval(() => {
    if (!ioRef) return;
    const silenced = checkSilentSessions();
    for (const { sessionId, state } of silenced) {
      ioRef.to(`session:${sessionId}`).emit("emotion:state", {
        ...state,
        ...EMOTION_META[state.primary],
      });
      console.log(
        `[Agent:Emotion] ${EMOTION_META[state.primary].emoji} silence detected → ${state.primary} intensity=${state.intensity}/10 | session=${sessionId}`,
      );
    }
  }, 15_000);

  console.log("[Orchestrator] Multi-Agent Core initialized");
}

function cleanQueue(): void {
  const now = Date.now();
  const before = state.queue.length;

  // Drop stale general-chat items early when queue is busy
  if (state.queue.length > 20) {
    state.queue = state.queue.filter((item) => {
      const age = now - item.enqueuedAt;
      if (item.priority >= 6 && age > MAX_GENERAL_ITEM_AGE_MS) {
        console.log(`[Queue:Drop] stale general | viewer=${item.event.username} age=${Math.round(age / 1000)}s`);
        return false;
      }
      return true;
    });
  }

  // Always drop anything older than 30s
  state.queue = state.queue.filter((item) => now - item.enqueuedAt < 30_000);

  // Hard cap at 40
  if (state.queue.length > 40) {
    const dropped = state.queue.splice(40);
    console.log(`[Queue:Drop] hard cap — removed ${dropped.length} excess items`);
  }

  if (state.queue.length < before) {
    console.log(`[Queue:Trim] ${before} → ${state.queue.length} items`);
  }

  // Clean up migrated-pipeline Maps (entries older than 10 min)
  const cutoff = now - 10 * 60 * 1_000;
  for (const [key, ts] of state.announcementCooldowns) {
    if (ts < cutoff) state.announcementCooldowns.delete(key);
  }
  for (const [key, ts] of state.perViewerReplyCooldown) {
    if (ts < cutoff) state.perViewerReplyCooldown.delete(key);
  }
}

export async function enqueueEvent(event: TikTokEvent, streamerId: number): Promise<void> {
  if (!ioRef) return;

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-FILTERS: logic migrated from old processAiAnnouncements pipeline.
  // These run BEFORE the priority queue so only valid events reach the Orchestrator.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 1. Like events: only enqueue at 100-like milestones ────────────────────
  if (event.type === "like") {
    const likeCount = (event.data.likeCount as number) ?? 1;
    const prev = state.sessionLikeTotals.get(event.sessionId) ?? 0;
    const next = prev + likeCount;
    state.sessionLikeTotals.set(event.sessionId, next);
    trackStreamEvent(event.sessionId, event.type, likeCount);

    const prevMilestone = Math.floor(prev / 100);
    const nextMilestone = Math.floor(next / 100);
    if (nextMilestone <= prevMilestone) {
      // No milestone crossed — track the like but don't generate AI response
      return;
    }
    const milestoneKey = `${event.sessionId}:like_milestone`;
    const lastMs = state.announcementCooldowns.get(milestoneKey) ?? 0;
    if (Date.now() - lastMs < ANNOUNCEMENT_COOLDOWN_MS.like_milestone) {
      console.log(`[NEW-PIPELINE] like_milestone cooldown skip | session=${event.sessionId} total=${next}`);
      return;
    }
    state.announcementCooldowns.set(milestoneKey, Date.now());
    const milestone = nextMilestone * 100;
    console.log(`[NEW-PIPELINE] ⭐ like_milestone=${milestone} | session=${event.sessionId} totalLikes=${next}`);
    // Emotion trigger
    const milestoneEmotion = applyEmotionalTrigger(event.sessionId, "like_milestone");
    ioRef.to(`session:${event.sessionId}`).emit("emotion:state", { ...milestoneEmotion, ...EMOTION_META[milestoneEmotion.primary] });
    // Enrich event so hostAgent can craft a milestone-specific reply
    event = { ...event, data: { ...event.data, milestone } };
  }

  // ── 2. Gift events: threshold check + per-session cooldown ─────────────────
  if (event.type === "gift") {
    const coins = (event.data.coins as number) ?? 0;
    let giftConfig: typeof import("@workspace/db")["aiPersonaConfigsTable"]["$inferSelect"] | undefined;
    try {
      giftConfig = await db.query.aiPersonaConfigsTable.findFirst({
        where: eq(aiPersonaConfigsTable.streamerId, streamerId),
      }) ?? undefined;
    } catch { /* non-fatal */ }

    if (giftConfig && !giftConfig.announceGifts) {
      console.log(`[NEW-PIPELINE] gift suppressed (announceGifts=false) | coins=${coins} | session=${event.sessionId}`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
    const threshold = giftConfig?.announceGiftThreshold ?? 0;
    if (coins < threshold) {
      console.log(`[NEW-PIPELINE] gift below threshold | coins=${coins} < threshold=${threshold} | session=${event.sessionId}`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
    const giftKey = `${event.sessionId}:gift`;
    const lastGift = state.announcementCooldowns.get(giftKey) ?? 0;
    if (Date.now() - lastGift < ANNOUNCEMENT_COOLDOWN_MS.gift) {
      console.log(`[NEW-PIPELINE] gift cooldown | session=${event.sessionId} coins=${coins}`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
    state.announcementCooldowns.set(giftKey, Date.now());
    console.log(`[NEW-PIPELINE] 🎁 gift passed threshold | coins=${coins} threshold=${threshold} | session=${event.sessionId}`);
    // Emotion trigger — amplified by gift velocity (rapid gifts chain into bigger reactions)
    recordGiftVelocity(event.sessionId);
    const velocity    = getGiftVelocityAmplification(event.sessionId);
    const baseTrigger = giftTierTrigger(coins);
    const amplifiedTrigger =
      velocity === "storm" ? "gift_whale" as const :
      velocity === "wave"  ? (baseTrigger === "gift_micro" ? "gift_standard" as const : baseTrigger === "gift_standard" ? "gift_big" as const : baseTrigger) :
      baseTrigger;
    if (velocity !== "none") {
      console.log(`[Agent:Emotion] 🌊 gift ${velocity} → ${baseTrigger} → ${amplifiedTrigger}`);
    }
    const giftEmotion = applyEmotionalTrigger(event.sessionId, amplifiedTrigger);
    console.log(`[Agent:Emotion] ${EMOTION_META[giftEmotion.primary].emoji} ${giftEmotion.primary} intensity=${giftEmotion.intensity}/10 ← gift ${coins} coins`);
    ioRef.to(`session:${event.sessionId}`).emit("emotion:state", { ...giftEmotion, ...EMOTION_META[giftEmotion.primary] });
  }

  // ── 3. Share events: per-session cooldown ──────────────────────────────────
  if (event.type === "share") {
    const shareKey = `${event.sessionId}:share`;
    const lastShare = state.announcementCooldowns.get(shareKey) ?? 0;
    if (Date.now() - lastShare < ANNOUNCEMENT_COOLDOWN_MS.share) {
      console.log(`[NEW-PIPELINE] share cooldown | session=${event.sessionId}`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
    state.announcementCooldowns.set(shareKey, Date.now());
    console.log(`[NEW-PIPELINE] 📢 share passed cooldown | session=${event.sessionId} viewer=${event.username}`);
    const shareEmotion = applyEmotionalTrigger(event.sessionId, "share");
    ioRef.to(`session:${event.sessionId}`).emit("emotion:state", { ...shareEmotion, ...EMOTION_META[shareEmotion.primary] });
  }

  // ── 4. Follow events: announceLevelUp flag + per-session cooldown ───────────
  if (event.type === "follow") {
    let followConfig: typeof import("@workspace/db")["aiPersonaConfigsTable"]["$inferSelect"] | undefined;
    try {
      followConfig = await db.query.aiPersonaConfigsTable.findFirst({
        where: eq(aiPersonaConfigsTable.streamerId, streamerId),
      }) ?? undefined;
    } catch { /* non-fatal */ }

    if (followConfig && !followConfig.announceLevelUp) {
      console.log(`[NEW-PIPELINE] follow suppressed (announceLevelUp=false) | session=${event.sessionId}`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
    const followKey = `${event.sessionId}:follow`;
    const lastFollow = state.announcementCooldowns.get(followKey) ?? 0;
    if (Date.now() - lastFollow < ANNOUNCEMENT_COOLDOWN_MS.follow) {
      console.log(`[NEW-PIPELINE] follow cooldown | session=${event.sessionId}`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
    state.announcementCooldowns.set(followKey, Date.now());
    console.log(`[NEW-PIPELINE] 👤 follow passed cooldown | session=${event.sessionId} viewer=${event.username}`);
    const followEmotion = applyEmotionalTrigger(event.sessionId, "follow");
    ioRef.to(`session:${event.sessionId}`).emit("emotion:state", { ...followEmotion, ...EMOTION_META[followEmotion.primary] });
  }

  // ── 5. Comment events: fast spam check + per-viewer reply cooldown ──────────
  if (event.type === "comment") {
    const comment = ((event.data.text as string) ?? "").trim();
    if (comment.length <= 2) return;

    // Fast local spam check — instant, no API call (mirrors old pipeline step 0)
    const spamResult = fastSpamCheck(comment);
    if (spamResult.flagged) {
      console.log(
        `[NEW-PIPELINE] 🚫 spam-blocked (fast check) | viewer=${event.username} reason="${spamResult.reason}" | session=${event.sessionId}`,
      );
      ioRef.to(`session:${event.sessionId}`).emit("moderation:flagged", {
        viewerName: event.username,
        comment,
        reason: spamResult.reason,
        pipeline: "orchestrator",
      });
      return;
    }

    // Per-viewer reply cooldown (mirrors old pipeline autoReplySpamMap logic)
    let commentConfig: typeof import("@workspace/db")["aiPersonaConfigsTable"]["$inferSelect"] | undefined;
    try {
      commentConfig = await db.query.aiPersonaConfigsTable.findFirst({
        where: eq(aiPersonaConfigsTable.streamerId, streamerId),
      }) ?? undefined;
    } catch { /* non-fatal */ }

    if (commentConfig?.spamProtectionEnabled) {
      const cooldownMs = Math.max(5_000, (commentConfig.spamCooldownSeconds ?? 30) * 1_000);
      const viewerKey = `${event.sessionId}:${event.username ?? "anon"}`;
      const lastReply = state.perViewerReplyCooldown.get(viewerKey) ?? 0;
      const elapsed = Date.now() - lastReply;
      if (elapsed < cooldownMs) {
        console.log(
          `[NEW-PIPELINE] per-viewer cooldown | viewer=${event.username} elapsed=${Math.round(elapsed / 1_000)}s < ${Math.round(cooldownMs / 1_000)}s | session=${event.sessionId}`,
        );
        return;
      }
    }
  }

  // ── End pre-filters: all checks passed → classify and enqueue ──────────────

  // Graduated comment burst + record activity for silence detection
  if (event.type === "comment") {
    const burst = recordCommentForBurst(event.sessionId);
    if (burst.trigger) {
      const burstEmotion = applyEmotionalTrigger(event.sessionId, burst.trigger);
      console.log(`[Agent:Emotion] ${EMOTION_META[burstEmotion.primary].emoji} ${burst.burstLabel} (${burst.count30s}/30s) → ${burstEmotion.primary} intensity=${burstEmotion.intensity}/10`);
      ioRef.to(`session:${event.sessionId}`).emit("emotion:state", { ...burstEmotion, ...EMOTION_META[burstEmotion.primary] });
    }
  }
  recordSessionStart(event.sessionId);
  recordActivity(event.sessionId);

  const classification = await classifyEvent(event, streamerId);

  // ── GENERAL comment batching: aggregate similar messages in a 3s window ──────
  // This fires BEFORE the in-queue dedup so identical comments from many viewers
  // collapse into a single AI call with crowd-context instead of N separate calls.
  if (event.type === "comment" && classification.priority === PRIORITY_LEVELS.GENERAL && classification.groupKey) {
    const text = (event.data.text as string) ?? "";

    // Emit priority signal immediately for UI feedback (don't wait for batch)
    ioRef.to(`session:${event.sessionId}`).emit("agent:chat:priority", {
      viewerName: event.username,
      message: text,
      priorityLevel: classification.priority,
      priorityReason: classification.reason,
      agentType: classification.agentType,
      isQuestion: classification.isQuestion,
      isVip: classification.isVip,
    });

    batchSimilarMessages(
      event.sessionId,
      streamerId,
      event.username ?? "unknown",
      text,
      classification.groupKey,
      (result) => {
        // Secondary dedup: if an identical group is already queued, merge counts
        const alreadyQueued = state.queue.find(
          (q) => q.sessionId === event.sessionId && q.groupKey === classification.groupKey,
        );
        if (alreadyQueued) {
          alreadyQueued.batchCount = (alreadyQueued.batchCount ?? 1) + result.count;
          console.log(`[Chat:Batch] 📦 merged flush ${result.count}x into queued item → group="${result.groupKey}" (${alreadyQueued.batchCount} total)`);
          return;
        }

        // Enrich event text with crowd context when multiple viewers sent it
        const batchedEvent = result.count > 1
          ? { ...event, data: { ...event.data, text: result.topMessage } }
          : event;

        const batchedItem: QueueItem = {
          priority: classification.priority,
          sessionId: event.sessionId,
          streamerId,
          event:     batchedEvent,
          agentType: classification.agentType,
          priorityReason: classification.reason,
          enqueuedAt: Date.now(),
          groupKey:   classification.groupKey,
          batchCount: result.count,
        };

        state.queue.push(batchedItem);
        state.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
        console.log(`[Chat:Batch] ⏱️ flushed ${result.count}x similar → group="${result.groupKey}" priority=${classification.priority}`);
      },
    );

    void savePriorityDecision({
      sessionId:     event.sessionId,
      streamerId,
      viewerName:    event.username ?? "Unknown",
      message:       text,
      priorityLevel: classification.priority,
      priorityReason: classification.reason,
      agentType:     classification.agentType,
    });

    trackStreamEvent(event.sessionId, event.type);
    return; // batch timer handles queue insertion
  }

  // ── Non-GENERAL / non-comment: in-queue dedup (safety net) ──────────────────
  if (classification.priority === PRIORITY_LEVELS.GENERAL && classification.groupKey) {
    const existing = state.queue.find(
      (q) => q.sessionId === event.sessionId && q.groupKey === classification.groupKey,
    );
    if (existing) {
      existing.batchCount = (existing.batchCount ?? 1) + 1;
      console.log(`[Chat:Batch] 📦 merged @${event.username ?? "?"} → group="${classification.groupKey}" (${existing.batchCount} viewers)`);
      trackStreamEvent(event.sessionId, event.type);
      return;
    }
  }

  const item: QueueItem = {
    priority: classification.priority,
    sessionId: event.sessionId,
    streamerId,
    event,
    agentType: classification.agentType,
    priorityReason: classification.reason,
    enqueuedAt: Date.now(),
    groupKey: classification.groupKey,
    batchCount: 1,
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
  const nextItem = state.queue[0]!;
  const cooldown = ttsCooldown(nextItem.priority);
  const timeSinceLastTts = now - state.lastTtsTime;

  if (timeSinceLastTts < cooldown) return;

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

  console.log(`[Orchestrator] ⚡ dispatch | event=${event.type} | agent=${agentType} | viewer=${event.username ?? "anon"} | session=${sessionId} | priority=${item.priority}`);

  const isAgentEnabled = await checkAgentEnabled(streamerId, agentType);
  if (!isAgentEnabled) {
    console.log(`[Orchestrator] ✗ agent=${agentType} disabled for streamer=${streamerId}`);
    return;
  }

  const config = await db.query.aiPersonaConfigsTable.findFirst({
    where: eq(aiPersonaConfigsTable.streamerId, streamerId),
  });
  if (!config) return;

  const viewerId = (event.data.uniqueId as string) ?? event.username ?? "anon";

  // ── Memory Agent: upsert viewer profile ─────────────────────────────────────
  if (state.enabledAgents.has("memory")) {
    const eventTypeForProfile = event.type as "comment" | "gift" | "follow" | "like";
    if (["comment", "gift", "follow", "like"].includes(event.type)) {
      console.log(`[Agent:Memory] 🧠 upsertViewerProfile | viewer=${event.username} | event=${event.type}`);
      void upsertViewerProfile({
        streamerId,
        tiktokViewerId: viewerId,
        viewerName: event.username ?? "Unknown",
        eventType: eventTypeForProfile,
      });
    }
  }

  // ── Moderation Agent ─────────────────────────────────────────────────────────
  if (agentType === "moderation" && state.enabledAgents.has("moderation")) {
    console.log(`[Agent:Moderation] 🛡️ checking content | viewer=${event.username}`);
    const result = await runModerationAgent({ event, streamerId, sessionId, useAI: config.moderationEnabled });
    if (result.flagged) {
      console.log(`[Agent:Moderation] 🚨 FLAGGED | viewer=${event.username} | reason=${result.reason} | severity=${result.severity}`);
      io.to(`session:${sessionId}`).emit("agent:task", {
        agentType: "moderation",
        action: "flagged",
        viewerName: event.username,
        reason: result.reason,
        severity: result.severity,
      });
    } else {
      console.log(`[Agent:Moderation] ✓ content clean | viewer=${event.username}`);
    }
    return;
  }

  if (!state.enabledAgents.has("host")) return;

  // ── Personality Agent ────────────────────────────────────────────────────────
  const personality = await getActivePersonality(streamerId);
  console.log(`[Agent:Personality] 🎭 mode=${personality.modeKey} | modeName="${personality.modeName}" | tone="${personality.toneGuide}"`);

  // ── Voice Agent ──────────────────────────────────────────────────────────────
  const voice = await getActiveVoice(streamerId, personality.modeKey);
  console.log(`[Agent:Voice] 🎵 voiceKey=${voice.voiceKey} | speed=${voice.speed} | desc="${voice.description}"`);

  // ── Memory Agent: load context ───────────────────────────────────────────────
  const memoryCtx = state.enabledAgents.has("memory")
    ? await getMemoryContext(streamerId, event.username ?? undefined)
    : "";
  if (memoryCtx) {
    console.log(`[Agent:Memory] 🧠 context loaded | ${memoryCtx.length} chars | viewer=${event.username}`);
  } else {
    console.log(`[Agent:Memory] 🧠 no prior context for viewer=${event.username}`);
  }

  const history = state.conversationHistory.get(sessionId) ?? [];
  const conversationHistory = history.length > 0
    ? history.slice(-5).map((h) => `@${h.viewer}: "${h.comment}" → AI: "${h.reply}"`).join("\n")
    : undefined;

  // ── Emotion Agent: get current state + trigger for VIP / first-timer ─────────
  let emotionState = getEmotionalState(sessionId);
  if (event.type === "comment" && state.enabledAgents.has("memory")) {
    try {
      const viewerProfile = await db.query.agentViewerProfilesTable.findFirst({
        where: and(
          eq(agentViewerProfilesTable.streamerId, streamerId),
          eq(agentViewerProfilesTable.viewerName, event.username ?? ""),
        ),
      });
      if (!viewerProfile) {
        emotionState = applyEmotionalTrigger(sessionId, "first_timer");
        console.log(`[Agent:Emotion] ${EMOTION_META[emotionState.primary].emoji} first-timer: ${event.username}`);
      } else if (viewerProfile.vipLevel !== "none") {
        emotionState = applyEmotionalTrigger(sessionId, "vip_comment");
        console.log(`[Agent:Emotion] ${EMOTION_META[emotionState.primary].emoji} VIP comment: ${event.username} (${viewerProfile.vipLevel})`);
      }
      if (ioRef) ioRef.to(`session:${sessionId}`).emit("emotion:state", { ...emotionState, ...EMOTION_META[emotionState.primary] });
    } catch { /* non-fatal */ }
  }
  // Battle mode locks in competitive emotion
  if (isBattleActive(sessionId) && emotionState.primary !== "competitive") {
    emotionState = applyEmotionalTrigger(sessionId, "battle_start");
    if (ioRef) ioRef.to(`session:${sessionId}`).emit("emotion:state", { ...emotionState, ...EMOTION_META[emotionState.primary] });
  }
  console.log(`[Agent:Emotion] ${EMOTION_META[emotionState.primary].emoji} state=${emotionState.primary} intensity=${emotionState.intensity}/10 trigger="${emotionState.lastTrigger}"`);

  // ── Battle Agent: override if battle is active ───────────────────────────────
  if (state.enabledAgents.has("battle") && isBattleActive(sessionId) && event.type === "comment") {
    const commentText = (event.data.text as string) ?? "";
    console.log(`[Agent:Battle] ⚔️ BATTLE ACTIVE | session=${sessionId} | opponent: "${commentText.slice(0, 60)}"`);
    const battleResult = await generateBattleReply({
      sessionId,
      streamerId,
      opponentStatement: commentText,
      personaName: config.personaName,
      personality,
      replyLanguage: config.replyLanguage ?? "auto",
      emotionState,
    });
    if (battleResult.shouldSpeak && battleResult.suggestedReply) {
      console.log(`[Agent:Battle] ⚔️ battle reply: "${battleResult.suggestedReply.slice(0, 80)}"`);
      state.lastTtsTime = Date.now();
      io.to(`session:${sessionId}`).emit("agent:battle:reply", {
        suggestedReply: battleResult.suggestedReply,
        opponentStatement: commentText,
        context: battleResult.context,
      });
      // Route battle reply through the same TTS voice pipeline with emotion speed modifier
      if (config.voiceEnabled && state.enabledAgents.has("voice")) {
        void (async () => {
          try {
            const battleSpeedBoost = getVoiceSpeedModifier(emotionState);
            const battleSpeed      = Math.min(1.8, Math.max(0.5, (voice.speed ?? 1.0) + battleSpeedBoost));
            if (Math.abs(battleSpeedBoost) > 0.01) {
              console.log(`[Agent:Battle] 🎙️ speed adjusted | base=${voice.speed} boost=+${battleSpeedBoost.toFixed(2)} → ${battleSpeed.toFixed(2)}`);
            }
            const audioBuffer = await generateVoice(
              battleResult.suggestedReply!,
              voice.voiceKey as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
              battleSpeed,
            );
            if (audioBuffer) {
              io.to(`session:${sessionId}`).emit("tts:audio", { audio: audioBuffer, text: battleResult.suggestedReply });
              console.log(`[Agent:Battle] 🔊 TTS battle comeback delivered`);
            }
          } catch (e) {
            console.error("[Agent:Battle] TTS error:", (e as Error)?.message);
          }
        })();
      }
      void scoreResponse({ sessionId, streamerId, agentType: "battle", triggerEvent: "comment", aiResponse: battleResult.suggestedReply, score: 8.0 });
      void logTask({ sessionId, streamerId, agentType: "battle", eventType: "comment", priority: item.priority, input: { opponent: commentText.slice(0, 100) }, output: { reply: battleResult.suggestedReply.slice(0, 100) } });
      recordBattleAftermath(sessionId, "win");
      return; // battle reply takes over — skip standard host agent
    }
  }

  // ── Behavior Engine: build behavioral context for this event ────────────────
  const commentText2 = event.type === "comment" ? ((event.data.text as string) ?? "") : "";
  const humor             = detectHumor(commentText2);
  const questionComplexity = detectQuestionComplexity(commentText2);
  const fatigueCtx        = getStreamFatiguePromptContext(sessionId);
  const aftermathCtx      = getBattleAftermathContext(sessionId);
  const behaviorHints     = getBehaviorPromptContext({ humor, questionComplexity });
  const behaviorCtx = [fatigueCtx, aftermathCtx, behaviorHints].filter(Boolean).join("\n");

  // ── Host Agent: generate main AI reply ──────────────────────────────────────
  // When multiple viewers sent the same message, give the AI crowd context
  const eventForHost = (item.batchCount && item.batchCount > 1 && event.type === "comment")
    ? { ...event, data: { ...event.data, text: `[${item.batchCount} viewers are saying:] ${(event.data.text as string) ?? ""}` } }
    : event;

  const hostResult = await runHostAgent({
    event: eventForHost,
    streamerId,
    personaName: config.personaName,
    personality,
    memoryContext: memoryCtx,
    replyLanguage: config.replyLanguage ?? "auto",
    conversationHistory,
    emotionState,
    behaviorCtx: behaviorCtx || undefined,
  });

  if (!hostResult?.text) {
    console.log(`[Agent:Host] ✗ no reply generated for event=${event.type} viewer=${event.username}`);
    return;
  }

  // ── Behavior Engine: inject paralinguistic texture into spoken text ──────────
  const spokenText = injectParalinguistics(hostResult.text, {
    emotionState,
    personalityKey: personality.modeKey,
    humor,
    questionComplexity,
    streamFatigue: getStreamFatigue(sessionId),
  });
  if (spokenText !== hostResult.text) {
    console.log(`[Agent:Behavior] 🎭 paralinguistic | "${spokenText.slice(0, 80)}"`);
  }

  console.log(`[Agent:Host] 🎙️ reply="${spokenText.slice(0, 100)}" | emotion=${hostResult.emotion} | personality=${personality.modeKey}`);

  state.lastTtsTime = Date.now();

  const roomId = `session:${sessionId}`;

  console.log(
    `[NEW-PIPELINE] 📢 ai:announcement | type=${event.type} | viewer=${event.username ?? "anon"} | session=${sessionId} | text="${spokenText.slice(0, 80)}"`,
  );
  io.to(roomId).emit("ai:announcement", {
    text: spokenText,
    type: event.type,
    viewerName: event.username,
    emotion: hostResult.emotion,
    agentType: "host",
    personality: personality.modeKey,
    pipeline: "orchestrator",  // proof: every announcement from the new pipeline carries this field
  });

  io.to(roomId).emit("agent:task", {
    agentType: "host",
    action: "spoke",
    text: spokenText,
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

    // Record per-viewer reply timestamp so the pre-filter can enforce cooldowns
    const viewerKey = `${sessionId}:${event.username ?? "anon"}`;
    state.perViewerReplyCooldown.set(viewerKey, Date.now());
    console.log(`[NEW-PIPELINE] 🕐 per-viewer cooldown set | viewer=${event.username} | session=${sessionId}`);
  }

  // ── Strategy Agent: score response (engagement-weighted, not hardcoded 5.0) ──
  void scoreResponse({
    sessionId,
    streamerId,
    agentType: "host",
    triggerEvent: event.type,
    aiResponse: hostResult.text,
    score: computeBaseScore(item.priority, event.type),
  });

  // ── Voice Agent: synthesize TTS (emotion-adjusted speed) ────────────────────
  if (config.voiceEnabled && state.enabledAgents.has("voice")) {
    try {
      const emotionSpeedBoost = getVoiceSpeedModifier(emotionState);
      const adjustedSpeed     = Math.min(1.8, Math.max(0.5, (voice.speed ?? 1.0) + emotionSpeedBoost));
      if (Math.abs(emotionSpeedBoost) > 0.01) {
        console.log(`[Agent:Voice] 🎙️ speed adjusted by emotion | base=${voice.speed} boost=${emotionSpeedBoost.toFixed(2)} → ${adjustedSpeed.toFixed(2)}`);
      }
      console.log(`[Agent:Voice] 🎙️ synthesizing TTS | voiceKey=${voice.voiceKey} speed=${adjustedSpeed.toFixed(2)} | text="${spokenText.slice(0, 50)}..."`);
      const audioBuffer = await generateVoice(spokenText, voice.voiceKey as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer", adjustedSpeed);
      if (audioBuffer) {
        console.log(`[Agent:Voice] ✓ TTS audio generated | ${audioBuffer.byteLength ?? 0} bytes`);
        io.to(roomId).emit("tts:audio", { audio: audioBuffer, text: spokenText });
      }
    } catch (err: unknown) {
      console.error("[Agent:Voice] ✗ TTS error:", (err as Error)?.message);
    }
  }

  // ── Strategy Agent: generate suggestions ────────────────────────────────────
  if (state.enabledAgents.has("strategy") && await shouldGenerateSuggestion(sessionId)) {
    const suggestion = await generateStrategySuggestion({ sessionId, streamerId, personaName: config.personaName });
    if (suggestion) {
      console.log(`[Agent:Strategy] 📊 strategy suggestion generated`);
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
  }).catch((err: unknown) => {
    console.error("[Agent:TaskLog] DB insert failed:", (err as Error)?.message ?? err);
  });
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
  clearEmotionalState(sessionId);
  clearBehaviorState(sessionId);
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
