import type { Server as SocketServer } from "socket.io";
import { db, aiAgentsTable, aiAgentTasksTable, aiPersonaConfigsTable, agentViewerProfilesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { TikTokEvent } from "../lib/tiktokSimulator";
import { classifyEvent, savePriorityDecision, PRIORITY_LEVELS, batchSimilarMessages } from "./chatAgent";
import { runHostAgent } from "./hostAgent";
import { runModerationAgent } from "./moderationAgent";
import { getActivePersonality } from "./personalityAgent";
import { getActiveVoice } from "./voiceAgent";
import { getMemoryContext, upsertViewerProfile, trackViewerInSession, schedulePruning } from "./memoryAgent";
import { getViewerContext } from "../lib/agents/memoryAgent";
import { trackStreamEvent, generateStrategySuggestion, shouldGenerateSuggestion, scoreResponse } from "./strategyAgent";
import type { StrategySuggestion } from "./strategyAgent";
import { runLearningAgent } from "./learningAgent";
import { isBattleActive, generateBattleReply, updateBattleScore, initBattleAgent } from "./battleAgent";
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
import {
  initMoodState,
  clearMoodState,
  applyMoodEvent,
  decayAllMoods,
  getMoodPromptContext,
  getMoodBehaviorModifiers,
} from "./moodEngine";

const MAX_QUEUE_SIZE         = 40;   // hard cap — evict oldest P6 items first
const QUEUE_PRUNE_THRESHOLD  = 25;   // start pruning when queue exceeds this depth
const MAX_GENERAL_ITEM_AGE_MS = 15_000; // P6 items older than 15s are stale

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
  3: 1_500,   // battle / streamer speech — fast response
  4: 5_000,   // direct question
  5: 6_000,   // vip viewer
  6: 8_000,   // general chat
};

function ttsCooldown(priority: number): number {
  return TTS_COOLDOWN_MS[priority] ?? 8_000;
}

// Engagement scores by priority / event type for the learning system
// Spec: gift=9, follow=8, direct_question=7, first_timer=7, vip=6, general=5
function computeBaseScore(priority: number, eventType: string, viewerContext?: "first_timer" | "vip" | "regular"): number {
  if (eventType === "gift")   return 9.0;
  if (eventType === "follow") return 8.0;
  if (eventType === "share")  return 7.5;
  if (viewerContext === "first_timer") return 7.0;
  if (viewerContext === "vip")         return 6.0;
  switch (priority) {
    case 4: return 7.0;  // direct question answered
    default: return 5.0; // general chat
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
  sessionToStreamer: Map<number, number>;        // sessionId → streamerId (used by silence filler)
  lastStrategySuggestion: Map<number, { suggestion: StrategySuggestion; ts: number }>; // injected as optional hint into behaviorCtx
  streamerSpeechHistory: Map<number, Array<{ text: string; ts: number }>>; // what the streamer said recently (mic input)
  // Anti-repetition system:
  recentReplies: Map<number, string[]>;         // last 20 AI replies per session
  recentOpeners: Map<number, string[]>;         // last 5 reply openers per session (first 3 words)
  // Real-time engagement tracking:
  recentEventTimes: Map<number, number[]>;      // timestamps of recent processed events per session (for engagement signal)
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
  sessionToStreamer: new Map(),
  lastStrategySuggestion: new Map(),
  streamerSpeechHistory: new Map(),
  recentReplies: new Map(),
  recentOpeners: new Map(),
  recentEventTimes: new Map(),
};

// ── Anti-repetition helpers ────────────────────────────────────────────────────
function extractOpener(text: string): string {
  return text.trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase().replace(/[^a-zа-яіїєґёa-z\s]/gi, "").trim();
}

function isOpenerRepeated(newOpener: string, recentOpeners: string[]): boolean {
  if (!newOpener || newOpener.length < 3) return false;
  const firstWord = newOpener.split(/\s+/)[0] ?? "";
  if (firstWord.length < 3) return false;
  return recentOpeners.some((op) => {
    const opFirst = op.split(/\s+/)[0] ?? "";
    return opFirst === firstWord;
  });
}

// Word-overlap (Jaccard) similarity — catches paraphrased repetitions
function computeSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().split(/\s+/).filter((w) => w.replace(/[^a-zа-яіїєґё]/gi, "").length > 2));
  const wa = tokenize(a);
  const wb = tokenize(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return intersection / union;
}

