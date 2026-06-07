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
    if (text) io.to(roomId).emit("ai:announcement", { text, type: "gift", viewerName });
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
    if (text) io.to(roomId).emit("ai:announcement", { text, type: "level_up", viewerName });
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
    if (text) io.to(roomId).emit("ai:announcement", { text, type: "boss_defeated", viewerName: killedBy, bossName });
  } catch {
    // AI failures must never crash the pipeline
  }
}
