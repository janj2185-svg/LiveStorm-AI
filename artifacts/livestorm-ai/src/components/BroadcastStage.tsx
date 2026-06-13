/**
 * BroadcastStage — Real streaming stage for AI Storm center area.
 * Camera viewfinder corners · perspective grid floor · stage spotlights ·
 * ambient depth particles · audio waveform at floor.
 * Focus: the STAGE itself — no branding, no logo.
 */
import { memo } from "react";

const PARTICLES: Array<{ x: string; y: string; r: number; dur: number; del: number; col: string }> = [
  { x: "8%",  y: "9%",  r: 2.5, dur: 6.2, del: 0.0, col: "rgba(167,139,250,0.55)" },
  { x: "18%", y: "25%", r: 2.0, dur: 8.5, del: 1.4, col: "rgba(103,232,249,0.45)" },
  { x: "27%", y: "7%",  r: 3.0, dur: 5.8, del: 0.6, col: "rgba(192,132,252,0.50)" },
  { x: "73%", y: "8%",  r: 3.0, dur: 7.1, del: 2.0, col: "rgba(167,139,250,0.50)" },
  { x: "83%", y: "24%", r: 2.0, dur: 6.7, del: 0.9, col: "rgba(103,232,249,0.42)" },
  { x: "92%", y: "11%", r: 2.5, dur: 9.0, del: 3.2, col: "rgba(192,132,252,0.48)" },
  { x: "13%", y: "41%", r: 3.5, dur: 5.3, del: 1.8, col: "rgba(139,92,246,0.38)" },
  { x: "87%", y: "43%", r: 3.0, dur: 7.4, del: 4.0, col: "rgba(139,92,246,0.35)" },
  { x: "5%",  y: "58%", r: 2.0, dur: 8.1, del: 2.5, col: "rgba(103,232,249,0.28)" },
  { x: "95%", y: "56%", r: 2.0, dur: 6.9, del: 1.2, col: "rgba(167,139,250,0.26)" },
  { x: "39%", y: "15%", r: 4.5, dur: 10,  del: 0.5, col: "rgba(192,132,252,0.40)" },
  { x: "61%", y: "19%", r: 4.5, dur: 11,  del: 5.0, col: "rgba(103,232,249,0.38)" },
  { x: "50%", y: "5%",  r: 5.5, dur: 12,  del: 2.5, col: "rgba(167,139,250,0.32)" },
];

const W_H   = [5,9,15,21,27,32,35,32,27,21,15,9,5];
const W_C   = ["#8b5cf6","#a78bfa","#c084fc","#06b6d4","#67e8f9","#a78bfa","#8b5cf6","#a78bfa","#67e8f9","#06b6d4","#c084fc","#a78bfa","#8b5cf6"];
const W_DUR = [1.8,2.2,1.6,2.5,1.9,2.0,1.7,2.4,2.0,2.8,2.1,1.5,2.4];
const W_DEL = [0.0,0.15,0.40,0.08,0.65,0.25,0.50,0.10,0.75,0.35,0.05,0.55,0.20];

