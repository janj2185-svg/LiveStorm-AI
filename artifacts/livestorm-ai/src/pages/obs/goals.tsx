import { useEffect, useMemo } from "react";
import { useObsSocket } from "@/hooks/useObsSocket";
import { useOverlayTheme } from "@/lib/obsTheme";

export function ObsGoals() {
  const params = new URLSearchParams(window.location.search);
  const streamerId = Number(params.get("streamerId"));
  const token = params.get("token") ?? "";
  const goalType = (params.get("goalType") ?? "followers") as "followers" | "likes" | "comments" | "gifts" | "viewers";
  const goalTarget = Number(params.get("goalTarget") ?? 500);
  const label = params.get("label") ?? `${goalTarget} ${goalType}`;
  const accentColor = params.get("color") ?? "7c3aed";
  const { fontScale, transitionMs } = useOverlayTheme();

  const { overlayState } = useObsSocket(streamerId || null, token || null);

  useEffect(() => {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  const current = useMemo(() => {
    if (!overlayState?.session) return 0;
    const s = overlayState.session;
    switch (goalType) {
      case "followers": return s.totalFollowers;
      case "likes": return s.totalLikes;
      case "comments": return s.totalComments;
      case "gifts": return s.totalGifts;
      case "viewers": return s.peakViewers;
      default: return 0;
    }
  }, [overlayState, goalType]);

  const pct = Math.min(100, Math.round((current / Math.max(1, goalTarget)) * 100));
  const isComplete = pct >= 100;

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "32px",
        boxSizing: "border-box",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        zoom: fontScale,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "rgba(15, 15, 25, 0.88)",
          border: `2px solid ${isComplete ? "#22c55e" : `#${accentColor}`}`,
          borderRadius: "16px",
          padding: "20px 28px",
          boxShadow: `0 0 40px ${isComplete ? "rgba(34,197,94,0.3)" : "rgba(124,58,237,0.3)"}, 0 8px 32px rgba(0,0,0,0.8)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isComplete ? "#22c55e" : `#${accentColor}` }}>
            {isComplete ? "🎉 Goal Reached!" : "🎯 Stream Goal"}
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
            {current.toLocaleString()} <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400, fontSize: "14px" }}>/ {goalTarget.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: "12px" }}>
          {label}
        </div>

        <div style={{ height: "16px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: isComplete
                ? "linear-gradient(90deg, #16a34a, #22c55e)"
                : `linear-gradient(90deg, #${accentColor}, #a78bfa)`,
              borderRadius: "8px",
              transition: transitionMs > 0 ? `width ${transitionMs * 1.5}ms cubic-bezier(0.34, 1.56, 0.64, 1)` : "none",
              boxShadow: isComplete ? "0 0 16px rgba(34,197,94,0.6)" : `0 0 16px rgba(124,58,237,0.6)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "10px",
              fontWeight: 700,
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {pct}%
          </div>
        </div>

        {!overlayState?.session && (
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "8px", textAlign: "center" }}>
            Waiting for live session...
          </div>
        )}
      </div>
    </div>
  );
}
