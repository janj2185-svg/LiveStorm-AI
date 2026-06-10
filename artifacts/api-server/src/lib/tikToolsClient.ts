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
  userId: string;
  comment: string;
}
export interface TikToolsGiftEvent {
  username: string;
  userId: string;
  giftName: string;
  coins: number;
  count: number;
  repeatEnd: boolean;
}
export interface TikToolsLikeEvent {
  username: string;
  userId: string;
  likeCount: number;
  total: number;
}
export interface TikToolsSocialEvent {
  username: string;
  userId: string;
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
  /** roomId received from the roomInfo WS event — used to reconnect by roomId if available. */
  private cachedRoomId: string | null = null;
  /** Count of MAPPED viewer events (chat/gift/like/member/follow/share) in the current connection. */
  private mappedEventCount = 0;

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
              max_websockets: 5,
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
        // Decode and log the JWT payload so we can verify allowedCreators and
        // maxWebSockets without ever logging the token string itself.
        try {
          const payloadB64 = token.split(".")[1] ?? "";
          const payload = JSON.parse(
            Buffer.from(payloadB64, "base64url").toString("utf8"),
          ) as any;
          console.log(
            `[TikTools:jwt-payload] @${this.username} ` +
            `allowedCreators=${JSON.stringify(payload.allowedCreators ?? [])} ` +
            `maxWebSockets=${payload.maxWebSockets ?? "?"} ` +
            `keyHash=${payload.keyHash ?? "?"} ` +
            `exp=${new Date((payload.exp ?? 0) * 1000).toISOString()}`,
          );
        } catch {
          /* ignore decode errors — token is still valid */
        }
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

    // ── 1.5. Pre-flight room_info check ──────────────────────────────────────
    // Query /webcast/room_info before opening the WebSocket so we can:
    //   A) Log the exact roomId tik.tools will connect to
    //   B) Detect "not found" early (wrong username / plan restriction) before
    //      burning a precious WS session slot
    // This call is advisory — we never block the WS attempt on failure (fail open).
    await this._fetchRoomInfo(apiKey);

    // ── 2. Connect WebSocket ──────────────────────────────────────────────────
    this.rawEventCount = 0;
    this.mappedEventCount = 0;
    // tik.tools requires uniqueId — roomId alone returns 4400 "Missing uniqueId parameter".
    // We also pass roomId as an optional hint so tik.tools can bypass its own username lookup
    // and connect directly to the known room (avoids REST 404 inconsistency).
    const wsUrl = this.cachedRoomId
      ? `${WS_BASE}?uniqueId=${encodeURIComponent(this.username)}&roomId=${encodeURIComponent(this.cachedRoomId)}&jwtKey=${encodeURIComponent(token)}`
      : `${WS_BASE}?uniqueId=${encodeURIComponent(this.username)}&jwtKey=${encodeURIComponent(token)}`;
    // Log exact WS URL with jwtKey masked (first 12 chars + "...")
    const maskedUrl = wsUrl.replace(
      /jwtKey=[^&]*/,
      `jwtKey=${token.slice(0, 12)}...[masked]`,
    );
    console.log(
      `[TikTools:ws-url] @${this.username} connecting${this.cachedRoomId ? ` with roomId hint ${this.cachedRoomId}` : ""}: ${maskedUrl}`,
    );
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
    // Watchdog: if connected for 3 min but zero MAPPED events (chat/gift/like/member) arrive,
    // the connection is alive but delivering no viewer data (only pings + system init events).
    // Force a reconnect so tik.tools re-establishes its event pipeline.
    let mappedEventsTimer: ReturnType<typeof setTimeout> | null = null;
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

      // Mapped-events watchdog: if we receive packets (pings, system events) but zero
      // MAPPED viewer events (chat/gift/like/member/follow/share) for 3 minutes, the
      // tik.tools pipeline is connected but not delivering live data. Force reconnect
      // so tik.tools re-establishes its event subscription for this room.
      mappedEventsTimer = setTimeout(() => {
        if (this.mappedEventCount === 0 && !this.stopped) {
          console.warn(
            `[TikTools:no-events] @${this.username} — 3 min connected, 0 viewer events received. ` +
            `rawEventCount=${this.rawEventCount} cachedRoomId=${this.cachedRoomId ?? "none"} — ` +
            `forcing reconnect to re-establish tik.tools event pipeline.`,
          );
          ws.close(1000, "no_mapped_events");
        }
      }, 3 * 60_000);
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

