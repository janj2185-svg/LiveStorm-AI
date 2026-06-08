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
  /<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/s;

interface LiveRoomInfo {
  isLive: boolean;
  roomId: string;
}

/**
 * Parse TikTok's live page HTML to extract live status and room ID.
 * Uses the embedded SIGI_STATE JSON blob — reliable from server-side IPs.
 */
async function fetchLiveRoomInfo(username: string): Promise<LiveRoomInfo> {
  const clean = username.replace(/^@/, "").trim();
  const res = await fetch(`https://www.tiktok.com/@${clean}/live`, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.tiktok.com/",
    },
  });
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} fetching live page for @${clean}. ` +
        `Check that the TikTok username is correct.`,
    );
  }
  const html = await res.text();
  const match = html.match(SIGI_PATTERN);
  if (!match) {
    // Page loaded but no SIGI_STATE — TikTok may have changed layout or the
    // account doesn't exist.
    return { isLive: false, roomId: "" };
  }
  let sigiState: Record<string, any>;
  try {
    sigiState = JSON.parse(match[1]);
  } catch {
    return { isLive: false, roomId: "" };
  }

  const liveRoomInfo = sigiState?.LiveRoom?.liveRoomUserInfo;
  if (!liveRoomInfo) {
    return { isLive: false, roomId: "" };
  }

  // The "user" object inside liveRoomUserInfo carries roomId and status.
  const user: Record<string, any> = liveRoomInfo.user ?? liveRoomInfo;
  const roomId = String(user?.roomId ?? "");
  const status = Number(user?.status ?? 0);

  // TikTok status 4 = live and broadcasting.
  const isLive = status === 4 && roomId !== "" && roomId !== "0";
  return { isLive, roomId };
}

/** Returns true when the error means "user isn't live yet" (retriable). */
export function isNotLiveError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("not currently streaming") ||
    msg.includes("not started") ||
    msg.includes("no room ID found") ||
    msg.includes("Start a TikTok LIVE") ||
    msg.includes("not live") ||
    msg.includes("status is not")
  );
}

// ── TikTokLiveClient ──────────────────────────────────────────────────────────

/**
 * Thin wrapper around WebcastPushConnection that:
 *  - Checks live status via SIGI_STATE before attempting a WebSocket connection.
 *  - Emits "notLive" and polls every 30 s when the user isn't streaming yet.
 *  - Auto-reconnects on disconnect (exponential back-off, max 30 s).
 *  - Maps tiktok-live-connector events to this app's typed event interface.
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

  /** Full round-trip: check live status, then connect WebSocket. */
  private async _fullConnect(): Promise<void> {
    if (this.stopped) return;

    console.log(`[TikTok] Checking live status for @${this.username}...`);
    let info: LiveRoomInfo;
    try {
      info = await fetchLiveRoomInfo(this.username);
    } catch (err: any) {
      throw err; // network / HTTP error — propagate to caller
    }

    if (!info.isLive) {
      const msg =
        `@${this.username} is not currently streaming on TikTok LIVE. ` +
        `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
      console.log(
        `[TikTok] @${this.username} is not live — polling again in 30 s.`,
      );
      this.emit("notLive", { username: this.username, message: msg });
      this._scheduleRetry(30_000, /* fullConnect */ true);
      return;
    }

    console.log(
      `[TikTok] @${this.username} is live (roomId: ${info.roomId}) — opening WebSocket...`,
    );
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
        console.error(`[TikTok] Error for @${this.username}: ${msg}`);
        this.emit("wsError", err instanceof Error ? err : new Error(msg));
        // Don't reject — disconnect handler will schedule a reconnect.
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
          console.error(
            `[TikTok] connect() rejected for @${this.username}: ${msg}`,
          );
          this.emit("wsError", new Error(msg));
          settle();
          if (!this.stopped) {
            this._scheduleRetry(this.reconnectDelay, /* fullConnect */ false);
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000);
          }
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
