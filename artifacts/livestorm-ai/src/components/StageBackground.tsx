import { memo } from "react";
import { cn } from "@/lib/utils";

export type StageVariant = "purple" | "battle" | "studio" | "cyan" | "dashboard";

interface VConfig {
  base: string;
  orb1: string;
  orb2: string;
  sideGlow: string;
  floorGlow: string;
  ringColor: string;
  ringGlow: string;
  scanColor: string;
  grid: string;
  cornerColor: string;
}

const STAGE_VARIANTS: Record<StageVariant, VConfig> = {
  purple: {
    base: "linear-gradient(180deg,#0b0220 0%,#060118 55%,#0c031e 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(168,85,247,0.62) 0%,rgba(99,102,241,0.32) 38%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(79,70,229,0.22) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(109,40,217,0.18) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(139,92,246,0.14) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(139,92,246,0.65) 0%,rgba(88,28,135,0.30) 42%,transparent 68%)",
    ringColor: "rgba(192,132,252,0.72)",
    ringGlow: "139,92,246",
    scanColor: "rgba(192,132,252,0.12)",
    grid: "rgba(139,92,246,0.048)",
    cornerColor: "rgba(167,139,250,0.55)",
  },
  battle: {
    base: "linear-gradient(180deg,#140307 0%,#0d0204 55%,#130406 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(239,68,68,0.60) 0%,rgba(234,179,8,0.24) 38%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(185,28,28,0.22) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(220,38,38,0.18) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(234,179,8,0.12) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(239,68,68,0.62) 0%,rgba(127,29,29,0.32) 42%,transparent 68%)",
    ringColor: "rgba(252,165,165,0.70)",
    ringGlow: "239,68,68",
    scanColor: "rgba(252,165,165,0.10)",
    grid: "rgba(239,68,68,0.044)",
    cornerColor: "rgba(252,165,165,0.50)",
  },
  studio: {
    base: "linear-gradient(180deg,#020e1a 0%,#020b14 55%,#021018 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(6,182,212,0.55) 0%,rgba(59,130,246,0.28) 38%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(14,165,233,0.18) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(6,182,212,0.16) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(59,130,246,0.12) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(6,182,212,0.58) 0%,rgba(8,145,178,0.28) 42%,transparent 68%)",
    ringColor: "rgba(103,232,249,0.68)",
    ringGlow: "6,182,212",
    scanColor: "rgba(103,232,249,0.10)",
    grid: "rgba(6,182,212,0.042)",
    cornerColor: "rgba(103,232,249,0.50)",
  },
  cyan: {
    base: "linear-gradient(180deg,#07021a 0%,#04011a 55%,#070318 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(139,92,246,0.52) 0%,rgba(6,182,212,0.30) 38%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(99,102,241,0.18) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(109,40,217,0.16) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(6,182,212,0.14) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(109,40,217,0.55) 0%,rgba(6,182,212,0.22) 42%,transparent 68%)",
    ringColor: "rgba(167,139,250,0.65)",
    ringGlow: "109,40,217",
    scanColor: "rgba(103,232,249,0.09)",
    grid: "rgba(99,102,241,0.042)",
    cornerColor: "rgba(139,92,246,0.50)",
  },
  dashboard: {
    base: "linear-gradient(135deg,#080220 0%,#050118 45%,#070220 100%)",
    orb1: "radial-gradient(ellipse 80% 55% at 65% 35%,rgba(139,92,246,0.48) 0%,rgba(6,182,212,0.22) 42%,transparent 70%)",
    orb2: "radial-gradient(ellipse 60% 40% at 20% 60%,rgba(99,102,241,0.20) 0%,transparent 65%)",
    sideGlow: "radial-gradient(ellipse 50% 70% at 0% 50%,rgba(109,40,217,0.18) 0%,transparent 70%),radial-gradient(ellipse 40% 50% at 100% 40%,rgba(6,182,212,0.12) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 100% 30% at 50% 115%,rgba(109,40,217,0.45) 0%,transparent 65%)",
    ringColor: "rgba(167,139,250,0.55)",
    ringGlow: "109,40,217",
    scanColor: "rgba(167,139,250,0.07)",
    grid: "rgba(139,92,246,0.038)",
    cornerColor: "rgba(139,92,246,0.45)",
  },
};

