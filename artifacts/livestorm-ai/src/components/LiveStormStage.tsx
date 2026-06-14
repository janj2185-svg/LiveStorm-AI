/**
 * LiveStormStage — Premium futuristic streaming stage.
 * City skyline with neon outlines · holographic platform ·
 * 30 neon particles · animated waveform · LiveStorm branding.
 * Default center for AI Storm — no avatar, no character.
 */
import { memo } from "react";

// ── 30 floating particles (fixed — no Math.random) ──────────────────────────
const PARTICLES: Array<{ x: string; y: string; r: number; dur: number; del: number; col: string }> = [
  // Upper band
  { x: "7%",  y: "7%",  r: 3.5, dur: 5.2,  del: 0.0, col: "rgba(167,139,250,0.92)" },
  { x: "19%", y: "11%", r: 2.5, dur: 7.1,  del: 1.5, col: "rgba(103,232,249,0.82)" },
  { x: "33%", y: "5%",  r: 4.0, dur: 4.3,  del: 0.7, col: "rgba(192,132,252,0.88)" },
  { x: "48%", y: "8%",  r: 3.0, dur: 6.0,  del: 3.1, col: "rgba(139,92,246,0.85)"  },
  { x: "62%", y: "6%",  r: 3.5, dur: 5.8,  del: 2.0, col: "rgba(103,232,249,0.88)" },
  { x: "74%", y: "10%", r: 2.5, dur: 8.0,  del: 0.4, col: "rgba(167,139,250,0.78)" },
  { x: "87%", y: "7%",  r: 4.0, dur: 6.4,  del: 1.2, col: "rgba(139,92,246,0.85)"  },
  { x: "94%", y: "14%", r: 2.5, dur: 5.5,  del: 4.0, col: "rgba(192,132,252,0.72)" },
  // Mid-upper band
  { x: "4%",  y: "26%", r: 5.0, dur: 4.7,  del: 1.9, col: "rgba(139,92,246,0.78)"  },
  { x: "23%", y: "29%", r: 3.5, dur: 6.2,  del: 0.9, col: "rgba(103,232,249,0.72)" },
  { x: "41%", y: "21%", r: 4.5, dur: 9.1,  del: 2.7, col: "rgba(167,139,250,0.72)" },
  { x: "59%", y: "27%", r: 3.0, dur: 5.5,  del: 3.8, col: "rgba(192,132,252,0.68)" },
  { x: "76%", y: "23%", r: 5.0, dur: 7.3,  del: 1.1, col: "rgba(139,92,246,0.72)"  },
  { x: "91%", y: "31%", r: 3.5, dur: 4.9,  del: 4.2, col: "rgba(103,232,249,0.68)" },
  // Mid band
  { x: "11%", y: "44%", r: 4.0, dur: 6.7,  del: 2.5, col: "rgba(167,139,250,0.62)" },
  { x: "29%", y: "49%", r: 3.0, dur: 8.5,  del: 0.6, col: "rgba(192,132,252,0.58)" },
  { x: "51%", y: "42%", r: 5.0, dur: 5.0,  del: 3.3, col: "rgba(139,92,246,0.65)"  },
  { x: "69%", y: "47%", r: 3.5, dur: 6.9,  del: 1.7, col: "rgba(103,232,249,0.58)" },
  { x: "86%", y: "43%", r: 4.0, dur: 7.4,  del: 4.5, col: "rgba(167,139,250,0.58)" },
  // Lower band (above city)
  { x: "3%",  y: "61%", r: 3.5, dur: 5.6,  del: 2.0, col: "rgba(192,132,252,0.52)" },
  { x: "21%", y: "67%", r: 3.0, dur: 4.8,  del: 1.3, col: "rgba(139,92,246,0.48)"  },
  { x: "39%", y: "64%", r: 4.0, dur: 7.2,  del: 3.6, col: "rgba(103,232,249,0.48)" },
  { x: "57%", y: "69%", r: 3.0, dur: 5.3,  del: 0.8, col: "rgba(167,139,250,0.42)" },
  { x: "75%", y: "62%", r: 4.0, dur: 6.6,  del: 2.8, col: "rgba(192,132,252,0.42)" },
  { x: "93%", y: "66%", r: 3.5, dur: 8.1,  del: 1.5, col: "rgba(139,92,246,0.42)"  },
  // Hero stars — large, very bright
  { x: "14%", y: "17%", r: 6.5, dur: 10.0, del: 0.0, col: "rgba(192,132,252,0.60)" },
  { x: "83%", y: "19%", r: 6.5, dur: 12.0, del: 5.0, col: "rgba(103,232,249,0.60)" },
  { x: "50%", y: "14%", r: 7.5, dur: 11.0, del: 2.5, col: "rgba(167,139,250,0.55)" },
  { x: "32%", y: "37%", r: 5.5, dur: 9.5,  del: 1.8, col: "rgba(139,92,246,0.52)"  },
  { x: "67%", y: "41%", r: 5.5, dur: 8.8,  del: 3.2, col: "rgba(103,232,249,0.50)" },
];

