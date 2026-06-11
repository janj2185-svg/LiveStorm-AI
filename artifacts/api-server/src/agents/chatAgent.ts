import { db, chatPriorityQueueTable, agentViewerProfilesTable as viewerProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { TikTokEvent } from "../lib/tiktokSimulator";

export const PRIORITY_LEVELS = {
  GIFT: 1,
  FOLLOW: 2,
  BATTLE: 3,
  DIRECT_QUESTION: 4,
  VIP_VIEWER: 5,
  GENERAL: 6,
} as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];

export interface ChatClassification {
  priority: PriorityLevel;
  reason: string;
  agentType: "host" | "chat" | "battle" | "strategy" | "moderation";
  isQuestion: boolean;
  isVip: boolean;
  groupKey?: string;
}

const QUESTION_PATTERNS = [
  /\?/,
  /^(what|how|why|when|where|who|can you|could you|tell me|do you)/i,
  /^@(storm|ai|bot|host)/i,
];

const SPAM_PATTERNS = [
  /^(.{1,3})\1{4,}$/,
  /^[A-Z]{15,}$/,
  /^[!?.]{5,}$/,
];

interface BatchEntry {
  messages: Array<{ username: string; text: string; ts: number }>;
  timer: ReturnType<typeof setTimeout>;
  groupKey: string;
}

const chatBatches = new Map<string, BatchEntry>();

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function computeGroupKey(text: string): string {
  const words = normalizeText(text).split(/\s+/).slice(0, 3);
  return words.join("_");
}

function isSpamMessage(text: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(text));
}

function isDirectQuestion(text: string): boolean {
  return QUESTION_PATTERNS.some((p) => p.test(text));
}

export async function classifyEvent(
  event: TikTokEvent,
  streamerId: number,
): Promise<ChatClassification> {
  if (event.type === "gift") {
    return { priority: PRIORITY_LEVELS.GIFT, reason: "Gift received", agentType: "host", isQuestion: false, isVip: true };
  }
  if (event.type === "follow") {
    return { priority: PRIORITY_LEVELS.FOLLOW, reason: "New follower", agentType: "host", isQuestion: false, isVip: false };
  }
  if (event.type === "share") {
    return { priority: PRIORITY_LEVELS.FOLLOW, reason: "Stream shared", agentType: "host", isQuestion: false, isVip: false };
  }

  if (event.type === "comment") {
    const text = (event.data.text as string) ?? "";
    const viewerId = (event.data.uniqueId as string) ?? event.username ?? "";

    if (isSpamMessage(text)) {
      return { priority: PRIORITY_LEVELS.GENERAL, reason: "Spam pattern", agentType: "moderation", isQuestion: false, isVip: false };
    }

    let isVip = false;
    try {
      const profile = await db.query.agentViewerProfilesTable.findFirst({
        where: and(
          eq(viewerProfilesTable.streamerId, streamerId),
          eq(viewerProfilesTable.tiktokViewerId, viewerId),
        ),
      });
      if (profile && profile.vipLevel !== "none") isVip = true;
    } catch {}

    const isQuestion = isDirectQuestion(text);
    if (isQuestion) {
      return { priority: PRIORITY_LEVELS.DIRECT_QUESTION, reason: "Direct question detected", agentType: "host", isQuestion: true, isVip };
    }
    if (isVip) {
      return { priority: PRIORITY_LEVELS.VIP_VIEWER, reason: "VIP viewer", agentType: "host", isQuestion: false, isVip: true, groupKey: computeGroupKey(text) };
    }

    const groupKey = computeGroupKey(text);
    return { priority: PRIORITY_LEVELS.GENERAL, reason: "General chat", agentType: "chat", isQuestion: false, isVip: false, groupKey };
  }

  return { priority: PRIORITY_LEVELS.GENERAL, reason: "General event", agentType: "host", isQuestion: false, isVip: false };
}

export interface BatchResult {
  summary: string;
  topMessage: string;
  count: number;
  groupKey: string;
}

export function batchSimilarMessages(
  sessionId: number,
  streamerId: number,
  username: string,
  text: string,
  groupKey: string,
  onFlush: (result: BatchResult) => void,
  windowMs = 3000,
): void {
  const batchKey = `${sessionId}:${groupKey}`;
  let batch = chatBatches.get(batchKey);

  if (batch) {
    clearTimeout(batch.timer);
    batch.messages.push({ username, text, ts: Date.now() });
  } else {
    batch = {
      groupKey,
      messages: [{ username, text, ts: Date.now() }],
      timer: null as unknown as ReturnType<typeof setTimeout>,
    };
    chatBatches.set(batchKey, batch);
  }

  batch.timer = setTimeout(() => {
    const b = chatBatches.get(batchKey);
    if (!b) return;
    chatBatches.delete(batchKey);

    const count = b.messages.length;
    const topMessage = b.messages[0]!;
    const summary =
      count === 1
        ? `${topMessage.username}: "${topMessage.text}"`
        : `${count} viewers talking about: "${topMessage.text}" (+ ${count - 1} similar)`;

    onFlush({ summary, topMessage: topMessage.text, count, groupKey });
  }, windowMs);
}

export async function savePriorityDecision(opts: {
  sessionId: number;
  streamerId: number;
  viewerName: string;
  message: string;
  priorityLevel: number;
  priorityReason: string;
  agentType: string;
}): Promise<void> {
  await db.insert(chatPriorityQueueTable).values({
    sessionId: opts.sessionId,
    streamerId: opts.streamerId,
    viewerName: opts.viewerName,
    message: opts.message.slice(0, 500),
    priorityLevel: opts.priorityLevel,
    priorityReason: opts.priorityReason,
    agentType: opts.agentType,
    wasResponded: false,
  }).catch(() => {});
}
