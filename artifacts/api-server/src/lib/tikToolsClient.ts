/**
 * TikTools (tik.tools) LIVE client — drop-in replacement for TikTokLiveClient.
 *
 * Uses tik.tools' JWT-authenticated WebSocket API (wss://api.tik.tools).
 * Emits identical events to TikTokLiveClient so tiktokConnector.ts needs
 * zero changes beyond swapping the constructor.
 *
 * Requires: TIKTOOL_API_KEY env var (free key at https://tik.tools).
 * Activate: set LIVE_PROVIDER=tiktools in environment.
 */

import { EventEmitter } from "node:events";
import WebSocket from "ws";

// ── Event types (mirrors TikTokLiveClient interface exactly) ──────────────────

export interface TikToolsChatEvent {
  username: string;
  comment: string;
}
export interface TikToolsGiftEvent {
  username: string;
  giftName: string;
  coins: number;
  count: number;
  repeatEnd: boolean;
}
export interface TikToolsLikeEvent {
  username: string;
  likeCount: number;
  total: number;
}
export interface TikToolsSocialEvent {
  username: string;
  action: "follow" | "share" | "join";
}
export interface TikToolsViewerCountEvent {
  count: number;
}

interface TikToolsOptions {
  onBeforeReconnect?: () => Promise<boolean>;
}

interface TikToolsRawEvent {
  event: string;
  data?: Record<string, any>;
}

const API_BASE = "https://api.tik.tools";
const WS_BASE = "wss://api.tik.tools";

// ── Module-level raw-event ring buffer (last 20 events for debugging) ─────────

interface RawEventEntry {
  ts: string;          // ISO timestamp
  username: string;    // creator username
  event: string;       // raw event name from tik.tools
  dataPreview: string; // first 800 chars of JSON-stringified data
  mapped: boolean;     // whether _handleEvent has a case for this event name
}

const KNOWN_EVENTS = new Set(["chat","gift","like","follow","share","member","roomInfo","ping","roomUserSeq"]);
const RAW_EVENT_BUFFER: RawEventEntry[] = [];
const RAW_BUFFER_MAX = 50;

export function getRawEventBuffer(): RawEventEntry[] {
  return RAW_EVENT_BUFFER.slice();
}

function pushToBuffer(entry: RawEventEntry): void {
  RAW_EVENT_BUFFER.push(entry);
  if (RAW_EVENT_BUFFER.length > RAW_BUFFER_MAX) {
    RAW_EVENT_BUFFER.shift();
  }
}

// ── TikToolsClient ────────────────────────────────────────────────────────────

export class TikToolsClient extends EventEmitter {
  private username: string;
  private stopped = false;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 15_000;
  private rawEventCount = 0;
  private options: TikToolsOptions;
  /** Exponential backoff used exclusively for tik.tools 4429 rate-limit closes. */
  private rateLimitBackoff = 60_000;
  /** Cached JWT token to avoid fetching a new one on every reconnect. */
  private cachedJwt: { token: string; expiresAt: number } | null = null;

  constructor(username: string, options: TikToolsOptions = {}) {
    super();
    this.username = username.replace(/^@/, "").trim();
    this.options = options;
  }

