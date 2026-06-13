import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export function GlassCard({
  children,
  className,
  hover = false,
  glow,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "violet" | "cyan" | "green" | "amber" | "red";
}) {
  const glowMap = {
    violet: "shadow-lg shadow-violet-500/10 border-violet-500/15",
    cyan:   "shadow-lg shadow-cyan-500/10 border-cyan-500/15",
    green:  "shadow-lg shadow-green-500/10 border-green-500/15",
    amber:  "shadow-lg shadow-amber-500/10 border-amber-500/15",
    red:    "shadow-lg shadow-red-500/10 border-red-500/15",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border backdrop-blur-sm",
        "bg-white/[0.04] border-white/[0.08]",
        hover && "hover:bg-white/[0.06] hover:border-white/[0.13] transition-all duration-200 cursor-pointer",
        glow && glowMap[glow],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border backdrop-blur-md",
        "bg-white/[0.03] border-white/[0.06]",
        "shadow-2xl shadow-black/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 py-4",
        "border-b border-white/[0.06]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatBubble({
  label,
  value,
  icon: Icon,
  color = "violet",
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: "violet" | "cyan" | "green" | "amber" | "pink" | "blue";
  sublabel?: string;
}) {
  const colorMap = {
    violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/20" },
    cyan:   { bg: "bg-cyan-500/15",   text: "text-cyan-400",   border: "border-cyan-500/20" },
    green:  { bg: "bg-green-500/15",  text: "text-green-400",  border: "border-green-500/20" },
    amber:  { bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/20" },
    pink:   { bg: "bg-pink-500/15",   text: "text-pink-400",   border: "border-pink-500/20" },
    blue:   { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/20" },
  };
  const c = colorMap[color];
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl border flex-shrink-0", c.bg, c.border)}>
        <Icon className={cn("h-4 w-4", c.text)} />
      </div>
      <div>
        <p className="text-xl font-black text-white tabular-nums leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-[10px] text-white/40 font-medium mt-0.5">{sublabel ?? label}</p>
      </div>
    </div>
  );
}

export function LiveDot({ color = "green", label }: { color?: string; label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex items-center justify-center">
        <span className={cn("absolute inline-flex rounded-full opacity-75 animate-ping h-2 w-2", color)} />
        <span className={cn("relative inline-flex rounded-full h-2 w-2", color)} />
      </span>
      {label && <span className={cn("text-xs font-bold uppercase tracking-widest", color.replace("bg-", "text-"))}>{label}</span>}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.12em]">{children}</h3>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function GradientPill({
  children,
  className,
  variant = "violet",
}: {
  children: ReactNode;
  className?: string;
  variant?: "violet" | "green" | "amber" | "cyan" | "red";
}) {
  const v = {
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    green:  "bg-green-500/15 text-green-300 border-green-500/25",
    amber:  "bg-amber-500/15 text-amber-300 border-amber-500/25",
    cyan:   "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    red:    "bg-red-500/15 text-red-300 border-red-500/25",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", v[variant], className)}>
      {children}
    </span>
  );
}

export function QuickActionBtn({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  const v = {
    default: "bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.09] hover:text-white",
    primary: "bg-violet-600/25 border-violet-500/30 text-violet-300 hover:bg-violet-600/35 hover:text-white",
    danger:  "bg-red-500/15 border-red-500/25 text-red-400 hover:bg-red-500/25 hover:text-white",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 transition-all duration-150 w-full",
        v[variant],
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-semibold leading-none text-center">{label}</span>
    </button>
  );
}
