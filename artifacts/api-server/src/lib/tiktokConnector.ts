/**
 * TikTok Live Connector
 *
 * Controlled by TIKTOK_MODE environment variable:
 *   TIKTOK_MODE=demo  (default) — always use the built-in simulator
 *   TIKTOK_MODE=real            — attempt real TikTok LIVE via custom connector
 *
 * The custom connector uses pbf + ws (both installable on Replit) instead of
 * the `tiktok-live-connector` npm package which was blocked by Replit's
 * supply-chain security firewall (requires protobufjs, which is entirely blocked).
 *
 * On production VPS/Docker: set TIKTOK_MODE=real. Works with or without Replit.
 * On Replit: set TIKTOK_MODE=real. Custom connector connects directly to TikTok.
 */

import type { Server as SocketServer } from "socket.io";
import { ingestLiveEvent } from "./socketServer.js";
import { startSimulator, stopSimulator, type TikTokEvent } from "./tiktokSimulator.js";
import {
  TikTokLiveClient,
  type TikTokChatEvent,
  type TikTokGiftEvent,
  type TikTokLikeEvent,
  type TikTokSocialEvent,
  type TikTokViewerCountEvent,
} from "./tiktokLiveClient.js";

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

function makeEvent(
  type: TikTokEvent["type"],
  sessionId: number,
  username: string | undefined,
  data: Record<string, unknown>,
): TikTokEvent {
  return { type, sessionId, username, data, timestamp: Date.now() };
}

// ── Real connector ────────────────────────────────────────────────────────────

function friendlyError(raw: string, username: string): string {
  if (raw.includes("not currently streaming") || raw.includes("not started") || raw.includes("no room ID found")) {
    return raw; // already user-friendly from tiktokLiveClient
  }
  if (raw.includes("ECONNREFUSED") || raw.includes("ENOTFOUND") || raw.includes("network")) {
    return "Network error: server cannot reach TikTok. Check firewall rules and outbound internet access.";
  }
  if (raw.includes("429") || raw.toLowerCase().includes("rate limit")) {
    return "TikTok rate-limited this server IP. Wait a few minutes before retrying.";
  }
  if (raw.includes("HTTP 4") || raw.includes("HTTP 5")) {
    return `TikTok API error connecting to @${username}: ${raw}`;
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

  const client = new TikTokLiveClient(tiktokUsername);

  // Wire up events → ingestLiveEvent
  client.on("chat", (ev: TikTokChatEvent) => {
    void ingestLiveEvent(makeEvent("comment", sessionId, ev.username, { text: ev.comment }), userId);
  });

  client.on("gift", (ev: TikTokGiftEvent) => {
    void ingestLiveEvent(
      makeEvent("gift", sessionId, ev.username, {
        giftName: ev.giftName,
        coins: ev.coins,
        count: ev.count,
      }),
      userId,
    );
  });

  client.on("like", (ev: TikTokLikeEvent) => {
    void ingestLiveEvent(makeEvent("like", sessionId, ev.username, { likeCount: ev.likeCount }), userId);
  });

  client.on("social", (ev: TikTokSocialEvent) => {
    if (ev.action === "follow") {
      void ingestLiveEvent(makeEvent("follow", sessionId, ev.username, {}), userId);
    } else if (ev.action === "share") {
      void ingestLiveEvent(makeEvent("share", sessionId, ev.username, {}), userId);
    }
    // "join" events are ignored (no matching TikTokEvent type)
  });

  client.on("viewerCount", (ev: TikTokViewerCountEvent) => {
    void ingestLiveEvent(makeEvent("viewerCount", sessionId, undefined, { count: ev.count }), userId);
  });

  // Runtime errors (after successful initial connect — e.g. during a reconnect attempt)
  client.on("wsError", (err: Error) => {
    const msg = friendlyError(err.message, tiktokUsername);
    console.error(`[TikTok] Runtime WebSocket error for @${tiktokUsername}: ${msg}`);
    // Keep the connector entry as "real" — reconnect is handled internally by client
  });

  client.on("disconnected", (code: number) => {
    console.warn(`[TikTok] Disconnected from @${tiktokUsername} (session ${sessionId}, code=${code})`);
    // Client will auto-reconnect unless stopped
  });

  client.on("connected", () => {
    console.log(`[TikTok] ✓ Connected to @${tiktokUsername} LIVE (session ${sessionId})`);
    // Update mode to "real" on successful reconnect after an error
    activeConnectors.set(sessionId, {
      type: "real",
      stop: () => client.disconnect(),
    });
    io.to(roomId).emit("tiktok:status", { mode: "real", username: tiktokUsername });
  });

  try {
    await client.connect();

    activeConnectors.set(sessionId, {
      type: "real",
      stop: () => client.disconnect(),
    });

    return { ok: true };
  } catch (err: any) {
    const raw = err?.message ?? String(err);
    client.disconnect();
    return { ok: false, error: friendlyError(raw, tiktokUsername) };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start a TikTok connection for a session.
 * Returns "real" | "demo" | "error".
 *
 * TIKTOK_MODE=real + success → "real", real events flow.
 * TIKTOK_MODE=real + failure → "error", emits tiktok:status with exact message.
 * TIKTOK_MODE=demo OR demoMode=true → "demo", simulator runs.
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

    // Real mode failed — surface the exact error, no silent fallback
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
 * Lightweight connection test: verifies the username exists and room is live
 * without fully connecting the WebSocket.
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
    const client = new TikTokLiveClient(clean);
    await client.connect();
    const latencyMs = Date.now() - start;
    client.disconnect();
    return { ok: true, latencyMs };
  } catch (err: any) {
    const raw = err?.message ?? String(err);
    return { ok: false, error: friendlyError(raw, clean) };
  }
}
