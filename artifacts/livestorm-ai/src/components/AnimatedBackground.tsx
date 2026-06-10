import { useEffect, useRef, memo } from "react";

export type BgVariant =
  | "default" | "ai" | "dashboard" | "gamification"
  | "gaming"  | "universe" | "content" | "studio" | "moderation";

interface OrbCfg {
  color: string;
  cx: string; cy: string;
  size: number; opacity: number;
  dur: number; delay?: number;
  anim: string;
}

interface VCfg {
  n: number;        // particle count
  dist: number;     // max connection distance
  spd: number;      // speed
  lA: number;       // line alpha multiplier
  dA: number;       // dot alpha multiplier
  rgb: [number, number, number][];  // color palette
  orbs: OrbCfg[];
  pulses?: boolean; // synapse pulse rings (AI variant)
}

const V: Record<BgVariant, VCfg> = {
  default: {
    n: 48, dist: 120, spd: 0.28, lA: 0.18, dA: 0.58,
    rgb: [[124,58,237],[6,182,212],[59,130,246]],
    orbs: [
      { color:"#7c3aed", cx:"8%",  cy:"10%", size:520, opacity:0.14, dur:14, anim:"aiFloat1" },
      { color:"#06b6d4", cx:"88%", cy:"78%", size:440, opacity:0.11, dur:19, anim:"aiFloat2" },
      { color:"#3b82f6", cx:"65%", cy:"15%", size:360, opacity:0.08, dur:23, anim:"aiFloat3" },
    ],
  },
  dashboard: {
    n: 55, dist: 128, spd: 0.30, lA: 0.20, dA: 0.62,
    rgb: [[124,58,237],[6,182,212],[59,130,246]],
    orbs: [
      { color:"#7c3aed", cx:"5%",  cy:"8%",  size:560, opacity:0.16, dur:15, anim:"aiFloat1" },
      { color:"#0ea5e9", cx:"90%", cy:"85%", size:500, opacity:0.12, dur:21, anim:"aiFloat2" },
      { color:"#8b5cf6", cx:"68%", cy:"18%", size:390, opacity:0.09, dur:13, anim:"aiFloat3" },
    ],
  },
  ai: {
    n: 95, dist: 160, spd: 0.48, lA: 0.28, dA: 0.80, pulses: true,
    rgb: [[139,92,246],[6,182,212],[99,102,241],[168,85,247],[20,184,166]],
    orbs: [
      { color:"#8b5cf6", cx:"14%", cy:"18%", size:680, opacity:0.22, dur:10, anim:"aiFloat1" },
      { color:"#06b6d4", cx:"82%", cy:"72%", size:620, opacity:0.18, dur:13, anim:"aiFloat2" },
      { color:"#a855f7", cx:"55%", cy:"6%",  size:480, opacity:0.15, dur:17, anim:"aiFloat3" },
      { color:"#0891b2", cx:"16%", cy:"84%", size:420, opacity:0.12, dur:22, delay:4, anim:"aiFloat4" },
      { color:"#6366f1", cx:"88%", cy:"26%", size:340, opacity:0.10, dur:9,  delay:6, anim:"aiFloat5" },
    ],
  },
  gamification: {
    n: 58, dist: 128, spd: 0.38, lA: 0.22, dA: 0.65,
    rgb: [[251,191,36],[239,68,68],[124,58,237]],
    orbs: [
      { color:"#f59e0b", cx:"10%", cy:"14%", size:520, opacity:0.16, dur:12, anim:"aiFloat1" },
      { color:"#7c3aed", cx:"85%", cy:"82%", size:460, opacity:0.13, dur:16, anim:"aiFloat2" },
      { color:"#ef4444", cx:"58%", cy:"8%",  size:370, opacity:0.10, dur:19, anim:"aiFloat3" },
    ],
  },
  gaming: {
    n: 65, dist: 140, spd: 0.50, lA: 0.24, dA: 0.70,
    rgb: [[239,68,68],[234,179,8],[124,58,237]],
    orbs: [
      { color:"#ef4444", cx:"12%", cy:"20%", size:520, opacity:0.18, dur:10, anim:"aiFloat1" },
      { color:"#eab308", cx:"82%", cy:"75%", size:460, opacity:0.14, dur:14, anim:"aiFloat2" },
      { color:"#7c3aed", cx:"50%", cy:"5%",  size:390, opacity:0.11, dur:18, anim:"aiFloat3" },
    ],
  },
  universe: {
    n: 72, dist: 150, spd: 0.22, lA: 0.17, dA: 0.58,
    rgb: [[99,102,241],[168,85,247],[16,185,129]],
    orbs: [
      { color:"#6366f1", cx:"10%", cy:"14%", size:620, opacity:0.16, dur:22, anim:"aiFloat1" },
      { color:"#a855f7", cx:"85%", cy:"82%", size:520, opacity:0.13, dur:27, anim:"aiFloat2" },
      { color:"#10b981", cx:"55%", cy:"9%",  size:420, opacity:0.10, dur:19, anim:"aiFloat3" },
    ],
  },
  content: {
    n: 44, dist: 108, spd: 0.24, lA: 0.15, dA: 0.48,
    rgb: [[16,185,129],[6,182,212],[59,130,246]],
    orbs: [
      { color:"#10b981", cx:"8%",  cy:"10%", size:490, opacity:0.14, dur:16, anim:"aiFloat1" },
      { color:"#06b6d4", cx:"88%", cy:"82%", size:430, opacity:0.11, dur:20, anim:"aiFloat2" },
    ],
  },
  studio: {
    n: 55, dist: 128, spd: 0.36, lA: 0.20, dA: 0.60,
    rgb: [[249,115,22],[239,68,68],[124,58,237]],
    orbs: [
      { color:"#f97316", cx:"10%", cy:"12%", size:540, opacity:0.15, dur:13, anim:"aiFloat1" },
      { color:"#ef4444", cx:"85%", cy:"80%", size:470, opacity:0.12, dur:18, anim:"aiFloat2" },
      { color:"#7c3aed", cx:"62%", cy:"10%", size:390, opacity:0.09, dur:22, anim:"aiFloat3" },
    ],
  },
  moderation: {
    n: 48, dist: 118, spd: 0.28, lA: 0.16, dA: 0.55,
    rgb: [[239,68,68],[251,191,36],[124,58,237]],
    orbs: [
      { color:"#ef4444", cx:"8%",  cy:"12%", size:500, opacity:0.15, dur:14, anim:"aiFloat1" },
      { color:"#7c3aed", cx:"88%", cy:"80%", size:440, opacity:0.11, dur:20, anim:"aiFloat2" },
    ],
  },
};

