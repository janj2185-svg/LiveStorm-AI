const PARTICLES: Array<{ x: string; y: string; r: number; dur: number; del: number; col: string }> = [
  { x: "7%",  y: "7%",  r: 3.5, dur: 5.2,  del: 0.0, col: "rgba(167,139,250,0.92)" },
  { x: "19%", y: "11%", r: 2.5, dur: 7.1,  del: 1.5, col: "rgba(103,232,249,0.82)" },
  { x: "33%", y: "5%",  r: 4.0, dur: 4.3,  del: 0.7, col: "rgba(192,132,252,0.88)" },
  { x: "48%", y: "8%",  r: 3.0, dur: 6.0,  del: 3.1, col: "rgba(139,92,246,0.85)"  },
  { x: "62%", y: "6%",  r: 3.5, dur: 5.8,  del: 2.0, col: "rgba(103,232,249,0.88)" },
  { x: "74%", y: "10%", r: 2.5, dur: 8.0,  del: 0.4, col: "rgba(167,139,250,0.78)" },
  { x: "87%", y: "7%",  r: 4.0, dur: 6.4,  del: 1.2, col: "rgba(139,92,246,0.85)"  },
  { x: "94%", y: "14%", r: 2.5, dur: 5.5,  del: 4.0, col: "rgba(192,132,252,0.72)" },
  { x: "4%",  y: "26%", r: 5.0, dur: 4.7,  del: 1.9, col: "rgba(139,92,246,0.78)"  },
  { x: "23%", y: "29%", r: 3.5, dur: 6.2,  del: 0.9, col: "rgba(103,232,249,0.72)" },
  { x: "41%", y: "21%", r: 4.5, dur: 9.1,  del: 2.7, col: "rgba(167,139,250,0.72)" },
  { x: "59%", y: "27%", r: 3.0, dur: 5.5,  del: 3.8, col: "rgba(192,132,252,0.68)" },
  { x: "76%", y: "23%", r: 5.0, dur: 7.3,  del: 1.1, col: "rgba(139,92,246,0.72)"  },
  { x: "91%", y: "31%", r: 3.5, dur: 4.9,  del: 4.2, col: "rgba(103,232,249,0.68)" },
  { x: "11%", y: "44%", r: 4.0, dur: 6.7,  del: 2.5, col: "rgba(167,139,250,0.62)" },
  { x: "29%", y: "49%", r: 3.0, dur: 8.5,  del: 0.6, col: "rgba(192,132,252,0.58)" },
  { x: "51%", y: "42%", r: 5.0, dur: 5.0,  del: 3.3, col: "rgba(139,92,246,0.65)"  },
  { x: "69%", y: "47%", r: 3.5, dur: 6.9,  del: 1.7, col: "rgba(103,232,249,0.58)" },
  { x: "86%", y: "43%", r: 4.0, dur: 7.4,  del: 4.5, col: "rgba(167,139,250,0.58)" },
  { x: "3%",  y: "61%", r: 3.5, dur: 5.6,  del: 2.0, col: "rgba(192,132,252,0.52)" },
  { x: "21%", y: "67%", r: 3.0, dur: 4.8,  del: 1.3, col: "rgba(139,92,246,0.48)"  },
  { x: "39%", y: "64%", r: 4.0, dur: 7.2,  del: 3.6, col: "rgba(103,232,249,0.48)" },
  { x: "57%", y: "69%", r: 3.0, dur: 5.3,  del: 0.8, col: "rgba(167,139,250,0.42)" },
  { x: "75%", y: "62%", r: 4.0, dur: 6.6,  del: 2.8, col: "rgba(192,132,252,0.42)" },
  { x: "93%", y: "66%", r: 3.5, dur: 8.1,  del: 1.5, col: "rgba(139,92,246,0.42)"  },
  { x: "14%", y: "17%", r: 6.5, dur: 10.0, del: 0.0, col: "rgba(192,132,252,0.60)" },
  { x: "83%", y: "19%", r: 6.5, dur: 12.0, del: 5.0, col: "rgba(103,232,249,0.60)" },
  { x: "50%", y: "14%", r: 7.5, dur: 11.0, del: 2.5, col: "rgba(167,139,250,0.55)" },
  { x: "32%", y: "37%", r: 5.5, dur: 9.5,  del: 1.8, col: "rgba(139,92,246,0.52)"  },
  { x: "67%", y: "41%", r: 5.5, dur: 8.8,  del: 3.2, col: "rgba(103,232,249,0.50)" },
];

