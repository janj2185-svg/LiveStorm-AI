import type { Server as SocketServer } from "socket.io";
import { db, aiPersonaConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateAnnouncement } from "./aiService";

async function getPersona(streamerId: number) {
  return db.query.aiPersonaConfigsTable.findFirst({
    where: eq(aiPersonaConfigsTable.streamerId, streamerId),
  });
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
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}
