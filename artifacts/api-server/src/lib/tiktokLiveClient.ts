/**
 * TikTok LIVE client using tiktok-live-connector@2.1.1-beta1.
 *
 * Live detection uses SIGI_STATE HTML parsing (reliable from any server IP).
 * The WebSocket connection is signed via eulerstream's API.
 *
 * For stable, sustained connections set the SIGN_API_KEY environment variable
 * to your eulerstream API key (https://eulerstream.com). Without a key the
 * connector uses eulerstream's anonymous fallback which may disconnect quickly;
 * the client will auto-reconnect with exponential back-off in that case.
 */

import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

// tiktok-live-connector is CommonJS — import via createRequire so esbuild
// can bundle it into our ESM output without issues.
const _require = createRequire(import.meta.url);
const { WebcastPushConnection } = _require("tiktok-live-connector") as {
  WebcastPushConnection: new (username: string, options?: Record<string, unknown>) => any;
};

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

/** SIGI_STATE regex — the live page embeds a JSON blob in this script tag. */
const SIGI_PATTERN =
  /<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/;

interface LiveRoomInfo {
  isLive: boolean;
  roomId: string;
}

/**
 * Parse TikTok's live page HTML to extract live status and room ID.
 *
 * Uses the SIGI_STATE JSON blob embedded in the live page.
 *
 * Key fields (verified via live diagnostic on 2026-06-08):
 *   LiveRoom.liveRoomStatus          — TOP-LEVEL stream status
 *                                      0 = not streaming, non-zero = streaming
 *   LiveRoom.liveRoomUserInfo.user.roomId — persistent room ID (present even offline)
 *   LiveRoom.liveRoomUserInfo.user.status — USER account status (NOT stream status;
 *                                            value 2 = normal account, always 2)
 *
 * BUG HISTORY: code previously checked user.status === 4 which is the WRONG
 * field (user account status) and the WRONG value (4 = ended in room context).
 * The correct signal is liveRoomStatus at the LiveRoom top level.
 */
