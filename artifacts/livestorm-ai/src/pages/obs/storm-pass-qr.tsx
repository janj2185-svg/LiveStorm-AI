import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface QrState {
  streamerSlug: string;
  duration: number;
}

function getParams(): { streamerId: number | null; token: string | null } {
  const p = new URLSearchParams(window.location.search);
  const sid = parseInt(p.get("streamerId") ?? "", 10);
  return {
    streamerId: isNaN(sid) ? null : sid,
    token:      p.get("token"),
  };
}

export function ObsStormPassQR() {
  const { streamerId, token } = getParams();

  const socketRef     = useRef<Socket | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected,   setConnected]  = useState(false);
  const [qrState,     setQrState]    = useState<QrState | null>(null);
  const [countdown,   setCountdown]  = useState(0);

  // ── Transparent background for OBS ────────────────────────────────────────
  useEffect(() => {
    document.body.style.background = "transparent";
    document.body.style.margin     = "0";
  }, []);

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamerId || !token) return;

    const socket = io(window.location.origin, {
      path:       `${BASE_URL}/api/socket.io`,
      transports: ["websocket", "polling"],
      auth:       { obsToken: token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("obs:subscribe", { token, streamerId });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("stormpass:show_qr", (data: { duration?: number; streamerSlug?: string }) => {
      const dur = data.duration ?? 20;
      const slug = data.streamerSlug ?? "";
      setQrState({ streamerSlug: slug, duration: dur });
      setCountdown(dur);

      if (timerRef.current) clearInterval(timerRef.current);
      let remaining = dur;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setQrState(null);
        }
      }, 1000);
    });

    socket.on("stormpass:hide_qr", () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setQrState(null);
      setCountdown(0);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamerId, token]);

  if (!qrState) return null;

  const passUrl  = `${window.location.origin}/pass${qrState.streamerSlug ? `?s=${encodeURIComponent(qrState.streamerSlug)}` : ""}`;
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&color=ffffff&bgcolor=0d1120&data=${encodeURIComponent(passUrl)}`;
  const pct      = Math.round((countdown / qrState.duration) * 100);

  return (
    <div
      style={{
        position:        "fixed",
        bottom:          "32px",
        right:           "32px",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        gap:             "0",
        fontFamily:      "'Inter', sans-serif",
        animation:       "fadeInUp 0.4s ease-out",
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>

      <div style={{
        background:   "rgba(13, 17, 32, 0.92)",
        border:       "2px solid rgba(168, 85, 247, 0.6)",
        borderRadius: "20px",
        padding:      "16px 16px 12px",
        boxShadow:    "0 8px 40px rgba(168, 85, 247, 0.3), 0 2px 8px rgba(0,0,0,0.8)",
        display:      "flex",
        flexDirection:"column",
        alignItems:   "center",
        gap:          "10px",
        backdropFilter: "blur(12px)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>⚡</span>
          <span style={{
            color:       "#a855f7",
            fontWeight:  800,
            fontSize:    "13px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>Storm Pass</span>
        </div>

        {/* QR code */}
        <div style={{
          borderRadius: "12px",
          overflow:     "hidden",
          border:       "1px solid rgba(168, 85, 247, 0.3)",
        }}>
          <img
            src={qrImgUrl}
            alt="Storm Pass QR"
            width={160}
            height={160}
            style={{ display: "block" }}
            loading="eager"
          />
        </div>

        {/* Instruction */}
        <div style={{
          color:      "#e2e8f0",
          fontSize:   "12px",
          fontWeight: 600,
          textAlign:  "center",
          lineHeight: 1.3,
        }}>
          Відскануй, щоб відкрити свій<br />
          <span style={{ color: "#a855f7" }}>Storm Pass</span>
        </div>

        {/* URL hint */}
        {qrState.streamerSlug && (
          <div style={{
            color:      "rgba(148, 163, 184, 0.7)",
            fontSize:   "10px",
            fontFamily: "monospace",
            letterSpacing: "0.02em",
          }}>
            /pass?s={qrState.streamerSlug}
          </div>
        )}

        {/* Countdown bar */}
        <div style={{
          width:        "160px",
          height:       "3px",
          background:   "rgba(255,255,255,0.1)",
          borderRadius: "2px",
          overflow:     "hidden",
        }}>
          <div style={{
            width:        `${pct}%`,
            height:       "100%",
            background:   "linear-gradient(90deg, #7c3aed, #a855f7)",
            borderRadius: "2px",
            transition:   "width 1s linear",
          }} />
        </div>

        <div style={{ color: "rgba(148, 163, 184, 0.5)", fontSize: "10px" }}>
          {countdown}s
        </div>
      </div>
    </div>
  );
}