  /**
   * Begin connecting. Resolves once the WebSocket is open OR once "notLive"
   * polling is established — mirroring TikTokLiveClient.connect() behaviour.
   */
  async connect(): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      void this._connectAttempt(settle);
    });
  }

  private async _connectAttempt(settle: () => void): Promise<void> {
    if (this.stopped) {
      settle();
      return;
    }

    // Guard: ask the session layer whether we should still reconnect
    if (this.options.onBeforeReconnect) {
      try {
        const shouldContinue = await this.options.onBeforeReconnect();
        if (!shouldContinue) {
          this.stopped = true;
          settle();
          return;
        }
      } catch (err: any) {
        console.error(`[TikTools] onBeforeReconnect error: ${err?.message}`);
      }
    }

    const apiKey = process.env.TIKTOOL_API_KEY;
    if (!apiKey) {
      const msg =
        "TIKTOOL_API_KEY is not set. Get a free key at https://tik.tools " +
        "and add it as TIKTOOL_API_KEY in your environment secrets.";
      console.error(`[TikTools] ${msg}`);
      this.emit("wsError", new Error(msg));
      settle();
      return;
    }
    // Q5 — log first 6 + last 6 chars of the key actually used at runtime
    const keyFingerprint = `${apiKey.slice(0, 8)}...${apiKey.slice(-8)}`;
    console.log(
      `[TikTools:key] @${this.username} using TIKTOOL_API_KEY fingerprint="${keyFingerprint}" ` +
      `length=${apiKey.length} startsWithTk=${apiKey.startsWith("tk_")}`,
    );

    // ── 1. Obtain JWT from tik.tools (cached to avoid rate-limit burn) ───────
    // JWT expires_after=3600s; we consider it stale 5 min before expiry so we
    // never hand an almost-expired token to the WS handshake.
    const JWT_STALE_MARGIN = 5 * 60 * 1000; // 5 min
    let token: string;
    const now = Date.now();
    if (this.cachedJwt && this.cachedJwt.expiresAt - JWT_STALE_MARGIN > now) {
      token = this.cachedJwt.token;
      console.log(
        `[TikTools] Reusing cached JWT for @${this.username} ` +
        `(expires in ${Math.round((this.cachedJwt.expiresAt - now) / 1000)}s)`,
      );
    } else {
      try {
        const resp = await fetch(
          `${API_BASE}/authentication/jwt?apiKey=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              allowed_creators: [this.username],
              expire_after: 3600,
              max_websockets: 1,
            }),
          },
        );
        const j = (await resp.json()) as any;

        if (!j?.data?.token) {
          const errMsg: string =
            j?.error ?? j?.message ?? `HTTP ${resp.status}: ${JSON.stringify(j).slice(0, 200)}`;
          console.warn(`[TikTools] JWT auth failed for @${this.username}: ${errMsg}`);
          if (this._isNotLiveError(errMsg)) {
            const msg =
              `@${this.username} is not currently streaming on TikTok LIVE. ` +
              `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
            console.warn(
              `[TikTools:notLive] PATH=jwt-not-live @${this.username} ` +
              `wsState=no-ws rawEventCount=${this.rawEventCount} ` +
              `hadAnyMessage=n/a(pre-ws) lastEvent=n/a jwtError="${errMsg}"`,
            );
            this.rateLimitBackoff = 60_000; // reset on normal not-live path
            this.emit("notLive", { username: this.username, message: msg });
            this._scheduleRetry(30_000, settle);
            return;
          }
          // JWT rate-limit — back off using the same escalating window as WS 4429
          if (errMsg.toLowerCase().includes("rate limit")) {
            this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 1.5, 300_000);
            console.warn(
              `[TikTools:rate-limit] JWT rate-limited @${this.username} — ` +
              `backing off ${this.rateLimitBackoff / 1000}s`,
            );
            this._scheduleRetry(this.rateLimitBackoff, settle);
            return;
          }
          throw new Error(errMsg);
        }
        token = j.data.token as string;
        // Cache JWT for 55 min (expire_after=3600s, minus 5 min stale margin).
        // Never log the token itself — only log the expiry timestamp.
        const jwtExpiresAt = now + 55 * 60 * 1000;
        this.cachedJwt = { token, expiresAt: jwtExpiresAt };
        console.log(
          `[TikTools] JWT acquired for @${this.username} — ` +
          `expires at ${new Date(jwtExpiresAt).toISOString()} ` +
          `(in ${Math.round((jwtExpiresAt - now) / 1000)}s) — opening WebSocket`,
        );
      } catch (err: any) {
        console.error(`[TikTools] JWT fetch error for @${this.username}: ${err?.message}`);
        if (!this.stopped) {
          this.emit("wsError", err instanceof Error ? err : new Error(String(err)));
          this._scheduleRetry(this.reconnectDelay, settle);
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 60_000);
        }
        return;
      }
    }

    // ── 2. Connect WebSocket ──────────────────────────────────────────────────
    this.rawEventCount = 0;
    const wsUrl = `${WS_BASE}?uniqueId=${encodeURIComponent(this.username)}&jwtKey=${encodeURIComponent(token)}`;
    // Q6 — log exact WS URL with jwtKey masked (first 12 chars + "...")
    const maskedUrl = wsUrl.replace(
      /jwtKey=[^&]*/,
      `jwtKey=${token.slice(0, 12)}...[masked]`,
    );
    console.log(`[TikTools:ws-url] @${this.username} connecting to: ${maskedUrl}`);
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err: any) {
      console.error(`[TikTools] WS constructor failed: ${err?.message}`);
      this.emit("wsError", err instanceof Error ? err : new Error(String(err)));
      settle();
      return;
    }
    this.ws = ws;

    let connectedAt: number | null = null;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    // True once ANY message arrives (including roomInfo). roomInfo proves the room is live —
    // a subsequent quick WS close is a server-side rotation, NOT a "not live" signal.
    let hadAnyMessage = false;
    // Tracks the last event type received — logged on every notLive path for debugging.
    let lastEventType: string | null = null;

    ws.on("open", () => {
      connectedAt = Date.now();
      this.reconnectDelay = 15_000; // reset backoff on successful open
      console.log(`[TikTools] ✓ WebSocket open for @${this.username}`);
      this.emit("connected", { roomId: this.username });
      settle();

      // If connected but silent for 60 s → likely not live
      silenceTimer = setTimeout(() => {
        if (this.rawEventCount === 0 && !this.stopped) {
          console.warn(
            `[TikTools] 60 s silence with 0 events @${this.username} — ` +
            `stream may not be live. Closing to retry.`,
          );
          ws.close(1000, "silence_timeout");
        }
      }, 60_000);
    });

    ws.on("message", (data: Buffer | string) => {
      hadAnyMessage = true;
      // Cancel the silence watchdog on first message (any type, including roomInfo)
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      const raw = data.toString();
      let msg: TikToolsRawEvent;
      try {
        msg = JSON.parse(raw) as TikToolsRawEvent;
      } catch {
        console.warn(`[TikTools] Non-JSON WS message @${this.username}: ${raw.slice(0, 200)}`);
        return;
      }
      lastEventType = msg.event ?? null;

      // ── Ring buffer + full raw logging ────────────────────────────────────
      const dataPreview = raw.slice(0, 800);
      const mapped = KNOWN_EVENTS.has(msg.event ?? "");
      pushToBuffer({
        ts: new Date().toISOString(),
        username: this.username,
        event: msg.event ?? "(none)",
        dataPreview,
        mapped,
      });

      // Log EVERY event with full raw payload preview
      console.log(
        `[TikTools:raw] @${this.username} event="${msg.event ?? "(none)"}" mapped=${mapped} | ${dataPreview}`,
      );

      if (msg.event !== "roomInfo") {
        this.rawEventCount++;
        if (this.rawEventCount === 1) {
          console.log(
            `[Pipeline:1] [TikTools] FIRST non-roomInfo packet from @${this.username} — event=${msg.event}`,
          );
        } else if (this.rawEventCount <= 10 || this.rawEventCount % 50 === 0) {
          console.log(
            `[Pipeline:1] [TikTools] Packet #${this.rawEventCount} event=${msg.event} @${this.username}`,
          );
        }
      }

      this._handleEvent(msg);
    });

    ws.on("close", (code: number, reasonBuf: Buffer) => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      this.ws = null;
      this.emit("disconnected", code);
      settle(); // idempotent — no-op if already settled

      if (this.stopped) return;

      const reason = reasonBuf?.toString?.() ?? "";
      const connectedMs = connectedAt != null ? Date.now() - connectedAt : 0;

      if (code === 4401 || reason.toLowerCase().includes("invalid or expired jwt")) {
        // tik.tools rejected the JWT — the cached token is no longer valid.
        // Evict the cache so the next attempt fetches a fresh JWT.
        // This prevents an infinite retry loop with a permanently-rejected token.
        if (this.cachedJwt) {
          const remainingSec = Math.round((this.cachedJwt.expiresAt - Date.now()) / 1000);
          console.warn(
            `[TikTools:4401] JWT rejected by server @${this.username} ` +
            `(cached token had ${remainingSec}s remaining — clearing cache, ` +
            `will force-fetch new JWT on next attempt) — reconnecting in 15s`,
          );
          this.cachedJwt = null;
        } else {
          console.warn(
            `[TikTools:4401] JWT rejected by server @${this.username} ` +
            `(no cached token) — reconnecting in 15s`,
          );
        }
        this._scheduleRetry(15_000, settle);
      } else if (code === 4429 || reason.toLowerCase().includes("rate limit")) {
        // tik.tools 4429 has two distinct sub-types:
        //
        // A) "Daily Demo Limit Reached. Upgrade Required. (15 WS sessions / 24h on Community)"
        //    → Account has exhausted its daily WS session quota. Every retry burns another
        //      slot. Back off for the full remaining window (~23h) and stop retrying today.
        //
        // B) "Evicted - newer connection arrived (FIFO)"
        //    → A newer connection from the same JWT displaced ours (dev+prod both running,
        //      or a second browser tab).  Back off exponentially; the FIFO queue is shared.
        const isDailyLimit =
          reason.toLowerCase().includes("daily") ||
          reason.toLowerCase().includes("limit reached") ||
          reason.toLowerCase().includes("upgrade required");

        if (isDailyLimit) {
          // ~23 hours — slightly less than 24h so we don't permanently block after
          // unlucky server restart timing near the reset window.
          const dailyBackoff = 23 * 60 * 60 * 1000;
          console.error(
            `[TikTools:daily-limit] WS closed code=4429 @${this.username} ` +
            `reason="${reason.slice(0, 200)}" — ` +
            `Daily WS session quota (15/24h on Community plan) exhausted. ` +
            `Backing off ${dailyBackoff / 3600_000}h. Upgrade at https://tik.tools/pricing ` +
            `or wait for the 24h quota reset.`,
          );
          this._scheduleRetry(dailyBackoff, settle);
        } else {
          // FIFO eviction or other 4429 sub-type — exponential backoff
          this.rateLimitBackoff = Math.min(
            (this.rateLimitBackoff ?? 60_000) * 1.5,
            300_000, // max 5 min
          );
          console.warn(
            `[TikTools:rate-limit] WS closed code=4429 @${this.username} ` +
            `reason="${reason.slice(0, 120)}" — backing off ${this.rateLimitBackoff / 1000}s`,
          );
          this._scheduleRetry(this.rateLimitBackoff, settle);
        }
      } else if (reason === "silence_timeout") {
        // Our own watchdog fired → user is not streaming
        this.rateLimitBackoff = 60_000; // reset rate-limit backoff on normal flow
        const msg =
          `@${this.username} is not currently streaming on TikTok LIVE. ` +
          `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
        console.warn(
          `[TikTools:notLive] PATH=silence-timeout @${this.username} ` +
          `wsState=${ws.readyState} rawEventCount=${this.rawEventCount} ` +
          `hadAnyMessage=${hadAnyMessage} lastEvent=${lastEventType ?? "null"} ` +
          `connectedMs=${connectedMs} code=${code}`,
        );
        this.emit("notLive", { username: this.username, message: msg });
        this._scheduleRetry(30_000, settle);
      } else if (!hadAnyMessage && connectedMs < 20_000) {
        // Quick close with zero messages before any data arrived.
        // This is NOT a reliable "not live" signal — tik.tools can close the WS
        // transiently for server-side reasons (JWT race, rotation, load-balancer) even
        // when the creator IS streaming. We already have two authoritative "not live"
        // paths: (1) JWT returns a not-live error, (2) 60s silence timer.
        // → Reconnect silently with a short backoff; do NOT emit notLive.
        this.rateLimitBackoff = 60_000; // reset rate-limit backoff on normal flow
        console.warn(
          `[TikTools:quick-close] PATH=quick-close (silent retry) @${this.username} ` +
          `wsState=${ws.readyState} rawEventCount=${this.rawEventCount} ` +
          `hadAnyMessage=${hadAnyMessage} lastEvent=${lastEventType ?? "null"} ` +
          `connectedMs=${connectedMs} code=${code} reason="${reason}" — reconnecting in 30s`,
        );
        this._scheduleRetry(30_000, settle);
      } else {
        // Normal disconnect mid-stream → reconnect with backoff
        this.rateLimitBackoff = 60_000; // reset rate-limit backoff on normal flow
        console.warn(
          `[TikTools] WS closed (code=${code} reason="${reason}" packets=${this.rawEventCount}) ` +
          `@${this.username} — reconnecting in ${this.reconnectDelay / 1000}s`,
        );
        this._scheduleRetry(this.reconnectDelay, settle);
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 60_000);
      }
    });

    ws.on("error", (err: Error) => {
      console.error(`[TikTools] WS error @${this.username}: ${err?.message}`);
      if (!this.stopped) {
        this.emit("wsError", err);
      }
    });
  }

  // ── Event mapping ───────────────────────────────────────────────────────────

  private _handleEvent(msg: TikToolsRawEvent): void {
    const d = msg.data ?? {};
    const username: string =
      d.user?.nickname ??
      d.user?.uniqueId ??
      d.user?.unique_id ??
      d.user_unique_id ??
      "unknown";

    switch (msg.event) {
      case "chat":
        this.emit("chat", {
          username,
          comment: String(d.comment ?? ""),
        } satisfies TikToolsChatEvent);
        break;

      case "gift":
        this.emit("gift", {
          username,
          giftName: String(d.giftName ?? d.gift_name ?? "Gift"),
          coins: Number(d.diamondCount ?? d.diamond_count ?? 0),
          count: Number(d.repeatCount ?? d.repeat_count ?? 1),
          repeatEnd: Boolean(d.repeatEnd ?? d.repeat_end ?? true),
        } satisfies TikToolsGiftEvent);
        break;

      case "like":
        this.emit("like", {
          username,
          likeCount: Number(d.likeCount ?? d.like_count ?? 1),
          total: Number(d.totalLikeCount ?? d.total_like_count ?? 0),
        } satisfies TikToolsLikeEvent);
        break;

      case "follow":
        this.emit("social", { username, action: "follow" } satisfies TikToolsSocialEvent);
        break;

      case "share":
        this.emit("social", { username, action: "share" } satisfies TikToolsSocialEvent);
        break;

      case "member":
        this.emit("social", { username, action: "join" } satisfies TikToolsSocialEvent);
        break;

      case "roomUserSeq": {
        const count = Number(d.viewerCount ?? d.viewer_count ?? d.totalViewers ?? 0);
        if (count > 0) {
          this.emit("viewerCount", { count } satisfies TikToolsViewerCountEvent);
        }
        break;
      }

      case "roomInfo": {
        // tik.tools puts roomInfo metadata at the top level (no msg.data wrapper).
        // The event looks like: { event:"roomInfo", roomId:"...", uniqueId:"...", ... }
        // Viewer count arrives in later real-time events (member, share, etc.).
        // Emit with count=0 as a no-op placeholder so the pipeline stays consistent.
        const roomMsg = msg as any;
        const count = Number(
          roomMsg.viewerCount ?? roomMsg.viewer_count ??
          d.viewerCount ?? d.viewer_count ?? 0,
        );
        if (count > 0) {
          this.emit("viewerCount", { count } satisfies TikToolsViewerCountEvent);
        }
        console.log(
          `[TikTools] roomInfo @${this.username} roomId=${roomMsg.roomId ?? "?"} viewerCount=${count}`,
        );
        break;
      }

      // Unknown events are silently ignored
    }
  }

  private _isNotLiveError(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes("not live") ||
      m.includes("not_live") ||
      m.includes("offline") ||
      m.includes("no active") ||
      m.includes("room not found") ||
      m.includes("creator not found") ||
      m.includes("invalid creator") ||
      m.includes("creator_not_found") ||
      m.includes("not found") ||
      m.includes("no stream")
    );
  }

  private _scheduleRetry(delay: number, settle: () => void): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      if (!this.stopped) {
        void this._connectAttempt(settle);
      }
    }, delay);
  }

  stopConnection(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, "stopped");
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
