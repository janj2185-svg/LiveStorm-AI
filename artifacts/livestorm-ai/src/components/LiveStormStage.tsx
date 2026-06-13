/**
 * LiveStormStage
 * Premium futuristic streaming stage — city skyline + holographic platform +
 * neon particles + waveform + LiveStorm branding.
 * Default center for AI Storm when no avatar is loaded.
 */
import { memo } from "react";

// ── Fixed particle data (no Math.random to avoid render jitter) ───────────────
const PARTICLES: Array<{
  x: string; y: string; r: number;
  dur: number; del: number; color: string;
}> = [
  { x: "8%",  y: "16%", r: 2,   dur: 5.2, del: 0.0, color: "rgba(167,139,250,0.65)" },
  { x: "88%", y: "13%", r: 1.5, dur: 7.1, del: 1.5, color: "rgba(103,232,249,0.55)" },
  { x: "24%", y: "32%", r: 3,   dur: 4.3, del: 0.7, color: "rgba(139,92,246,0.70)"  },
  { x: "76%", y: "28%", r: 2,   dur: 6.4, del: 2.2, color: "rgba(167,139,250,0.50)" },
  { x: "46%", y: "10%", r: 2.5, dur: 5.8, del: 3.1, color: "rgba(103,232,249,0.60)" },
  { x: "62%", y: "22%", r: 1.5, dur: 8.0, del: 0.4, color: "rgba(192,132,252,0.50)" },
  { x: "14%", y: "52%", r: 2,   dur: 4.7, del: 1.9, color: "rgba(139,92,246,0.40)"  },
  { x: "84%", y: "48%", r: 2.5, dur: 6.2, del: 0.9, color: "rgba(103,232,249,0.40)" },
  { x: "36%", y: "7%",  r: 1.5, dur: 9.1, del: 2.7, color: "rgba(167,139,250,0.40)" },
  { x: "70%", y: "9%",  r: 2,   dur: 5.5, del: 3.8, color: "rgba(192,132,252,0.40)" },
  { x: "51%", y: "42%", r: 3,   dur: 7.3, del: 1.1, color: "rgba(139,92,246,0.50)"  },
  { x: "92%", y: "65%", r: 1.5, dur: 4.9, del: 4.2, color: "rgba(103,232,249,0.30)" },
  { x: "4%",  y: "70%", r: 2,   dur: 6.7, del: 2.5, color: "rgba(167,139,250,0.30)" },
  { x: "66%", y: "58%", r: 1.5, dur: 8.5, del: 0.6, color: "rgba(192,132,252,0.28)" },
  { x: "30%", y: "63%", r: 2,   dur: 5.0, del: 3.3, color: "rgba(139,92,246,0.30)"  },
  { x: "55%", y: "5%",  r: 1.5, dur: 6.9, del: 1.7, color: "rgba(103,232,249,0.45)" },
  { x: "18%", y: "22%", r: 1.5, dur: 7.4, del: 4.5, color: "rgba(192,132,252,0.40)" },
  { x: "94%", y: "38%", r: 2,   dur: 5.6, del: 2.0, color: "rgba(139,92,246,0.35)"  },
];

// ── Waveform bar heights (bell-curve shaped spectrum) ─────────────────────────
const WAVEFORM_HEIGHTS = [3,5,8,11,15,18,21,23,22,19,15,21,23,22,19,15,11,8,5,3];
const WAVEFORM_COLORS  = [
  "#8b5cf6","#a78bfa","#06b6d4","#67e8f9","#8b5cf6","#c084fc",
  "#06b6d4","#8b5cf6","#a78bfa","#67e8f9","#06b6d4","#8b5cf6",
  "#a78bfa","#c084fc","#06b6d4","#8b5cf6","#67e8f9","#a78bfa","#06b6d4","#8b5cf6",
];
const WAVEFORM_DURS   = [2.0,2.4,1.8,2.7,2.1,3.2,1.9,2.5,2.2,3.0,2.3,1.7,2.6,2.0,2.9,1.8,2.4,2.1,2.7,2.3];
const WAVEFORM_DELAYS = [0.0,0.2,0.5,0.1,0.8,0.3,0.6,0.1,0.9,0.4,0.0,0.7,0.2,0.5,0.3,0.8,0.1,0.6,0.4,0.9];

// ── Fixed window lights ───────────────────────────────────────────────────────
const LEFT_WINDOWS  = [[47,82,3,3,0.75],[47,86,3,3,0.45],[70,60,3,3,0.80],[70,65,3,3,0.50],[90,70,4,3,0.65],[100,78,4,3,0.70],[106,79,4,3,0.50]];
const RIGHT_WINDOWS = [[338,62,3,3,0.80],[338,66,3,3,0.50],[349,65,4,3,0.70],[322,69,3,3,0.65],[322,74,3,3,0.40],[299,86,4,3,0.65],[306,86,4,3,0.45]];

