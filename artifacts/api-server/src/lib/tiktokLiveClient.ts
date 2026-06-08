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

function isRateLimitError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("429") || m.includes("rate limit") || m.includes("rate_limit");
}

/**
 * Returns true when the error means "user isn't live yet" (retriable with 30s polling).
 *
 * Covers our own messages AND the exact error strings thrown by tiktok-live-connector:
 *   - UserOfflineError: "The requested user isn't online :("  [status===4 from webcast API]
 *   - FetchIsLiveError: "Failed to retrieve Room ID from all sources."
 *   - Generic "not live" patterns from all 3 fallback routes (HTML, API, Euler)
 */
export function isNotLiveError(err: unknown): boolean {
  // The library emits { info, exception } via handleError() — accept both shapes.
  const asObj = err as any;
  const exception: unknown = asObj?.exception ?? err;
  const msg = (
    (exception instanceof Error ? exception.message : "") ||
    asObj?.info ||
    String(err)
  ).toLowerCase();

  return (
    msg.includes("isn't online")            || // UserOfflineError: "The requested user isn't online :("
    msg.includes("not currently streaming") || // our own message
    msg.includes("not started")             || // library: room not started
    msg.includes("no room id found")        || // library: no room for username
    msg.includes("start a tiktok live")     || // our own message
    msg.includes("not live")                || // generic
    msg.includes("status is not")           || // library: status check failed
    msg.includes("live has ended")          || // library: stream ended mid-session
    msg.includes("failed to retrieve room") || // FetchIsLiveError: all sources exhausted
    msg.includes("failed to get room")      || // library: room API error
    msg.includes("room not found")          || // library: no active room
    msg.includes("is offline")              || // library: user offline
    msg.includes("not online")                 // library: user not online
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
export interface TikTokLiveClientOptions {
  /**
   * Called before every reconnect attempt.
   * Return `true` to proceed, `false` to abort and stop the client.
   * Use this to guard reconnects against sessions that have been ended in the DB.
   */
  onBeforeReconnect?: () => Promise<boolean>;
}

export class TikTokLiveClient extends EventEmitter {
  readonly username: string;
  private stopped = false;
  private currentClient: InstanceType<typeof WebcastPushConnection> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 15_000;
  /** Last WebSocket URL host used — included in DISCONNECT log for traceability. */
  lastWsUrlHost: string | null = null;
  private onBeforeReconnect?: () => Promise<boolean>;

  constructor(username: string, options?: TikTokLiveClientOptions) {
    super();
    this.username = username.replace(/^@/, "").trim();
    this.onBeforeReconnect = options?.onBeforeReconnect;
  }

  /**
   * Start connecting.  Resolves when:
   *   A) WebSocket is connected and emitting events, OR
   *   B) User isn't live yet — "notLive" event fired, 30 s polling active.
   * Throws only on hard errors (network down, invalid username, etc.).
   */
  async connect(): Promise<void> {
    this.stopped = false;
    this.reconnectDelay = 15_000;
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

      // ── REQ-2: Catch-all interceptor — logs EVERY event the library fires ──
      // This is the definitive test: if nothing appears here after "connected",
      // the library itself is receiving zero decoded messages from TikTok.
      {
        const _origEmit = (client as any).emit.bind(client);
        const SKIP_NOISY = new Set(["decodedData", "websocketData"]);
        (client as any).emit = (event: string | symbol, ...args: unknown[]) => {
          const name = String(event);
          if (!SKIP_NOISY.has(name)) {
            // For disconnected, log the raw argument so we can see the actual shape
            if (name === "disconnected") {
              let raw = "undefined";
              try { raw = JSON.stringify(args[0]); } catch { raw = String(args[0]); }
              console.log(`[Pipeline:0] library.emit("disconnected") @${this.username} | raw arg: ${raw}`);
            } else {
              console.log(`[Pipeline:0] library.emit("${name}") @${this.username}`);
            }
          }
          return _origEmit(event, ...args);
        };
      }

      // ── Signing pipeline diagnostics ─────────────────────────────────────
      {
        const signApiUrl  = process.env.SIGN_API_URL ?? 'https://tiktok.eulerstream.com';
        const hasSignKey  = !!process.env.SIGN_API_KEY;
        console.log(
          `[TikTok:Signing] Provider: Eulerstream | endpoint: ${signApiUrl} | API key: ${hasSignKey ? 'SET' : 'NOT SET (anonymous tier)'}`,
        );

        const webClient = (client as any).webClient;
        if (typeof webClient?.fetchSignedWebSocketFromEuler === 'function') {
          let capturedWsUrl: string | null = null;
          const _originalSign = webClient.fetchSignedWebSocketFromEuler.bind(webClient);

          webClient.fetchSignedWebSocketFromEuler = async (opts: any) => {
            console.log(
              `[TikTok:Signing] → request  roomId=${opts?.roomId ?? '-'}  uniqueId=${opts?.uniqueId ?? '-'}`,
            );
            try {
              const result = await _originalSign(opts);
              let wsHost = '?';
              try { wsHost = new URL(result.wsUrl).hostname; } catch { wsHost = String(result.wsUrl ?? '').slice(0, 80); }
              capturedWsUrl = result.wsUrl ?? null;
              this.lastWsUrlHost = wsHost; // tracked for DISCONNECT log
              // Log the full ProtoMessageFetchResult so we can see all Eulerstream fields
              const fullLog: Record<string, unknown> = {
                wsHost,
                cursor: result.cursor ? `${String(result.cursor).slice(0, 30)}…` : 'ABSENT',
                internalExt: result.internalExt ? `${String(result.internalExt).slice(0, 40)}…` : 'absent',
                wsParamKeys: Object.keys(result.wsParams ?? {}),
                messageCount: result.messages?.length ?? 0,
              };
              console.log(`[TikTok:Signing] ← FULL result: ${JSON.stringify(fullLog)}`);
              return result;
            } catch (err: any) {
              console.error(
                `[TikTok:Signing] ← request FAILED: ${err?.message ?? String(err)} | httpStatus: ${err?.response?.status ?? 'n/a'}`,
              );
              throw err;
            }
          };

          // Log first raw WebSocket packet after the WS is established
          client.on('websocketConnected', (_wsClient: any) => {
            console.log(
              `[TikTok:WS] WebSocket open to TikTok | wsUrl host: ${capturedWsUrl ? (() => { try { return new URL(capturedWsUrl!).hostname; } catch { return capturedWsUrl!.slice(0, 60); } })() : '(unknown)'}`,
            );
            let firstPacket = true;
            client.on('websocketData', (data: any) => {
              if (!firstPacket) return;
              firstPacket = false;
              const size = data?.byteLength ?? data?.length ?? '?';
              console.log(`[TikTok:WS] First raw WebSocket packet from TikTok: ${size} bytes`);
            });
          });
        } else {
          console.warn('[TikTok:Signing] webClient.fetchSignedWebSocketFromEuler not found — cannot wrap signing call');
        }
      }

      // ── Connection lifecycle ──────────────────────────────────────────────

      client.on("connected", (state: any) => {
        console.log(
          `[TikTok] ✓ Connected to @${this.username} LIVE (roomId: ${state?.roomId ?? "?"})`,
        );
        this.reconnectDelay = 15_000; // reset on success
        settle();
        this.emit("connected");
      });

      client.on("disconnected", (wsCodeOrEvent?: any) => {
        // The library may pass a number OR a CloseEvent-shaped object depending on version.
        // Log the raw payload first so we can see the exact shape.
        let rawPayload = "undefined";
        try { rawPayload = JSON.stringify(wsCodeOrEvent); } catch { rawPayload = String(wsCodeOrEvent); }

        // Extract numeric close code from whatever shape is passed
        let code: number;
        let reason = "";
        if (typeof wsCodeOrEvent === "number") {
          code = wsCodeOrEvent;
        } else if (wsCodeOrEvent !== null && typeof wsCodeOrEvent === "object") {
          // CloseEvent: { code, reason, wasClean }
          // Library object: { disconnectReason, disconnectReasonString }
          // Fallback to 1006 if none of the known fields are numeric
          const c =
            wsCodeOrEvent.code ??
            wsCodeOrEvent.disconnectReason ??
            wsCodeOrEvent.statusCode ??
            wsCodeOrEvent.status;
          code = typeof c === "number" ? c : 1006;
          reason =
            wsCodeOrEvent.reason ??
            wsCodeOrEvent.disconnectReasonString ??
            wsCodeOrEvent.message ??
            "";
        } else {
          code = 1006;
        }

        const codeExplain: Record<number, string> = {
          1000: "normal closure",
          1001: "going away",
          1006: "abnormal closure — no close frame sent (proxy/server dropped, rate limit, or keepalive timeout)",
          1011: "server error",
          1012: "server restart",
          1013: "try again later (rate limit / server overload)",
          4000: "TikTok: stream ended",
          4004: "TikTok: room not found",
        };
        const explain = codeExplain[code] ?? `unknown code ${code}`;
        const reasonStr = reason ? ` | reason="${reason}"` : "";

        console.warn(
          `[Pipeline:DISCONNECT] @${this.username} | code=${code} (${explain})${reasonStr}` +
          ` | rawPacketsReceived=${rawEventCount}` +
          ` | wsUrl=${this.lastWsUrlHost ?? "unknown"}` +
          ` | rawPayload=${rawPayload}`,
        );
        this.currentClient = null;
        this.emit("disconnected", code);
        settle(); // resolve the promise if not yet done
        if (!this.stopped) {
          const isEnterRoomRejection = reason.includes("im_enter_room");
          if (isEnterRoomRejection && rawEventCount === 0) {
            // Zero raw packets + im_enter_room = TikTok refused room entry before
            // sending any data. Diagnostic evidence (2026-06-08): this occurs when
            // the user is offline/not streaming — Eulerstream returns cursor="0"
            // and TikTok's WebSocket closes immediately after the enter_room frame.
            // Treat identically to "not live": emit notLive and poll every 30 s.
            const notLiveMsg =
              `@${this.username} is not currently streaming on TikTok LIVE. ` +
              `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
            console.log(
              `[TikTok] im_enter_room rejection + 0 packets @${this.username} — ` +
              `user is offline → emitting notLive, polling in 30 s`,
            );
            this.emit("notLive", { username: this.username, message: notLiveMsg });
            this._scheduleRetry(30_000, /* fullConnect */ true);
          } else if (isEnterRoomRejection && rawEventCount > 0) {
            // Had live packets then got kicked with im_enter_room — Eulerstream
            // session/cookie pool exhausted mid-stream. Back off 120 s.
            console.warn(
              `[TikTok] im_enter_room rejection after ${rawEventCount} packet(s) @${this.username} — ` +
              `Eulerstream pool exhausted. Backing off 120 s.`,
            );
            this._scheduleRetry(120_000, /* fullConnect */ false);
          } else {
            this._scheduleRetry(this.reconnectDelay, /* fullConnect */ false);
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 60_000);
          }
        }
      });

      client.on("error", (errPayload: any) => {
        // The library's handleError() emits { info: string, exception: Error }.
        // It also re-throws, so .catch() will fire too — settle() here prevents
        // double-handling by marking the promise resolved first.
        const exception: any = errPayload?.exception ?? errPayload;
        const msg: string = (
          (exception instanceof Error ? exception.message : "") ||
          errPayload?.info ||
          String(errPayload)
        );
        console.log(`[TikTok] on("error") for @${this.username}: ${msg}`);
        if (isNotLiveError(errPayload)) {
          const notLiveMsg =
            `@${this.username} is not currently streaming on TikTok LIVE. ` +
            `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
          console.log(`[TikTok] @${this.username} not live — polling in 30 s`);
          this.emit("notLive", { username: this.username, message: notLiveMsg });
          this._scheduleRetry(30_000, /* fullConnect */ true);
        } else if (isRateLimitError(msg)) {
          // Rate limit — force a 60 s cooling-off period before retrying.
          // Anonymous Eulerstream tier has a per-minute connection quota; retrying
          // in 15 s would immediately trigger it again.
          console.warn(`[TikTok] Rate limit for @${this.username} — backing off 60 s`);
          this.reconnectDelay = 60_000;
          this.emit("wsError", exception instanceof Error ? exception : new Error(msg));
        } else {
          console.error(`[TikTok] Error for @${this.username}: ${msg}`);
          this.emit("wsError", exception instanceof Error ? exception : new Error(msg));
        }
        settle(); // marks promise resolved so .catch() below becomes a no-op
      });

      // ── Raw event tracing (fires for every decoded TikTok message) ───────
      // REQ-1/8/9: If this never fires after connect, TikTok sent no data
      // packets before the WebSocket closed — events stop at Stage 1 (WS level).
      let rawEventCount = 0;
      client.on("decodedData", (type: string, data: any) => {
        rawEventCount++;
        if (rawEventCount === 1) {
          // REQ-8: Log the full first raw packet from TikTok
          let preview = "";
          try { preview = JSON.stringify(data).slice(0, 200); } catch { preview = String(data).slice(0, 200); }
          console.log(
            `[Pipeline:1] FIRST raw packet from TikTok | type=${type} | @${this.username} | data=${preview}`,
          );
        } else if (rawEventCount <= 10 || rawEventCount % 50 === 0) {
          console.log(`[Pipeline:1] RawEvent #${rawEventCount} type=${type} @${this.username}`);
        }
      });

      // ── Live events ───────────────────────────────────────────────────────

      client.on("chat", (d: any) => {
        // v2 schema: primary field is "comment"; fallback to "content" in case of schema changes.
        const comment: string = d?.comment ?? d?.content ?? "";
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        console.log(`[Pipeline:2a] library→chat @${this.username} | user=${username} | text="${comment.slice(0, 80)}"`);
        if (!comment.trim()) {
          console.log(`[Pipeline:2a] chat DROPPED — empty comment from ${username}`);
          return;
        }
        // REQ-9: first comment event
        console.log(`[Pipeline:2b] this.emit("chat") → connector | user=${username} | text="${comment.slice(0, 80)}"`);
        this.emit("chat", { username, comment } satisfies TikTokChatEvent);
      });

      client.on("gift", (d: any) => {
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        const giftName = d?.giftName ?? d?.gift?.name ?? "Gift";
        const coins = Number(d?.diamondCount ?? d?.gift?.diamondCount ?? 0);
        console.log(`[Pipeline:2a] library→gift @${this.username} | user=${username} | gift=${giftName} coins=${coins}`);
        console.log(`[Pipeline:2b] this.emit("gift") → connector`);
        this.emit("gift", {
          username,
          giftName,
          coins,
          count: Number(d?.repeatCount ?? 1),
          repeatEnd: !!d?.repeatEnd,
        } satisfies TikTokGiftEvent);
      });

      client.on("like", (d: any) => {
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        const likeCount = Number(d?.likeCount ?? 0);
        console.log(`[Pipeline:2a] library→like @${this.username} | user=${username} | count=${likeCount}`);
        console.log(`[Pipeline:2b] this.emit("like") → connector`);
        this.emit("like", {
          username,
          likeCount,
          total: Number(d?.totalLikeCount ?? 0),
        } satisfies TikTokLikeEvent);
      });

      // The library emits "follow" and "share" as separate events (WebcastEvent.FOLLOW /
      // WebcastEvent.SHARE) — NOT through "social". We listen to all three.
      client.on("follow", (d: any) => {
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        console.log(`[Pipeline:2a] library→follow @${this.username} | user=${username}`);
        console.log(`[Pipeline:2b] this.emit("social/follow") → connector`);
        this.emit("social", { username, action: "follow" } satisfies TikTokSocialEvent);
      });

      client.on("share", (d: any) => {
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        console.log(`[Pipeline:2a] library→share @${this.username} | user=${username}`);
        console.log(`[Pipeline:2b] this.emit("social/share") → connector`);
        this.emit("social", { username, action: "share" } satisfies TikTokSocialEvent);
      });

      client.on("social", (d: any) => {
        // Fallback for any "social" events not routed to "follow"/"share" above.
        const dt: string = (d?.displayType ?? d?.common?.displayText?.displayType ?? "").toLowerCase();
        const action: TikTokSocialEvent["action"] = dt.includes("share") ? "share" : "follow";
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        console.log(`[Pipeline:2a] library→social(fallback) @${this.username} | user=${username} | action=${action}`);
        console.log(`[Pipeline:2b] this.emit("social/${action}") → connector`);
        this.emit("social", { username, action } satisfies TikTokSocialEvent);
      });

      client.on("member", (d: any) => {
        // "member" = viewer joined the room
        const username = d?.uniqueId ?? d?.user?.uniqueId ?? d?.userDetails?.user?.uniqueId ?? "unknown";
        console.log(`[Pipeline:2a] library→member(join) @${this.username} | user=${username}`);
        this.emit("social", { username, action: "join" } satisfies TikTokSocialEvent);
      });

      client.on("roomUser", (d: any) => {
        const count = Number(d?.viewerCount ?? d?.totalUserCount ?? 0);
        console.log(`[Pipeline:2a] library→roomUser @${this.username} | viewers=${count}`);
        if (count > 0) {
          console.log(`[Pipeline:2b] this.emit("viewerCount") → connector`);
          this.emit("viewerCount", { count } satisfies TikTokViewerCountEvent);
        }
      });

      // Initiate the connection.
      client
        .connect()
        .then(() => settle())
        .catch((err: any) => {
          // The library calls handleError() (→ emits 'error' event) AND rethrows.
          // on("error") fires first and calls settle(), so by the time we get here
          // settled is already true. Early-exit to avoid double-handling.
          if (settled) return;

          // This path handles errors that bypass handleError() (e.g. promise
          // rejections from setupWebsocket that don't go through the error event).
          const msg: string = err?.message ?? String(err);
          if (isNotLiveError(err)) {
            const notLiveMsg =
              `@${this.username} is not currently streaming on TikTok LIVE. ` +
              `Start a TikTok LIVE from your phone — the app will connect automatically within 30 seconds.`;
            console.log(`[TikTok] @${this.username} not live (.catch: ${msg}) — polling in 30 s`);
            this.emit("notLive", { username: this.username, message: notLiveMsg });
            this._scheduleRetry(30_000, /* fullConnect */ true);
          } else {
            console.error(`[TikTok] connect() rejected for @${this.username}: ${msg}`);
            this.emit("wsError", new Error(msg));
            if (!this.stopped) {
              this._scheduleRetry(this.reconnectDelay, /* fullConnect */ false);
              this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 60_000);
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
      // Guard: check if this session should still be running before reconnecting.
      // Prevents ghost connectors for ended/deleted sessions from reconnecting
      // indefinitely even after the DB guard on the initial start path.
      if (this.onBeforeReconnect) {
        let shouldContinue = false;
        try {
          shouldContinue = await this.onBeforeReconnect();
        } catch (err: any) {
          console.error(`[TikTok] onBeforeReconnect check failed for @${this.username}: ${err?.message} — stopping`);
          this.stopConnection();
          return;
        }
        if (!shouldContinue) {
          console.log(`[TikTok] onBeforeReconnect returned false for @${this.username} — session ended, stopping reconnect loop`);
          this.stopConnection();
          return;
        }
      }
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

  /**
   * Stop all connections and prevent any further reconnects.
   * This is the canonical "stop" method — sets stopped=true so the internal
   * reconnect timer never fires again after this call.
   */
  stopConnection(): void {
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
    console.log(`[TikTok] stopConnection() called — @${this.username} fully stopped`);
  }

  /** @deprecated Use stopConnection() instead. */
  disconnect(): void {
    this.stopConnection();
  }
}
