import { useEffect } from "react";
import { useObsSocket } from "@/hooks/useObsSocket";
import { useOverlayTheme } from "@/lib/obsTheme";

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309", "#7c3aed", "#7c3aed"];
const RANK_ICONS = ["🥇", "🥈", "🥉"];

export function ObsLeaderboard() {
  const params = new URLSearchParams(window.location.search);
  const streamerId = Number(params.get("streamerId"));
  const token = params.get("token") ?? "";
  const accentColor = params.get("color") ?? "7c3aed";
  const title = params.get("title") ?? "Top Supporters";
  const { fontScale } = useOverlayTheme();

  const { overlayState } = useObsSocket(streamerId || null, token || null);
  const entries = overlayState?.leaderboard ?? [];

  useEffect(() => {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        zoom: fontScale,
      }}
    >
      <div
        style={{
          width: "300px",
          background: "rgba(10, 10, 20, 0.88)",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            background: `linear-gradient(135deg, #${accentColor}22, transparent)`,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px" }}>🏆</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
            {title}
          </span>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
            {overlayState?.session ? "No viewers yet" : "Waiting for live session..."}
          </div>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <div
                key={entry.tiktokViewerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 18px",
                  borderBottom: i < entries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: i === 0 ? "rgba(245,158,11,0.06)" : "transparent",
                  transition: "background 0.3s",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    textAlign: "center",
                    fontSize: i < 3 ? "18px" : "12px",
                    fontWeight: 800,
                    color: RANK_COLORS[Math.min(i, 4)],
                    flexShrink: 0,
                  }}
                >
                  {i < 3 ? RANK_ICONS[i] : `#${i + 1}`}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.viewerName}
                  </div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>
                    Lv.{entry.level} • {entry.totalXp.toLocaleString()} XP
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#f59e0b" }}>
                    🎁 {entry.giftCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
