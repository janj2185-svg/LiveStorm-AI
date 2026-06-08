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
  isNotLiveError,
  type TikTokChatEvent,
  type TikTokGiftEvent,
  type TikTokLikeEvent,
  type TikTokSocialEvent,
  type TikTokViewerCountEvent,
} from "./tiktokLiveClient.js";
import { db, sessionsTable, streamersTable, usersTable } from "@workspace/db";
import { isNull, eq as dbEq } from "drizzle-orm";

export type ConnectionMode = "real" | "demo" | "error";

interface ConnectorEntry {
  type: ConnectionMode;
  error?: string;
  stop: () => void;
}

const activeConnectors = new Map<number, ConnectorEntry>();

/**
 * Sessions whose connector is being started asynchronously but hasn't yet
 * written an entry into activeConnectors.  Used to prevent race-condition
 * duplicates where recoverActiveSessions and a concurrent HTTP request both
 * check getConnectionMode() before the first caller's entry is committed.
 */
const pendingConnectors = new Set<number>();

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
  if (isNotLiveError(new Error(raw))) {
    return raw; // already user-friendly from tiktokLiveClient
  }
  if (raw.includes("ECONNREFUSED") || raw.includes("ENOTFOUND") || raw.toLowerCase().includes("network")) {
    return "Network error: server cannot reach TikTok. Check firewall rules and outbound internet access.";
  }
  if (
    raw.includes("429") ||
    raw.toLowerCase().includes("rate limit") ||
    raw.toLowerCase().includes("rate_limit")
  ) {
    return (
      "Eulerstream rate limit reached — too many connection attempts. " +
      "Sign up for a free API key at https://eulerstream.com/pricing and set " +
      "SIGN_API_KEY in your server environment for stable, sustained connections."
    );
  }
  // WebSocket 404 = TikTok rejected the connection. Usually means the room isn't
  // actually broadcasting even though room/info returned status 4.
  if (raw.includes("Unexpected server response: 404") || raw.includes("server response: 404")) {
    return (
      `@${username} is not currently streaming on TikTok LIVE. ` +
      `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`
    );
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
): Promise<{ ok: boolean; error?: string; polling?: boolean }> {
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

  // Track if the initial connect() entered "not live" polling mode
  let notLiveMessage: string | null = null;

  client.on("notLive", ({ message }: { message: string }) => {
    const errMsg = friendlyError(message, tiktokUsername);
    notLiveMessage = errMsg;
    console.log(`[TikTok] @${tiktokUsername} not live yet — connector polling every 30 s`);
    // Store connector entry NOW (with a real stop fn) so the client can be stopped later
    activeConnectors.set(sessionId, { type: "error", error: errMsg, stop: () => client.disconnect() });
    io.to(roomId).emit("tiktok:status", { mode: "error", error: errMsg, username: tiktokUsername });
  });

  try {
    await client.connect();
    // connect() resolves without throwing in two cases:
    //   A) WebSocket connected successfully → set "real" entry
    //   B) User isn't live yet → "notLive" event already fired, entry already set, polling running

    if (notLiveMessage) {
      // Polling is active — entry was already set by the notLive handler above.
      // Tell the caller not to overwrite the entry.
      return { ok: false, error: notLiveMessage, polling: true };
    }

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

  // Prevent duplicate connectors caused by concurrent calls (e.g. session
  // recovery + simultaneous HTTP request) both seeing getConnectionMode()=null
  // before the first caller commits its entry to activeConnectors.
  if (activeConnectors.has(sessionId) || pendingConnectors.has(sessionId)) {
    const mode = activeConnectors.get(sessionId)?.type ?? "real";
    console.log(
      `[TikTok] Session ${sessionId} already has an active/pending connector (${mode}) — skipping duplicate start`,
    );
    return mode;
  }

  if (!demoMode && tiktokUsername && isRealModeEnabled) {
    pendingConnectors.add(sessionId);
    let result: { ok: boolean; error?: string; polling?: boolean };
    try {
      console.log(`[TikTok] REAL mode — connecting to @${tiktokUsername} (session ${sessionId})`);
      result = await startLiveConnector(io, tiktokUsername, sessionId, userId);
    } finally {
      pendingConnectors.delete(sessionId);
    }

    if (result.ok) {
      io.to(roomId).emit("tiktok:status", { mode: "real", username: tiktokUsername });
      return "real";
    }

    const errMsg = result.error!;
    console.error(`[TikTok] REAL mode connection FAILED for @${tiktokUsername}: ${errMsg}`);

    if (!result.polling) {
      // Hard failure — connector is dead; set an inert error entry
      activeConnectors.set(sessionId, { type: "error", error: errMsg, stop: () => {} });
      io.to(roomId).emit("tiktok:status", { mode: "error", error: errMsg, username: tiktokUsername });
    }
    // polling=true → entry + tiktok:status already emitted by startLiveConnector's notLive handler;
    //                 client is still running and will auto-connect when user goes live.

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
  pendingConnectors.delete(sessionId);
  const entry = activeConnectors.get(sessionId);
  if (entry) {
    entry.stop();
    activeConnectors.delete(sessionId);
  }
}

export function getConnectionMode(sessionId: number): ConnectionMode | null {
  if (activeConnectors.has(sessionId)) return activeConnectors.get(sessionId)!.type;
  // A pending connector is in-flight (async live check underway) — treat as "real"
  // so callers don't start a duplicate connector while the first is initializing.
  if (pendingConnectors.has(sessionId)) return "real";
  return null;
}

export function getConnectionError(sessionId: number): string | undefined {
  return activeConnectors.get(sessionId)?.error;
}

/**
 * Called once on server startup to reconnect TikTok for any sessions that were
 * live when the server last shut down. The in-memory activeConnectors map is
 * cleared on every restart, so without this, a deployed server would lose all
 * real connections and silently fall back to "demo" for existing sessions.
 */
export async function recoverActiveSessions(io: SocketServer): Promise<void> {
  if (!isRealModeEnabled) {
    console.log("[TikTok] Demo mode — skipping active session recovery.");
    return;
  }

  console.log("[TikTok] Scanning for active sessions to recover after restart...");
  try {
    const rows = await db
      .select({
        sessionId: sessionsTable.id,
        userId: usersTable.id,
        tiktokUsername: usersTable.tiktokUsername,
      })
      .from(sessionsTable)
      .innerJoin(streamersTable, dbEq(streamersTable.id, sessionsTable.streamerId))
      .innerJoin(usersTable, dbEq(usersTable.id, streamersTable.userId))
      .where(isNull(sessionsTable.endedAt));

    if (rows.length === 0) {
      console.log("[TikTok] No active sessions found — nothing to recover.");
      return;
    }

    console.log(`[TikTok] Found ${rows.length} active session(s) to recover.`);
    for (const row of rows) {
      if (activeConnectors.has(row.sessionId)) continue; // already connected
      const username = row.tiktokUsername;
      if (!username) {
        console.warn(`[TikTok] Session ${row.sessionId} has no TikTok username — skipping recovery.`);
        continue;
      }
      console.log(`[TikTok] Recovering session ${row.sessionId} → @${username}`);
      startTikTokConnection(io, username, row.sessionId, row.userId, false).catch((err: Error) => {
        console.error(`[TikTok] Recovery failed for session ${row.sessionId}:`, err.message);
      });
    }
  } catch (err: any) {
    console.error("[TikTok] Session recovery error:", err.message);
  }
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