// ── Waveform (23 bars, bell-curve spectrum) ──────────────────────────────────
const W_H = [8,13,20,28,36,44,52,58,62,64,62,58,52,44,36,28,20,13,8,13,20,28,13];
const W_C = [
  "#8b5cf6","#a78bfa","#c084fc","#06b6d4","#67e8f9","#8b5cf6","#a78bfa",
  "#06b6d4","#c084fc","#a78bfa","#8b5cf6","#06b6d4","#67e8f9","#a78bfa",
  "#c084fc","#8b5cf6","#06b6d4","#a78bfa","#8b5cf6","#c084fc","#06b6d4","#67e8f9","#8b5cf6",
];
const W_DUR = [1.8,2.2,1.6,2.5,1.9,3.0,1.7,2.4,2.0,2.8,2.1,1.5,2.4,1.8,2.7,1.6,2.2,1.9,2.5,1.7,2.0,2.3,1.8];
const W_DEL = [0.0,0.15,0.40,0.08,0.65,0.25,0.50,0.10,0.75,0.35,0.05,0.55,0.20,0.45,0.30,0.70,0.12,0.58,0.38,0.82,0.25,0.48,0.92];

// ── Window lights (fixed) ────────────────────────────────────────────────────
const L_WIN = [
  [47,83,3,3],[47,87,3,3],[47,91,3,3],
  [53,83,3,3],[53,88,3,3],
  [71,60,3,4],[71,65,3,4],[71,70,3,3],
  [77,60,3,3],[77,65,3,3],
  [90,73,4,3],[90,78,4,3],
  [100,79,4,3],[100,84,4,3],[107,80,4,3],
  [116,92,4,3],[122,102,4,3],
];
const R_WIN = [
  [346,62,3,4],[346,67,3,4],[346,72,3,3],
  [340,60,3,3],[340,65,3,3],
  [323,70,3,3],[323,75,3,3],[323,80,3,3],
  [311,73,4,3],[311,78,4,3],
  [299,79,4,3],[299,84,4,3],[292,80,4,3],
  [283,92,4,3],[277,100,4,3],
];

// ── Light beams (6 total) ────────────────────────────────────────────────────
const BEAMS = [
  { left: "12%", w: 3,   h: "55%", col: "rgba(139,92,246,0.55)",  dur: "6s",  del: "0s"   },
  { left: "21%", w: 1.5, h: "42%", col: "rgba(103,232,249,0.38)", dur: "9s",  del: "2s"   },
  { left: "36%", w: 2,   h: "35%", col: "rgba(192,132,252,0.30)", dur: "7s",  del: "4s"   },
  { left: "88%", w: 3,   h: "55%", col: "rgba(139,92,246,0.55)",  dur: "7s",  del: "3s"   },
  { left: "79%", w: 1.5, h: "42%", col: "rgba(103,232,249,0.38)", dur: "8s",  del: "1s"   },
  { left: "64%", w: 2,   h: "35%", col: "rgba(192,132,252,0.30)", dur: "10s", del: "5s"   },
];

