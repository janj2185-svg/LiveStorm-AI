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
    violet: "shadow-lg shadow-sky-500/10 border-sky-200",
    cyan:   "shadow-lg shadow-sky-500/10 border-sky-200",
    green:  "shadow-lg shadow-emerald-500/10 border-emerald-200",
    amber:  "shadow-lg shadow-amber-500/12 border-amber-200",
    red:    "shadow-lg shadow-red-500/10 border-red-200",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border backdrop-blur-2xl",
        "bg-white/64 border-white/75 shadow-[0_20px_70px_rgba(56,119,182,.12)]",
        hover && "hover:bg-white/78 hover:border-sky-200 transition-all duration-200 cursor-pointer hover:-translate-y-0.5",
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
        "rounded-2xl border backdrop-blur-2xl",
        "bg-white/56 border-white/75",
        "shadow-[0_24px_80px_rgba(56,119,182,.12)]",
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
        "border-b border-white/70",
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
    violet: { bg: "bg-sky-50",     text: "text-sky-600",     border: "border-sky-200" },
    cyan:   { bg: "bg-sky-50",     text: "text-sky-600",     border: "border-sky-200" },
    green:  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
    amber:  { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200" },
    pink:   { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-200" },
    blue:   { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200" },
  };
  const c = colorMap[color];
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl border flex-shrink-0", c.bg, c.border)}>
        <Icon className={cn("h-4 w-4", c.text)} />
      </div>
      <div>
        <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sublabel ?? label}</p>
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
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">{children}</h3>
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
    violet: "bg-sky-50 text-sky-700 border-sky-200",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    cyan:   "bg-sky-50 text-sky-700 border-sky-200",
    red:    "bg-red-50 text-red-700 border-red-200",
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
    default: "bg-white/62 border-white/75 text-slate-600 hover:bg-white/80 hover:text-slate-950",
    primary: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:text-sky-900",
    danger:  "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700",
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
