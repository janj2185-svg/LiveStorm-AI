import { Server as SocketServer, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyToken } from "@clerk/express";
import {
  db,
  streamersTable,
  sessionsTable,
  usersTable,
  aiPersonaConfigsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { processAutomations } from "./automationEngine";
import { processGamification, seedAchievements } from "./gamificationEngine";
import type { TikTokEvent } from "./tiktokSimulator";
import { translateComment } from "./aiService";
import { initOrchestrator, enqueueEvent as orchestratorEnqueue } from "../agents/agentOrchestrator";

let io: SocketServer | null = null;

// ─── Per-session recent-events ring buffer (last 100 events, in-memory) ───────
const RECENT_EVENTS_MAX = 100;
const recentEventsStore = new Map<number, TikTokEvent[]>();

export function pushRecentEvent(sessionId: number, event: TikTokEvent): void {
  let buf = recentEventsStore.get(sessionId);
  if (!buf) {
    buf = [];
    recentEventsStore.set(sessionId, buf);
  }
  buf.push(event);
  if (buf.length > RECENT_EVENTS_MAX) buf.shift();
}

export function getRecentEvents(sessionId: number): TikTokEvent[] {
  return (recentEventsStore.get(sessionId) ?? []).slice();
}

export async function getSocketDiagnostics(): Promise<Record<string, unknown>> {
  if (!io) return { error: "Socket.IO not initialised" };
  const sockets = await io.fetchSockets();
  const rooms: Record<string, number> = {};
  for (const [roomName, roomSet] of io.sockets.adapter.rooms) {
    if (roomName.startsWith("session:")) {
      rooms[roomName] = roomSet.size;
    }
  }
  return {
    totalConnectedSockets: sockets.length,
    sessionRooms: rooms,
    sessionRoomCount: Object.keys(rooms).length,
  };
}

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

// ── Chat Translation Pipeline ─────────────────────────────────────────────────
// Priority score: higher = translate first (used when chat volume is high)
function getTranslationPriority(event: TikTokEvent): number {
  const text = String(event.data.text ?? "");
  if (/\?/.test(text)) return 8;                                          // direct question
  if (/\bai\b|бот|bot|assistant|@/i.test(text)) return 7;               // AI/streamer mention
  if (/gift|дяк|дякую|спасиб|thank/i.test(text)) return 6;             // gift-related
  return 5;                                                              // standard comment
}

// Simple in-flight throttle: skip if already translating > 5 comments in session
const sessionTranslatingCount = new Map<number, number>();

async function processTranslation(
  io: SocketServer,
  event: TikTokEvent,
  streamerId: number,
): Promise<void> {
  if (event.type !== "comment") return;
  const text = String(event.data.text ?? "").trim();
  if (!text || text.length < 3) return;

  try {
    const config = await db.query.aiPersonaConfigsTable.findFirst({
      where: eq(aiPersonaConfigsTable.streamerId, streamerId),
    });
    if (!config?.translateChat) return;

    const priority = getTranslationPriority(event);

    // Under high load: only translate priority ≥ 6 if already 5+ in-flight for this session
    const inFlight = sessionTranslatingCount.get(event.sessionId) ?? 0;
    if (inFlight >= 5 && priority < 6) {
      console.log(`[AI:translate] session=${event.sessionId} HIGH_LOAD — low-priority skipped (in-flight=${inFlight})`);
      return;
    }

    const targetLang = config.translateTargetLang ?? "uk";
    const roomId = `session:${event.sessionId}`;
    const msgId = String(event.data.msgId ?? event.timestamp);

    sessionTranslatingCount.set(event.sessionId, inFlight + 1);
    try {
      const translatedText = await translateComment(text, targetLang);
      if (translatedText) {
        io.to(roomId).emit("live:translation", {
          msgId,
          sessionId: event.sessionId,
          translatedText,
          targetLang,
        });
      }
    } finally {
      const remaining = (sessionTranslatingCount.get(event.sessionId) ?? 1) - 1;
      if (remaining <= 0) sessionTranslatingCount.delete(event.sessionId);
      else sessionTranslatingCount.set(event.sessionId, remaining);
    }
  } catch (err: any) {
    console.error(`[AI:translate] session=${event.sessionId} error:`, err?.message);
  }
}

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/api/socket.io",
  });

  seedAchievements().catch(() => {});
  initOrchestrator(io);

  io.on("connection", (socket: Socket) => {
    const authToken = socket.handshake.auth?.token as string | undefined;
    const obsToken = socket.handshake.auth?.obsToken as string | undefined;
    const hasAuth = !!authToken || !!obsToken;
    console.log(
      `[Socket.IO] New connection | socketId=${socket.id} | transport=${socket.conn.transport.name} | hasAuth=${hasAuth}`,
    );

    socket.on("disconnect", (reason: string) => {
      console.log(`[Socket.IO] Disconnected | socketId=${socket.id} | reason=${reason}`);
    });

    socket.on("session:join", async (sessionId: number) => {
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

          const targetStreamerId = Number(data?.streamerId);
          const streamer = await db.query.streamersTable.findFirst({
            where: eq(streamersTable.id, targetStreamerId),
          });
          if (!streamer || !streamer.obsToken || streamer.obsToken !== tokenToVerify) {
            socket.emit("obs:error", { message: "Invalid or expired overlay token" });
            return;
          }

          socket.data.obsStreamerId = targetStreamerId;

          if (data?.sessionId) {
            const session = await db.query.sessionsTable.findFirst({
              where: eq(sessionsTable.id, Number(data.sessionId)),
            });
            if (session && session.streamerId === targetStreamerId && !session.endedAt) {
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

    // ── Streamer microphone input → co-host orchestrator ────────────────────────
    socket.on(
      "streamer:speech",
      async (
        data: { text: string; lang: string; sessionId: number },
        callback?: (ack: { ok: boolean; ts: number; reason?: string }) => void,
      ) => {
        const ack = (ok: boolean, reason?: string) => {
          if (typeof callback === "function") callback({ ok, ts: Date.now(), reason });
        };
        try {
          const sid  = Number(data?.sessionId);
          const text = (data?.text ?? "").trim();
          console.log(`[Mic:10] streamer:speech received | socketId=${socket.id} | userId=${socket.data.userId ?? "NONE"} | sessionId=${sid} | lang=${data?.lang} | textLen=${text.length}`);
          if (!sid || !text) { ack(false, "missing-sid-or-text"); return; }
          if (!socket.data.userId) {
            console.warn(`[Mic:10] ✗ REJECTED — no auth (socket.data.userId missing) | socketId=${socket.id}`);
            ack(false, "no-auth");
            return;
          }
          const session = await db.query.sessionsTable.findFirst({
            where: eq(sessionsTable.id, sid),
          });
          if (!session || session.endedAt) {
            console.warn(`[Mic:10] ✗ REJECTED — session not found or ended | sid=${sid}`);
            ack(false, "session-not-found");
            return;
          }
          const event = {
            type:      "streamer_speech" as const,
            sessionId: sid,
            username:  "streamer",
            source:    "microphone",
            data:      { text, lang: data?.lang ?? "uk" },
            timestamp: Date.now(),
          };
          console.log(`[Mic:10] ✅ enqueuing | session=${sid} | streamer=${session.streamerId} | lang=${data?.lang} | "${text.slice(0, 60)}"`);
          void orchestratorEnqueue(event, session.streamerId);
          ack(true);
        } catch (err) {
          console.error("[Mic:10] ✗ error:", (err as Error)?.message);
          ack(false, (err as Error)?.message);
        }
      },
    );

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

  pushRecentEvent(event.sessionId, event);

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

  let streamerId: number | null = null;
  try {
    const sessionRecord = await db.query.sessionsTable.findFirst({
      where: eq(sessionsTable.id, event.sessionId),
    });
    if (sessionRecord) {
      streamerId = sessionRecord.streamerId;
    }
  } catch (_err) {}

  await processAutomations(io, roomId, userId, event, streamerId ?? undefined);

  try {
    if (streamerId) {
      await processGamification(io, event, streamerId);
    }
  } catch (_err) {}

  if (streamerId) {
    void processTranslation(io, event, streamerId);
    void orchestratorEnqueue(event, streamerId);
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
