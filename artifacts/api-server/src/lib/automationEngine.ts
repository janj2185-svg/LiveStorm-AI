import type { Server as SocketServer } from "socket.io";
import type { TikTokEvent } from "./tiktokSimulator";
import { db } from "@workspace/db";
import { automationsTable, automationLogsTable, streamersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateVoice } from "./aiService";
import { emitAiAutomationAnnouncement } from "./aiAnnouncer";

export interface AutomationFiredEvent {
  automationId: number;
  automationName: string;
  actionType: string;
  actionPayload: string;
  triggerEvent: TikTokEvent;
  timestamp: number;
}

function evaluateCondition(
  eventType: string,
  event: TikTokEvent,
  operator: string,
  conditionValue: string
): boolean {
  if (event.type !== eventType) return false;

  if (eventType === "comment") {
    const text = String(event.data.text ?? "").toLowerCase();
    const keyword = conditionValue.toLowerCase();
    switch (operator) {
      case "contains": return text.includes(keyword);
      case "startsWith": return text.startsWith(keyword);
      case "endsWith": return text.endsWith(keyword);
      case "exact": return text === keyword;
      case "regex": {
        try {
          return new RegExp(conditionValue, "i").test(String(event.data.text ?? ""));
        } catch {
          return false;
        }
      }
      case "any":
      default:
        return true;
    }
  }

  if (eventType === "follow" || eventType === "share") {
    return true;
  }

  const numValue = parseFloat(conditionValue);

  if (isNaN(numValue)) {
    return true;
  }

  let eventValue = 0;

  if (eventType === "gift") {
    eventValue = (event.data.coins as number) ?? 0;
  } else if (eventType === "like") {
    eventValue = (event.data.likeCount as number) ?? 0;
  } else if (eventType === "viewerCount") {
    eventValue = (event.data.count as number) ?? 0;
  } else {
    return true;
  }

  switch (operator) {
    case "gte": return eventValue >= numValue;
    case "gt": return eventValue > numValue;
    case "lte": return eventValue <= numValue;
    case "lt": return eventValue < numValue;
    case "eq": return eventValue === numValue;
    default: return true;
  }
}

async function writeLog(
  automationId: number,
  streamerId: number,
  sessionId: number,
  eventType: string,
  actionType: string,
  result: string,
): Promise<void> {
  try {
    await db.insert(automationLogsTable).values({
      automationId,
      streamerId,
      sessionId,
      eventType,
      actionType,
      result,
    });
  } catch (err: any) {
    console.error(`[Automation:log] Failed to write log: ${err?.message}`);
  }
}

async function executeAction(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  automation: typeof automationsTable.$inferSelect,
  event: TikTokEvent,
): Promise<string> {
  const { actionType, actionPayload } = automation;
  const viewerName = event.username ?? "a viewer";

  try {
    if (actionType === "ai_response" || actionType === "send_chat_reply") {
      const amount =
        event.type === "gift"
          ? ((event.data.coins as number) ?? 0)
          : event.type === "like"
            ? ((event.data.likeCount as number) ?? 0)
            : undefined;

      const text = await emitAiAutomationAnnouncement(
        io,
        roomId,
        streamerId,
        { type: actionPayload?.trim() || event.type, viewerName, amount },
        automation.name,
      );

      if (!text) {
        return "error:empty_response";
      }
      return "success";
    }

    if (actionType === "tts" || actionType === "play_sound") {
      const textToSpeak = actionPayload?.trim() || `${viewerName} triggered the stream!`;
      const audioBuffer = await generateVoice(textToSpeak);
      if (audioBuffer) {
        const audioBase64 = audioBuffer.toString("base64");
        io.to(roomId).emit("tts:play", { audioBase64, mimeType: "audio/mpeg", text: textToSpeak });
        console.log(
          `[Automation:tts] rule="${automation.name}" session=${event.sessionId} bytes=${audioBuffer.length}`,
        );
      } else {
        console.warn(`[Automation:tts] rule="${automation.name}" — voice generation returned null`);
        return "error:voice_generation_failed";
      }
      return "success";
    }

    if (
      actionType === "custom_message" ||
      actionType === "display_message" ||
      actionType === "show_alert"
    ) {
      const message = actionPayload?.trim() || "Something happened on stream!";
      io.to(roomId).emit("system:message", {
        text: message,
        automationName: automation.name,
        timestamp: Date.now(),
      });
      console.log(
        `[Automation:custom_message] rule="${automation.name}" session=${event.sessionId} → "${message.slice(0, 60)}"`,
      );
      return "success";
    }

    if (actionType === "webhook") {
      console.log(
        `[Automation:webhook] rule="${automation.name}" session=${event.sessionId} — webhook stub`,
      );
      return "success:webhook_stub";
    }

    console.warn(`[Automation:exec] Unknown actionType="${actionType}" rule="${automation.name}"`);
    return `error:unknown_action_${actionType}`;
  } catch (err: any) {
    console.error(
      `[Automation:exec:error] rule="${automation.name}" actionType=${actionType}: ${err?.message}`,
    );
    return `error:${err?.message ?? "unknown"}`;
  }
}

