import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { db, streamersTable, sessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { processAutomations } from "./automationEngine";
import type { TikTokEvent } from "./tiktokSimulator";

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    socket.on("session:join", async (sessionId: number) => {
      try {
        const session = await db.query.sessionsTable.findFirst({
          where: eq(sessionsTable.id, Number(sessionId)),
        });
        if (!session || session.endedAt) {
          socket.emit("session:error", { message: "Session not found or ended" });
          return;
        }
        socket.join(`session:${sessionId}`);
        socket.emit("session:joined", { sessionId });
      } catch (_err) {
        socket.emit("session:error", { message: "Could not join session" });
      }
    });

    socket.on("session:leave", (sessionId: number) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

export async function ingestLiveEvent(event: TikTokEvent, userId: number) {
  if (!io) return;

  const roomId = `session:${event.sessionId}`;

  io.to(roomId).emit("live:event", event);

  await processAutomations(io, roomId, userId, event);

  try {
    if (event.type === "viewerCount") {
      const count = (event.data.count as number) ?? 0;
      const session = await db.query.sessionsTable.findFirst({
        where: eq(sessionsTable.id, event.sessionId),
      });
      if (session) {
        await db
          .update(streamersTable)
          .set({ viewerCount: count, updatedAt: new Date() })
          .where(eq(streamersTable.id, session.streamerId));

        if (count > session.peakViewers) {
          await db
            .update(sessionsTable)
            .set({ peakViewers: count })
            .where(eq(sessionsTable.id, event.sessionId));
        }
      }
    } else if (event.type === "gift") {
      const coins = (event.data.coins as number) ?? 0;
      await db
        .update(sessionsTable)
        .set({ totalGifts: sql`${sessionsTable.totalGifts} + ${coins}` })
        .where(eq(sessionsTable.id, event.sessionId));
      const session = await db.query.sessionsTable.findFirst({
        where: eq(sessionsTable.id, event.sessionId),
      });
      if (session) {
        await db
          .update(streamersTable)
          .set({
            totalGiftsReceived: sql`${streamersTable.totalGiftsReceived} + ${coins}`,
            updatedAt: new Date(),
          })
          .where(eq(streamersTable.id, session.streamerId));
      }
    } else if (event.type === "like") {
      const likeCount = (event.data.likeCount as number) ?? 1;
      await db
        .update(sessionsTable)
        .set({ totalLikes: sql`${sessionsTable.totalLikes} + ${likeCount}` })
        .where(eq(sessionsTable.id, event.sessionId));
    } else if (event.type === "follow") {
      await db
        .update(sessionsTable)
        .set({ totalFollowers: sql`${sessionsTable.totalFollowers} + 1` })
        .where(eq(sessionsTable.id, event.sessionId));
    } else if (event.type === "comment") {
      await db
        .update(sessionsTable)
        .set({ totalComments: sql`${sessionsTable.totalComments} + 1` })
        .where(eq(sessionsTable.id, event.sessionId));
    }
  } catch (_err) {}
}