export const BroadcastStage = memo(function BroadcastStage() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 2 }}
    >

      {/* ── Stage spotlights from top ─────────────────────────────────────── */}
      <div className="absolute" style={{
        top: 0, left: "22%",
        width: 200, height: "54%",
        background: "linear-gradient(to bottom, rgba(139,92,246,0.24) 0%, rgba(139,92,246,0.08) 55%, transparent 100%)",
        clipPath: "polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)",
        filter: "blur(14px)",
        animation: "neon-breathe 8s ease-in-out 1s infinite",
      }} />
      <div className="absolute" style={{
        top: 0, left: "50%", transform: "translateX(-50%)",
        width: 240, height: "65%",
        background: "linear-gradient(to bottom, rgba(192,132,252,0.30) 0%, rgba(139,92,246,0.16) 40%, rgba(103,232,249,0.05) 70%, transparent 100%)",
        clipPath: "polygon(33% 0%, 67% 0%, 100% 100%, 0% 100%)",
        filter: "blur(16px)",
        animation: "neon-breathe 6s ease-in-out infinite",
      }} />
      <div className="absolute" style={{
        top: 0, right: "22%",
        width: 200, height: "54%",
        background: "linear-gradient(to bottom, rgba(103,232,249,0.20) 0%, rgba(103,232,249,0.07) 55%, transparent 100%)",
        clipPath: "polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)",
        filter: "blur(14px)",
        animation: "neon-breathe 9s ease-in-out 3s infinite",
      }} />

      {/* ── Perspective grid floor ────────────────────────────────────────── */}
      <svg
        viewBox="0 0 400 180"
        className="absolute bottom-0 left-0 w-full"
        style={{ height: "58%" }}
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="bs-mask-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="0" />
            <stop offset="35%"  stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id="bs-fade"><rect x="0" y="0" width="400" height="180" fill="url(#bs-mask-g)" /></mask>
          <filter id="bs-glow">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Radial perspective lines from vanishing point (200, 8) */}
        <g mask="url(#bs-fade)">
          {([-200,-150,-100,-60,-30,0,30,60,100,150,200] as number[]).map((dx, i) => (
            <line key={i}
              x1={200} y1={8}
              x2={200 + dx * 2.4} y2={182}
              stroke={i % 3 === 0 ? "rgba(192,132,252,0.38)" : "rgba(139,92,246,0.20)"}
              strokeWidth={i % 3 === 0 ? 0.7 : 0.4}
              filter={i % 3 === 0 ? "url(#bs-glow)" : undefined}
            />
          ))}

          {/* Horizontal grid lines — denser near VP, perspective convergence */}
          {([32,52,72,92,112,132,150,163,172] as number[]).map((y, i) => {
            const pct = (y - 8) / 172;
            const xl = 200 - pct * 420;
            const xr = 200 + pct * 420;
            return (
              <line key={i}
                x1={Math.max(xl, -30)} y1={y}
                x2={Math.min(xr, 430)} y2={y}
                stroke={pct > 0.6 ? "rgba(103,232,249,0.45)" : "rgba(103,232,249,0.22)"}
                strokeWidth={pct > 0.75 ? 0.8 : 0.4}
                opacity={0.15 + pct * 0.55}
              />
            );
          })}
        </g>

        {/* Neon front rim */}
        <line x1="-60" y1="174" x2="460" y2="174"
          stroke="rgba(139,92,246,0.65)" strokeWidth="1.5" filter="url(#bs-glow)" />
        <line x1="-60" y1="174" x2="460" y2="174"
          stroke="rgba(103,232,249,0.35)" strokeWidth="0.6" />
      </svg>

      {/* ── Floor spotlight glow pool ─────────────────────────────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{
        bottom: "22%", width: 300, height: 70,
        background: "radial-gradient(ellipse 50% 100%, rgba(139,92,246,0.38) 0%, rgba(103,232,249,0.14) 55%, transparent 100%)",
        filter: "blur(16px)",
        animation: "neon-breathe 5s ease-in-out 0.5s infinite",
      }} />

      {/* ── Waveform at stage floor level ────────────────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-end"
        style={{ bottom: "24%", gap: "4px" }}
      >
        {W_H.map((h, i) => (
          <div key={i} style={{
            width: 4,
            height: h,
            background: W_C[i],
            borderRadius: "3px 3px 1px 1px",
            transformOrigin: "center bottom",
            animation: `waveform-bar ${W_DUR[i]}s ease-in-out ${W_DEL[i]}s infinite`,
            boxShadow: `0 0 8px ${W_C[i]}cc, 0 0 18px ${W_C[i]}44`,
          }} />
        ))}
      </div>

      {/* ── Ambient depth particles ───────────────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: p.x, top: p.y,
          width: p.r * 2, height: p.r * 2,
          background: p.col,
          boxShadow: `0 0 ${p.r * 5}px ${p.col}, 0 0 ${p.r * 10}px ${p.col.replace(/[\d.]+\)$/, "0.18)")}`,
          animation: `float-dot ${p.dur}s ease-in-out ${p.del}s infinite`,
        }} />
      ))}

      {/* ── Camera viewfinder corners ─────────────────────────────────────── */}
      {/* Top-left */}
      <div className="absolute" style={{ top: 16, left: 16, width: 28, height: 28 }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-cyan-400/65" style={{ boxShadow: "0 0 6px rgba(103,232,249,0.8)" }} />
        <div className="absolute top-0 left-0 bottom-0 w-px bg-cyan-400/65" style={{ boxShadow: "0 0 6px rgba(103,232,249,0.8)" }} />
      </div>
      {/* Top-right */}
      <div className="absolute" style={{ top: 16, right: 16, width: 28, height: 28 }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-violet-400/65" style={{ boxShadow: "0 0 6px rgba(167,139,250,0.8)" }} />
        <div className="absolute top-0 right-0 bottom-0 w-px bg-violet-400/65" style={{ boxShadow: "0 0 6px rgba(167,139,250,0.8)" }} />
      </div>
      {/* Bottom-left */}
      <div className="absolute" style={{ bottom: 16, left: 16, width: 28, height: 28 }}>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-violet-400/65" style={{ boxShadow: "0 0 6px rgba(167,139,250,0.8)" }} />
        <div className="absolute bottom-0 left-0 top-0 w-px bg-violet-400/65" style={{ boxShadow: "0 0 6px rgba(167,139,250,0.8)" }} />
      </div>
      {/* Bottom-right */}
      <div className="absolute" style={{ bottom: 16, right: 16, width: 28, height: 28 }}>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400/65" style={{ boxShadow: "0 0 6px rgba(103,232,249,0.8)" }} />
        <div className="absolute bottom-0 right-0 top-0 w-px bg-cyan-400/65" style={{ boxShadow: "0 0 6px rgba(103,232,249,0.8)" }} />
      </div>

      {/* ── Center crosshair (very subtle targeting reticle) ─────────────── */}
      <div className="absolute" style={{
        top: "42%", left: "50%", transform: "translateX(-50%)",
        width: 32, height: 1,
        background: "rgba(192,132,252,0.20)",
      }} />
      <div className="absolute" style={{
        left: "50%", top: "38%",
        width: 1, height: 32,
        background: "rgba(192,132,252,0.20)",
      }} />

      {/* ── "STAGE READY" indicator — bottom center ───────────────────────── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "rgba(139,92,246,0.9)",
          boxShadow: "0 0 5px rgba(139,92,246,1), 0 0 12px rgba(139,92,246,0.5)",
          animation: "neon-breathe 2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.38em",
          color: "rgba(167,139,250,0.50)",
          textTransform: "uppercase",
        }}>
          Stage Ready
        </span>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "rgba(103,232,249,0.9)",
          boxShadow: "0 0 5px rgba(103,232,249,1), 0 0 12px rgba(103,232,249,0.5)",
          animation: "neon-breathe 2s ease-in-out 1s infinite",
        }} />
      </div>

    </div>
  );
});