function isTooSimilarToRecent(text: string, recentReplies: string[], threshold = 0.7): boolean {
  const check = recentReplies.slice(-10); // compare against last 10 replies
  for (const prev of check) {
    if (computeSimilarity(text, prev) >= threshold) return true;
  }
  return false;
}

let ioRef: SocketServer | null = null;

export function initOrchestrator(io: SocketServer): void {
  ioRef = io;
  setInterval(processQueue, 200);
  setInterval(cleanQueue, 30_000);
  setInterval(decayAllEmotions, 30_000);
  setInterval(decayAllMoods, 60_000);

  // Silence detection: check every 15s, emit emotion:state + update mood
  setInterval(() => {
    if (!ioRef) return;
    const silenced = checkSilentSessions();
    for (const { sessionId, state: silenceState } of silenced) {
      ioRef.to(`session:${sessionId}`).emit("emotion:state", {
        ...silenceState,
        ...EMOTION_META[silenceState.primary],
      });
      console.log(
        `[Agent:Emotion] ${EMOTION_META[silenceState.primary].emoji} silence detected → ${silenceState.primary} intensity=${silenceState.intensity}/10 | session=${sessionId}`,
      );
      // Mood: deep silence drains energy and patience more than brief silence
      applyMoodEvent(sessionId, silenceState.primary === "frustrated" ? "deep_silence" : "silence");

      // Verbal filler: real hosts don't go silent during dead air — they think out loud,
      // check in with chat, or share an observation. ~45% chance per silence tick.
      const streamerId = state.sessionToStreamer.get(sessionId);
      if (streamerId && Math.random() < 0.45) {
        const isExtended = silenceState.intensity >= 7;
        void enqueueEvent(
          {
            type:      "silence_filler",
            sessionId,
            username:  undefined,
            data:      { silenceDuration: isExtended ? "extended" : "brief" },
            timestamp: Date.now(),
          } satisfies TikTokEvent,
          streamerId,
        );
        console.log(`[Agent:Silence] 💬 verbal filler enqueued | session=${sessionId} extended=${isExtended}`);
      }
    }
  }, 15_000);

  // Restore battle sessions from DB (server restart recovery)
  void initBattleAgent();

  // Background memory pruning — runs 30s after startup, then every 24h
  setTimeout(() => void schedulePruning(), 30_000);
  setInterval(() => void schedulePruning(), 24 * 60 * 60 * 1000);

  console.log("[Orchestrator] Multi-Agent Core initialized");
}