const FRAME_MS = 1000 / 30;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; pulse: number;
  ci: number;
}

interface PulseRing {
  x: number; y: number;
  r: number; maxR: number;
  alpha: number;
  rgb: [number, number, number];
}

export const AnimatedBackground = memo(function AnimatedBackground({
  variant = "default",
}: {
  variant?: BgVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const stateRef  = useRef<{
    particles: Particle[];
    pulses: PulseRing[];
    lastFrame: number;
    pulseTimer: number;
    w: number; h: number;
  }>({ particles: [], pulses: [], lastFrame: 0, pulseTimer: 0, w: 0, h: 0 });

  const cfg = V[variant];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const state = stateRef.current;

    function initParticles(w: number, h: number) {
      state.particles = Array.from({ length: cfg.n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * cfg.spd * 2,
        vy: (Math.random() - 0.5) * cfg.spd * 2,
        r: Math.random() * 1.6 + 0.5,
        pulse: Math.random() * Math.PI * 2,
        ci: Math.floor(Math.random() * cfg.rgb.length),
      }));
      state.pulses = [];
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      state.w = w; state.h = h;
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width  = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(dpr, dpr);
      initParticles(w, h);
    }

    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (ts - state.lastFrame < FRAME_MS) return;
      state.lastFrame = ts;

      const { w, h, particles, pulses } = state;
      ctx!.clearRect(0, 0, w, h);

      // — Move particles —
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.025;
        if (p.x < 0)  { p.x = 0;  p.vx *= -1; }
        if (p.x > w)  { p.x = w;  p.vx *= -1; }
        if (p.y < 0)  { p.y = 0;  p.vy *= -1; }
        if (p.y > h)  { p.y = h;  p.vy *= -1; }
      }

      // — Synapse pulse rings (AI variant only) —
      if (cfg.pulses) {
        state.pulseTimer++;
        if (state.pulseTimer % 18 === 0 && particles.length > 0) {
          const p = particles[Math.floor(Math.random() * particles.length)];
          pulses.push({
            x: p.x, y: p.y,
            r: p.r, maxR: 60 + Math.random() * 50,
            alpha: 0.55,
            rgb: cfg.rgb[p.ci],
          });
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const pu = pulses[i];
          pu.r     += 1.8;
          pu.alpha -= 0.018;
          if (pu.alpha <= 0) { pulses.splice(i, 1); continue; }
          const [r, g, b] = pu.rgb;
          ctx!.beginPath();
          ctx!.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(${r},${g},${b},${pu.alpha.toFixed(3)})`;
          ctx!.lineWidth = 1.2;
          ctx!.stroke();
        }
      }

      // — Connection lines —
      const d2max = cfg.dist * cfg.dist;
      ctx!.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const [ar, ag, ab] = cfg.rgb[a.ci];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < d2max) {
            const alpha = (1 - Math.sqrt(d2) / cfg.dist) * cfg.lA;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = `rgba(${ar},${ag},${ab},${alpha.toFixed(3)})`;
            ctx!.stroke();
          }
        }
      }

      // — Particles —
      for (const p of particles) {
        const [r, g, b] = cfg.rgb[p.ci];
        const alpha = (0.30 + 0.22 * Math.sin(p.pulse)) * cfg.dA;
        // Soft glow halo
        if (p.r > 1.2) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.12).toFixed(3)})`;
          ctx!.fill();
        }
        // Core dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx!.fill();
      }
    }

    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [variant]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0,
        zIndex: 0, pointerEvents: "none", overflow: "hidden",
      }}
    >
      {/* ── Deep gradient base ── */}
      <div style={{
        position: "absolute", inset: 0,
        background:
          "linear-gradient(135deg," +
          "hsl(230,42%,4%) 0%," +
          "hsl(244,38%,6%) 40%," +
          "hsl(220,45%,5%) 70%," +
          "hsl(260,35%,4%) 100%)",
      }} />

      {/* ── Floating radial orbs ── */}
      {cfg.orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: orb.cx, top: orb.cy,
            width: orb.size, height: orb.size,
            transform: "translate(-50%,-50%)",
            background: `radial-gradient(circle,${orb.color}${
              Math.round(orb.opacity * 255).toString(16).padStart(2, "0")
            } 0%,transparent 70%)`,
            borderRadius: "50%",
            animation: `${orb.anim} ${orb.dur}s ease-in-out infinite`,
            animationDelay: `${-(orb.delay ?? 0)}s`,
            willChange: "transform",
          }}
        />
      ))}

      {/* ── Neural network canvas ── */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* ── Subtle grid for depth ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage:
          "linear-gradient(rgba(139,92,246,0.035) 1px,transparent 1px)," +
          "linear-gradient(90deg,rgba(139,92,246,0.035) 1px,transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* ── Vignette edge darkening ── */}
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(ellipse 80% 80% at 50% 50%," +
          "transparent 40%,rgba(0,0,4,0.55) 100%)",
      }} />
    </div>
  );
});
