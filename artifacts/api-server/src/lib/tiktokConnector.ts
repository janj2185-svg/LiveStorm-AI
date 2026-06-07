/**
 * TikTok Live Connector
 *
 * Controlled by TIKTOK_MODE environment variable:
 *   TIKTOK_MODE=demo  (default) — always use the built-in simulator
 *   TIKTOK_MODE=real            — attempt real TikTok LIVE; surface exact errors, NO silent fallback
 *
 * On a production VPS/Docker server, set TIKTOK_MODE=real and ensure
 * tiktok-live-connector is installed (npm install tiktok-live-connector).
 */

import type { Server as SocketServer } from "socket.io";
import { ingestLiveEvent } from "./socketServer";
import { startSimulator, stopSimulator, type TikTokEvent } from "./tiktokSimulator";

export type ConnectionMode = "real" | "demo" | "error";

interface ConnectorEntry {
  type: ConnectionMode;
  error?: string;
  stop: () => void;
}

const activeConnectors = new Map<number, ConnectorEntry>();

const TIKTOK_MODE = (process.env.TIKTOK_MODE ?? "demo").trim().toLowerCase();
export const isRealModeEnabled = TIKTOK_MODE === "real";

// ── Event mappers ─────────────────────────────────────────────────────────────

function mapGiftEvent(data: any, sessionId: number): TikTokEvent {
  return {
    type: "gift",
    sessionId,
    username: data.uniqueId ?? data.nickname ?? "unknown",
    data: {
      giftName: data.giftName ?? data.gift?.name ?? "Gift",
      coins: data.diamondCount ?? data.gift?.diamondCount ?? 0,
      count: data.repeatCount ?? 1,
    },
    timestamp: Date.now(),
  };
}

function mapCommentEvent(data: any, sessionId: number): TikTokEvent {
  return {
    type: "comment",
    sessionId,
    username: data.uniqueId ?? data.nickname ?? "unknown",
    data: { text: data.comment ?? data.comment?.text ?? "" },
    timestamp: Date.now(),
  };
}

function mapLikeEvent(data: any, sessionId: number): TikTokEvent {
  return {
    type: "like",
    sessionId,
    username: data.uniqueId ?? data.nickname ?? "unknown",
    data: { likeCount: data.likeCount ?? 1 },
    timestamp: Date.now(),
  };
}

function mapFollowEvent(data: any, sessionId: number): TikTokEvent {
  return {
    type: "follow",
    sessionId,
    username: data.uniqueId ?? data.nickname ?? "unknown",
    data: {},
    timestamp: Date.now(),
  };
}

function mapShareEvent(data: any, sessionId: number): TikTokEvent {
  return {
    type: "share",
    sessionId,
    username: data.uniqueId ?? data.nickname ?? "unknown",
    data: {},
    timestamp: Date.now(),
  };
}

function mapViewerCountEvent(count: number, sessionId: number): TikTokEvent {
  return {
    type: "viewerCount",
    sessionId,
    data: { count },
    timestamp: Date.now(),
  };
}

// ── Real connector ────────────────────────────────────────────────────────────

function friendlyError(raw: string, username: string): string {
  if (raw.includes("MODULE_NOT_FOUND") || raw.includes("Cannot find") || raw.includes("ERR_MODULE_NOT_FOUND")) {
    return "tiktok-live-connector package is not installed on this server.\n" +
      "Fix: run 'npm install tiktok-live-connector' in the api-server directory, then restart.";
  }
  if (raw.includes("LIVE_NOT_FOUND") || raw.toLowerCase().includes("not live") || raw.includes("not found")) {
    return `@${username} is not currently streaming. Start a TikTok LIVE first.`;
  }
  if (raw.includes("ECONNREFUSED") || raw.includes("ENOTFOUND") || raw.includes("network")) {
    return "Network error: server cannot reach TikTok. Check firewall rules and outbound internet access.";
  }
  if (raw.includes("429") || raw.toLowerCase().includes("rate limit")) {
    return "TikTok rate-limited this server IP. Wait a few minutes before retrying.";
  }
  return raw;
}