function cleanQueue(): void {
  const now = Date.now();
  const before = state.queue.length;

  // Drop stale general-chat items early when queue is busy
  if (state.queue.length > 25) {
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

  // Track session → streamer mapping so the silence filler can find the right config
  state.sessionToStreamer.set(event.sessionId, streamerId);

  // ── Streamer mic input: record history + enqueue at P3 (high priority) ──────
  // Streamer speech bypasses all viewer-facing pre-filters.
  if ((event.type as string) === "streamer_speech") {
    const text = (event.data.text as string) ?? "";
    const tenMinAgo = Date.now() - 10 * 60_000;
    const hist = (state.streamerSpeechHistory.get(event.sessionId) ?? []).filter(h => h.ts > tenMinAgo);
    hist.push({ text, ts: Date.now() });
    state.streamerSpeechHistory.set(event.sessionId, hist.slice(-5));
    recordActivity(event.sessionId);
    const streamerItem: QueueItem = {
      priority:       3,
      sessionId:      event.sessionId,
      streamerId,
      event,
      agentType:      "host",
      priorityReason: "Streamer microphone input",
      enqueuedAt:     Date.now(),
    };
    state.queue.push(streamerItem);
    state.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
    console.log(`[Orchestrator] 🎙️ streamer speech | P3 | session=${event.sessionId} | "${text.slice(0, 60)}"`);
    return;
  }

  // ── Silence filler: bypass all pre-filters, enqueue directly at P6 ──────────
  // These are internally-generated ambient responses during dead air.
  // They skip viewer cooldowns, spam checks, and classification.
  if ((event.type as string) === "silence_filler") {
    initMoodState(event.sessionId);
    const fillerItem: QueueItem = {
      priority:      PRIORITY_LEVELS.GENERAL,
      sessionId:     event.sessionId,
      streamerId,
      event,
      agentType:     "host",
      priorityReason: "Ambient filler — silence",
      enqueuedAt:    Date.now(),
    };
    state.queue.push(fillerItem);
    state.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
    // Reset the activity clock so the silence detector doesn't re-fire next tick
    recordActivity(event.sessionId);
    return;
  }

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
    applyMoodEvent(event.sessionId, "like_milestone");
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
    // Mood: gift chain creates lasting positivity and energy boost
    applyMoodEvent(event.sessionId,
      amplifiedTrigger === "gift_whale"    ? "whale_gift" :
      amplifiedTrigger === "gift_big"      ? "big_gift"   : "standard_gift",
    );
    // ── Battle score: all gifts received go to OUR side ────────────────────
    if (isBattleActive(event.sessionId)) {
      const updatedScore = updateBattleScore(event.sessionId, "us", coins);
      if (updatedScore) {
        const gap = Math.abs(updatedScore.us - updatedScore.opponent);
        const leader = updatedScore.us > updatedScore.opponent ? "us" : updatedScore.opponent > updatedScore.us ? "opponent" : "tied";
        console.log(`[BattleAgent] 🏆 score | us=${updatedScore.us} vs opp=${updatedScore.opponent} | gap=${gap} | leader=${leader} | session=${event.sessionId}`);
        ioRef.to(`session:${event.sessionId}`).emit("battle:score", updatedScore);
      }
    }
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
    applyMoodEvent(event.sessionId, "follow");
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
      // Mood: toxic/spam content slowly erodes patience and positivity
      applyMoodEvent(event.sessionId, "toxic_comment");
      return;
    }

    // Low-value comment throttling: emoji-only, number-only, filler words
    // Real streamers don't reply to every "lol" or "🔥🔥🔥"
    {
      const stripped = comment.replace(/[\s\u200B-\u200D\uFEFF]/g, "");
      const emojiOnly = /^[\p{Emoji}\p{Emoji_Presentation}\uFE0F\u20E3]+$/u.test(stripped);
      const numberOnly = /^\d+$/.test(stripped);
      const shortNoise = stripped.length <= 4 && !emojiOnly;
      const fillerWords = new Set(["lol","lmao","xd","gg","ok","okay","nice","hi","hey","wow","haha","hehe","omg","wtf","bruh","ngl","fr","nah","yep","yup","yeah","kek","pog","poggers","oof","rip","ayo","bro","sus","based","cringe","mid","slay"]);
      const isFiller = fillerWords.has(stripped.toLowerCase());

      let skipProb = 0;
      let skipReason = "";
      if (emojiOnly)  { skipProb = 0.80; skipReason = "emoji-only"; }
      else if (numberOnly) { skipProb = 0.70; skipReason = "number-only"; }
      else if (isFiller)   { skipProb = 0.60; skipReason = `filler-word(${stripped})`; }
      else if (shortNoise) { skipProb = 0.65; skipReason = "short-noise"; }

      if (skipProb > 0 && Math.random() < skipProb) {
        console.log(`[LowValue] ⏭️ skip | viewer=${event.username ?? "?"} reason="${skipReason}" prob=${skipProb} | session=${event.sessionId}`);
        return;
      } else if (skipProb > 0) {
        console.log(`[LowValue] ✅ allowed | viewer=${event.username ?? "?"} reason="${skipReason}" rolled-through | session=${event.sessionId}`);
      }
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
    // Mood: active chat builds energy and humor over time
    if (burst.burstLabel === "wild" || burst.burstLabel === "buzzing") {
      applyMoodEvent(event.sessionId, "chat_surge");
    } else if (burst.burstLabel === "warming") {
      applyMoodEvent(event.sessionId, "chat_warming");
    }
  }
  initMoodState(event.sessionId); // idempotent — only initializes if not yet tracked
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
        // Selective non-response: real people don't reply to every P6 comment.
        // Skip probability increases with queue depth and stream fatigue.
        const queueDepth = state.queue.length;
        const fatigue    = getStreamFatigue(event.sessionId);
        const baseSkip   = fatigue >= 0.6 ? 0.22 : fatigue >= 0.3 ? 0.12 : 0.06;
        const queueSkip  = queueDepth > 10 ? 0.15 : queueDepth > 5 ? 0.08 : 0;
        const skipProb   = Math.min(0.35, baseSkip + queueSkip);
        if (Math.random() < skipProb) {
          console.log(`[Orchestrator] 🎲 skip | P6 viewer=${event.username ?? "?"} skip=${skipProb.toFixed(2)} q=${queueDepth} fatigue=${fatigue.toFixed(2)}`);
          return;
        }

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

/**
 * High-volume queue protection — called before every dispatch cycle.
 *
 * Phase 1 (soft prune): When depth > QUEUE_PRUNE_THRESHOLD (25), evict all
 *   P6 (GENERAL) items that are older than MAX_GENERAL_ITEM_AGE_MS (15s).
 *   These are stale low-priority chat messages — the moment has passed.
 *
 * Phase 2 (hard cap): If queue is still above MAX_QUEUE_SIZE (40) after the
 *   soft prune, evict the oldest P6 items until we're at or below the cap.
 *   This prevents unbounded memory growth during spikes.
 */
function pruneQueue(): void {
  if (state.queue.length <= QUEUE_PRUNE_THRESHOLD) return;

  const now = Date.now();

  // Phase 1: drop stale P6 items
  const before = state.queue.length;
  state.queue = state.queue.filter((item) => {
    if (item.priority !== PRIORITY_LEVELS.GENERAL) return true; // keep all non-P6
    return now - item.enqueuedAt < MAX_GENERAL_ITEM_AGE_MS;
  });
  const afterPhase1 = state.queue.length;
  if (afterPhase1 < before) {
    console.log(`[Orchestrator:Queue] 🧹 pruned ${before - afterPhase1} stale P6 items (>${MAX_GENERAL_ITEM_AGE_MS / 1000}s old) | depth: ${before}→${afterPhase1}`);
  }

  // Phase 2: hard cap — evict oldest P6 items until queue ≤ MAX_QUEUE_SIZE
  if (state.queue.length > MAX_QUEUE_SIZE) {
    const p6Indices = state.queue
      .map((item, idx) => (item.priority === PRIORITY_LEVELS.GENERAL ? idx : -1))
      .filter((idx) => idx !== -1)
      .sort((a, b) => (state.queue[a]!.enqueuedAt - state.queue[b]!.enqueuedAt)); // oldest first

    let evicted = 0;
    const toRemove = new Set<number>();
    for (const idx of p6Indices) {
      if (state.queue.length - toRemove.size <= MAX_QUEUE_SIZE) break;
      toRemove.add(idx);
      evicted++;
    }
    if (evicted > 0) {
      state.queue = state.queue.filter((_, idx) => !toRemove.has(idx));
      console.log(`[Orchestrator:Queue] ⚠️ hard cap hit — evicted ${evicted} P6 items | depth now: ${state.queue.length}`);
    }
  }
}

async function processQueue(): Promise<void> {
  if (state.processing || state.queue.length === 0 || !ioRef) return;

  // Prune stale low-priority items before deciding what to dispatch next
  pruneQueue();

  if (state.queue.length === 0) return;

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
      const viewerVisitStatus = trackViewerInSession(sessionId, event.username ?? "Unknown");
      console.log(`[Agent:Memory] 🧠 upsertViewerProfile | viewer=${event.username} | event=${event.type} | visit=${viewerVisitStatus}`);
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

  // ── Memory Agent: load context (merged from both memory agents) ─────────────
  const [rawMemoryCtx, viewerCtx] = await Promise.all([
    state.enabledAgents.has("memory")
      ? getMemoryContext(streamerId, event.username ?? undefined)
      : Promise.resolve(""),
    state.enabledAgents.has("memory") && event.username
      ? getViewerContext(streamerId, event.username, (event.data.uniqueId as string) ?? event.username)
          .catch(() => ({ profile: null, memories: [], contextSummary: "" }))
      : Promise.resolve({ profile: null, memories: [], contextSummary: "" }),
  ]);

  // Merge: viewer profile summary (from lib agent) prepended to free-form memories
  const memoryCtx = [viewerCtx.contextSummary, rawMemoryCtx].filter(Boolean).join("\n");
  if (memoryCtx) {
    console.log(`[Agent:Memory] 🧠 context loaded | ${memoryCtx.length} chars (profile=${viewerCtx.contextSummary.length} + mem=${rawMemoryCtx.length}) | viewer=${event.username}`);
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
        applyMoodEvent(sessionId, "first_timer");
      } else if (viewerProfile.vipLevel !== "none") {
        emotionState = applyEmotionalTrigger(sessionId, "vip_comment");
        console.log(`[Agent:Emotion] ${EMOTION_META[emotionState.primary].emoji} VIP comment: ${event.username} (${viewerProfile.vipLevel})`);
        applyMoodEvent(sessionId, "vip_comment");
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
      intensityMode: (config as any).intensityMode ?? "savage_battle",
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
      const battleRoomSockets = io.sockets.adapter.rooms.get(`session:${sessionId}`)?.size ?? 0;
      if (config.voiceEnabled && state.enabledAgents.has("voice") && battleRoomSockets > 0) {
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
      applyMoodEvent(sessionId, "battle_win");
      return; // battle reply takes over — skip standard host agent
    }
  }

  // ── Behavior Engine: build behavioral context for this event ────────────────
  const commentText2 = event.type === "comment" ? ((event.data.text as string) ?? "") : "";
  const humor              = detectHumor(commentText2);
  const questionComplexity = detectQuestionComplexity(commentText2);
  const fatigueCtx         = getStreamFatiguePromptContext(sessionId);
  const aftermathCtx       = getBattleAftermathContext(sessionId);
  const moodCtx            = getMoodPromptContext(sessionId);
  const behaviorHints      = getBehaviorPromptContext({ humor, questionComplexity });
  // Comment depth hint: long personal comments deserve a response that matches their depth
  const commentDepthHint   = commentText2.length > 60
    ? "This viewer wrote something personal and detailed — match their depth and specificity in your reply."
    : "";
  // Strategy hint: inject the most recent coach suggestion as an optional nudge (valid for 5 min)
  const stratEntry = state.lastStrategySuggestion.get(sessionId);
  const strategyHint = stratEntry && Date.now() - stratEntry.ts < 5 * 60_000
    ? `💡 Optional strategy hint (use when it fits naturally — not forced): ${stratEntry.suggestion.suggestion}`
    : "";
  // Recent streamer speech — give Storm memory of what the streamer said recently
  const recentStreamerSpeech = (state.streamerSpeechHistory.get(sessionId) ?? [])
    .filter(s => Date.now() - s.ts < 10 * 60_000)
    .slice(-3);
  const streamerSpeechCtx = recentStreamerSpeech.length > 0
    ? recentStreamerSpeech.map(s => {
        const ageMs  = Date.now() - s.ts;
        const ageLbl = ageMs < 60_000 ? `${Math.round(ageMs / 1000)}s ago` : `${Math.round(ageMs / 60_000)}m ago`;
        return `[Streamer said ${ageLbl}]: "${s.text}"`;
      }).join("\n")
    : "";

  // ── Live atmosphere: viewer count → energy calibration hint ─────────────────
  const roomSize = io.sockets.adapter.rooms.get(`session:${sessionId}`)?.size ?? 0;
  const atmosphereCtx = roomSize >= 100
    ? `[Live Atmosphere] Big crowd — ${roomSize} viewers watching. Elevate energy, address the whole room as one massive unit.`
    : roomSize >= 30
    ? `[Live Atmosphere] Good crowd — ${roomSize} viewers. Balance personal attention with group hype.`
    : roomSize >= 10
    ? `[Live Atmosphere] Smaller stream — ${roomSize} viewers. More personal, get people talking to each other.`
    : roomSize > 0
    ? `[Live Atmosphere] Intimate stream — ${roomSize} viewer(s). Ultra-personal, one-on-one conversational feeling.`
    : "";

  // ── Real-time engagement signal: event frequency in last 2 min ──────────────
  const nowEngTs = Date.now();
  const prevEventTimes = state.recentEventTimes.get(sessionId) ?? [];
  const updatedEventTimes = [...prevEventTimes.filter(t => t > nowEngTs - 120_000), nowEngTs];
  state.recentEventTimes.set(sessionId, updatedEventTimes);
  const eventsPer2Min = updatedEventTimes.length;
  const engagementCtx = eventsPer2Min >= 15
    ? `[Engagement Signal] 🔥 Stream is extremely active — ${eventsPer2Min} events in 2 min. This energy is working, keep it going.`
    : eventsPer2Min >= 6
    ? `[Engagement Signal] Good engagement — ${eventsPer2Min} events in 2 min. Building well.`
    : eventsPer2Min <= 1
    ? `[Engagement Signal] Chat is slow right now. Try a new angle — ask a question, provoke a debate, or change your energy completely.`
    : "";

  const behaviorCtx = [moodCtx, fatigueCtx, aftermathCtx, behaviorHints, commentDepthHint, strategyHint, streamerSpeechCtx, atmosphereCtx, engagementCtx].filter(Boolean).join("\n");

  // ── Host Agent: generate main AI reply ──────────────────────────────────────
  // When multiple viewers sent the same message, give the AI crowd context in
  // natural language (not a metadata tag) so the response addresses the crowd.
  const batchSize    = item.batchCount ?? 1;
  const originalText = (event.data.text as string) ?? "";
  const crowdPrefix  = batchSize > 4
    ? `A lot of chat (${batchSize} viewers) are all saying: `
    : batchSize > 2
    ? `Several viewers (${batchSize}) are saying: `
    : "";
  const eventForHost = (batchSize > 1 && event.type === "comment" && crowdPrefix)
    ? { ...event, data: { ...event.data, text: `${crowdPrefix}"${originalText}"` } }
    : event;

  const sessionRecentReplies  = state.recentReplies.get(sessionId)  ?? [];
  const sessionRecentOpeners  = state.recentOpeners.get(sessionId)  ?? [];

  console.log(`[HostAgentStarted] event=${event.type} | session=${sessionId} | streamer=${streamerId}${event.type === "streamer_speech" ? ` | speech="${((event.data.text as string) ?? "").slice(0, 60)}"` : ` | viewer="${event.username ?? "anon"}"`}`);
  let hostResult = await runHostAgent({
    event: eventForHost,
    streamerId,
    personaName:     config.personaName,
    personality,
    memoryContext:   memoryCtx,
    replyLanguage:   config.replyLanguage   ?? "auto",
    defaultLanguage: config.defaultLanguage ?? "uk",
    conversationHistory,
    emotionState,
    behaviorCtx:     behaviorCtx || undefined,
    recentReplies:   sessionRecentReplies.slice(-5),
    personaGender:   (config as any).personaGender ?? "neutral",
    intensityMode:   (config as any).intensityMode ?? "streamer",
  });

  console.log(`[HostAgentCompleted] event=${event.type} | hasText=${!!hostResult?.text} | text="${(hostResult?.text ?? "").slice(0, 80)}"`);
  if (!hostResult?.text) {
    console.log(`[Agent:Host] ✗ no reply generated for event=${event.type} viewer=${event.username}`);
    return;
  }

  // ── Anti-repetition: opener check + semantic similarity + regenerate once ─────
  const newOpener = extractOpener(hostResult.text);
  const openerRepeated = isOpenerRepeated(newOpener, sessionRecentOpeners);
  const tooSimilar     = isTooSimilarToRecent(hostResult.text, sessionRecentReplies);

  // Short-circuit streamer intents (greetings, thanks, laughs) are inherently brief
  // and similar by nature — skip the regeneration LLM call to cut latency.
  const shouldSkipAntiRepeat = hostResult.skipAntiRepetition === true;

  if (!shouldSkipAntiRepeat && (openerRepeated || tooSimilar)) {
    const reason = openerRepeated ? `opener repeated "${newOpener.slice(0, 25)}"` : `similarity >70%`;
    console.log(`[Anti-Repeat] 🔄 ${reason} — regenerating once...`);
    const regenResult = await runHostAgent({
      event: eventForHost,
      streamerId,
      personaName:      config.personaName,
      personality,
      memoryContext:    memoryCtx,
      replyLanguage:    config.replyLanguage   ?? "auto",
      defaultLanguage:  config.defaultLanguage ?? "uk",
      conversationHistory,
      emotionState,
      behaviorCtx:      behaviorCtx || undefined,
      recentReplies:    sessionRecentReplies.slice(-8),
      personaGender:    (config as any).personaGender ?? "neutral",
      intensityMode:    (config as any).intensityMode ?? "streamer",
      forceAlternative: true,
    });
    if (regenResult?.text) {
      const regenOpener = extractOpener(regenResult.text);
      const regenSim    = isTooSimilarToRecent(regenResult.text, sessionRecentReplies);
      console.log(`[Anti-Repeat] ✅ alternative | opener="${regenOpener.slice(0, 25)}" sim-ok=${!regenSim} | "${regenResult.text.slice(0, 55)}"`);
      hostResult = regenResult;
    }
  } else {
    console.log(`[Anti-Repeat] ✓ opener="${newOpener.slice(0, 25)}" fresh | sim<70%`);
  }

  // Track this reply for future anti-repetition
  const finalOpener = extractOpener(hostResult.text);
  state.recentOpeners.set(sessionId, [...sessionRecentOpeners, finalOpener].slice(-5));
  state.recentReplies.set(sessionId, [...sessionRecentReplies, hostResult.text].slice(-50));
  console.log(`[Anti-Repeat] 📝 tracked | recentReplies=${state.recentReplies.get(sessionId)!.length}/50 | recentOpeners=${state.recentOpeners.get(sessionId)!.length}/5`);

  // ── Behavior Engine: inject paralinguistic texture into spoken text ──────────
  const spokenText = injectParalinguistics(hostResult.text, {
    emotionState,
    personalityKey: personality.modeKey,
    humor,
    questionComplexity,
    streamFatigue: getStreamFatigue(sessionId),
    moodModifiers: getMoodBehaviorModifiers(sessionId),
  });
  if (spokenText !== hostResult.text) {
    console.log(`[Agent:Behavior] 🎭 paralinguistic | "${spokenText.slice(0, 80)}"`);
  }

  console.log(`[Agent:Host] 🎙️ reply="${spokenText.slice(0, 100)}" | emotion=${hostResult.emotion} | personality=${personality.modeKey}`);
  console.log(`[AIReply] event=${event.type} | "${spokenText.slice(0, 120)}"`);

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
    streamerLang: config.defaultLanguage ?? "uk", // stream's primary language for TTS selection
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

  // Append ALL event types to conversation history so the next reply has full context.
  // A gift arriving mid-conversation, or a follow from someone who was just chatting,
  // should appear in the thread — "Stream was just talking about:" uses this.
  {
    const contextLine =
      event.type === "comment"
        ? (event.data.text as string) ?? ""
        : event.type === "streamer_speech"
        ? `[streamer said]: "${(event.data.text as string) ?? ""}"`
        : event.type === "gift"
        ? `[gift: ${event.username} sent ${(event.data.giftName as string) ?? "a gift"} (${(event.data.coins as number) ?? 0} coins)]`
        : event.type === "follow"
        ? `[follow: ${event.username} just followed]`
        : event.type === "share"
        ? `[share: ${event.username} shared the stream]`
        : `[${event.type}: ${event.username ?? "anon"}]`;
    const updated = [...history, { viewer: event.username ?? "Unknown", comment: contextLine, reply: hostResult.text, ts: Date.now() }];
    state.conversationHistory.set(sessionId, updated.slice(-10));
  }

  if (event.type === "comment") {
    // Record per-viewer reply timestamp so the pre-filter can enforce cooldowns
    const viewerKey = `${sessionId}:${event.username ?? "anon"}`;
    state.perViewerReplyCooldown.set(viewerKey, Date.now());
    console.log(`[NEW-PIPELINE] 🕐 per-viewer cooldown set | viewer=${event.username} | session=${sessionId}`);
  }

  // ── Strategy Agent: score response (engagement-weighted) ────────────────────
  const _lastTrigger = emotionState.lastTrigger ?? "";
  const _viewerCtx =
    _lastTrigger === "first_timer" ? "first_timer" :
    _lastTrigger === "vip_comment" ? "vip" : "regular";
  void scoreResponse({
    sessionId,
    streamerId,
    agentType: "host",
    triggerEvent: event.type,
    aiResponse: hostResult.text,
    score: computeBaseScore(item.priority, event.type, _viewerCtx),
  });

  // ── Voice Agent: synthesize TTS (emotion-adjusted speed) ────────────────────
  const socketsInRoom = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
  console.log(`[TTSRequested] voiceEnabled=${config.voiceEnabled} | socketsInRoom=${socketsInRoom} | event=${event.type} | voiceKey=${voice.voiceKey}`);
  if (config.voiceEnabled && state.enabledAgents.has("voice")) {
    if (socketsInRoom === 0) {
      console.log(`[Agent:Voice] ⚠️ skipping TTS — no sockets in room ${roomId} (prevents silent billing)`);
    } else {
    try {
      const emotionSpeedBoost = getVoiceSpeedModifier(emotionState);
      const adjustedSpeed     = Math.min(1.8, Math.max(0.5, (voice.speed ?? 1.0) + emotionSpeedBoost));
      if (Math.abs(emotionSpeedBoost) > 0.01) {
        console.log(`[Agent:Voice] 🎙️ speed adjusted by emotion | base=${voice.speed} boost=${emotionSpeedBoost.toFixed(2)} → ${adjustedSpeed.toFixed(2)}`);
      }
      console.log(`[Agent:Voice] 🎙️ synthesizing TTS | voiceKey=${voice.voiceKey} speed=${adjustedSpeed.toFixed(2)} | text="${spokenText.slice(0, 50)}..."`);
      const audioBuffer = await generateVoice(spokenText, voice.voiceKey as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer", adjustedSpeed);
      if (audioBuffer) {
        console.log(`[TTSGenerated] bytes=${audioBuffer.byteLength ?? 0} | event=${event.type} → emitting tts:audio to ${roomId}`);
        console.log(`[Agent:Voice] ✓ TTS audio generated | ${audioBuffer.byteLength ?? 0} bytes`);
        io.to(roomId).emit("tts:audio", { audio: audioBuffer, text: spokenText });
      } else {
        console.warn(`[TTSGenerated] ✗ audioBuffer is null — generateVoice returned nothing | event=${event.type}`);
      }
    } catch (err: unknown) {
      console.error("[Agent:Voice] ✗ TTS error:", (err as Error)?.message);
    }
    }
  } else {
    console.log(`[TTSRequested] ⚠️ server TTS skipped — voiceEnabled=${config.voiceEnabled} | voice agent enabled=${state.enabledAgents.has("voice")} → client-side TTS via ai:announcement`);
  }

  // ── Strategy Agent: generate suggestions ────────────────────────────────────
  if (state.enabledAgents.has("strategy") && await shouldGenerateSuggestion(sessionId)) {
    const suggestion = await generateStrategySuggestion({ sessionId, streamerId, personaName: config.personaName });
    if (suggestion) {
      console.log(`[Agent:Strategy] 📊 strategy suggestion generated: "${suggestion.suggestion.slice(0, 60)}" (${suggestion.priority})`);
      // Cache so the NEXT hostAgent call can use it as an optional nudge
      state.lastStrategySuggestion.set(sessionId, { suggestion, ts: Date.now() });
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
  state.sessionToStreamer.delete(sessionId);
  state.lastStrategySuggestion.delete(sessionId);
  state.recentReplies.delete(sessionId);
  state.recentOpeners.delete(sessionId);
  clearEmotionalState(sessionId);
  clearBehaviorState(sessionId);
  clearMoodState(sessionId);
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
