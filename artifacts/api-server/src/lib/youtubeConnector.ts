/**
 * YouTube Live Connector
 *
 * Polls the YouTube Live Chat API every 5s (or the server-specified interval).
 * Maps YouTube events to the same TikTokEvent shape used by the orchestrator,
 * so the AI host, gamification, and analytics pipelines need no changes.
 *
 * Requirements:
 *   GOOGLE_CLIENT_ID     — Google OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET — Google OAuth 2.0 client secret
 *   YOUTUBE_REDIRECT_URI — Full callback URL registered in Google Cloud Console
 */

import type { Server as SocketServer } from "socket.io";
import { OAuth2Client } from "google-auth-library";
import { ingestLiveEvent } from "./socketServer.js";
import type { TikTokEvent } from "./tiktokSimulator.js";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── In-memory connector registry ──────────────────────────────────────────────

interface YouTubeConnectorEntry {
  stop: () => void;
  liveChatId: string | null;
  viewerCount: number | null;
}

const activeYouTubeConnectors = new Map<number, YouTubeConnectorEntry>();

const POLL_INTERVAL_MS = 5000;
const MAX_SEEN_MSGS = 5000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeYtEvent(
  type: TikTokEvent["type"],
  sessionId: number,
  username: string | undefined,
  data: Record<string, unknown>,
): TikTokEvent {
  return { type, platform: "youtube", sessionId, username, data, timestamp: Date.now() };
}

function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI,
  );
}

// ── Public: OAuth helpers ─────────────────────────────────────────────────────

export function isYouTubeConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.YOUTUBE_REDIRECT_URI
  );
}

/**
 * Generate an OAuth URL that encodes the user's Clerk ID in the `state` param
 * so the unauthenticated /callback route can unambiguously identify the user.
 */
export function getYouTubeAuthUrl(clerkUserId: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
    prompt: "consent",
    state: clerkUserId,
  });
}

export async function exchangeYouTubeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  channelId: string | null;
  channelName: string | null;
}> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error("No access_token returned from Google OAuth");
  }

  let channelId: string | null = null;
  let channelName: string | null = null;

  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as any;
      const ch = data.items?.[0];
      channelId = ch?.id ?? null;
      channelName = ch?.snippet?.title ?? null;
    }
  } catch {
    // Non-fatal
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? "",
    channelId,
    channelName,
  };
}

// ── Internal: token refresh ───────────────────────────────────────────────────

async function refreshToken(refreshTokenStr: string): Promise<string | null> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshTokenStr });
  try {
    const { credentials } = await client.refreshAccessToken();
    return credentials.access_token ?? null;
  } catch {
    return null;
  }
}

// ── Internal: YouTube API calls ───────────────────────────────────────────────

interface LiveBroadcastInfo {
  liveChatId: string | null;
  viewerCount: number | null;
}

async function fetchActiveBroadcastInfo(accessToken: string): Promise<LiveBroadcastInfo> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,statistics&broadcastStatus=active&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { liveChatId: null, viewerCount: null };
    const data = (await res.json()) as any;
    const item = data.items?.[0];
    return {
      liveChatId: item?.snippet?.liveChatId ?? null,
      viewerCount: item?.statistics?.concurrentViewers != null
        ? parseInt(item.statistics.concurrentViewers, 10)
        : null,
    };
  } catch {
    return { liveChatId: null, viewerCount: null };
  }
}

/** @deprecated Use fetchActiveBroadcastInfo — kept for a single call site */
async function fetchActiveLiveChatId(accessToken: string): Promise<string | null> {
  return (await fetchActiveBroadcastInfo(accessToken)).liveChatId;
}

interface YTMessage {
  id: string;
  snippet: {
    type: string;
    displayMessage: string;
    superChatDetails?: { amountMicros: string };
  };
  authorDetails: {
    displayName: string;
    channelId: string;
  };
}

