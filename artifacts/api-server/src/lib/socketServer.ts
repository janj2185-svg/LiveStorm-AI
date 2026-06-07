import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { getAuth } from "@clerk/express";
import { db, streamersTable, sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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
      socket.join(`session:${sessionId}`);
      socket.emit("session:joined", { sessionId });
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

export async function broadcastEvent(
  event: TikTokEvent,
  userId: number,
) {
  if (!io) return;

  const roomId = `session:${event.sessionId}`;
  io.to(roomId).emit("live:event", event);

  await processAutomations(io, roomId, userId, event);

  try {
    const updateFields: Record<string, unknown> = {};

    if (event.type === "gift") {
      const coins = (event.data.coins as number) ?? 0;
      await db
        .update(streamersTable)
        .set({ totalGiftsReceived: (await db.query.streamersTable.findFirst({ where: eq(streamersTable.id, (await db.query.sessionsTable.findFirst({ where: eq(sessionsTable.id, event.sessionId) }))?.streamerId ?? 0) }))?.totalGiftsReceived ?? 0 + coins })
        .where(eq(streamersTable.id, (await db.query.sessionsTable.findFirst({ where: eq(sessionsTable.id, event.sessionId) }))?.streamerId ?? 0));
    }

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

        if (count > (session.peakViewers ?? 0)) {
          await db
            .update(sessionsTable)
            .set({ peakViewers: count })
            .where(eq(sessionsTable.id, event.sessionId));
        }
      }
    }
  } catch (_err) {}
}
