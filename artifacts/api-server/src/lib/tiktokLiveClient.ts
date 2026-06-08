/**
 * Custom TikTok LIVE WebSocket client.
 *
 * Replaces the `tiktok-live-connector` npm package which depends on `protobufjs`
 * — a package entirely blocked by Replit's supply-chain security firewall.
 *
 * Uses:
 *  - Node.js 24 built-in `fetch` for HTTP
 *  - `ws` for WebSocket (custom headers support, mTLS-friendly)
 *  - `pbf` for protobuf decoding (via ./tiktokProto.ts)
 *
 * Connection flow:
 *  1. GET https://www.tiktok.com/@{username}/live → extract roomId from HTML
 *  2. GET https://webcast.tiktok.com/webcast/room/info/ → verify room is live (status 4)
 *  3. GET https://webcast.tiktok.com/webcast/im/fetch/ → get WebSocket cursor + wsParam
 *  4. Connect wss://webcast.tiktok.com/ws/ → stream protobuf events
 */

import WebSocket from "ws";
import zlib from "node:zlib";
import { EventEmitter } from "node:events";
import {
  decodeWebcastResponse,
  decodeChatMessage,
  decodeGiftMessage,
  decodeLikeMessage,
  decodeSocialMessage,
  decodeMemberMessage,
  decodeRoomUserSeqMessage,
} from "./tiktokProto.js";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  "Referer": "https://www.tiktok.com/",
  "Origin": "https://www.tiktok.com",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function tiktokFetch(url: string): Promise<Response> {
  return fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
}

// ── Step 1: Room ID ───────────────────────────────────────────────────────────

async function getRoomId(username: string): Promise<string> {
  const res = await tiktokFetch(`https://www.tiktok.com/@${username}/live`);
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} fetching TikTok live page for @${username}. ` +
      `The username may not exist.`,
    );
  }
  const html = await res.text();
  const match = html.match(/"roomId":"(\d+)"/);
  if (!match || !match[1] || match[1] === "0") {
    throw new Error(
      `@${username} is not currently streaming (no room ID found). ` +
      `Start a TikTok LIVE first, then connect.`,
    );
  }
  return match[1];
}

// ── Step 2: Verify live ───────────────────────────────────────────────────────

async function verifyRoomIsLive(roomId: string, username: string): Promise<void> {
  const res = await tiktokFetch(
    `https://webcast.tiktok.com/webcast/room/info/?room_id=${roomId}&aid=1988`,
  );
  if (!res.ok) {
    throw new Error(`Room info API returned HTTP ${res.status}.`);
  }
  const body = (await res.json()) as Record<string, any>;
  const status: number | undefined = body?.data?.status;
  if (status !== undefined && status !== 4) {
    throw new Error(
      status === 2
        ? `@${username} has not started their LIVE yet.`
        : `@${username} is not currently streaming (room status: ${status}). ` +
          `Start a TikTok LIVE first.`,
    );
  }
}

// ── Step 3: WebSocket params ──────────────────────────────────────────────────

const BASE_PARAMS: Record<string, string> = {
  aid: "1988",
  app_language: "en-US",
  app_name: "tiktok_web",
  browser_language: "en-US",
  browser_name: "Mozilla",
  browser_online: "true",
  browser_platform: "Win32",
  browser_version: "5.0 (Windows NT 10.0; Win64; x64)",
  compress: "gzip",
  cookie_enabled: "true",
  device_platform: "web",
  did_rule: "3",
  fetch_rule: "1",
  host: "https://www.tiktok.com",
  identity: "audience",
  last_rtt: "0",
  live_id: "12",
  resp_content_type: "protobuf",
  screen_height: "1080",
  screen_width: "1920",
  tz_name: "UTC",
  version_code: "180800",
  webcast_sdk_version: "1.0.14-beta.0",
};

