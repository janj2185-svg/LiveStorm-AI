import type { Server as SocketServer } from "socket.io";
import { db, aiPersonaConfigsTable, aiMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateAnnouncement } from "./aiService";

async function logAnnouncement(streamerId: number, text: string): Promise<void> {
  try {
    await db.insert(aiMessagesTable).values({ streamerId, role: "assistant", content: text });
  } catch {
    // DB logging must never crash the announcement pipeline
  }
}

async function getPersona(streamerId: number) {
  return db.query.aiPersonaConfigsTable.findFirst({
    where: eq(aiPersonaConfigsTable.streamerId, streamerId),
  });
}

export async function emitAiAutomationAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  event: { type: string; viewerName: string; amount?: number },
  automationName: string,
): Promise<string> {
  try {
    const config = await getPersona(streamerId);
    const persona = config
      ? { name: config.personaName, tone: config.tone }
      : { name: "AI Co-host", tone: "friendly" };

    const text = await generateAnnouncement({
      type: event.type,
      viewerName: event.viewerName,
      amount: event.amount,
      persona,
    });

    if (!text) {
      console.warn(`[AI:automation] streamerId=${streamerId} automation="${automationName}" — empty text returned`);
      return "";
    }

    console.log(`[AI:automation] streamerId=${streamerId} automation="${automationName}" → "${text.slice(0, 60)}"`);
    io.to(roomId).emit("ai:announcement", { text, type: "automation", viewerName: event.viewerName, automationName });
    await logAnnouncement(streamerId, text);
    return text;
  } catch {
    return "";
  }
}

export async function emitAiGiftAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  viewerName: string,
  coins: number,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config) return;
    const text = await generateAnnouncement({
      type: "gift",
      viewerName,
      amount: coins,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] gift | streamerId=${streamerId} viewer=${viewerName} coins=${coins} → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "gift", viewerName });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export async function emitAiLevelUpAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  viewerName: string,
  newLevel: number,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config || !config.announceLevelUp) return;
    const text = await generateAnnouncement({
      type: "level_up",
      viewerName,
      amount: newLevel,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] level_up | streamerId=${streamerId} viewer=${viewerName} lvl=${newLevel} → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "level_up", viewerName });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export async function emitAiBossDefeatedAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  bossName: string,
  killedBy: string,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config || !config.announceBossKill) return;
    const text = await generateAnnouncement({
      type: "boss_kill",
      viewerName: killedBy,
      bossName,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] boss_kill | streamerId=${streamerId} boss="${bossName}" killedBy=${killedBy} → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "boss_defeated", viewerName: killedBy, bossName });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export async function emitAiShareAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  viewerName: string,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config || !config.announceGifts) return;
    const text = await generateAnnouncement({
      type: "share",
      viewerName,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] share | streamerId=${streamerId} viewer=${viewerName} → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "share", viewerName });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export async function emitAiLikeMilestoneAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  totalLikes: number,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config || !config.announceGifts) return;
    const text = await generateAnnouncement({
      type: "like_milestone",
      amount: totalLikes,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] like_milestone | streamerId=${streamerId} totalLikes=${totalLikes} → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "like_milestone" });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export async function emitAiLuckyDropAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  winnerName: string,
  dropName: string,
  xpReward: number,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config) return;
    const text = await generateAnnouncement({
      type: "lucky_drop",
      viewerName: winnerName,
      bossName: dropName,
      amount: xpReward,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] lucky_drop | streamerId=${streamerId} winner=${winnerName} drop="${dropName}" → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "lucky_drop", viewerName: winnerName, dropName });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export async function emitAiAchievementAnnouncement(
  io: SocketServer,
  roomId: string,
  streamerId: number,
  viewerName: string,
  achievementName: string,
) {
  try {
    const config = await getPersona(streamerId);
    if (!config) return;
    const text = await generateAnnouncement({
      type: "achievement",
      viewerName,
      bossName: achievementName,
      persona: { name: config.personaName, tone: config.tone },
    });
    if (text) {
      console.log(`[AI:announcer] achievement | streamerId=${streamerId} viewer=${viewerName} achievement="${achievementName}" → "${text.slice(0, 60)}"`);
      io.to(roomId).emit("ai:announcement", { text, type: "achievement", viewerName, achievementName });
      await logAnnouncement(streamerId, text);
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}