export const LiveStormStage = memo(function LiveStormStage() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 2 }}
    >

      {/* ── Light beams from top ──────────────────────────────────────────── */}
      {BEAMS.map((b, i) => (
        <div key={i} className="absolute top-0" style={{
          left:   b.left,
          width:  b.w,
          height: b.h,
          background: `linear-gradient(to bottom, transparent 0%, ${b.col} 30%, ${b.col} 70%, transparent 100%)`,
          filter: "blur(2.5px)",
          animation: `neon-breathe ${b.dur} ease-in-out ${b.del} infinite`,
        }} />
      ))}

      {/* ── 30 floating neon particles ───────────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left:      p.x,
          top:       p.y,
          width:     p.r * 2,
          height:    p.r * 2,
          background: p.col,
          boxShadow: `0 0 ${p.r * 5}px ${p.col}, 0 0 ${p.r * 10}px ${p.col.replace(/[\d.]+\)$/, "0.25)")}`,
          animation: `float-dot ${p.dur}s ease-in-out ${p.del}s infinite`,
        }} />
      ))}

      {/* ── City skyline SVG ─────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 400 180"
        className="absolute bottom-0 left-0 w-full"
        style={{ height: "46%" }}
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          {/* Building body — visible dark-purple gradient */}
          <linearGradient id="lss-b-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1e0650" stopOpacity="0.95" />
            <stop offset="60%"  stopColor="#0e0330" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#04010e" stopOpacity="1"    />
          </linearGradient>
          <linearGradient id="lss-b-r" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a0548" stopOpacity="0.95" />
            <stop offset="60%"  stopColor="#0c0228" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#040110" stopOpacity="1"    />
          </linearGradient>
          {/* Window lights */}
          <linearGradient id="lss-wl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(192,132,252,1)" />
            <stop offset="100%" stopColor="rgba(103,232,249,0.7)" />
          </linearGradient>
          <linearGradient id="lss-wr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(103,232,249,1)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0.7)" />
          </linearGradient>
          {/* Holographic column gradients */}
          <linearGradient id="lss-cl" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor="rgba(192,132,252,1)" />
            <stop offset="100%" stopColor="rgba(192,132,252,0)" />
          </linearGradient>
          <linearGradient id="lss-cr" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor="rgba(103,232,249,1)" />
            <stop offset="100%" stopColor="rgba(103,232,249,0)" />
          </linearGradient>
          <filter id="lss-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="lss-glow2" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Left building block (fill) ── */}
        <path fill="url(#lss-b-l)" d={`
          M 0,180 L 0,138 L 8,138 L 8,124 L 18,124 L 18,110 L 24,110 L 24,102
          L 32,102 L 32,95 L 38,95 L 38,108 L 46,108 L 46,84 L 52,84 L 52,78
          L 55,78 L 55,70 L 58,70 L 58,64 L 61,64 L 61,56 L 63,56 L 63,52
          L 65,52 L 65,56 L 68,56 L 68,68 L 74,68 L 74,78 L 80,78 L 80,88
          L 90,88 L 90,72 L 96,72 L 96,65 L 102,65 L 102,78 L 110,78 L 110,90
          L 118,90 L 118,100 L 126,100 L 126,112 L 136,112 L 136,122 L 144,122 L 144,180 Z
        `} />

        {/* ── Left skyline neon outline (STROKE only — makes it pop) ── */}
        <path fill="none" strokeWidth="1.5" stroke="rgba(139,92,246,0.85)" filter="url(#lss-glow)" d={`
          M 0,138 L 8,138 L 8,124 L 18,124 L 18,110 L 24,110 L 24,102
          L 32,102 L 32,95 L 38,95 L 38,108 L 46,108 L 46,84 L 52,84 L 52,78
          L 55,78 L 55,70 L 58,70 L 58,64 L 61,64 L 61,56 L 63,56 L 63,52
          L 65,52 L 65,56 L 68,56 L 68,68 L 74,68 L 74,78 L 80,78 L 80,88
          L 90,88 L 90,72 L 96,72 L 96,65 L 102,65 L 102,78 L 110,78 L 110,90
          L 118,90 L 118,100 L 126,100 L 126,112 L 136,112 L 136,122 L 144,122
        `} />

        {/* ── Right building block (fill) ── */}
        <path fill="url(#lss-b-r)" d={`
          M 400,180 L 400,138 L 392,138 L 392,124 L 382,124 L 382,110 L 376,110 L 376,102
          L 368,102 L 368,95 L 362,95 L 362,108 L 354,108 L 354,84 L 348,84 L 348,78
          L 345,78 L 345,70 L 342,70 L 342,64 L 339,64 L 339,56 L 337,56 L 337,52
          L 335,52 L 335,56 L 332,56 L 332,68 L 326,68 L 326,78 L 320,78 L 320,88
          L 310,88 L 310,72 L 304,72 L 304,65 L 298,65 L 298,78 L 290,78 L 290,90
          L 282,90 L 282,100 L 274,100 L 274,112 L 264,112 L 264,122 L 256,122 L 256,180 Z
        `} />

        {/* ── Right skyline neon outline ── */}
        <path fill="none" strokeWidth="1.5" stroke="rgba(103,232,249,0.85)" filter="url(#lss-glow)" d={`
          M 400,138 L 392,138 L 392,124 L 382,124 L 382,110 L 376,110 L 376,102
          L 368,102 L 368,95 L 362,95 L 362,108 L 354,108 L 354,84 L 348,84 L 348,78
          L 345,78 L 345,70 L 342,70 L 342,64 L 339,64 L 339,56 L 337,56 L 337,52
          L 335,52 L 335,56 L 332,56 L 332,68 L 326,68 L 326,78 L 320,78 L 320,88
          L 310,88 L 310,72 L 304,72 L 304,65 L 298,65 L 298,78 L 290,78 L 290,90
          L 282,90 L 282,100 L 274,100 L 274,112 L 264,112 L 264,122 L 256,122
        `} />

        {/* ── Antenna spires ── */}
        <line x1="63" y1="52" x2="63" y2="38" stroke="rgba(192,132,252,0.8)" strokeWidth="1"   filter="url(#lss-glow)" />
        <circle cx="63" cy="38" r="2.5" fill="rgba(192,132,252,1)"   filter="url(#lss-glow2)" />
        <line x1="337" y1="52" x2="337" y2="38" stroke="rgba(103,232,249,0.8)" strokeWidth="1" filter="url(#lss-glow)" />
        <circle cx="337" cy="38" r="2.5" fill="rgba(103,232,249,1)"  filter="url(#lss-glow2)" />
        <line x1="96" y1="65" x2="96" y2="54"  stroke="rgba(167,139,250,0.7)" strokeWidth="0.8" filter="url(#lss-glow)" />
        <circle cx="96" cy="54" r="1.8" fill="rgba(167,139,250,0.9)" filter="url(#lss-glow)"  />
        <line x1="304" y1="65" x2="304" y2="54" stroke="rgba(167,139,250,0.7)" strokeWidth="0.8" filter="url(#lss-glow)" />
        <circle cx="304" cy="54" r="1.8" fill="rgba(167,139,250,0.9)" filter="url(#lss-glow)" />

        {/* ── Holographic columns from spire tops ── */}
        <rect x="59" y="38" width="8" height="38" fill="url(#lss-cl)" opacity="0.12" />
        <rect x="333" y="38" width="8" height="38" fill="url(#lss-cr)" opacity="0.12" />

        {/* ── Left window lights ── */}
        {L_WIN.map(([x,y,w,h],i) => (
          <rect key={`wl${i}`} x={x} y={y} width={w} height={h} fill="url(#lss-wl)"
            opacity={i % 3 === 0 ? 0.85 : i % 3 === 1 ? 0.65 : 0.45}
            filter="url(#lss-glow)" rx="0.5" />
        ))}

        {/* ── Right window lights ── */}
        {R_WIN.map(([x,y,w,h],i) => (
          <rect key={`wr${i}`} x={x} y={y} width={w} height={h} fill="url(#lss-wr)"
            opacity={i % 3 === 0 ? 0.85 : i % 3 === 1 ? 0.65 : 0.45}
            filter="url(#lss-glow)" rx="0.5" />
        ))}

        {/* ── Rooftop neon accent lines ── */}
        <line x1="61" y1="56" x2="65" y2="56" stroke="rgba(192,132,252,0.95)" strokeWidth="1.5" filter="url(#lss-glow)" />
        <line x1="335" y1="56" x2="339" y2="56" stroke="rgba(103,232,249,0.95)" strokeWidth="1.5" filter="url(#lss-glow)" />
        <line x1="90" y1="72" x2="96" y2="72" stroke="rgba(167,139,250,0.70)" strokeWidth="1" filter="url(#lss-glow)" />
        <line x1="310" y1="72" x2="304" y2="72" stroke="rgba(167,139,250,0.70)" strokeWidth="1" filter="url(#lss-glow)" />
      </svg>

      {/* ── Neon horizon — 3 layers ───────────────────────────────────────── */}
      {/* Wide diffuse glow */}
      <div className="absolute left-0 right-0" style={{
        bottom: "43%", height: 80,
        background: "linear-gradient(to top, rgba(139,92,246,0.28) 0%, rgba(103,232,249,0.12) 40%, transparent 100%)",
        filter: "blur(8px)",
      }} />
      {/* Medium glow band */}
      <div className="absolute left-0 right-0" style={{
        bottom: "45%", height: 24,
        background: "linear-gradient(to right, transparent 2%, rgba(139,92,246,0.7) 15%, rgba(103,232,249,0.85) 50%, rgba(139,92,246,0.7) 85%, transparent 98%)",
        filter: "blur(4px)",
        animation: "neon-breathe 4s ease-in-out infinite",
      }} />
      {/* Sharp neon line */}
      <div className="absolute left-0 right-0" style={{
        bottom: "46%", height: 2,
        background: "linear-gradient(to right, transparent 4%, rgba(192,132,252,0.95) 18%, rgba(103,232,249,1) 50%, rgba(192,132,252,0.95) 82%, transparent 96%)",
        animation: "neon-breathe 4s ease-in-out infinite",
      }} />

      {/* ── Central stage platform glow ───────────────────────────────────── */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{
        bottom: "44%", width: 220, height: 40,
        background: "radial-gradient(ellipse 50% 100%, rgba(139,92,246,0.45) 0%, rgba(103,232,249,0.15) 50%, transparent 100%)",
        filter: "blur(10px)",
        animation: "neon-breathe 6s ease-in-out 1s infinite",
      }} />

      {/* ── Waveform spectrum bars ────────────────────────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-end"
        style={{ bottom: "46%", gap: "3px" }}
      >
        {W_H.map((h, i) => (
          <div key={i} style={{
            width: 5,
            height: h,
            background: W_C[i],
            borderRadius: "3px 3px 1px 1px",
            transformOrigin: "center bottom",
            animation: `waveform-bar ${W_DUR[i]}s ease-in-out ${W_DEL[i]}s infinite`,
            boxShadow: `0 0 10px ${W_C[i]}cc, 0 0 20px ${W_C[i]}44`,
          }} />
        ))}
      </div>

      {/* ── Central branding ─────────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 flex flex-col items-center" style={{ top: "6%" }}>

        {/* Spotlight cone from top */}
        <div className="absolute" style={{
          width: 180, height: "100%",
          top: 0, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(to bottom, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.06) 60%, transparent 100%)",
          clipPath: "polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)",
          filter: "blur(6px)",
        }} />

        {/* Hero glow halo — very wide, deep purple */}
        <div className="absolute" style={{
          width: 320, height: 320,
          top: -100, left: "50%", transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(139,92,246,0.85) 0%, rgba(99,102,241,0.40) 35%, transparent 68%)",
          filter: "blur(32px)",
          animation: "neon-breathe 6s ease-in-out infinite",
        }} />

        {/* Dark backdrop pill behind logo — makes it cut through scene */}
        <div className="absolute" style={{
          width: 240, height: 140,
          top: -10, left: "50%", transform: "translateX(-50%)",
          background: "radial-gradient(ellipse 60% 70%, rgba(6,2,20,0.75) 0%, transparent 100%)",
          filter: "blur(12px)",
        }} />

        {/* Lightning bolt — even larger */}
        <div className="relative" style={{ zIndex: 3 }}>
          <div className="absolute inset-0 rounded-full" style={{
            width: 140, height: 140,
            top: -22, left: -22,
            background: "radial-gradient(circle, rgba(167,92,246,1) 0%, rgba(192,132,252,0.50) 45%, transparent 70%)",
            filter: "blur(20px)",
            animation: "neon-breathe 4s ease-in-out infinite",
          }} />
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" className="relative">
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              fill="rgba(240,200,255,1)"
              style={{
                filter:
                  "drop-shadow(0 0 6px rgba(255,255,255,0.9)) " +
                  "drop-shadow(0 0 14px rgba(192,132,252,1)) " +
                  "drop-shadow(0 0 30px rgba(139,92,246,1)) " +
                  "drop-shadow(0 0 60px rgba(139,92,246,0.70)) " +
                  "drop-shadow(0 0 100px rgba(139,92,246,0.35))",
              }}
            />
          </svg>
        </div>

        {/* Wordmark — bold white with purple halo */}
        <div className="text-center mt-2" style={{ zIndex: 3, position: "relative" }}>
          <p
            className="font-black tracking-[0.24em] uppercase"
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,1)",
              textShadow:
                "0 0 8px rgba(255,255,255,1), " +
                "0 0 20px rgba(255,255,255,0.7), " +
                "0 0 35px rgba(192,132,252,1), " +
                "0 0 65px rgba(139,92,246,0.90), " +
                "0 0 110px rgba(139,92,246,0.50)",
            }}
          >
            LiveStorm AI
          </p>
          <p
            className="font-bold tracking-[0.50em] uppercase mt-1"
            style={{
              fontSize: 12,
              color: "rgba(150,240,255,1)",
              textShadow:
                "0 0 8px rgba(103,232,249,1), " +
                "0 0 20px rgba(103,232,249,0.90), " +
                "0 0 40px rgba(103,232,249,0.55), " +
                "0 0 70px rgba(103,232,249,0.30)",
            }}
          >
            STREAMING STAGE
          </p>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 mt-3" style={{ zIndex: 3, position: "relative" }}>
          <div style={{
            width: 72, height: 2,
            background: "linear-gradient(to right, transparent, rgba(192,132,252,1))",
            boxShadow: "0 0 8px rgba(192,132,252,0.8), 0 0 16px rgba(192,132,252,0.4)",
          }} />
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "rgba(255,255,255,1)",
            boxShadow:
              "0 0 6px rgba(255,255,255,1), " +
              "0 0 14px rgba(192,132,252,1), " +
              "0 0 28px rgba(192,132,252,0.8), " +
              "0 0 50px rgba(192,132,252,0.45)",
            animation: "neon-breathe 2.5s ease-in-out infinite",
          }} />
          <div style={{
            width: 72, height: 2,
            background: "linear-gradient(to left, transparent, rgba(192,132,252,1))",
            boxShadow: "0 0 8px rgba(192,132,252,0.8), 0 0 16px rgba(192,132,252,0.4)",
          }} />
        </div>

        {/* Status hint */}
        <p
          className="font-bold tracking-[0.32em] uppercase mt-2"
          style={{
            fontSize: 9,
            color: "rgba(192,132,252,0.95)",
            textShadow: "0 0 12px rgba(192,132,252,0.8), 0 0 24px rgba(192,132,252,0.4)",
            letterSpacing: "0.32em",
            position: "relative",
            zIndex: 3,
          }}
        >
          Upload avatar to activate
        </p>
      </div>

    </div>
  );
});
