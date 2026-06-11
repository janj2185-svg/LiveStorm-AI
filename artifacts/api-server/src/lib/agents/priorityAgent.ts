import type { TikTokEvent } from "../tiktokSimulator";
import type { ViewerContext } from "./memoryAgent";

export interface PriorityScore {
  score: number;
  reason: string;
  shouldReply: boolean;
  shouldBatch: boolean;
}

export interface QueueEntry {
  sessionId: number;
  viewerName: string;
  comment: string;
  score: number;
  reason: string;
  timestamp: number;
  replied: boolean;
}

// Per-session priority queues (in-memory)
const sessionQueues = new Map<number, QueueEntry[]>();

// Recent comment fingerprints to detect batching (similar messages)
const recentComments = new Map<string, number[]>();

setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, queue] of sessionQueues) {
    const fresh = queue.filter(e => e.timestamp > cutoff);
    if (fresh.length === 0) sessionQueues.delete(key);
    else sessionQueues.set(key, fresh);
  }
  for (const [key, ts] of recentComments) {
    const fresh = ts.filter(t => t > cutoff);
    if (fresh.length === 0) recentComments.delete(key);
    else recentComments.set(key, fresh);
  }
}, 5 * 60 * 1000);

function isQuestion(text: string): boolean {
  const t = text.trim();
  return t.endsWith("?") || /^(what|who|where|when|why|how|can you|could you|do you|are you|is this|will you)/i.test(t);
}

function isSimilarToRecent(sessionId: number, comment: string): boolean {
  const key = `${sessionId}:${normalize(comment)}`;
  const times = recentComments.get(key) ?? [];
  const now = Date.now();
  const fresh = times.filter(t => now - t < 60_000);
  recentComments.set(key, [...fresh, now]);
  return fresh.length >= 3;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

export function scorePriority(
  event: TikTokEvent,
  viewerCtx: ViewerContext,
): PriorityScore {
  if (event.type !== "comment") {
    return { score: 5, reason: "non-comment event", shouldReply: false, shouldBatch: false };
  }

  const comment = ((event.data?.text as string) ?? "").trim();
  const sessionId = event.sessionId;
  let score = 5;
  const reasons: string[] = [];

  // VIP / high gifter
  const vipLevel = viewerCtx.profile?.vipLevel ?? "none";
  if (vipLevel === "diamond") { score += 4; reasons.push("diamond VIP"); }
  else if (vipLevel === "gold") { score += 3; reasons.push("gold VIP"); }
  else if (vipLevel === "silver") { score += 2; reasons.push("silver VIP"); }
  else if (vipLevel === "bronze") { score += 1; reasons.push("bronze VIP"); }

  // Direct question
  if (isQuestion(comment)) { score += 3; reasons.push("direct question"); }

  // First-time commenter (new to stream)
  if (viewerCtx.profile?.isFirstSeen) { score += 2; reasons.push("first-time viewer"); }

  // Regular chatter (lots of comments = loyal viewer)
  const totalComments = viewerCtx.profile?.totalComments ?? 0;
  if (totalComments >= 50) { score += 1; reasons.push("loyal viewer"); }

  // Spam-like pattern (exact same comment appearing too often)
  if (isSimilarToRecent(sessionId, comment)) { score -= 3; reasons.push("similar to recent batch"); }

  // Cap at 10
  score = Math.max(1, Math.min(10, score));

  const shouldReply = score >= 6;
  const shouldBatch = score < 4;

  return {
    score,
    reason: reasons.join(", ") || "standard comment",
    shouldReply,
    shouldBatch,
  };
}

export function enqueueComment(
  sessionId: number,
  viewerName: string,
  comment: string,
  priority: PriorityScore,
): void {
  let queue = sessionQueues.get(sessionId) ?? [];
  queue.push({
    sessionId,
    viewerName,
    comment,
    score: priority.score,
    reason: priority.reason,
    timestamp: Date.now(),
    replied: false,
  });
  // Keep only top 50 unprocessed
  queue = queue.slice(-50);
  sessionQueues.set(sessionId, queue);
}

export function getSessionQueue(sessionId: number): QueueEntry[] {
  return [...(sessionQueues.get(sessionId) ?? [])];
}

export function markReplied(sessionId: number, viewerName: string): void {
  const queue = sessionQueues.get(sessionId);
  if (!queue) return;
  for (const entry of queue) {
    if (entry.viewerName === viewerName && !entry.replied) {
      entry.replied = true;
      break;
    }
  }
}
