import type { Server as SocketServer } from "socket.io";
import type { TikTokEvent } from "./tiktokSimulator";
import { db } from "@workspace/db";
import { automationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

  const numValue = parseFloat(conditionValue);
  if (isNaN(numValue)) return true;

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

export async function processAutomations(
  io: SocketServer,
  roomId: string,
  userId: number,
  event: TikTokEvent
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

    for (const automation of automations) {
      const fired = evaluateCondition(
        automation.eventType,
        event,
        automation.conditionOperator,
        automation.conditionValue
      );

      if (fired) {
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

        io.to(roomId).emit("automation:fired", firedEvent);
      }
    }
  } catch (_err) {
  }
}