async function startLiveConnector(
  io: SocketServer,
  tiktokUsername: string,
  sessionId: number,
  userId: number,
): Promise<{ ok: boolean; error?: string }> {
  const roomId = `session:${sessionId}`;
  try {
    const { WebcastPushConnection } = (await import("tiktok-live-connector")) as any;

    const connection = new WebcastPushConnection(tiktokUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000,
    });

    connection.on("gift",     (data: any) => ingestLiveEvent(mapGiftEvent(data, sessionId), userId));
    connection.on("chat",     (data: any) => ingestLiveEvent(mapCommentEvent(data, sessionId), userId));
    connection.on("like",     (data: any) => ingestLiveEvent(mapLikeEvent(data, sessionId), userId));
    connection.on("follow",   (data: any) => ingestLiveEvent(mapFollowEvent(data, sessionId), userId));
    connection.on("share",    (data: any) => ingestLiveEvent(mapShareEvent(data, sessionId), userId));
    connection.on("roomUser", (data: any) => ingestLiveEvent(mapViewerCountEvent(data.viewerCount ?? 0, sessionId), userId));

    connection.on("error", (err: any) => {
      const raw = err?.message ?? String(err);
      const msg = friendlyError(raw, tiktokUsername);
      console.error(`[TikTok] Runtime error for @${tiktokUsername}:`, msg);
      activeConnectors.set(sessionId, {
        type: "error",
        error: msg,
        stop: () => { try { connection.disconnect(); } catch (_) {} },
      });
      io.to(roomId).emit("tiktok:status", { mode: "error", error: msg, username: tiktokUsername });
    });

    connection.on("disconnected", () => {
      console.warn(`[TikTok] Disconnected from @${tiktokUsername} (session ${sessionId})`);
    });

    await connection.connect();
    console.log(`[TikTok] ✓ Connected to @${tiktokUsername} LIVE (session ${sessionId})`);

    activeConnectors.set(sessionId, {
      type: "real",
      stop: () => { try { connection.disconnect(); } catch (_) {} },
    });

    return { ok: true };
  } catch (err: any) {
    const raw = err?.message ?? String(err);
    return { ok: false, error: friendlyError(raw, tiktokUsername) };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start a TikTok connection for a session.
 * Returns "real" | "demo" | "error".
 *
 * TIKTOK_MODE=real + failure → returns "error", emits tiktok:status with exact message. NO fallback.
 * TIKTOK_MODE=demo OR demoMode=true → returns "demo", runs simulator.
 */
export async function startTikTokConnection(
  io: SocketServer,
  tiktokUsername: string | null | undefined,
  sessionId: number,
  userId: number,
  demoMode = false,
): Promise<ConnectionMode> {
  const roomId = `session:${sessionId}`;

  if (!demoMode && tiktokUsername && isRealModeEnabled) {
    console.log(`[TikTok] REAL mode — connecting to @${tiktokUsername} (session ${sessionId})`);
    const result = await startLiveConnector(io, tiktokUsername, sessionId, userId);

    if (result.ok) {
      io.to(roomId).emit("tiktok:status", { mode: "real", username: tiktokUsername });
      return "real";
    }

    // Real mode failed — surface the error, do NOT silently fall back to demo
    const errMsg = result.error!;
    console.error(`[TikTok] REAL mode connection FAILED for @${tiktokUsername}: ${errMsg}`);
    activeConnectors.set(sessionId, { type: "error", error: errMsg, stop: () => {} });
    io.to(roomId).emit("tiktok:status", { mode: "error", error: errMsg, username: tiktokUsername });
    return "error";
  }

  // Demo mode
  const reason = demoMode
    ? "demoMode=true"
    : !tiktokUsername
    ? "no TikTok username configured"
    : "TIKTOK_MODE is not 'real'";
  console.log(`[TikTok] Demo simulator for session ${sessionId} (${reason})`);

  startSimulator(io, sessionId, roomId, userId);
  activeConnectors.set(sessionId, { type: "demo", stop: () => stopSimulator(sessionId) });
  io.to(roomId).emit("tiktok:status", { mode: "demo" });
  return "demo";
}

export function stopTikTokConnection(sessionId: number) {
  const entry = activeConnectors.get(sessionId);
  if (entry) {
    entry.stop();
    activeConnectors.delete(sessionId);
  }
}

export function getConnectionMode(sessionId: number): ConnectionMode | null {
  return activeConnectors.get(sessionId)?.type ?? null;
}

export function getConnectionError(sessionId: number): string | undefined {
  return activeConnectors.get(sessionId)?.error;
}

/**
 * Test a TikTok username connection without starting a full session.
 * Requires TIKTOK_MODE=real and tiktok-live-connector installed.
 * Call via POST /api/tiktok/test-connection.
 */
export async function testTikTokConnection(
  username: string,
): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  if (!isRealModeEnabled) {
    return {
      ok: false,
      error:
        "Server is running in DEMO mode (TIKTOK_MODE=demo).\n" +
        "Set TIKTOK_MODE=real in your environment and restart to enable real TikTok connections.",
    };
  }

  const clean = username.replace(/^@/, "").trim();
  const start = Date.now();
  try {
    const { WebcastPushConnection } = (await import("tiktok-live-connector")) as any;
    const conn = new WebcastPushConnection(clean, { processInitialData: false });
    await conn.connect();
    const latencyMs = Date.now() - start;
    try { conn.disconnect(); } catch (_) {}
    return { ok: true, latencyMs };
  } catch (err: any) {
    const raw = err?.message ?? String(err);
    return { ok: false, error: friendlyError(raw, clean) };
  }
}
