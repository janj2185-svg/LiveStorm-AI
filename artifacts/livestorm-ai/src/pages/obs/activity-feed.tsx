import { useEffect } from "react";
import { useObsSocket, type LiveEvent } from "@/hooks/useObsSocket";
import { useOverlayTheme } from "@/lib/obsTheme";

function getEventDisplay(event: LiveEvent): { icon: string; text: string; color: string } | null {
  const name = (event.data.viewerName ?? event.data.username ?? event.data.nickname ?? "Viewer") as string;
  switch (event.type) {
    case "gift": {
      const gift = (event.data.giftName ?? "Gift") as string;
      const coins = (event.data.coins ?? 1) as number;
      return { icon: "🎁", text: `${name} sent ${gift} (${coins} coins)`, color: "#f59e0b" };
    }
    case "follow":
      return { icon: "💜", text: `${name} followed`, color: "#8b5cf6" };
    case "share":
      return { icon: "🔗", text: `${name} shared the stream`, color: "#06b6d4" };
    case "like": {
      const count = (event.data.likeCount ?? 1) as number;
      return { icon: "❤️", text: `${name} sent ${count} likes`, color: "#ef4444" };
    }
    case "comment": {
      const comment = (event.data.comment ?? "") as string;
      return { icon: "💬", text: `${name}: ${comment.slice(0, 50)}${comment.length > 50 ? "…" : ""}`, color: "#94a3b8" };
    }
    case "viewerCount": {
      const count = (event.data.count ?? 0) as number;
      return { icon: "👥", text: `${count} viewers watching`, color: "#64748b" };
    }
    default:
      return null;
  }
}

function timeAgo(ts: string): string {
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

export function ObsActivityFeed() {
  const params = new URLSearchParams(window.location.search);
  const streamerId = Number(params.get("streamerId"));
  const token = params.get("token") ?? "";
  const accentColor = params.get("color") ?? "7c3aed";
  const maxItems = Number(params.get("maxItems") ?? 20);
  const { fontScale } = useOverlayTheme();

  const { events, overlayState } = useObsSocket(streamerId || null, token || null);

  useEffect(() => {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  const displayEvents = events.slice(0, maxItems).map((e, i) => ({ event: e, display: getEventDisplay(e), key: `${e.type}-${i}` })).filter((x) => x.display !== null);

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        zoom: fontScale,
      }}
    >
      <div
        style={{
          width: "320px",
          maxHeight: "calc(100vh - 48px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(10,10,20,0.85)",
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: `#${accentColor}`,
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⚡</span> Live Activity
          {overlayState?.session && (
            <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: "10px" }}>
              {events.length} events
            </span>
          )}
        </div>

        {displayEvents.length === 0 ? (
          <div
            style={{
              padding: "16px 14px",
              background: "rgba(10,10,20,0.75)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              color: "rgba(255,255,255,0.3)",
              fontSize: "12px",
              textAlign: "center",
              backdropFilter: "blur(12px)",
            }}
          >
            {overlayState?.session ? "No activity yet..." : "Waiting for stream..."}
          </div>
        ) : (
          displayEvents.map(({ event, display, key }) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 14px",
                background: "rgba(10,10,20,0.82)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "10px",
                backdropFilter: "blur(12px)",
                animation: "slideIn 0.3s ease-out",
              }}
            >
              <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{display!.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: display!.color, lineHeight: 1.4, wordBreak: "break-word" }}>
                  {display!.text}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "3px" }}>
                  {timeAgo(event.timestamp ?? new Date().toISOString())}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
