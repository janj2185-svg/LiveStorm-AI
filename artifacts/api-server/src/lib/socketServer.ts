import { Server as SocketServer, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyToken } from "@clerk/express";
import {
  db,
  streamersTable,
  sessionsTable,
  usersTable,
  aiPersonaConfigsTable,
  aiModerationLogsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { processAutomations } from "./automationEngine";
import { processGamification, seedAchievements } from "./gamificationEngine";
import type { TikTokEvent } from "./tiktokSimulator";
import { verifyObsToken } from "../routes/obs";
import { generateAnnouncement, moderateComment } from "./aiService";

let io: SocketServer | null = null;

async function resolveUserIdFromToken(token: string): Promise<number | null> {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const clerkUserId = payload.sub;
    if (!clerkUserId) return null;
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkUserId),
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function processAiAnnouncements(
  io: SocketServer,
  event: TikTokEvent,
  streamerId: number,
) {
  try {
    const config = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamerId),
    });
    if (!config) return;

    const roomId = `session:${event.sessionId}`;
    const persona = { name: config.personaName, tone: config.tone };

    if (event.type === "gift" && config.announceGifts) {
      const coins = (event.data.coins as number) ?? 0;
      if (coins >= config.announceGiftThreshold) {
        const text = await generateAnnouncement({
          type: "gift",
          viewerName: event.data.viewerName as string,
          amount: coins,
          persona,
        });
        if (text) {
          io.to(roomId).emit("ai:announcement", {
            text,
            type: "gift",
            viewerName: event.data.viewerName,
          });
        }
      }
    } else if (event.type === "comment" && config.moderationEnabled) {
      const comment = ((event.data.comment as string) ?? "").trim();
      if (comment.length > 3) {
        const { flagged, reason } = await moderateComment(comment);
        if (flagged) {
          const viewerName = (event.data.viewerName as string) ?? "Unknown";
          io.to(roomId).emit("moderation:flagged", { viewerName, comment, reason });
          await db.insert(aiModerationLogsTable).values({
            sessionId: event.sessionId,
            streamerId,
            viewerName,
            comment,
            reason,
          });
        }
      }
    }
  } catch {
    // AI failures must never crash the pipeline
  }
}

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/api/socket.io",
  });

  seedAchievements().catch(() => {});

  io.on("connection", (socket: Socket) => {
    const authToken = socket.handshake.auth?.token as string | undefined;
    const obsToken = socket.handshake.auth?.obsToken as string | undefined;

    socket.on("session:join", async (sessionId: number) => {
      try {
        const sid = Number(sessionId);
        const session = await db.query.sessionsTable.findFirst({
          where: eq(sessionsTable.id, sid),
        });
        if (!session || session.endedAt) {
          socket.emit("session:error", { message: "Session not found or already ended" });
          return;
        }

        if (!authToken) {
          socket.emit("session:error", { message: "Authentication required" });
          return;
        }

        const userId = await resolveUserIdFromToken(authToken);
        if (!userId) {
          socket.emit("session:error", { message: "Invalid auth token" });
          return;
        }

        const streamer = await db.query.streamersTable.findFirst({
          where: eq(streamersTable.id, session.streamerId),
        });
        if (!streamer || streamer.userId !== userId) {
          socket.emit("session:error", { message: "Not authorized for this session" });
          return;
        }

        socket.data.userId = userId;
        socket.join(`session:${sid}`);
        socket.emit("session:joined", { sessionId: sid });
      } catch (_err) {
        socket.emit("session:error", { message: "Could not join session" });
      }
    });

    socket.on(
      "obs:subscribe",
      async (data: { token: string; streamerId: number; sessionId?: number }) => {
        try {
          const tokenToVerify = data?.token ?? obsToken;
          if (!tokenToVerify) {
            socket.emit("obs:error", { message: "Missing overlay token" });
            return;
          }

          const verified = verifyObsToken(tokenToVerify);
          if (!verified || verified.streamerId !== Number(data?.streamerId)) {
            socket.emit("obs:error", { message: "Invalid or expired overlay token" });
            return;
          }

          socket.data.obsStreamerId = verified.streamerId;

          if (data?.sessionId) {
            const session = await db.query.sessionsTable.findFirst({
              where: eq(sessionsTable.id, Number(data.sessionId)),
            });
            if (session && session.streamerId === verified.streamerId && !session.endedAt) {
              socket.join(`session:${session.id}`);
              socket.emit("obs:subscribed", { sessionId: session.id });
              return;
            }
          }

          socket.emit("obs:subscribed", { sessionId: null });
        } catch (_err) {
          socket.emit("obs:error", { message: "Could not subscribe to overlay events" });
        }
      },
    );

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

  let streamerId: number | null = null;
  try {
    const sessionForGamification = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.id, event.sessionId),
    });
    if (sessionForGamification) {
      streamerId = sessionForGamification.streamerId;
      await processGamification(io, event, sessionForGamification.streamerId);
    }
  } catch (_err) {}

  // AI announcements + moderation (non-blocking, fire-and-forget)
  if (streamerId) {
    void processAiAnnouncements(io, event, streamerId);
  }

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
    } else if (event.type === "share") {
      await db
        .update(sessionsTable)
        .set({ totalShares: sql`${sessionsTable.totalShares} + 1` })
        .where(eq(sessionsTable.id, event.sessionId));
    }
  } catch (_err) {}
}
