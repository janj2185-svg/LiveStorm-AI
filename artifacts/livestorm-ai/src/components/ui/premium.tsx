import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function AnimatedCounter({
  target,
  duration = 1000,
  className,
}: {
  target: number;
  duration?: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const start = performance.now();
    const diff = target - from;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span className={className}>{count.toLocaleString()}</span>;
}

export function GradientText({
  children,
  className,
  from = "from-violet-400",
  to = "to-cyan-400",
}: {
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
}) {
  return (
    <span className={cn(`bg-gradient-to-r ${from} ${to} bg-clip-text text-transparent`, className)}>
      {children}
    </span>
  );
}

export function PulsingDot({
  color = "bg-green-500",
  size = "h-2 w-2",
}: {
  color?: string;
  size?: string;
}) {
  return (
    <span className="relative flex items-center justify-center">
      <span className={cn("absolute inline-flex rounded-full opacity-75 animate-ping", color, size)} />
      <span className={cn("relative inline-flex rounded-full", color, size)} />
    </span>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center font-black text-sm text-yellow-900 shadow-lg shadow-yellow-500/30 shrink-0">
        1
      </div>
    );
  if (rank === 2)
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center font-black text-sm text-slate-900 shadow-md shadow-slate-400/20 shrink-0">
        2
      </div>
    );
  if (rank === 3)
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-800 flex items-center justify-center font-black text-sm text-amber-100 shadow-md shadow-amber-700/20 shrink-0">
        3
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-muted-foreground shrink-0">
      {rank}
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  colorClass = "stroke-violet-500",
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(value / max, 1) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-white/10"
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={colorClass}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

export function PageHero({
  icon,
  eyebrow,
  title,
  subtitle,
  right,
  gradientFrom = "rgba(124,58,237,0.18)",
  gradientTo = "rgba(14,165,233,0.10)",
  className,
}: {
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  right?: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] p-6 md:p-8",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(124,58,237,0.12), transparent 60%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && <div className="hidden sm:block">{icon}</div>}
          <div>
            {eyebrow && <div className="mb-2">{eyebrow}</div>}
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-1.5 text-sm md:text-base max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}

export function GlassCard({
  children,
  className,
  glowColor,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm",
        glowColor && `shadow-xl ${glowColor}`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatWidget({
  icon,
  label,
  value,
  sub,
  iconBg = "bg-violet-500/15",
  iconColor = "text-violet-400",
  animate = false,
  glowColor,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  iconBg?: string;
  iconColor?: string;
  animate?: boolean;
  glowColor?: string;
  trend?: "up" | "down";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-all duration-300",
        glowColor && `shadow-xl ${glowColor}`,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-bold",
              trend === "up" ? "text-green-400" : "text-red-400",
            )}
          >
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>
      <div className="text-3xl md:text-4xl font-black text-white tabular-nums leading-none">
        {animate && typeof value === "number" ? (
          <AnimatedCounter target={value} />
        ) : typeof value === "number" ? (
          value.toLocaleString()
        ) : (
          value
        )}
      </div>
      <div className="text-xs text-muted-foreground font-medium mt-1.5">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── HolographicOrb ───────────────────────────────────────────────────────────
// Animated AI avatar orb used in the AI Co-Host hero section.
export function HolographicOrb({
  size = 200,
  isActive = false,
}: {
  size?: number;
  isActive?: boolean;
}) {
  const half = size / 2;

  const rings = [
    { sz: size * 0.92, color: "rgba(124,58,237,0.22)", bw: 1.5, dur: "14s",  cw: true,  dot: "#a78bfa", ds: 7 },
    { sz: size * 0.76, color: "rgba(34,211,238,0.18)",  bw: 1,   dur: "9s",   cw: false, dot: "#22d3ee", ds: 5 },
    { sz: size * 0.60, color: "rgba(244,114,182,0.15)", bw: 1,   dur: "5.5s", cw: true,  dot: "#f472b6", ds: 4 },
  ];

  const particles = [
    { l: "12%", t: "9%",  d: 0,   c: "#a78bfa" },
    { l: "79%", t: "13%", d: 0.7, c: "#22d3ee" },
    { l: "5%",  t: "58%", d: 1.4, c: "#f472b6" },
    { l: "87%", t: "63%", d: 0.3, c: "#a78bfa" },
    { l: "21%", t: "84%", d: 1.8, c: "#22d3ee" },
    { l: "71%", t: "82%", d: 0.9, c: "#fbbf24" },
  ];

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      {/* Ambient glow halo */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          inset: "-18%",
          background: isActive
            ? "radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(124,58,237,0.22) 40%, transparent 70%)"
            : "radial-gradient(circle, rgba(124,58,237,0.20) 0%, rgba(14,165,233,0.08) 50%, transparent 70%)",
          animation: "holo-pulse 4s ease-in-out infinite",
        }}
      />

      {/* Orbital rings */}
      {rings.map((ring, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: ring.sz,
            height: ring.sz,
            top: half - ring.sz / 2,
            left: half - ring.sz / 2,
            border: `${ring.bw}px solid ${ring.color}`,
            animation: `${ring.cw ? "orbit-cw" : "orbit-ccw"} ${ring.dur} linear infinite`,
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: ring.ds,
              height: ring.ds,
              top: -(ring.ds / 2),
              left: "50%",
              marginLeft: -(ring.ds / 2),
              background: ring.dot,
              boxShadow: `0 0 ${ring.ds * 2}px ${ring.dot}, 0 0 ${ring.ds}px ${ring.dot}`,
            }}
          />
        </div>
      ))}

      {/* Core */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Glow halo behind core */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.58,
            height: size * 0.58,
            background: "radial-gradient(circle, rgba(124,58,237,0.42) 0%, transparent 70%)",
            animation: "holo-pulse 3s ease-in-out infinite",
          }}
        />
        {/* Core sphere */}
        <div
          className="relative rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: size * 0.42,
            height: size * 0.42,
            background: "radial-gradient(circle at 38% 32%, #c4b5fd 0%, #7c3aed 50%, #3b0764 100%)",
            animation: "holo-glow 3s ease-in-out infinite",
          }}
        >
          {/* Specular highlight */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: "radial-gradient(circle at 33% 26%, rgba(255,255,255,0.28) 0%, transparent 52%)",
            }}
          />
          {/* Scan line */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                animation: "scan-line 2.5s ease-in-out infinite",
              }}
            />
          </div>
          {/* Bot icon — inline SVG so no import needed */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: size * 0.2, height: size * 0.2, opacity: 0.92, position: "relative", zIndex: 1 }}
          >
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M12 8V4H8" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </svg>
        </div>
      </div>

      {/* Floating data particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 5,
            height: 5,
            left: p.l,
            top: p.t,
            background: p.c,
            boxShadow: `0 0 8px ${p.c}, 0 0 3px ${p.c}`,
            animation: `float-dot 3.5s ease-in-out ${p.d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── GlowBorder ──────────────────────────────────────────────────────────────
// Wraps children in an animated gradient border when active=true.
export function GlowBorder({
  children,
  className,
  active = false,
  color = "violet",
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  color?: "violet" | "cyan" | "green" | "amber";
}) {
  const gradients: Record<string, string> = {
    violet: "from-violet-500 via-purple-400 to-cyan-500",
    cyan:   "from-cyan-400 via-blue-500 to-violet-500",
    green:  "from-green-400 via-emerald-500 to-cyan-400",
    amber:  "from-amber-400 via-orange-500 to-pink-500",
  };

  if (!active) {
    return (
      <div className={cn("rounded-2xl border border-white/[0.08]", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-2xl overflow-hidden p-px", className)}>
      <div
        className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-80",
          gradients[color] ?? gradients.violet,
        )}
        style={{ backgroundSize: "200% 200%", animation: "gradient-x 3s ease infinite" }}
      />
      <div className="relative rounded-[calc(1rem-1px)] bg-card overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── ShimmerLine ─────────────────────────────────────────────────────────────
// A horizontal shimmer sweep — use as an overlay on loading / active items.
export function ShimmerLine({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-full h-px bg-white/5", className)}>
      <div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        style={{ animation: "shimmer-slide 2s ease-in-out infinite" }}
      />
    </div>
  );
}