async function fetchChatMessages(
  liveChatId: string,
  accessToken: string,
  pageToken?: string,
): Promise<{
  messages: YTMessage[];
  nextPageToken?: string;
  pollingIntervalMs: number;
}> {
  let url =
    `https://www.googleapis.com/youtube/v3/liveChatMessages` +
    `?liveChatId=${encodeURIComponent(liveChatId)}&part=snippet,authorDetails&maxResults=200`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.status.toString());
    throw new Error(`YT Chat API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as any;
  return {
    messages: data.items ?? [],
    nextPageToken: data.nextPageToken,
    pollingIntervalMs: Math.max(data.pollingIntervalMillis ?? POLL_INTERVAL_MS, POLL_INTERVAL_MS),
  };
}

// ── Public: connector lifecycle ───────────────────────────────────────────────

export async function startYouTubeConnector(
  io: SocketServer,
  sessionId: number,
  userId: number,
  accessToken: string,
  refreshTokenStr: string,
): Promise<{ ok: boolean; error?: string }> {
  if (activeYouTubeConnectors.has(sessionId)) {
    console.log(`[YouTube] Session ${sessionId} already has a YouTube connector`);
    return { ok: true };
  }

  const roomId = `session:${sessionId}`;
  let stopped = false;
  let currentToken = accessToken;
  let pageToken: string | undefined;
  let liveChatId: string | null = null;
  let pollingTimer: ReturnType<typeof setTimeout> | null = null;
  const seenIds = new Set<string>();

  let viewerCount: number | null = null;

  function setEntry(chatId: string | null, vc: number | null) {
    liveChatId = chatId;
    viewerCount = vc;
    activeYouTubeConnectors.set(sessionId, {
      stop: () => {
        stopped = true;
        if (pollingTimer) clearTimeout(pollingTimer);
      },
      liveChatId: chatId,
      viewerCount: vc,
    });
  }

  // Register entry immediately to prevent duplicate starts
  setEntry(null, null);

  // Try to find an active broadcast
  let info = await fetchActiveBroadcastInfo(currentToken);
  if (!info.liveChatId) {
    const newToken = await refreshToken(refreshTokenStr);
    if (newToken) {
      currentToken = newToken;
      info = await fetchActiveBroadcastInfo(currentToken);
    }
  }

  if (info.liveChatId) {
    console.log(`[YouTube] ✓ Live chat found for session ${sessionId}: ${info.liveChatId} viewers=${info.viewerCount ?? "?"}`);
    setEntry(info.liveChatId, info.viewerCount);
    io.to(roomId).emit("youtube:status", { connected: true, liveChatId: info.liveChatId, viewerCount: info.viewerCount });
  } else {
    console.log(`[YouTube] No active broadcast for session ${sessionId} — will poll every ${POLL_INTERVAL_MS}ms`);
    io.to(roomId).emit("youtube:status", { connected: true, liveChatId: null, viewerCount: null, waiting: true });
  }

  async function poll() {
    if (stopped) return;

    try {
      // (Re-)discover live chat if not yet found, or refresh viewer count if already connected
      if (!liveChatId) {
        const broadcastInfo = await fetchActiveBroadcastInfo(currentToken);
        if (broadcastInfo.liveChatId) {
          console.log(`[YouTube] Broadcast detected for session ${sessionId}: ${broadcastInfo.liveChatId}`);
          setEntry(broadcastInfo.liveChatId, broadcastInfo.viewerCount);
          io.to(roomId).emit("youtube:status", { connected: true, liveChatId: broadcastInfo.liveChatId, viewerCount: broadcastInfo.viewerCount });
        }
      } else {
        // Refresh viewer count every ~30s (every 6 polls at 5s cadence)
        if (seenIds.size % 6 === 0) {
          const broadcastInfo = await fetchActiveBroadcastInfo(currentToken);
          if (broadcastInfo.viewerCount !== null && broadcastInfo.viewerCount !== viewerCount) {
            setEntry(liveChatId, broadcastInfo.viewerCount);
          }
        }
      }

      if (liveChatId) {
        let result: Awaited<ReturnType<typeof fetchChatMessages>>;

        try {
          result = await fetchChatMessages(liveChatId, currentToken, pageToken);
        } catch (err: any) {
          if (err.message.includes("401") || err.message.includes("403")) {
            const newToken = await refreshToken(refreshTokenStr);
            if (newToken) {
              currentToken = newToken;
              await db
                .update(usersTable)
                .set({ youtubeAccessToken: newToken })
                .where(eq(usersTable.id, userId))
                .catch(() => {});
              result = await fetchChatMessages(liveChatId, currentToken, pageToken);
            } else {
              console.error(`[YouTube] Token refresh failed for session ${sessionId}`);
              if (!stopped) pollingTimer = setTimeout(poll, POLL_INTERVAL_MS * 2);
              return;
            }
          } else {
            throw err;
          }
        }

        pageToken = result.nextPageToken;
        const nextPoll = result.pollingIntervalMs;

        for (const msg of result.messages) {
          if (seenIds.has(msg.id)) continue;
          seenIds.add(msg.id);

          const username = msg.authorDetails.displayName;
          const uid = msg.authorDetails.channelId;

          switch (msg.snippet.type) {
            case "textMessageEvent":
              console.log(`[YouTube:chat] session=${sessionId} user=${username}: "${msg.snippet.displayMessage.slice(0, 80)}"`);
              void ingestLiveEvent(
                makeYtEvent("comment", sessionId, username, {
                  text: msg.snippet.displayMessage,
                  userId: uid,
                  platform: "youtube",
                }),
                userId,
              );
              break;

            case "superChatEvent": {
              const micros = parseInt(msg.snippet.superChatDetails?.amountMicros ?? "0", 10);
              const coins = Math.max(1, Math.round(micros / 10000));
              console.log(`[YouTube:superchat] session=${sessionId} user=${username} coins=${coins}`);
              void ingestLiveEvent(
                makeYtEvent("gift", sessionId, username, {
                  giftName: "Super Chat",
                  coins,
                  count: 1,
                  userId: uid,
                  platform: "youtube",
                }),
                userId,
              );
              break;
            }

            case "memberMilestoneChatEvent":
            case "newSponsorEvent":
              console.log(`[YouTube:member] session=${sessionId} user=${username}`);
              void ingestLiveEvent(
                makeYtEvent("follow", sessionId, username, { userId: uid, platform: "youtube" }),
                userId,
              );
              break;

            default:
              break;
          }
        }

        // Trim seen-IDs set to avoid unbounded memory growth
        if (seenIds.size > MAX_SEEN_MSGS) {
          const arr = Array.from(seenIds);
          arr.slice(0, MAX_SEEN_MSGS / 2).forEach((id) => seenIds.delete(id));
        }

        if (!stopped) pollingTimer = setTimeout(poll, nextPoll);
        return;
      }
    } catch (err: any) {
      console.error(`[YouTube] Poll error session=${sessionId}: ${err.message}`);
    }

    if (!stopped) pollingTimer = setTimeout(poll, POLL_INTERVAL_MS * 2);
  }

  void poll();

  return { ok: true };
}

export function stopYouTubeConnector(sessionId: number): void {
  const entry = activeYouTubeConnectors.get(sessionId);
  if (entry) {
    entry.stop();
    activeYouTubeConnectors.delete(sessionId);
    console.log(`[YouTube] Connector stopped for session ${sessionId}`);
  }
}

export function getYouTubeConnectorState(
  sessionId: number,
): { active: boolean; liveChatId: string | null; viewerCount: number | null } | null {
  const entry = activeYouTubeConnectors.get(sessionId);
  if (!entry) return null;
  return { active: true, liveChatId: entry.liveChatId, viewerCount: entry.viewerCount };
}