async function fetchLiveRoomInfo(username: string): Promise<LiveRoomInfo> {
  const clean = username.replace(/^@/, "").trim();
  const res = await fetch(`https://www.tiktok.com/@${clean}/live`, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.tiktok.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} fetching live page for @${clean}. ` +
        `Check that the TikTok username is correct.`,
    );
  }

  const html = await res.text();
  console.log(`[TikTok] Live page for @${clean}: HTTP ${res.status}, ${html.length} chars`);

  // ── Parse SIGI_STATE ────────────────────────────────────────────────────
  const match = html.match(SIGI_PATTERN);
  if (!match) {
    // SIGI_STATE missing — TikTok may have changed page layout.
    // Log a warning but don't block the connection attempt; the WebSocket
    // handshake is the ground truth for whether the user is live.
    console.warn(
      `[TikTok] SIGI_STATE not found in live page for @${clean}. ` +
      `TikTok may have changed page layout. Attempting WebSocket connection anyway.`,
    );
    return { isLive: true, roomId: "" };
  }

  let sigiState: Record<string, any>;
  try {
    sigiState = JSON.parse(match[1]);
  } catch (e) {
    console.warn(`[TikTok] Failed to parse SIGI_STATE for @${clean}:`, e);
    return { isLive: true, roomId: "" };
  }

  // ── Extract fields ───────────────────────────────────────────────────────
  const liveRoom = sigiState?.LiveRoom ?? {};
  const lrui = liveRoom?.liveRoomUserInfo ?? {};
  const user: Record<string, any> = lrui?.user ?? {};
  const liveRoomObj: Record<string, any> = lrui?.liveRoom ?? {};

  const roomId = String(user?.roomId ?? "");

  // TOP-LEVEL liveRoomStatus: 0 = not streaming, non-zero = streaming.
  // This is the reliable signal — confirmed via diagnostic.
  const topLevelStatus = Number(liveRoom?.liveRoomStatus ?? -1);

  // Log full parsed context so the next failed test has a paper trail.
  console.log(`[TikTok] SIGI_STATE parsed for @${clean}:`, JSON.stringify({
    liveRoomStatus: topLevelStatus,           // KEY signal: 0=offline, non-zero=live
    roomId,                                   // persistent room ID
    userStatus: user?.status,                 // user account status — NOT stream status
    liveRoomObjStatus: liveRoomObj?.status,   // room-level status
    liveRoomStartTime: liveRoomObj?.startTime,
    uniqueId: user?.uniqueId,
    liveRoomUserInfoKeys: Object.keys(lrui),
    topLevelLiveRoomKeys: Object.keys(liveRoom),
  }));

  // ── Live detection ───────────────────────────────────────────────────────

  // Case 1: liveRoomStatus is explicitly 0 → definitively not streaming.
  if (topLevelStatus === 0) {
    console.log(`[TikTok] @${clean} liveRoomStatus=0 → not streaming`);
    return { isLive: false, roomId };
  }

  // Case 2: liveRoomStatus is a positive number → streaming.
  if (topLevelStatus > 0) {
    console.log(`[TikTok] @${clean} liveRoomStatus=${topLevelStatus}, roomId=${roomId} → streaming`);
    return { isLive: true, roomId };
  }

  // Case 3: liveRoomStatus field is absent (-1 sentinel).
  // Fall back to roomId presence: if there's a non-trivial roomId, attempt
  // the WebSocket connection and let the library confirm live status.
  const hasRoomId = roomId !== "" && roomId !== "0";
  console.log(
    `[TikTok] @${clean} liveRoomStatus field absent — ` +
    `roomId=${roomId || "(empty)"}, attempting connection: ${hasRoomId}`,
  );
  return { isLive: hasRoomId, roomId };
}

/**
 * Returns true when the error means "user isn't live yet" (retriable with 30s polling).
 * Covers both our own messages and patterns from tiktok-live-connector's internal checks.
 */
export function isNotLiveError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("not currently streaming") || // our own message
    msg.includes("not started")              || // library: room not started
    msg.includes("no room id found")         || // library: no room for username
    msg.includes("start a tiktok live")      || // our own message
    msg.includes("not live")                 || // generic
    msg.includes("status is not")            || // library: "Live status is not 4"
    msg.includes("live has ended")           || // library: stream ended mid-session
    msg.includes("failed to retrieve room")  || // library: room lookup failed
    msg.includes("failed to get room")       || // library: room API error
    msg.includes("room not found")           || // library: no active room
    msg.includes("is offline")               || // library: user offline
    msg.includes("not online")                  // library: user not online
  );
}

// ── TikTokLiveClient ──────────────────────────────────────────────────────────

/**
 * Thin wrapper around WebcastPushConnection that:
 *  - Connects directly via the library's own webcast-API live detection.
 *  - Emits "notLive" and polls every 30 s when the user isn't streaming yet.
 *  - Auto-reconnects on disconnect (exponential back-off, max 30 s).
 *  - Maps tiktok-live-connector events to this app's typed event interface.
 *
 * NOTE: We do NOT use our own SIGI_STATE HTML pre-check. Production logs
 * confirmed that TikTok serves liveRoomStatus=0 to server/datacenter IPs
 * on every request regardless of actual stream state. The library's internal
 * webcast API calls work correctly from server IPs and are the ground truth.
 */
export class TikTokLiveClient extends EventEmitter {
  readonly username: string;
  private stopped = false;
  private currentClient: InstanceType<typeof WebcastPushConnection> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 3_000;

  constructor(username: string) {
    super();
    this.username = username.replace(/^@/, "").trim();
  }

  /**
   * Start connecting.  Resolves when:
   *   A) WebSocket is connected and emitting events, OR
   *   B) User isn't live yet — "notLive" event fired, 30 s polling active.
   * Throws only on hard errors (network down, invalid username, etc.).
   */
  async connect(): Promise<void> {
    this.stopped = false;
    this.reconnectDelay = 3_000;
    await this._fullConnect();
  }

  /**
   * Initiate a connection attempt.
   * Goes straight to _connectClient() — no SIGI_STATE pre-check.
   * The library's own webcast API calls determine live status and are
   * reliable from server IPs. "Not live" errors are caught in _connectClient().
   */
  private async _fullConnect(): Promise<void> {
    if (this.stopped) return;
    console.log(`[TikTok] Connecting to @${this.username}...`);
    await this._connectClient();
  }

  /** Create a WebcastPushConnection and attach all event listeners. */
  private _connectClient(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.stopped) { resolve(); return; }

      const client = new WebcastPushConnection(this.username, {
        processInitialData: false,
        enableExtendedGiftInfo: false,
        enableWebsocketUpgrade: true,
        websocketPingIntervalMs: 10_000,
        websocketTimeout: 20_000,
        reconnectEnabled: false, // we handle reconnect
      }) as any;

      this.currentClient = client;
      let settled = false;
      const settle = () => { if (!settled) { settled = true; resolve(); } };

      // ── Connection lifecycle ──────────────────────────────────────────────

      client.on("connected", (state: any) => {
        console.log(
          `[TikTok] ✓ Connected to @${this.username} LIVE (roomId: ${state?.roomId ?? "?"})`,
        );
        this.reconnectDelay = 3_000;
        settle();
        this.emit("connected");
      });

      client.on("disconnected", () => {
        console.warn(`[TikTok] Disconnected from @${this.username}`);
        this.currentClient = null;
        this.emit("disconnected", 1006);
        settle(); // resolve the promise if not yet done
        if (!this.stopped) {
          this._scheduleRetry(this.reconnectDelay, /* fullConnect */ false);
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000);
        }
      });

      client.on("error", (err: any) => {
        const msg: string = err?.message ?? String(err);
        if (isNotLiveError(new Error(msg))) {
          // Library's own live-check determined the user isn't streaming yet.
          const notLiveMsg =
            `@${this.username} is not currently streaming on TikTok LIVE. ` +
            `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
          console.log(`[TikTok] @${this.username} not live (library error: ${msg}) — polling in 30 s`);
          this.emit("notLive", { username: this.username, message: notLiveMsg });
          this._scheduleRetry(30_000, /* fullConnect */ true);
        } else {
          console.error(`[TikTok] Error for @${this.username}: ${msg}`);
          this.emit("wsError", err instanceof Error ? err : new Error(msg));
        }
        // Don't reject — reconnect is scheduled above or by disconnect handler.
        settle();
      });

      // ── Live events ───────────────────────────────────────────────────────

      client.on("chat", (d: any) => {
        const comment: string = d?.comment ?? "";
        if (!comment.trim()) return;
        this.emit("chat", {
          username: d?.uniqueId ?? d?.user?.uniqueId ?? "unknown",
          comment,
        } satisfies TikTokChatEvent);
      });

      client.on("gift", (d: any) => {
        this.emit("gift", {
          username: d?.uniqueId ?? d?.user?.uniqueId ?? "unknown",
          giftName: d?.giftName ?? d?.gift?.name ?? "Gift",
          coins: Number(d?.diamondCount ?? 0),
          count: Number(d?.repeatCount ?? 1),
          repeatEnd: !!d?.repeatEnd,
        } satisfies TikTokGiftEvent);
      });

      client.on("like", (d: any) => {
        this.emit("like", {
          username: d?.uniqueId ?? d?.user?.uniqueId ?? "unknown",
          likeCount: Number(d?.likeCount ?? 0),
          total: Number(d?.totalLikeCount ?? 0),
        } satisfies TikTokLikeEvent);
      });

      client.on("social", (d: any) => {
        const dt: string = (d?.displayType ?? "").toLowerCase();
        const action: TikTokSocialEvent["action"] = dt.includes("share")
          ? "share"
          : "follow";
        this.emit("social", {
          username: d?.uniqueId ?? d?.user?.uniqueId ?? "unknown",
          action,
        } satisfies TikTokSocialEvent);
      });

      client.on("member", (d: any) => {
        // "member" = viewer joined the room
        this.emit("social", {
          username: d?.uniqueId ?? d?.user?.uniqueId ?? "unknown",
          action: "join",
        } satisfies TikTokSocialEvent);
      });

      client.on("roomUser", (d: any) => {
        const count = Number(d?.viewerCount ?? d?.totalUserCount ?? 0);
        if (count > 0) {
          this.emit("viewerCount", { count } satisfies TikTokViewerCountEvent);
        }
      });

      // Initiate the connection.
      client
        .connect()
        .then(() => settle())
        .catch((err: any) => {
          const msg: string = err?.message ?? String(err);
          if (isNotLiveError(new Error(msg))) {
            // Library confirmed user isn't live — fall into 30 s polling.
            const notLiveMsg =
              `@${this.username} is not currently streaming on TikTok LIVE. ` +
              `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
            console.log(`[TikTok] @${this.username} not live (library: ${msg}) — polling in 30 s`);
            this.emit("notLive", { username: this.username, message: notLiveMsg });
            this._scheduleRetry(30_000, /* fullConnect */ true);
          } else {
            console.error(`[TikTok] connect() rejected for @${this.username}: ${msg}`);
            this.emit("wsError", new Error(msg));
            if (!this.stopped) {
              this._scheduleRetry(this.reconnectDelay, /* fullConnect */ false);
              this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000);
            }
          }
          settle();
        });

      // Safety timeout — avoid hanging indefinitely if no event fires.
      setTimeout(settle, 25_000);
    });
  }

  /**
   * Schedule a retry after `delay` ms.
   * `fullConnect = true`  → re-check live status before connecting.
   * `fullConnect = false` → skip live check, go straight to WebSocket.
   */
  private _scheduleRetry(delay: number, fullConnect: boolean): void {
    if (this.stopped) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const humanDelay = delay >= 1000 ? `${(delay / 1000).toFixed(1)}s` : `${delay}ms`;
    console.log(
      `[TikTok] Scheduling reconnect in ${humanDelay} (fullConnect=${fullConnect})`,
    );
    this.reconnectTimer = setTimeout(async () => {
      if (this.stopped) return;
      this.reconnectTimer = null;
      try {
        if (fullConnect) {
          await this._fullConnect();
        } else {
          await this._connectClient();
        }
      } catch (err: any) {
        console.error(`[TikTok] Reconnect attempt failed: ${err?.message}`);
        if (!this.stopped) {
          this._scheduleRetry(
            Math.min(this.reconnectDelay * 1.5, 30_000),
            fullConnect,
          );
        }
      }
    }, delay);
  }

  /** Stop all connections and prevent further reconnects. */
  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.currentClient) {
      try {
        this.currentClient.disconnect();
      } catch (_) {
        // ignore
      }
      this.currentClient = null;
    }
  }
}