export async function processAutomations(
  io: SocketServer,
  roomId: string,
  userId: number,
  event: TikTokEvent,
  streamerId?: number,
) {
  try {
    const automations = await db
      .select()
      .from(automationsTable)
      .where(
        and(
          eq(automationsTable.userId, userId),
          eq(automationsTable.isEnabled, true)
        )
      );

    let resolvedStreamerId = streamerId;
    if (!resolvedStreamerId) {
      try {
        const streamer = await db.query.streamersTable.findFirst({
          where: eq(streamersTable.userId, userId),
        });
        resolvedStreamerId = streamer?.id;
      } catch {
        // proceed without streamerId — ai_response/tts will gracefully degrade
      }
    }

    for (const automation of automations) {
      const fired = evaluateCondition(
        automation.eventType,
        event,
        automation.conditionOperator,
        automation.conditionValue
      );

      if (!fired) continue;

      await db
        .update(automationsTable)
        .set({
          triggerCount: automation.triggerCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(automationsTable.id, automation.id));

      const firedEvent: AutomationFiredEvent = {
        automationId: automation.id,
        automationName: automation.name,
        actionType: automation.actionType,
        actionPayload: automation.actionPayload,
        triggerEvent: event,
        timestamp: Date.now(),
      };

      console.log(
        `[Automation:match] session=${event.sessionId} eventType=${event.type} ` +
        `rule="${automation.name}"(id=${automation.id}) ` +
        `trigger=${automation.eventType}/${automation.conditionOperator}/${automation.conditionValue || "*"} ` +
        `→ action=${automation.actionType} payload="${(automation.actionPayload ?? "").slice(0, 60)}"`,
      );

      io.to(roomId).emit("automation:fired", firedEvent);

      let result = "success";
      if (resolvedStreamerId) {
        result = await executeAction(io, roomId, resolvedStreamerId, automation, event);
      } else {
        console.warn(
          `[Automation:exec] rule="${automation.name}" — streamerId not resolved; skipping action`,
        );
        result = "error:streamer_not_found";
      }

      console.log(
        `[Automation:exec] session=${event.sessionId} rule="${automation.name}"(id=${automation.id}) ` +
        `→ action=${automation.actionType} result=${result} triggerCount=${automation.triggerCount + 1}`,
      );

      if (resolvedStreamerId) {
        await writeLog(
          automation.id,
          resolvedStreamerId,
          event.sessionId,
          event.type,
          automation.actionType,
          result,
        );
      }
    }
  } catch (err: any) {
    console.error(`[Automation:error] session=${event.sessionId} type=${event.type}: ${err?.message}`);
  }
}
