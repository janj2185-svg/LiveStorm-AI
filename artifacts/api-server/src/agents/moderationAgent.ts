import OpenAI from "openai";
import { db, aiModerationLogsTable, chatPriorityQueueTable } from "@workspace/db";
import type { TikTokEvent } from "../lib/tiktokSimulator";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL!,
});

export interface ModerationResult {
  flagged: boolean;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  action: "ignore" | "warn" | "flag" | "block";
}

const FAST_PATTERNS = [
  { pattern: /\b(spam|scam|hack|phish)\b/i, reason: "spam/scam", severity: "high" as const },
  { pattern: /\b(kill|murder|rape|terrorist)\b/i, reason: "violent content", severity: "critical" as const },
  { pattern: /(.)\1{6,}/i, reason: "character spam", severity: "low" as const },
  { pattern: /^[A-Z\s!]{20,}$/, reason: "all caps spam", severity: "low" as const },
  { pattern: /https?:\/\/\S+/i, reason: "link promotion", severity: "medium" as const },
];

export function fastModerationCheck(text: string): ModerationResult {
  for (const { pattern, reason, severity } of FAST_PATTERNS) {
    if (pattern.test(text)) {
      return {
        flagged: true,
        reason,
        severity,
        action: severity === "critical" ? "block" : severity === "high" ? "flag" : "warn",
      };
    }
  }
  return { flagged: false, reason: "", severity: "low", action: "ignore" };
}

export async function moderateWithAI(text: string): Promise<ModerationResult> {
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content: `You are a content moderator for a TikTok LIVE stream. Analyze the message and return JSON:
{"flagged": boolean, "reason": "string", "severity": "low|medium|high|critical", "action": "ignore|warn|flag|block"}
Only flag genuinely harmful content: hate speech, harassment, spam, dangerous content. Be lenient with normal chat.`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as ModerationResult;
    return {
      flagged: parsed.flagged ?? false,
      reason: parsed.reason ?? "",
      severity: parsed.severity ?? "low",
      action: parsed.action ?? "ignore",
    };
  } catch {
    return { flagged: false, reason: "", severity: "low", action: "ignore" };
  }
}

export async function runModerationAgent(opts: {
  event: TikTokEvent;
  streamerId: number;
  sessionId: number;
  useAI?: boolean;
}): Promise<ModerationResult> {
  const text = (opts.event.data.text as string ?? "").trim();
  if (!text || text.length < 3) return { flagged: false, reason: "", severity: "low", action: "ignore" };

  const fast = fastModerationCheck(text);
  if (fast.flagged) {
    await logModeration(opts.streamerId, opts.sessionId, opts.event.username ?? "Unknown", text, fast.reason, fast.severity);
    return fast;
  }

  if (opts.useAI) {
    const aiResult = await moderateWithAI(text);
    if (aiResult.flagged) {
      await logModeration(opts.streamerId, opts.sessionId, opts.event.username ?? "Unknown", text, aiResult.reason, aiResult.severity);
    }
    return aiResult;
  }

  return { flagged: false, reason: "", severity: "low", action: "ignore" };
}

async function logModeration(
  streamerId: number,
  sessionId: number,
  viewerName: string,
  comment: string,
  reason: string,
  severity: string,
): Promise<void> {
  await db.insert(aiModerationLogsTable).values({
    sessionId,
    streamerId,
    viewerName,
    comment,
    reason: `[${severity.toUpperCase()}] ${reason}`,
  }).catch(() => {});
}

export async function logChatPriority(opts: {
  sessionId: number;
  streamerId: number;
  viewerName: string;
  message: string;
  priorityLevel: number;
  priorityReason: string;
  agentType: string;
}): Promise<void> {
  await db.insert(chatPriorityQueueTable).values(opts).catch(() => {});
}
