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
import { moderateComment, generateCommentReply, generateAnnouncement, fastSpamCheck } from "./aiService";
import {
  emitAiGiftAnnouncement,
  emitAiShareAnnouncement,
  emitAiLikeMilestoneAnnouncement,
} from "./aiAnnouncer";
import { upsertViewerProfile, getViewerContext } from "./agents/memoryAgent";
import { scorePriority, enqueueComment, markReplied } from "./agents/priorityAgent";
import { scoreReply } from "./agents/learningAgent";

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

// ─── Anti-spam: per-session per-viewer last-reply timestamp ───────────────────
const autoReplySpamMap = new Map<string, number>();

// ─── Per-announcement-type cooldowns: "sessionId:eventType" → last-fired ts ──
// Cooldowns: share=45s, follow=60s, gift=30s, like_milestone=120s
const announcementCooldowns = new Map<string, number>();
const ANNOUNCEMENT_COOLDOWN_MS: Record<string, number> = {
  share: 45_000,
  follow: 60_000,
  gift: 30_000,
  like_milestone: 120_000,
};

// ─── Per-session cumulative like totals (for milestone detection) ──────────
const sessionLikeTotals = new Map<number, number>();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, ts] of autoReplySpamMap) {
    if (ts < cutoff) autoReplySpamMap.delete(key);
  }
  for (const [key, ts] of announcementCooldowns) {
    if (ts < cutoff) announcementCooldowns.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Per-session AI conversation context (last 10 exchanges) ──────────────────
// Provides continuity for AI replies within a single LIVE session.
interface AiExchange {
  viewer: string;
  comment: string;
  reply: string;
  ts: number;
}
const sessionAiContext = new Map<number, AiExchange[]>();

// Clean up contexts older than 24 h
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [sid, history] of sessionAiContext) {
    if (history.length === 0 || (history[history.length - 1]?.ts ?? 0) < cutoff) {
      sessionAiContext.delete(sid);
    }
  }
}, 60 * 60 * 1000);