const W_H = [8,13,20,28,36,44,52,58,62,64,62,58,52,44,36,28,20,13,8,13,20,28,13];
const W_C = [
  "#8b5cf6","#a78bfa","#c084fc","#06b6d4","#67e8f9","#8b5cf6","#a78bfa",
  "#06b6d4","#c084fc","#a78bfa","#8b5cf6","#06b6d4","#67e8f9","#a78bfa",
  "#c084fc","#8b5cf6","#06b6d4","#a78bfa","#8b5cf6","#c084fc","#06b6d4","#67e8f9","#8b5cf6",
];
const W_DUR = [1.8,2.2,1.6,2.5,1.9,3.0,1.7,2.4,2.0,2.8,2.1,1.5,2.4,1.8,2.7,1.6,2.2,1.9,2.5,1.7,2.0,2.3,1.8];
const W_DEL = [0.0,0.15,0.40,0.08,0.65,0.25,0.50,0.10,0.75,0.35,0.05,0.55,0.20,0.45,0.30,0.70,0.12,0.58,0.38,0.82,0.25,0.48,0.92];

const L_WIN = [
  [47,83,3,3],[47,87,3,3],[47,91,3,3],[53,83,3,3],[53,88,3,3],
  [71,60,3,4],[71,65,3,4],[71,70,3,3],[77,60,3,3],[77,65,3,3],
  [90,73,4,3],[90,78,4,3],[100,79,4,3],[100,84,4,3],[107,80,4,3],
  [116,92,4,3],[122,102,4,3],
];
const R_WIN = [
  [346,62,3,4],[346,67,3,4],[346,72,3,3],[340,60,3,3],[340,65,3,3],
  [323,70,3,3],[323,75,3,3],[323,80,3,3],[311,73,4,3],[311,78,4,3],
  [299,79,4,3],[299,84,4,3],[292,80,4,3],[283,92,4,3],[277,100,4,3],
];

