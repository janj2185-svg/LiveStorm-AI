import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

export interface ObsLeaderboardEntry {
  rank: number;
  tiktokViewerId: string;
  viewerName: string;
  totalXp: number;
  giftCount: number;
  level: number;
}

export interface ObsSessionState {
  id: number;
  totalGifts: number;
  totalFollowers: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  peakViewers: number;
  startedAt: string;
}

export interface ObsBossBattle {
  id: number;
  bossName: string;
  bossEmoji: string;
  currentHp: number;
  maxHp: number;
}

export interface ObsAttack {
  battleId: number;
  viewerName: string;
  attackType: string;
  damage: number;
  currentHp: number;
  timestamp: number;
}

export interface ObsOverlayState {
  streamerId: number;
  sessionId: number | null;
  session: ObsSessionState | null;
  activeBossBattle: ObsBossBattle | null;
  leaderboard: ObsLeaderboardEntry[];
}

export interface LiveEvent {
  type: string;
  data: Record<string, unknown>;
  sessionId: number;
  timestamp: string;
}

export function useObsSocket(streamerId: number | null, token: string | null) {
  const [connected, setConnected] = useState(false);
  const [overlayState, setOverlayState] = useState<ObsOverlayState | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [attacks, setAttacks] = useState<ObsAttack[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const tokenRef = useRef(token);
  const streamerIdRef = useRef(streamerId);

  tokenRef.current = token;
  streamerIdRef.current = streamerId;

  const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const addEvent = useCallback((event: LiveEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  const fetchState = useCallback(
    (onNewSession?: (sessionId: number) => void) => {
      const sid = streamerIdRef.current;
      const tok = tokenRef.current;
      if (!sid || !tok) return;

      fetch(`${BASE_URL}/api/obs/state/${sid}?token=${encodeURIComponent(tok)}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch overlay state");
          return r.json();
        })
        .then((data: ObsOverlayState) => {
          setOverlayState(data);
          if (data.sessionId && data.sessionId !== sessionIdRef.current) {
            sessionIdRef.current = data.sessionId;
            onNewSession?.(data.sessionId);
          }
        })
        .catch(() => {});
    },
    [BASE_URL]
  );

  useEffect(() => {
    if (!streamerId || !token) return;

    fetchState((sessionId) => {
      if (socketRef.current) {
        socketRef.current.emit("obs:subscribe", { token, streamerId, sessionId });
      }
    });
  }, [streamerId, token, fetchState]);

  useEffect(() => {
    if (!streamerId || !token) return;

    const pollInterval = setInterval(() => {
      if (sessionIdRef.current !== null) return;
      fetchState((sessionId) => {
        if (socketRef.current) {
          socketRef.current.emit("obs:subscribe", {
            token: tokenRef.current,
            streamerId: streamerIdRef.current,
            sessionId,
          });
        }
      });
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [streamerId, token, fetchState]);

  useEffect(() => {
    if (!streamerId || !token) return;

    const socket = io(window.location.origin, {
      path: `${BASE_URL}/api/socket.io`,
      transports: ["websocket", "polling"],
      auth: { obsToken: token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (sessionIdRef.current) {
        socket.emit("obs:subscribe", {
          token,
          streamerId,
          sessionId: sessionIdRef.current,
        });
      }
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("obs:subscribed", ({ sessionId }: { sessionId: number | null }) => {
      if (sessionId && sessionId !== sessionIdRef.current) {
        sessionIdRef.current = sessionId;
        setOverlayState((prev) => (prev ? { ...prev, sessionId } : null));
      }
    });

    socket.on("live:event", (event: LiveEvent) => {
      addEvent(event);

      if (event.type === "follow") {
        setOverlayState((prev) => {
          if (!prev?.session) return prev;
          return {
            ...prev,
            session: { ...prev.session, totalFollowers: prev.session.totalFollowers + 1 },
          };
        });
      } else if (event.type === "like") {
        const count = (event.data.likeCount as number) ?? 1;
        setOverlayState((prev) => {
          if (!prev?.session) return prev;
          return {
            ...prev,
            session: { ...prev.session, totalLikes: prev.session.totalLikes + count },
          };
        });
      } else if (event.type === "gift") {
        const coins = (event.data.coins as number) ?? 0;
        setOverlayState((prev) => {
          if (!prev?.session) return prev;
          return {
            ...prev,
            session: { ...prev.session, totalGifts: prev.session.totalGifts + coins },
          };
        });
      }
    });

    socket.on("xp:awarded", () => {
      if (!streamerIdRef.current || !tokenRef.current) return;
      fetch(
        `${BASE_URL}/api/obs/state/${streamerIdRef.current}?token=${encodeURIComponent(tokenRef.current)}`
      )
        .then((r) => r.json())
        .then((data: ObsOverlayState) => {
          setOverlayState((prev) => (prev ? { ...prev, leaderboard: data.leaderboard } : data));
        })
        .catch(() => {});
    });

    socket.on("boss:attacked", (data: ObsAttack) => {
      setAttacks((prev) => [data, ...prev].slice(0, 20));
      setOverlayState((prev) => {
        if (!prev?.activeBossBattle) return prev;
        return {
          ...prev,
          activeBossBattle: { ...prev.activeBossBattle, currentHp: data.currentHp },
        };
      });
    });

    socket.on("boss:defeated", (data: { battleId: number; bossName: string }) => {
      setOverlayState((prev) => {
        if (!prev?.activeBossBattle) return prev;
        return { ...prev, activeBossBattle: { ...prev.activeBossBattle, currentHp: 0 } };
      });
    });

    socket.on(
      "boss:spawned",
      (data: {
        battleId: number;
        bossName: string;
        bossEmoji: string;
        maxHp: number;
        currentHp: number;
      }) => {
        setAttacks([]);
        setOverlayState((prev) =>
          prev
            ? {
                ...prev,
                activeBossBattle: {
                  id: data.battleId,
                  bossName: data.bossName,
                  bossEmoji: data.bossEmoji ?? "🐉",
                  maxHp: data.maxHp,
                  currentHp: data.currentHp,
                },
              }
            : null
        );
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamerId, token, BASE_URL, addEvent]);

  return { socket: socketRef.current, connected, overlayState, events, attacks };
}
