import { useEffect, useState, useCallback } from "react";
import { useObsSocket, type LiveEvent } from "@/hooks/useObsSocket";

interface AlertItem {
  id: number;
  type: string;
  viewerName: string;
  detail: string;
  icon: string;
  color: string;
}

let alertIdCounter = 0;

function getAlertInfo(event: LiveEvent): AlertItem | null {
  const name = (event.data.viewerName ?? event.data.username ?? event.data.nickname ?? "Viewer") as string;
  if (event.type === "gift") {
    const gift = (event.data.giftName ?? "Gift") as string;
    const coins = (event.data.coins ?? 0) as number;
    return { id: ++alertIdCounter, type: "gift", viewerName: name, detail: `${gift} (×${coins} coins)`, icon: "🎁", color: "#f59e0b" };
  }
  if (event.type === "follow") {
    return { id: ++alertIdCounter, type: "follow", viewerName: name, detail: "just followed!", icon: "💜", color: "#8b5cf6" };
  }
  if (event.type === "share") {
    return { id: ++alertIdCounter, type: "share", viewerName: name, detail: "shared your stream!", icon: "🔗", color: "#06b6d4" };
  }
  if (event.type === "like") {
    const count = (event.data.likeCount ?? 1) as number;
    if (count >= 50) {
      return { id: ++alertIdCounter, type: "like", viewerName: name, detail: `sent ${count} likes!`, icon: "❤️", color: "#ef4444" };
    }
  }
  return null;
}

export function ObsAlerts() {
  const params = new URLSearchParams(window.location.search);
  const streamerId = Number(params.get("streamerId"));
  const token = params.get("token") ?? "";
  const accentColor = params.get("color") ?? "7c3aed";

  const { events } = useObsSocket(streamerId || null, token || null);
  const [queue, setQueue] = useState<AlertItem[]>([]);
  const [current, setCurrent] = useState<AlertItem | null>(null);
  const [animState, setAnimState] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  const processNext = useCallback((q: AlertItem[]) => {
    if (q.length === 0) return;
    const [next, ...rest] = q;
    setCurrent(next);
    setQueue(rest);
    setAnimState("in");
    setTimeout(() => setAnimState("hold"), 400);
    setTimeout(() => setAnimState("out"), 4400);
    setTimeout(() => {
      setCurrent(null);
    }, 4800);
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    const alert = getAlertInfo(latest);
    if (alert) {
      setQueue((prev) => [...prev, alert]);
    }
  }, [events]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      processNext(queue);
    }
  }, [current, queue, processNext]);

  if (!current) return <div style={{ background: "transparent", width: "100vw", height: "100vh" }} />;

  const slideIn = animState === "in" ? "translateX(120%)" : animState === "out" ? "translateX(120%)" : "translateX(0)";
  const opacity = animState === "in" || animState === "out" ? 0 : 1;

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "32px",
        boxSizing: "border-box",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: slideIn,
          opacity,
          transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
          background: "rgba(15, 15, 25, 0.92)",
          border: `2px solid #${accentColor}`,
          borderRadius: "16px",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          minWidth: "360px",
          maxWidth: "480px",
          boxShadow: `0 0 40px rgba(124,58,237,0.4), 0 8px 32px rgba(0,0,0,0.8)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ fontSize: "48px", lineHeight: 1, filter: "drop-shadow(0 0 12px rgba(255,255,255,0.3))" }}>
          {current.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: `#${accentColor}`,
              marginBottom: "4px",
            }}
          >
            {current.type === "gift" ? "New Gift" : current.type === "follow" ? "New Follower" : current.type === "share" ? "Shared" : "Likes Bomb"}
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.viewerName}
          </div>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
            {current.detail}
          </div>
        </div>
      </div>
    </div>
  );
}