export const LiveStormStage = memo(function LiveStormStage() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 2 }}
    >

      {/* ── Vertical light beams from top corners ───────────────────────── */}
      {[
        { left: "14%", dur: "6s", del: "0s",  col: "rgba(139,92,246,0.35)", h: "48%" },
        { left: "23%", dur: "9s", del: "2s",  col: "rgba(103,232,249,0.22)", h: "38%" },
        { left: "77%", dur: "7s", del: "3s",  col: "rgba(139,92,246,0.35)", h: "48%" },
        { left: "86%", dur: "8s", del: "1s",  col: "rgba(103,232,249,0.22)", h: "38%" },
      ].map((b, i) => (
        <div key={i} className="absolute top-0" style={{
          left: b.left,
          width: 1,
          height: b.h,
          background: `linear-gradient(to bottom, transparent 0%, ${b.col} 40%, ${b.col} 70%, transparent 100%)`,
          filter: "blur(2px)",
          animation: `neon-breathe ${b.dur} ease-in-out ${b.del} infinite`,
        }} />
      ))}

      {/* ── Floating neon particles ─────────────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: p.x,
          top: p.y,
          width:  p.r * 2,
          height: p.r * 2,
          background: p.color,
          boxShadow: `0 0 ${p.r * 4}px ${p.color}`,
          animation: `float-dot ${p.dur}s ease-in-out ${p.del}s infinite`,
        }} />
      ))}

      {/* ── City skyline SVG ────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 400 180"
        className="absolute bottom-0 left-0 w-full"
        style={{ height: "44%" }}
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="lss-city-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e0228" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#060112" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="lss-city-r" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e0228" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#060112" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="lss-win-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(167,139,250,0.9)" />
            <stop offset="100%" stopColor="rgba(103,232,249,0.6)" />
          </linearGradient>
          <linearGradient id="lss-win-r" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(103,232,249,0.9)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0.6)" />
          </linearGradient>
          <filter id="lss-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="lss-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Left city block */}
        <path
          d={`
            M 0,180 L 0,138 L 8,138 L 8,124
            L 18,124 L 18,110 L 24,110 L 24,102
            L 32,102 L 32,95  L 38,95  L 38,108
            L 46,108 L 46,84  L 52,84  L 52,78
            L 55,78  L 55,70  L 58,70  L 58,64
            L 61,64  L 61,56  L 63,56  L 63,52
            L 65,52  L 65,56  L 68,56  L 68,68
            L 74,68  L 74,78  L 80,78  L 80,88
            L 90,88  L 90,72  L 96,72  L 96,65
            L 102,65 L 102,78 L 110,78 L 110,90
            L 118,90 L 118,100 L 126,100 L 126,112
            L 136,112 L 136,122 L 144,122 L 144,180 Z
          `}
          fill="url(#lss-city-l)"
        />

        {/* Right city block */}
        <path
          d={`
            M 400,180 L 400,138 L 392,138 L 392,124
            L 382,124 L 382,110 L 376,110 L 376,102
            L 368,102 L 368,95  L 362,95  L 362,108
            L 354,108 L 354,84  L 348,84  L 348,78
            L 345,78  L 345,70  L 342,70  L 342,64
            L 339,64  L 339,56  L 337,56  L 337,52
            L 335,52  L 335,56  L 332,56  L 332,68
            L 326,68  L 326,78  L 320,78  L 320,88
            L 310,88  L 310,72  L 304,72  L 304,65
            L 298,65  L 298,78  L 290,78  L 290,90
            L 282,90  L 282,100 L 274,100 L 274,112
            L 264,112 L 264,122 L 256,122 L 256,180 Z
          `}
          fill="url(#lss-city-r)"
        />

        {/* Antenna spires */}
        <line x1="63" y1="52" x2="63" y2="42" stroke="rgba(192,132,252,0.55)" strokeWidth="0.8" filter="url(#lss-glow)" />
        <circle cx="63" cy="42" r="1.5" fill="rgba(192,132,252,0.9)" filter="url(#lss-glow-strong)" />
        <line x1="337" y1="52" x2="337" y2="42" stroke="rgba(103,232,249,0.55)" strokeWidth="0.8" filter="url(#lss-glow)" />
        <circle cx="337" cy="42" r="1.5" fill="rgba(103,232,249,0.9)" filter="url(#lss-glow-strong)" />
        <line x1="96" y1="65" x2="96" y2="57" stroke="rgba(167,139,250,0.45)" strokeWidth="0.6" filter="url(#lss-glow)" />
        <circle cx="96" cy="57" r="1" fill="rgba(167,139,250,0.7)" filter="url(#lss-glow)" />
        <line x1="304" y1="65" x2="304" y2="57" stroke="rgba(167,139,250,0.45)" strokeWidth="0.6" filter="url(#lss-glow)" />
        <circle cx="304" cy="57" r="1" fill="rgba(167,139,250,0.7)" filter="url(#lss-glow)" />

        {/* Neon edge lines on tallest buildings */}
        <line x1="61" y1="56" x2="65" y2="56" stroke="rgba(192,132,252,0.75)" strokeWidth="1" filter="url(#lss-glow)" />
        <line x1="335" y1="56" x2="339" y2="56" stroke="rgba(103,232,249,0.75)" strokeWidth="1" filter="url(#lss-glow)" />

        {/* Left window lights */}
        {LEFT_WINDOWS.map(([x, y, w, h, op], i) => (
          <rect key={`wl${i}`} x={x} y={y} width={w} height={h} fill="url(#lss-win-l)" opacity={op} filter="url(#lss-glow)" rx="0.5" />
        ))}

        {/* Right window lights */}
        {RIGHT_WINDOWS.map(([x, y, w, h, op], i) => (
          <rect key={`wr${i}`} x={x} y={y} width={w} height={h} fill="url(#lss-win-r)" opacity={op} filter="url(#lss-glow)" rx="0.5" />
        ))}

        {/* Holographic light columns rising from building tops */}
        <line x1="63" y1="56" x2="63" y2="0" stroke="url(#lss-col-l)" strokeWidth="8" opacity="0.06" />
        <line x1="337" y1="56" x2="337" y2="0" stroke="url(#lss-col-r)" strokeWidth="8" opacity="0.06" />
        <defs>
          <linearGradient id="lss-col-l" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(192,132,252,1)" />
            <stop offset="100%" stopColor="rgba(192,132,252,0)" />
          </linearGradient>
          <linearGradient id="lss-col-r" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(103,232,249,1)" />
            <stop offset="100%" stopColor="rgba(103,232,249,0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Neon horizon glow above city ───────────────────────────────── */}
      <div className="absolute left-0 right-0" style={{
        bottom: "36%",
        height: "60px",
        background: "linear-gradient(to top, rgba(139,92,246,0.0) 0%, rgba(139,92,246,0.0) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
      <div className="absolute left-0 right-0" style={{
        bottom: "42%",
        height: "4px",
        background: "linear-gradient(to right, transparent 5%, rgba(139,92,246,0.45) 20%, rgba(103,232,249,0.55) 50%, rgba(139,92,246,0.45) 80%, transparent 95%)",
        filter: "blur(2px)",
        animation: "neon-breathe 5s ease-in-out infinite",
      }} />

      {/* ── Waveform spectrum bars (at floor/platform level) ────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-end gap-[2.5px]" style={{ bottom: "40%" }}>
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <div key={i} style={{
            width: 4,
            height: h,
            background: WAVEFORM_COLORS[i % WAVEFORM_COLORS.length],
            borderRadius: 2,
            opacity: 0.65,
            animation: `neon-breathe ${WAVEFORM_DURS[i]}s ease-in-out ${WAVEFORM_DELAYS[i]}s infinite`,
            boxShadow: `0 0 6px ${WAVEFORM_COLORS[i % WAVEFORM_COLORS.length]}88`,
          }} />
        ))}
      </div>

      {/* ── Central branding ───────────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-2"
        style={{ top: "16%" }}
      >
        {/* Lightning bolt logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full blur-3xl opacity-55"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.9), rgba(99,102,241,0.4) 60%, transparent 90%)" }}
          />
          <svg
            className="relative"
            width="44" height="44"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              fill="rgba(167,139,250,0.95)"
              style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.9)) drop-shadow(0 0 20px rgba(139,92,246,0.5))" }}
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div className="text-center mt-1">
          <p
            className="text-[13px] font-black text-white/85 tracking-[0.22em] uppercase"
            style={{ textShadow: "0 0 18px rgba(139,92,246,0.75), 0 0 36px rgba(139,92,246,0.30)" }}
          >
            LiveStorm AI
          </p>
          <p
            className="text-[9px] font-bold tracking-[0.40em] uppercase mt-[3px]"
            style={{ color: "rgba(103,232,249,0.55)", textShadow: "0 0 12px rgba(103,232,249,0.4)" }}
          >
            STREAMING STAGE
          </p>
        </div>

        {/* Divider line */}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-8 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(139,92,246,0.5))" }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(192,132,252,0.7)", boxShadow: "0 0 6px rgba(192,132,252,0.8)", animation: "neon-breathe 3s ease-in-out infinite" }} />
          <div className="w-8 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(139,92,246,0.5))" }} />
        </div>

        {/* Status line */}
        <p
          className="text-[9px] font-semibold tracking-[0.25em] uppercase mt-0.5"
          style={{ color: "rgba(139,92,246,0.40)" }}
        >
          Upload avatar to activate
        </p>
      </div>

    </div>
  );
});