const BEAMS = [
  { left: "12%", w: 3,   h: "55%", col: "rgba(139,92,246,0.55)",  dur: "6s",  del: "0s"   },
  { left: "21%", w: 1.5, h: "42%", col: "rgba(103,232,249,0.38)", dur: "9s",  del: "2s"   },
  { left: "36%", w: 2,   h: "35%", col: "rgba(192,132,252,0.30)", dur: "7s",  del: "4s"   },
  { left: "88%", w: 3,   h: "55%", col: "rgba(139,92,246,0.55)",  dur: "7s",  del: "3s"   },
  { left: "79%", w: 1.5, h: "42%", col: "rgba(103,232,249,0.38)", dur: "8s",  del: "1s"   },
  { left: "64%", w: 2,   h: "35%", col: "rgba(192,132,252,0.30)", dur: "10s", del: "5s"   },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
  @keyframes neon-breathe {
    0%,100% { opacity:1; filter:brightness(1); }
    50%      { opacity:0.72; filter:brightness(1.35); }
  }
  @keyframes float-dot {
    0%,100% { transform:translateY(0px) scale(1); opacity:1; }
    50%      { transform:translateY(-10px) scale(1.15); opacity:0.65; }
  }
  @keyframes waveform-bar {
    0%,100% { transform:scaleY(1); opacity:0.85; }
    50%      { transform:scaleY(0.35); opacity:0.5; }
  }
`;

export function LiveStormStagePreview() {
  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "linear-gradient(180deg, #04010e 0%, #0a0120 40%, #06011a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{css}</style>

      <div style={{ position: "relative", width: 900, height: 260, overflow: "hidden" }}>

        {BEAMS.map((b, i) => (
          <div key={i} style={{
            position: "absolute", top: 0,
            left: b.left, width: b.w, height: b.h,
            background: `linear-gradient(to bottom, transparent 0%, ${b.col} 30%, ${b.col} 70%, transparent 100%)`,
            filter: "blur(2.5px)",
            animation: `neon-breathe ${b.dur} ease-in-out ${b.del} infinite`,
          }} />
        ))}

        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%",
            left: p.x, top: p.y,
            width: p.r * 2, height: p.r * 2,
            background: p.col,
            boxShadow: `0 0 ${p.r * 5}px ${p.col}, 0 0 ${p.r * 10}px ${p.col.replace(/[\d.]+\)$/, "0.25)")}`,
            animation: `float-dot ${p.dur}s ease-in-out ${p.del}s infinite`,
          }} />
        ))}

        <svg viewBox="0 0 400 180" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "46%" }} preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="b-l" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1e0650" stopOpacity="0.95" />
              <stop offset="60%"  stopColor="#0e0330" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#04010e" stopOpacity="1"    />
            </linearGradient>
            <linearGradient id="b-r" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1a0548" stopOpacity="0.95" />
              <stop offset="60%"  stopColor="#0c0228" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#040110" stopOpacity="1"    />
            </linearGradient>
            <linearGradient id="wl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(192,132,252,1)" />
              <stop offset="100%" stopColor="rgba(103,232,249,0.7)" />
            </linearGradient>
            <linearGradient id="wr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(103,232,249,1)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.7)" />
            </linearGradient>
            <filter id="glow1" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.5" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow2" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <path fill="url(#b-l)" d="M 0,180 L 0,138 L 8,138 L 8,124 L 18,124 L 18,110 L 24,110 L 24,102 L 32,102 L 32,95 L 38,95 L 38,108 L 46,108 L 46,84 L 52,84 L 52,78 L 55,78 L 55,70 L 58,70 L 58,64 L 61,64 L 61,56 L 63,56 L 63,52 L 65,52 L 65,56 L 68,56 L 68,68 L 74,68 L 74,78 L 80,78 L 80,88 L 90,88 L 90,72 L 96,72 L 96,65 L 102,65 L 102,78 L 110,78 L 110,90 L 118,90 L 118,100 L 126,100 L 126,112 L 136,112 L 136,122 L 144,122 L 144,180 Z" />
          <path fill="none" strokeWidth="1.5" stroke="rgba(139,92,246,0.85)" filter="url(#glow1)" d="M 0,138 L 8,138 L 8,124 L 18,124 L 18,110 L 24,110 L 24,102 L 32,102 L 32,95 L 38,95 L 38,108 L 46,108 L 46,84 L 52,84 L 52,78 L 55,78 L 55,70 L 58,70 L 58,64 L 61,64 L 61,56 L 63,56 L 63,52 L 65,52 L 65,56 L 68,56 L 68,68 L 74,68 L 74,78 L 80,78 L 80,88 L 90,88 L 90,72 L 96,72 L 96,65 L 102,65 L 102,78 L 110,78 L 110,90 L 118,90 L 118,100 L 126,100 L 126,112 L 136,112 L 136,122 L 144,122" />
          <path fill="url(#b-r)" d="M 400,180 L 400,138 L 392,138 L 392,124 L 382,124 L 382,110 L 376,110 L 376,102 L 368,102 L 368,95 L 362,95 L 362,108 L 354,108 L 354,84 L 348,84 L 348,78 L 345,78 L 345,70 L 342,70 L 342,64 L 339,64 L 339,56 L 337,56 L 337,52 L 335,52 L 335,56 L 332,56 L 332,68 L 326,68 L 326,78 L 320,78 L 320,88 L 310,88 L 310,72 L 304,72 L 304,65 L 298,65 L 298,78 L 290,78 L 290,90 L 282,90 L 282,100 L 274,100 L 274,112 L 264,112 L 264,122 L 256,122 L 256,180 Z" />
          <path fill="none" strokeWidth="1.5" stroke="rgba(103,232,249,0.85)" filter="url(#glow1)" d="M 400,138 L 392,138 L 392,124 L 382,124 L 382,110 L 376,110 L 376,102 L 368,102 L 368,95 L 362,95 L 362,108 L 354,108 L 354,84 L 348,84 L 348,78 L 345,78 L 345,70 L 342,70 L 342,64 L 339,64 L 339,56 L 337,56 L 337,52 L 335,52 L 335,56 L 332,56 L 332,68 L 326,68 L 326,78 L 320,78 L 320,88 L 310,88 L 310,72 L 304,72 L 304,65 L 298,65 L 298,78 L 290,78 L 290,90 L 282,90 L 282,100 L 274,100 L 274,112 L 264,112 L 264,122 L 256,122" />

          <line x1="63" y1="52" x2="63" y2="38" stroke="rgba(192,132,252,0.8)" strokeWidth="1"   filter="url(#glow1)" />
          <circle cx="63" cy="38" r="2.5" fill="rgba(192,132,252,1)"   filter="url(#glow2)" />
          <line x1="337" y1="52" x2="337" y2="38" stroke="rgba(103,232,249,0.8)" strokeWidth="1" filter="url(#glow1)" />
          <circle cx="337" cy="38" r="2.5" fill="rgba(103,232,249,1)"  filter="url(#glow2)" />

          {L_WIN.map(([x,y,w,h],i) => (
            <rect key={`wl${i}`} x={x} y={y} width={w} height={h} fill="url(#wl)"
              opacity={i % 3 === 0 ? 0.85 : i % 3 === 1 ? 0.65 : 0.45}
              filter="url(#glow1)" rx="0.5" />
          ))}
          {R_WIN.map(([x,y,w,h],i) => (
            <rect key={`wr${i}`} x={x} y={y} width={w} height={h} fill="url(#wr)"
              opacity={i % 3 === 0 ? 0.85 : i % 3 === 1 ? 0.65 : 0.45}
              filter="url(#glow1)" rx="0.5" />
          ))}
        </svg>

        {/* Horizon */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "43%", height: 80, background: "linear-gradient(to top, rgba(139,92,246,0.28) 0%, rgba(103,232,249,0.12) 40%, transparent 100%)", filter: "blur(8px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "45%", height: 24, background: "linear-gradient(to right, transparent 2%, rgba(139,92,246,0.7) 15%, rgba(103,232,249,0.85) 50%, rgba(139,92,246,0.7) 85%, transparent 98%)", filter: "blur(4px)", animation: "neon-breathe 4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "46%", height: 2, background: "linear-gradient(to right, transparent 4%, rgba(192,132,252,0.95) 18%, rgba(103,232,249,1) 50%, rgba(192,132,252,0.95) 82%, transparent 96%)", animation: "neon-breathe 4s ease-in-out infinite" }} />

        {/* Waveform */}
        <div style={{ position: "absolute", bottom: "46%", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "flex-end", gap: 3 }}>
          {W_H.map((h, i) => (
            <div key={i} style={{ width: 5, height: h, background: W_C[i], borderRadius: "3px 3px 1px 1px", transformOrigin: "center bottom", animation: `waveform-bar ${W_DUR[i]}s ease-in-out ${W_DEL[i]}s infinite`, boxShadow: `0 0 10px ${W_C[i]}cc, 0 0 20px ${W_C[i]}44` }} />
          ))}
        </div>

        {/* Central branding */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "5%", display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Spotlight cone */}
          <div style={{ position: "absolute", width: 300, height: "115%", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(to bottom, rgba(255,230,60,0.28) 0%, rgba(192,132,252,0.18) 40%, transparent 100%)", clipPath: "polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)", filter: "blur(10px)" }} />

          {/* Outer corona */}
          <div style={{ position: "absolute", width: 440, height: 440, top: -160, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(255,230,60,0.55) 0%, rgba(192,132,252,0.55) 25%, rgba(103,232,249,0.28) 48%, transparent 66%)", filter: "blur(38px)", animation: "neon-breathe 6s ease-in-out infinite" }} />

          {/* Mid halo */}
          <div style={{ position: "absolute", width: 240, height: 240, top: -70, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(255,255,160,0.80) 0%, rgba(255,180,50,0.70) 18%, rgba(192,132,252,1) 38%, rgba(139,92,246,0.55) 58%, transparent 74%)", filter: "blur(20px)", animation: "neon-breathe 3.5s ease-in-out 0.3s infinite" }} />

          {/* Inner glow */}
          <div style={{ position: "absolute", width: 140, height: 140, top: -22, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(255,255,255,0.70) 0%, rgba(255,240,100,0.60) 25%, rgba(192,132,252,0.50) 50%, transparent 70%)", filter: "blur(12px)", animation: "neon-breathe 2.8s ease-in-out infinite" }} />

          {/* Dark backdrop */}
          <div style={{ position: "absolute", width: 220, height: 150, top: -8, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(ellipse 52% 60%, rgba(3,1,14,0.85) 0%, transparent 100%)", filter: "blur(14px)" }} />

          {/* Bolt */}
          <div style={{ position: "relative", zIndex: 4 }}>
            <div style={{ position: "absolute", width: 132, height: 132, top: -18, left: -18, borderRadius: "50%", border: "2px solid rgba(255,220,60,0.75)", boxShadow: "0 0 16px rgba(255,220,60,0.70), 0 0 32px rgba(255,180,30,0.45), inset 0 0 16px rgba(255,220,60,0.20)", animation: "neon-breathe 2.8s ease-in-out infinite" }} />
            <div style={{ position: "absolute", width: 116, height: 116, top: -10, left: -10, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.65)", boxShadow: "0 0 10px rgba(255,255,255,0.50), 0 0 22px rgba(192,132,252,0.40)", animation: "neon-breathe 2.8s ease-in-out 0.8s infinite" }} />
            <div style={{ position: "absolute", width: 104, height: 104, top: -4, left: -4, borderRadius: "50%", border: "1px solid rgba(192,132,252,0.60)", animation: "neon-breathe 2.8s ease-in-out 1.6s infinite" }} />
            <div style={{ position: "absolute", width: 150, height: 150, top: -27, left: -27, background: "radial-gradient(circle, rgba(255,255,180,1) 0%, rgba(255,220,50,0.85) 20%, rgba(192,132,252,0.70) 45%, transparent 65%)", filter: "blur(22px)", animation: "neon-breathe 3s ease-in-out infinite" }} />
            <svg width="96" height="96" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 5 }}>
              <defs>
                <linearGradient id="bolt-g" x1="0.3" y1="0" x2="0.7" y2="1">
                  <stop offset="0%"   stopColor="#fffde7" />
                  <stop offset="20%"  stopColor="#fff176" />
                  <stop offset="50%"  stopColor="#ffffff" />
                  <stop offset="80%"  stopColor="#f3e8ff" />
                  <stop offset="100%" stopColor="#d8b4fe" />
                </linearGradient>
              </defs>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#bolt-g)" style={{ filter: "drop-shadow(0 0 2px #fff) drop-shadow(0 0 6px rgba(255,255,200,1)) drop-shadow(0 0 14px rgba(255,230,50,1)) drop-shadow(0 0 28px rgba(255,180,30,0.95)) drop-shadow(0 0 50px rgba(192,132,252,1)) drop-shadow(0 0 90px rgba(139,92,246,0.85))" }} />
            </svg>
          </div>

          {/* Wordmark */}
          <div style={{ textAlign: "center", marginTop: 8, zIndex: 4, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffffff", textShadow: "0 0 4px #fff, 0 0 12px #fff, 0 0 28px rgba(255,255,255,0.85), 0 0 55px rgba(200,220,255,0.60)" }}>LIVE</span>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#67e8f9", textShadow: "0 0 4px rgba(103,232,249,1), 0 0 12px rgba(103,232,249,1), 0 0 26px rgba(103,232,249,0.90), 0 0 50px rgba(6,182,212,0.80), 0 0 90px rgba(6,182,212,0.45)" }}>STORM</span>
              <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", color: "#0a0a14", background: "linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%)", borderRadius: 6, padding: "2px 7px", lineHeight: 1.5, boxShadow: "0 0 8px rgba(251,191,36,0.90), 0 0 20px rgba(251,191,36,0.70), 0 0 40px rgba(245,158,11,0.50), 0 2px 4px rgba(0,0,0,0.40)", position: "relative", top: -2 }}>AI</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}>
              <div style={{ width: 50, height: 1.5, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.70), rgba(103,232,249,1))", boxShadow: "0 0 6px rgba(103,232,249,0.70)" }} />
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", boxShadow: "0 0 4px #fff, 0 0 10px rgba(103,232,249,1), 0 0 22px rgba(192,132,252,0.90)", animation: "neon-breathe 2s ease-in-out infinite" }} />
              <div style={{ width: 50, height: 1.5, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.70), rgba(192,132,252,1))", boxShadow: "0 0 6px rgba(192,132,252,0.70)" }} />
            </div>

            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.50em", textTransform: "uppercase", marginTop: 6, color: "rgba(167,139,250,0.95)", textShadow: "0 0 8px rgba(167,139,250,1), 0 0 18px rgba(139,92,246,0.80), 0 0 35px rgba(139,92,246,0.50)" }}>STREAMING STAGE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