async function getWebSocketUrl(roomId: string): Promise<string> {
  const params = new URLSearchParams({
    ...BASE_PARAMS,
    room_id: roomId,
    cursor: "",
    internal_ext: "",
  });

  const res = await tiktokFetch(
    `https://webcast.tiktok.com/webcast/im/fetch/?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(
      `TikTok im/fetch returned HTTP ${res.status}. ` +
      `The stream may have ended or TikTok requires authentication.`,
    );
  }

  const raw = Buffer.from(await res.arrayBuffer());
  let buf: Buffer;
  try {
    buf = zlib.gunzipSync(raw);
  } catch {
    buf = raw;
  }

  const resp = decodeWebcastResponse(buf);
  const cursor = resp.cursor || "";
  const internalExt = resp.internalExt || "";
  const wsParam = resp.wsParam;

  const wsParams = new URLSearchParams({
    ...BASE_PARAMS,
    room_id: roomId,
    cursor,
    internal_ext: internalExt,
    endpoint: "wss://webcast.tiktok.com/ws/",
  });
  if (wsParam?.value) {
    wsParams.set(wsParam.name || "imprp", wsParam.value);
  }

  return `wss://webcast.tiktok.com/ws/?${wsParams.toString()}`;
}

// ── Event types (re-exported for type safety in connector) ────────────────────

export interface TikTokChatEvent {
  username: string;
  comment: string;
}
export interface TikTokGiftEvent {
  username: string;
  giftName: string;
  coins: number;
  count: number;
  repeatEnd: boolean;
}
export interface TikTokLikeEvent {
  username: string;
  likeCount: number;
  total: number;
}
export interface TikTokSocialEvent {
  username: string;
  action: "follow" | "share" | "join";
}
export interface TikTokViewerCountEvent {
  count: number;
}

// ── TikTokLiveClient ──────────────────────────────────────────────────────────

export class TikTokLiveClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private stopped = false;
  private reconnectDelay = 2000;
  readonly username: string;

  constructor(username: string) {
    super();
    this.username = username.replace(/^@/, "").trim();
  }

  /** Connect to TikTok LIVE. Throws on initial connection failure. */
  async connect(): Promise<void> {
    this.stopped = false;
    await this._fullConnect();
  }

  private async _fullConnect(): Promise<void> {
    if (this.stopped) return;

    console.log(`[TikTok] Connecting to @${this.username}...`);
    const roomId = await getRoomId(this.username);
    console.log(`[TikTok] Room ID: ${roomId}`);

    await verifyRoomIsLive(roomId, this.username);
    console.log(`[TikTok] Room verified live.`);

    const wsUrl = await getWebSocketUrl(roomId);
    console.log(`[TikTok] Connecting WebSocket...`);

    await this._connectWebSocket(wsUrl, roomId);
  }

  private _connectWebSocket(wsUrl: string, roomId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.stopped) {
        reject(new Error("Client stopped before WebSocket connected."));
        return;
      }

      const ws = new WebSocket(wsUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          "Origin": "https://www.tiktok.com",
          "Referer": `https://www.tiktok.com/@${this.username}/live`,
        },
        perMessageDeflate: false,
      });

      this.ws = ws;
      let resolved = false;

      ws.on("open", () => {
        console.log(`[TikTok] ✓ Connected to @${this.username} LIVE (roomId: ${roomId})`);
        this.reconnectDelay = 2000;
        resolved = true;
        this.emit("connected");
        resolve();
      });

      ws.on("message", (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        if (!isBinary) return;
        const buf = Buffer.isBuffer(data) ? data : Buffer.concat(data as Buffer[]);
        void this._handleBinaryMessage(buf);
      });

      ws.on("ping", () => {
        try { ws.pong(); } catch (_) {}
      });

      ws.on("close", (code: number, reason: Buffer) => {
        console.warn(
          `[TikTok] WebSocket closed (code=${code}, reason="${reason.toString() || "none"}")`,
        );
        this.ws = null;
        this.emit("disconnected", code);
        if (!this.stopped) {
          this._scheduleReconnect(roomId);
        }
      });

      ws.on("error", (err: Error) => {
        console.error(`[TikTok] WebSocket error: ${err.message}`);
        this.emit("wsError", err);
        if (!resolved) {
          reject(err);
        }
      });
    });
  }

  private _scheduleReconnect(roomId: string): void {
    if (this.stopped) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    console.log(`[TikTok] Reconnecting in ${delay}ms...`);
    setTimeout(async () => {
      if (this.stopped) return;
      try {
        await this._connectWebSocket(
          await getWebSocketUrl(roomId),
          roomId,
        );
      } catch (err: any) {
        console.error(`[TikTok] Reconnect failed: ${err.message}`);
        this._scheduleReconnect(roomId);
      }
    }, delay);
  }

  private async _handleBinaryMessage(raw: Buffer): Promise<void> {
    let buf: Buffer;
    try {
      buf = zlib.gunzipSync(raw);
    } catch {
      buf = raw;
    }

    let resp: ReturnType<typeof decodeWebcastResponse>;
    try {
      resp = decodeWebcastResponse(buf);
    } catch (e: any) {
      console.warn(`[TikTok] Protobuf decode error: ${e.message}`);
      return;
    }

    for (const msg of resp.messages) {
      try {
        this._dispatchMessage(msg.method, msg.payload);
      } catch (e: any) {
        console.warn(`[TikTok] Dispatch error for ${msg.method}: ${e.message}`);
      }
    }
  }

  private _dispatchMessage(method: string, payload: Uint8Array): void {
    switch (method) {
      case "WebcastChatMessage": {
        const { user, comment } = decodeChatMessage(payload);
        const c = comment.trim();
        if (!c) return;
        this.emit("chat", {
          username: user.uniqueId || user.nickname || "unknown",
          comment: c,
        } satisfies TikTokChatEvent);
        break;
      }

      case "WebcastGiftMessage": {
        const { user, giftName, diamondCount, repeatCount, repeatEnd } =
          decodeGiftMessage(payload);
        this.emit("gift", {
          username: user.uniqueId || user.nickname || "unknown",
          giftName,
          coins: diamondCount,
          count: repeatCount,
          repeatEnd,
        } satisfies TikTokGiftEvent);
        break;
      }

      case "WebcastLikeMessage": {
        const { user, count, total } = decodeLikeMessage(payload);
        this.emit("like", {
          username: user.uniqueId || user.nickname || "unknown",
          likeCount: count,
          total,
        } satisfies TikTokLikeEvent);
        break;
      }

      case "WebcastSocialMessage": {
        const { user, displayType } = decodeSocialMessage(payload);
        const username = user.uniqueId || user.nickname || "unknown";
        const dt = displayType.toLowerCase();
        if (dt.includes("follow") || dt.includes("subscribe")) {
          this.emit("social", { username, action: "follow" } satisfies TikTokSocialEvent);
        } else if (dt.includes("share")) {
          this.emit("social", { username, action: "share" } satisfies TikTokSocialEvent);
        }
        break;
      }

      case "WebcastMemberMessage": {
        const { user, actionId } = decodeMemberMessage(payload);
        const username = user.uniqueId || user.nickname || "unknown";
        if (actionId === 1) {
          this.emit("social", { username, action: "join" } satisfies TikTokSocialEvent);
        } else if (actionId === 6) {
          this.emit("social", { username, action: "follow" } satisfies TikTokSocialEvent);
        }
        break;
      }

      case "WebcastRoomUserSeqMessage": {
        const { viewerCount } = decodeRoomUserSeqMessage(payload);
        if (viewerCount > 0) {
          this.emit("viewerCount", { count: viewerCount } satisfies TikTokViewerCountEvent);
        }
        break;
      }

      default:
        break;
    }
  }

  /** Stop the connection and prevent reconnection. */
  disconnect(): void {
    this.stopped = true;
    if (this.ws) {
      try { this.ws.close(1000, "Client disconnected"); } catch (_) {}
      this.ws = null;
    }
  }
}