      // Log event type + first 120 chars of payload (no full avatar URLs)
      const shortPreview = dataPreview.slice(0, 120) + (dataPreview.length > 120 ? "…" : "");
      if (msg.event !== "ping") {
        console.log(
          `[TikTools:raw] @${this.username} event="${msg.event ?? "(none)"}" mapped=${mapped} | ${shortPreview}`,
        );
      }

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

      // Track mapped viewer events so the watchdog can detect a stale pipeline
      if (mapped && msg.event !== "roomInfo" && msg.event !== "ping" && msg.event !== "roomUserSeq") {
        this.mappedEventCount++;
        if (this.mappedEventCount === 1) {
          console.log(`[TikTools:first-viewer-event] @${this.username} — FIRST viewer event: ${msg.event}`);
        }
      }

      this._handleEvent(msg);
    });

    ws.on("close", (code: number, reasonBuf: Buffer) => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (mappedEventsTimer) {
        clearTimeout(mappedEventsTimer);
        mappedEventsTimer = null;
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
      } else if (reason === "no_mapped_events") {
        // Watchdog triggered: 3 min connected but zero viewer events. Reconnect.
        // Use a shorter delay so we re-subscribe quickly while the stream is still live.
        console.warn(
          `[TikTools:no-events] WS closed after 3 min with no viewer events @${this.username} ` +
          `rawEventCount=${this.rawEventCount} — reconnecting in 15s`,
        );
        this._scheduleRetry(15_000, settle);
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
      } else if (code === 4404) {
        // tik.tools application close: creator room not found or not live.
        // Reason text: "Creator is not currently live"
        // This is tik.tools' authoritative signal after querying TikTok's API.
        // Unlike a generic transient close, 4404 means tik.tools explicitly could
        // not find an active room for this uniqueId.
        //
        // Causes:
        //   1. Wrong TikTok username (most common)
        //   2. tik.tools plan restriction on this creator/region
        //   3. Creator ended LIVE between last check and now
        //
        // → Emit notLive so the UI shows an actionable error (not silent retry),
        //   then retry in 30s in case the creator goes live again.
        this.rateLimitBackoff = 60_000;
        const notLiveMsg =
          `tik.tools cannot find an active TikTok LIVE for @${this.username}. ` +
          `If the creator is live, verify the TikTok username is correct and that ` +
          `tik.tools supports this account (community plan may have creator restrictions). ` +
          `Retrying automatically every 30 seconds.`;
        console.warn(
          `[TikTools:4404] code=4404 @${this.username} reason="${reason}" ` +
          `connectedMs=${connectedMs} hadAnyMessage=${hadAnyMessage} ` +
          `rawEventCount=${this.rawEventCount} — ` +
          `tik.tools cannot resolve room; emitting notLive + retrying in 30s`,
        );
        this.emit("notLive", { username: this.username, message: notLiveMsg });
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

    // Stable numeric TikTok user ID — present in all user-generated events
    const userId: string = String(
      d.user?.id ?? d.user?.userId ?? d.user?.user_id ?? ""
    );

    switch (msg.event) {
      case "chat":
        this.emit("chat", {
          username,
          userId,
          comment: String(d.comment ?? ""),
        } satisfies TikToolsChatEvent);
        break;

      case "gift":
        this.emit("gift", {
          username,
          userId,
          giftName: String(d.giftName ?? d.gift_name ?? "Gift"),
          coins: Number(d.diamondCount ?? d.diamond_count ?? 0),
          count: Number(d.repeatCount ?? d.repeat_count ?? 1),
          repeatEnd: Boolean(d.repeatEnd ?? d.repeat_end ?? true),
        } satisfies TikToolsGiftEvent);
        break;

      case "like":
        this.emit("like", {
          username,
          userId,
          likeCount: Number(d.likeCount ?? d.like_count ?? 1),
          total: Number(d.totalLikeCount ?? d.total_like_count ?? 0),
        } satisfies TikToolsLikeEvent);
        break;

      case "follow":
        this.emit("social", { username, userId, action: "follow" } satisfies TikToolsSocialEvent);
        break;

      case "share":
        this.emit("social", { username, userId, action: "share" } satisfies TikToolsSocialEvent);
        break;

      case "member":
        this.emit("social", { username, userId, action: "join" } satisfies TikToolsSocialEvent);
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
        // Cache the roomId from the WS-level roomInfo event. On the next reconnect
        // we'll connect via ?roomId=... which bypasses tik.tools' REST username lookup.
        const wsRoomId: string | undefined = roomMsg.roomId ?? roomMsg.room_id;
        if (wsRoomId && wsRoomId !== "unknown") {
          this.cachedRoomId = wsRoomId;
        }
        console.log(
          `[TikTools] roomInfo @${this.username} roomId=${roomMsg.roomId ?? "?"} viewerCount=${count}` +
          (wsRoomId ? ` (cached for roomId-based reconnect)` : ""),
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

  /**
   * Pre-flight room check — queries tik.tools POST /webcast/room_id before opening
   * the WebSocket to log room state (alive, cached) and cache the roomId for reconnects.
   *
   * NOTE: GET /webcast/room_info (the old endpoint) always returns 404 for active rooms.
   * The correct endpoint is POST /webcast/room_id with { unique_id: username }.
   *
   * Never throws and never blocks the WS attempt — fail open on any error.
   */
  private async _fetchRoomInfo(apiKey: string): Promise<void> {
    const url = `${API_BASE}/webcast/room_id?apiKey=${encodeURIComponent(apiKey)}`;
    console.log(`[TikTools:room_info] @${this.username} → POST /webcast/room_id unique_id="${this.username}"`);
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unique_id: this.username }),
        signal: AbortSignal.timeout(8_000),
      });
      const rawText = await resp.text();
      let j: any;
      try { j = JSON.parse(rawText); } catch { j = null; }

      // Always log HTTP status + full raw body so nothing is hidden
      console.log(
        `[TikTools:room_info] @${this.username} → HTTP ${resp.status} body=${rawText.slice(0, 500)}`,
      );

      if (!j || j?.status_code !== 0 || !j?.data) {
        // tik.tools cannot resolve this creator to a room at this moment.
        console.warn(
          `[TikTools:room_info] @${this.username} → NOT FOUND ` +
          `(HTTP ${resp.status} status_code=${j?.status_code ?? "?"} error="${j?.error ?? j?.message ?? "n/a"}") — ` +
          `WS will still attempt connection (fail open)`,
        );
        return;
      }

      const data = j.data;
      const roomId: string = String(data.room_id ?? data.roomId ?? "unknown");
      const alive: boolean = Boolean(data.alive ?? false);
      const cached: boolean = Boolean(data.cached ?? false);

      console.log(
        `[TikTools:room_info] @${this.username} → FOUND ` +
        `roomId=${roomId} alive=${alive} cached=${cached}`,
      );

      // Cache roomId for roomId-based reconnects (bypasses username lookup on retry)
      if (roomId && roomId !== "unknown" && !this.cachedRoomId) {
        this.cachedRoomId = roomId;
        console.log(`[TikTools:room_info] @${this.username} → cached roomId=${roomId} for reconnect`);
      }

      if (!alive) {
        console.warn(
          `[TikTools:room_info] @${this.username} → alive=false — ` +
          `tik.tools pipeline not yet active for this room. ` +
          `WS will connect; viewer events may flow once the pipeline activates.`,
        );
      }
    } catch (err: any) {
      // Network error or timeout — non-fatal
      console.warn(
        `[TikTools:room_info] @${this.username} → fetch error: ${err?.message ?? String(err)} ` +
        `(non-fatal — continuing to WS connect)`,
      );
    }
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
