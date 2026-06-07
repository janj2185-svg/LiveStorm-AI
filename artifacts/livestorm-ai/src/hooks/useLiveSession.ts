import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@clerk/react";

export interface LiveEvent {
  type: "comment" | "gift" | "like" | "follow" | "share" | "viewerCount";
  sessionId: number;
  username?: string;
  avatarUrl?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface AutomationFiredEvent {
  automationId: number;
  automationName: string;
  actionType: string;
  actionPayload: string;
  triggerEvent: LiveEvent;
  timestamp: number;
}

export interface LiveStats {
  viewerCount: number;
  totalGifts: number;
  totalLikes: number;
  totalFollows: number;
  totalComments: number;
  totalShares: number;
  topSupporters: Array<{ username: string; coins: number }>;
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useLiveSession(sessionId: number | null | undefined) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [automationsFired, setAutomationsFired] = useState<AutomationFiredEvent[]>([]);
  const [stats, setStats] = useState<LiveStats>({
    viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0, totalComments: 0, totalShares: 0,
    topSupporters: [],
  });
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const supportersRef = useRef<Map<string, number>>(new Map());

  const clearEvents = useCallback(() => {
    setEvents([]);
    setAutomationsFired([]);
    setStats({ viewerCount: 0, totalGifts: 0, totalLikes: 0, totalFollows: 0, totalComments: 0, totalShares: 0, topSupporters: [] });
    supportersRef.current = new Map();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let socket: Socket;

    const connect = async () => {
      const token = await getToken();

      socket = io(window.location.origin, {
        path: `${BASE_URL}/api/socket.io`,
        transports: ["websocket", "polling"],
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("session:join", sessionId);
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("session:error", (err: { message: string }) => {
        console.error("[LiveSession] Socket auth error:", err.message);
      });

      socket.on("live:event", (event: LiveEvent) => {
        setEvents((prev) => [event, ...prev].slice(0, 200));

        setStats((prev) => {
          const next = { ...prev };
          if (event.type === "viewerCount") {
            next.viewerCount = (event.data.count as number) ?? prev.viewerCount;
          } else if (event.type === "gift") {
            const coins = (event.data.coins as number) ?? 0;
            next.totalGifts += coins;
            if (event.username) {
              const current = supportersRef.current.get(event.username) ?? 0;
              supportersRef.current.set(event.username, current + coins);
              next.topSupporters = Array.from(supportersRef.current.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([username, coins]) => ({ username, coins }));
            }
          } else if (event.type === "like") {
            next.totalLikes += (event.data.likeCount as number) ?? 1;
          } else if (event.type === "follow") {
            next.totalFollows += 1;
          } else if (event.type === "comment") {
            next.totalComments += 1;
          } else if (event.type === "share") {
            next.totalShares += 1;
          }
          return next;
        });
      });

      socket.on("automation:fired", (event: AutomationFiredEvent) => {
        setAutomationsFired((prev) => [event, ...prev].slice(0, 50));
      });

      socket.on("session:ended", () => {
        socket.disconnect();
      });
    };

    connect();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [sessionId, getToken]);

  return { events, stats, automationsFired, connected, clearEvents };
}