export function clearSessionAiContext(sessionId: number): void {
  sessionAiContext.delete(sessionId);
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

    // Include personalityType so replies use the configured personality
    const persona = {
      name: config.personaName,
      tone: config.tone,
      personalityType: config.personalityType ?? undefined,
      customPersonality: config.customPersonality ?? undefined,
    };
    const replyLanguage = config.replyLanguage ?? "auto";
    const defaultLanguage = config.defaultLanguage ?? "uk";

    // ── Memory Agent: update viewer profile on every event ─────────────────
    void upsertViewerProfile(streamerId, event);

    // Helper: returns true if cooldown has passed; records timestamp if it has
    function checkAndSetCooldown(type: string): boolean {
      const key = `${event.sessionId}:${type}`;
      const cooldownMs = ANNOUNCEMENT_COOLDOWN_MS[type] ?? 30_000;
      const last = announcementCooldowns.get(key) ?? 0;
      if (Date.now() - last < cooldownMs) {
        console.log(`[AI:cooldown] session=${event.sessionId} type=${type} skipped (${Date.now() - last}ms < ${cooldownMs}ms)`);
        return false;
      }
      announcementCooldowns.set(key, Date.now());
      return true;
    }

    // ── Gift announcements ─────────────────────────────────────────────────────
    if (event.type === "gift" && config.announceGifts) {
      const coins = (event.data.coins as number) ?? 0;
      if (coins >= config.announceGiftThreshold && checkAndSetCooldown("gift")) {
        console.log(`[AI:gift] session=${event.sessionId} viewer=${viewerName} coins=${coins} threshold=${config.announceGiftThreshold} → announcing`);
        void emitAiGiftAnnouncement(io, roomId, streamerId, viewerName, coins);
      }
    }

    // ── Share announcements ────────────────────────────────────────────────────
    if (event.type === "share" && config.announceGifts && checkAndSetCooldown("share")) {
      console.log(`[AI:share] session=${event.sessionId} viewer=${viewerName} → announcing share`);
      void emitAiShareAnnouncement(io, roomId, streamerId, viewerName);
    }

    // ── Like milestone announcements (every 100 cumulative likes) ─────────────
    if (event.type === "like" && config.announceGifts) {
      const likeCount = (event.data.likeCount as number) ?? 1;
      const prev = sessionLikeTotals.get(event.sessionId) ?? 0;
      const next = prev + likeCount;
      sessionLikeTotals.set(event.sessionId, next);
      const prevMilestone = Math.floor(prev / 100);
      const nextMilestone = Math.floor(next / 100);
      if (nextMilestone > prevMilestone && checkAndSetCooldown("like_milestone")) {
        const milestone = nextMilestone * 100;
        console.log(`[AI:like_milestone] session=${event.sessionId} totalLikes=${next} → announcing ${milestone} milestone`);
        void emitAiLikeMilestoneAnnouncement(io, roomId, streamerId, milestone);
      }
    }

    // ── Follow announcements (uses announceLevelUp flag as "announce follows") ──
    if (event.type === "follow" && config.announceLevelUp && checkAndSetCooldown("follow")) {
      console.log(`[AI:follow] session=${event.sessionId} viewer=${viewerName} → generating follow announcement`);
      try {
        const reply = await generateCommentReply(
          "just followed the stream!",
          viewerName,
          persona,
          replyLanguage,
        );
        if (reply) {
          console.log(`[AI:follow] session=${event.sessionId} viewer=${viewerName} reply="${reply.slice(0, 60)}"`);
          io.to(roomId).emit("ai:announcement", {
            text: reply,
            type: "follow",
            viewerName,
          });
        }
      } catch (err: any) {
        console.error(`[AI:follow] session=${event.sessionId} error:`, err?.message);
      }
    }

    // ── Comment: moderation + auto-reply ───────────────────────────────────────
    if (event.type === "comment") {
      const comment = ((event.data.text as string) ?? "").trim();
      if (comment.length <= 2) return;

      console.log(
        `[AI:comment] session=${event.sessionId} viewer=${viewerName} ` +
        `comment="${comment.slice(0, 60)}" ` +
        `autoReply=${config.autoReplyEnabled} moderation=${config.moderationEnabled} lang=${replyLanguage}`,
      );

      let flagged = false;

      // 0. Fast local spam check — instant, no API call
      if (config.moderationEnabled) {
        const spamResult = fastSpamCheck(comment);
        if (spamResult.flagged) {
          flagged = true;
          console.log(`[AI:moderation] FAST-FLAG session=${event.sessionId} viewer=${viewerName} reason="${spamResult.reason}"`);
          io.to(roomId).emit("moderation:flagged", { viewerName, comment, reason: spamResult.reason });
          await db.insert(aiModerationLogsTable).values({
            sessionId: event.sessionId,
            streamerId,
            viewerName,
            comment,
            reason: spamResult.reason,
          }).catch(() => {});
        }
      }

      // 1. AI moderation (only if not already caught by fast check)
      if (!flagged && config.moderationEnabled) {
        try {
          const { flagged: isFlagged, reason } = await moderateComment(comment);
          if (isFlagged) {
            flagged = true;
            console.log(`[AI:moderation] AI-FLAG session=${event.sessionId} viewer=${viewerName} reason="${reason}"`);
            io.to(roomId).emit("moderation:flagged", { viewerName, comment, reason });
            await db.insert(aiModerationLogsTable).values({
              sessionId: event.sessionId,
              streamerId,
              viewerName,
              comment,
              reason,
            }).catch(() => {});
          } else {
            console.log(`[AI:moderation] AI-OK session=${event.sessionId} viewer=${viewerName}`);
          }
        } catch (err: any) {
          console.warn(`[AI:moderation] error (non-fatal) session=${event.sessionId}:`, err?.message);
        }
      }

      // 2. Auto-reply (only if comment wasn't flagged)
      if (!flagged && config.autoReplyEnabled) {
        const spamKey = `${event.sessionId}:${viewerName}`;
        const lastReply = autoReplySpamMap.get(spamKey) ?? 0;
        const cooldownMs = config.spamProtectionEnabled
          ? Math.max(5, config.spamCooldownSeconds ?? 30) * 1000
          : 0;
        const sinceLastReply = Date.now() - lastReply;

        if (sinceLastReply >= cooldownMs) {
          // ── Priority Agent: score this comment before replying ────────────
          const viewerId = (event.data?.userId as string) ?? viewerName;
          const viewerCtx = await getViewerContext(streamerId, viewerName, viewerId);
          const priority = scorePriority(event, viewerCtx);
          enqueueComment(event.sessionId, viewerName, comment, priority);

          console.log(
            `[AI:reply] session=${event.sessionId} viewer=${viewerName} ` +
            `priority=${priority.score} reason="${priority.reason}" shouldReply=${priority.shouldReply} ` +
            `cooldown OK (${sinceLastReply}ms >= ${cooldownMs}ms)`,
          );

          if (!priority.shouldReply && priority.score < 4) {
            console.log(`[AI:priority] session=${event.sessionId} viewer=${viewerName} — LOW PRIORITY (${priority.score}) skipping reply`);
          } else {
            try {
              autoReplySpamMap.set(spamKey, Date.now());

              // Build conversation context from session history (last 5 exchanges)
              const history = sessionAiContext.get(event.sessionId) ?? [];
              const conversationContext = history.length > 0
                ? history.slice(-5).map((h) => `@${h.viewer}: "${h.comment}" → AI: "${h.reply}"`).join("\n")
                : undefined;

              const combinedContext = [conversationContext, viewerCtx.contextSummary || undefined]
                .filter(Boolean).join("\n") || undefined;

              console.log(
                `[AI:lang:select] session=${event.sessionId} viewer=${viewerName} ` +
                `comment="${comment.slice(0, 40)}" replyLang=${replyLanguage} defaultLang=${defaultLanguage}`,
              );
              const reply = await generateCommentReply(
                comment,
                viewerName,
                persona,
                replyLanguage,
                combinedContext,
                defaultLanguage,
              );

              if (reply) {
                // Store in session conversation context (max 10 entries)
                const updatedHistory = [...history, { viewer: viewerName, comment, reply, ts: Date.now() }];
                sessionAiContext.set(event.sessionId, updatedHistory.slice(-10));

                markReplied(event.sessionId, viewerName);

                // ── Learning Agent: score this reply for post-stream analysis ──
                void scoreReply(
                  event.sessionId,
                  streamerId,
                  reply,
                  `comment:${comment.slice(0, 60)}`,
                  "comment_reply",
                  5.0 + (priority.score - 5) * 0.2,
                );

                console.log(`[AI:reply:text] session=${event.sessionId} viewer=${viewerName} lang=${replyLanguage} → "${reply.slice(0, 70)}"`);
                io.to(roomId).emit("ai:announcement", {
                  text: reply,
                  type: "comment_reply",
                  viewerName,
                  priorityScore: priority.score,
                  viewerVipLevel: viewerCtx.profile?.vipLevel ?? "none",
                });
              } else {
                console.warn(`[AI:reply] session=${event.sessionId} viewer=${viewerName} — empty reply returned`);
              }
            } catch (err: any) {
              console.error(`[AI:reply] session=${event.sessionId} error:`, err?.message);
            }
          }
        } else {
          console.log(
            `[AI:reply] session=${event.sessionId} viewer=${viewerName} ` +
            `COOLDOWN (${sinceLastReply}ms < ${cooldownMs}ms) — skipping`,
          );
        }
      } else if (!flagged && !config.autoReplyEnabled) {
        console.log(`[AI:reply] session=${event.sessionId} auto-reply disabled — skipping`);
      }
    }
  } catch (err: any) {
    console.error(`[AI:pipeline] session=${event.sessionId} top-level error:`, err?.message);
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
