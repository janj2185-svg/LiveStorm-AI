/**
 * TikTok Live Connector
 *
 * Wraps `tiktok-live-connector` for real live stream ingestion.
 * Falls back to the built-in event simulator when the package is
 * unavailable (dev/CI environments where protobuf cannot be installed).
 */

import type { Server as SocketServer } from "socket.io";
import { ingestLiveEvent } from "./socketServer";
import { startSimulator, stopSimulator, type TikTokEvent } from "./tiktokSimulator";

interface ConnectorEntry {
  type: "live" | "demo";
  stop: () => void;
}

const activeConnectors = new Map<number, ConnectorEntry>();

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

async function startLiveConnector(
  tiktokUsername: string,
  sessionId: number,
  userId: number
): Promise<boolean> {
  try {
    const { WebcastPushConnection } = (await import("tiktok-live-connector")) as any;

    const connection = new WebcastPushConnection(tiktokUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000,
    });

    connection.on("gift", (data: any) =>
      ingestLiveEvent(mapGiftEvent(data, sessionId), userId)
    );
    connection.on("chat", (data: any) =>
      ingestLiveEvent(mapCommentEvent(data, sessionId), userId)
    );
    connection.on("like", (data: any) =>
      ingestLiveEvent(mapLikeEvent(data, sessionId), userId)
    );
    connection.on("follow", (data: any) =>
      ingestLiveEvent(mapFollowEvent(data, sessionId), userId)
    );
    connection.on("share", (data: any) =>
      ingestLiveEvent(mapShareEvent(data, sessionId), userId)
    );
    connection.on("roomUser", (data: any) =>
      ingestLiveEvent(mapViewerCountEvent(data.viewerCount ?? 0, sessionId), userId)
    );
    connection.on("error", (err: any) => {
      console.error(`[TikTokConnector] Error for session ${sessionId}:`, err?.message ?? err);
    });
    connection.on("disconnected", () => {
      console.warn(`[TikTokConnector] Disconnected from @${tiktokUsername} (session ${sessionId})`);
    });

    await connection.connect();
    console.log(`[TikTokConnector] Connected to @${tiktokUsername} LIVE (session ${sessionId})`);

    activeConnectors.set(sessionId, {
      type: "live",
      stop: () => {
        try { connection.disconnect(); } catch (_) {}
      },
    });

    return true;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes("Cannot find") || msg.includes("MODULE_NOT_FOUND")) {
      console.warn(
        "[TikTokConnector] tiktok-live-connector package unavailable in this environment. " +
        "Falling back to demo simulator. Install tiktok-live-connector with npm in production."
      );
    } else {
      console.error(`[TikTokConnector] Failed to connect to @${tiktokUsername}:`, msg);
    }
    return false;
  }
}

export async function startTikTokConnection(
  io: SocketServer,
  tiktokUsername: string | null | undefined,
  sessionId: number,
  userId: number,
  demoMode = false
) {
  if (!demoMode && tiktokUsername) {
    const connected = await startLiveConnector(tiktokUsername, sessionId, userId);
    if (connected) return;
  }

  const roomId = `session:${sessionId}`;
  startSimulator(io, sessionId, roomId, userId);
  activeConnectors.set(sessionId, {
    type: "demo",
    stop: () => stopSimulator(sessionId),
  });

  if (!demoMode && tiktokUsername) {
    console.warn(
      `[TikTokConnector] Using demo simulator for session ${sessionId} (live connection failed).`
    );
  } else {
    console.log(`[TikTokConnector] Demo mode started for session ${sessionId}.`);
  }
}

export function stopTikTokConnection(sessionId: number) {
  const entry = activeConnectors.get(sessionId);
  if (entry) {
    entry.stop();
    activeConnectors.delete(sessionId);
  }
}

export function getConnectionMode(sessionId: number): "live" | "demo" | null {
  return activeConnectors.get(sessionId)?.type ?? null;
}
