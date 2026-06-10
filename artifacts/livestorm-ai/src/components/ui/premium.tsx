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
