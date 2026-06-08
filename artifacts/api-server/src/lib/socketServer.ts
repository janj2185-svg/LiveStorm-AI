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
import { moderateComment, generateCommentReply, generateAnnouncement } from "./aiService";
import { emitAiGiftAnnouncement } from "./aiAnnouncer";

let io: SocketServer | null = null;

// ─── Anti-spam: per-session per-viewer last-reply timestamp ───────────────────
// key: `${sessionId}:${viewerName}`, value: ms timestamp of last AI reply
const autoReplySpamMap = new Map<string, number>();

// Clean up spam map entries older than 10 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, ts] of autoReplySpamMap) {
    if (ts < cutoff) autoReplySpamMap.delete(key);
  }
}, 5 * 60 * 1000);

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
    const viewerName = event.username ?? "Unknown";
    const persona = { name: config.personaName, tone: config.tone };
    const replyLanguage = config.replyLanguage ?? "auto";

    // ── Gift announcements ─────────────────────────────────────────────────────
    if (event.type === "gift" && config.announceGifts) {
      const coins = (event.data.coins as number) ?? 0;
      if (coins >= config.announceGiftThreshold) {
        void emitAiGiftAnnouncement(io, roomId, streamerId, viewerName, coins);
      }
    }

    // ── Follow announcements ───────────────────────────────────────────────────
    if (event.type === "follow" && config.announceLevelUp) {
      try {
        const reply = await generateCommentReply(
          "just followed the stream!",
          viewerName,
          persona,
          replyLanguage,
        );
        if (reply) {
          io.to(roomId).emit("ai:announcement", {
            text: reply,
            type: "follow",
            viewerName,
          });
        }
      } catch {
        // AI failures must not crash the pipeline
      }
    }

    // ── Comment: moderation + auto-reply ───────────────────────────────────────
    if (event.type === "comment") {
      const comment = ((event.data.text as string) ?? "").trim();
      if (comment.length <= 2) return;

      let flagged = false;

      // 1. Run moderation first (if enabled)
      if (config.moderationEnabled) {
        try {
          const { flagged: isFlagged, reason } = await moderateComment(comment);
          if (isFlagged) {
            flagged = true;
            io.to(roomId).emit("moderation:flagged", { viewerName, comment, reason });
            await db.insert(aiModerationLogsTable).values({
              sessionId: event.sessionId,
              streamerId,
              viewerName,
              comment,
              reason,
            });
          }
        } catch {
          // moderation errors are non-fatal
        }
      }

      // 2. Auto-reply (only if comment wasn't flagged)
      if (!flagged && config.autoReplyEnabled) {
        const spamKey = `${event.sessionId}:${viewerName}`;
        const lastReply = autoReplySpamMap.get(spamKey) ?? 0;
        const cooldownMs = config.spamProtectionEnabled
          ? Math.max(5, config.spamCooldownSeconds ?? 30) * 1000
          : 0;

        if (Date.now() - lastReply >= cooldownMs) {
          try {
            autoReplySpamMap.set(spamKey, Date.now());
            const reply = await generateCommentReply(
              comment,
              viewerName,
              persona,
              replyLanguage,
            );
            if (reply) {
              io.to(roomId).emit("ai:announcement", {
                text: reply,
                type: "comment_reply",
                viewerName,
              });
            }
          } catch {
            // auto-reply errors are non-fatal
          }
        }
      }
    }
  } catch {
    // Top-level catch — AI failures must never crash the event pipeline
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
      // REQ-7: Pipeline:7 — log the room ID the frontend is subscribing to
      console.log(`[Pipeline:7] session:join received | socketId=${socket.id} | sessionId=${sessionId} | room=session:${sessionId}`);
      try {
        const sid = Number(sessionId);
        const session = await db.query.sessionsTable.findFirst({
          where: eq(sessionsTable.id, sid),
        });
        if (!session || session.endedAt) {
          console.warn(`[Pipeline:7] session:join REJECTED — session ${sid} not found or ended`);
          socket.emit("session:error", { message: "Session not found or already ended" });
          return;
        }

        if (!authToken) {
          console.warn(`[Pipeline:7] session:join REJECTED — no auth token | socketId=${socket.id}`);
          socket.emit("session:error", { message: "Authentication required" });
          return;
        }

        const userId = await resolveUserIdFromToken(authToken);
        if (!userId) {
          console.warn(`[Pipeline:7] session:join REJECTED — invalid auth token | socketId=${socket.id}`);
          socket.emit("session:error", { message: "Invalid auth token" });
          return;
        }

        const streamer = await db.query.streamersTable.findFirst({
          where: eq(streamersTable.id, session.streamerId),
        });
        if (!streamer || streamer.userId !== userId) {
          console.warn(`[Pipeline:7] session:join REJECTED — not authorized | userId=${userId} | session=${sid}`);
          socket.emit("session:error", { message: "Not authorized for this session" });
          return;
        }

        socket.data.userId = userId;
        socket.join(`session:${sid}`);
        // Count sockets now in the room so we can correlate with emit logs
        const roomSockets = await io!.in(`session:${sid}`).fetchSockets();
        console.log(`[Pipeline:7] session:join SUCCESS | socketId=${socket.id} | userId=${userId} | room=session:${sid} | totalSocketsInRoom=${roomSockets.length}`);
        socket.emit("session:joined", { sessionId: sid });
      } catch (_err) {
        console.error(`[Pipeline:7] session:join ERROR | socketId=${socket.id} | sessionId=${sessionId}`, _err);
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
  if (!io) {
    console.error(`[Pipeline:4] ingestLiveEvent called but io=null — Socket.IO not initialised`);
    return;
  }

  const roomId = `session:${event.sessionId}`;

  // REQ-4/5/6: Pipeline:4 — every ingestLiveEvent call; Pipeline:5/6 — emit + room ID + socket count
  const roomSockets = await io.in(roomId).fetchSockets();
  console.log(
    `[Pipeline:4] ingestLiveEvent | type=${event.type} | session=${event.sessionId} | user=${event.username ?? "-"}`,
  );
  console.log(
    `[Pipeline:5/6] io.to(${roomId}).emit("live:event") | socketsInRoom=${roomSockets.length}` +
    (roomSockets.length === 0
      ? " ⚠️  NO FRONTEND SOCKETS IN ROOM — event will be lost"
      : ` | socketIds=${roomSockets.map((s) => s.id).join(",")}`),
  );
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

  // AI announcements, auto-reply, moderation (non-blocking)
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
