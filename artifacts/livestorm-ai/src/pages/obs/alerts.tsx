import { useEffect, useState, useCallback } from "react";
import { useObsSocket, type LiveEvent } from "@/hooks/useObsSocket";

interface AlertItem {
  id: number;
  type: string;
  viewerName: string;
  detail: string;
  icon: string;
  color: string;
  avatarUrl?: string;
}

let alertIdCounter = 0;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function nameToColor(name: string): string {
  const colors = ["#7c3aed", "#ef4444", "#f59e0b", "#06b6d4", "#22c55e", "#ec4899", "#8b5cf6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function getAlertInfo(event: LiveEvent): AlertItem | null {
  const name = ((event.data.viewerName ?? event.data.username ?? event.data.nickname ?? "Viewer") as string).trim();
  const avatarUrl = (event.data.avatarUrl ?? event.data.profilePictureUrl ?? undefined) as string | undefined;

  if (event.type === "gift") {
    const gift = (event.data.giftName ?? "Gift") as string;
    const coins = (event.data.coins ?? 0) as number;
    return { id: ++alertIdCounter, type: "gift", viewerName: name, detail: `${gift} (×${coins} coins)`, icon: "🎁", color: "#f59e0b", avatarUrl };
  }
  if (event.type === "follow") {
    return { id: ++alertIdCounter, type: "follow", viewerName: name, detail: "just followed!", icon: "💜", color: "#8b5cf6", avatarUrl };
  }
  if (event.type === "share") {
    return { id: ++alertIdCounter, type: "share", viewerName: name, detail: "shared your stream!", icon: "🔗", color: "#06b6d4", avatarUrl };
  }
  if (event.type === "like") {
    const count = (event.data.likeCount ?? 1) as number;
    if (count >= 50) {
      return { id: ++alertIdCounter, type: "like", viewerName: name, detail: `sent ${count} likes!`, icon: "❤️", color: "#ef4444", avatarUrl };
    }
  }
  return null;
}

function ViewerAvatar({ name, avatarUrl, size = 56 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.2)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: nameToColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 800,
        color: "#fff",
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.2)",
        textShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }}
    >
      {getInitials(name)}
    </div>
  );
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
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minWidth: "380px",
          maxWidth: "500px",
          boxShadow: `0 0 40px rgba(124,58,237,0.4), 0 8px 32px rgba(0,0,0,0.8)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <ViewerAvatar name={current.viewerName} avatarUrl={current.avatarUrl} size={56} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: `#${accentColor}`,
              marginBottom: "3px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{current.icon}</span>
            <span>
              {current.type === "gift" ? "New Gift" : current.type === "follow" ? "New Follower" : current.type === "share" ? "Shared Stream" : "Likes Bomb"}
            </span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.viewerName}
          </div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginTop: "3px" }}>
            {current.detail}
          </div>
        </div>
      </div>
    </div>
  );
}