export const StageBackground = memo(function StageBackground({
  variant = "purple",
  showRing = true,
  showScan = true,
  showGrid = true,
  showCorners = true,
  className,
}: {
  variant?: StageVariant;
  showRing?: boolean;
  showScan?: boolean;
  showGrid?: boolean;
  showCorners?: boolean;
  className?: string;
}) {
  const v = STAGE_VARIANTS[variant];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none",
        className,
      )}
    >
      {/* ── Base deep gradient ── */}
      <div className="absolute inset-0" style={{ background: v.base }} />

      {/* ── Central orb (main sphere glow) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: v.orb1,
          animation: "neon-breathe 9s ease-in-out infinite",
        }}
      />

      {/* ── Secondary outer nebula ── */}
      <div
        className="absolute inset-0"
        style={{
          background: v.orb2,
          animation: "neon-breathe 12s ease-in-out 3s infinite",
        }}
      />

      {/* ── Side ambient glow ── */}
      <div className="absolute inset-0" style={{ background: v.sideGlow }} />

      {/* ── Floor upward bloom ── */}
      <div className="absolute inset-0" style={{ background: v.floorGlow }} />

      {/* ── Subtle grid overlay ── */}
      {showGrid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${v.grid} 1px,transparent 1px),linear-gradient(90deg,${v.grid} 1px,transparent 1px)`,
            backgroundSize: "52px 52px",
          }}
        />
      )}

      {/* ── Outer floor ring ── */}
      {showRing && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "-6%",
            width: "88%",
            height: 0,
            paddingBottom: "20%",
            borderRadius: "50%",
            border: `1.5px solid ${v.ringColor}`,
            boxShadow: `0 0 22px 6px rgba(${v.ringGlow},0.45),0 0 55px 14px rgba(${v.ringGlow},0.20),inset 0 0 18px 4px rgba(${v.ringGlow},0.30)`,
            animation: "stage-ring-pulse 5s ease-in-out infinite",
          }}
        />
      )}

      {/* ── Inner floor ring ── */}
      {showRing && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "-10%",
            width: "54%",
            height: 0,
            paddingBottom: "11%",
            borderRadius: "50%",
            border: `1px solid ${v.ringColor}`,
            boxShadow: `0 0 14px 3px rgba(${v.ringGlow},0.38)`,
            opacity: 0.58,
            animation: "stage-ring-pulse 5s ease-in-out 2.5s infinite",
          }}
        />
      )}

      {/* ── Scan sweep line ── */}
      {showScan && (
        <div
          className="absolute left-0 right-0"
          style={{
            height: "2px",
            background: `linear-gradient(90deg,transparent 0%,${v.scanColor} 15%,rgba(255,255,255,0.16) 50%,${v.scanColor} 85%,transparent 100%)`,
            animation: "stage-scan 11s linear infinite",
            top: 0,
          }}
        />
      )}

      {/* ── Vignette edge darkening ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 115% 105% at 50% 50%,transparent 38%,rgba(0,0,0,0.70) 100%)",
        }}
      />

      {/* ── HUD corner brackets ── */}
      {showCorners && (
        <>
          <div
            className="absolute top-3 left-3 w-7 h-7"
            style={{
              borderTop: `1.5px solid ${v.cornerColor}`,
              borderLeft: `1.5px solid ${v.cornerColor}`,
              borderTopLeftRadius: "5px",
            }}
          />
          <div
            className="absolute top-3 right-3 w-7 h-7"
            style={{
              borderTop: `1.5px solid ${v.cornerColor}`,
              borderRight: `1.5px solid ${v.cornerColor}`,
              borderTopRightRadius: "5px",
            }}
          />
          <div
            className="absolute bottom-3 left-3 w-7 h-7"
            style={{
              borderBottom: `1.5px solid ${v.cornerColor}`,
              borderLeft: `1.5px solid ${v.cornerColor}`,
              borderBottomLeftRadius: "5px",
            }}
          />
          <div
            className="absolute bottom-3 right-3 w-7 h-7"
            style={{
              borderBottom: `1.5px solid ${v.cornerColor}`,
              borderRight: `1.5px solid ${v.cornerColor}`,
              borderBottomRightRadius: "5px",
            }}
          />
        </>
      )}
    </div>
  );
});
