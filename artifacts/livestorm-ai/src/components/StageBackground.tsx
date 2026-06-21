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
    base: "linear-gradient(180deg,rgba(255,255,255,0.92) 0%,rgba(224,242,254,0.72) 55%,rgba(254,243,199,0.58) 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(125,211,252,0.48) 0%,rgba(251,191,36,0.18) 42%,transparent 70%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(255,255,255,0.62) 0%,transparent 64%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(125,211,252,0.18) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(251,191,36,0.16) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(125,211,252,0.38) 0%,rgba(251,191,36,0.18) 42%,transparent 68%)",
    ringColor: "rgba(56,189,248,0.62)",
    ringGlow: "56,189,248",
    scanColor: "rgba(56,189,248,0.18)",
    grid: "rgba(56,189,248,0.06)",
    cornerColor: "rgba(251,191,36,0.60)",
  },
  battle: {
    base: "linear-gradient(180deg,rgba(255,255,255,0.90) 0%,rgba(255,247,237,0.74) 55%,rgba(254,226,226,0.54) 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(251,191,36,0.42) 0%,rgba(251,113,133,0.20) 40%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(255,255,255,0.58) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(251,113,133,0.14) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(251,191,36,0.16) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(251,191,36,0.36) 0%,rgba(251,113,133,0.16) 42%,transparent 68%)",
    ringColor: "rgba(251,191,36,0.66)",
    ringGlow: "251,191,36",
    scanColor: "rgba(251,191,36,0.18)",
    grid: "rgba(251,191,36,0.06)",
    cornerColor: "rgba(251,113,133,0.50)",
  },
  studio: {
    base: "linear-gradient(180deg,rgba(255,255,255,0.94) 0%,rgba(224,242,254,0.72) 55%,rgba(255,247,237,0.58) 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(125,211,252,0.50) 0%,rgba(251,191,36,0.18) 40%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(255,255,255,0.62) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(125,211,252,0.16) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(251,191,36,0.14) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(125,211,252,0.38) 0%,rgba(251,191,36,0.18) 42%,transparent 68%)",
    ringColor: "rgba(56,189,248,0.64)",
    ringGlow: "56,189,248",
    scanColor: "rgba(56,189,248,0.16)",
    grid: "rgba(56,189,248,0.058)",
    cornerColor: "rgba(251,191,36,0.56)",
  },
  cyan: {
    base: "linear-gradient(180deg,rgba(255,255,255,0.92) 0%,rgba(224,242,254,0.70) 55%,rgba(240,249,255,0.58) 100%)",
    orb1: "radial-gradient(ellipse 65% 52% at 50% 28%,rgba(125,211,252,0.48) 0%,rgba(186,230,253,0.30) 42%,transparent 68%)",
    orb2: "radial-gradient(ellipse 110% 38% at 50% 22%,rgba(255,255,255,0.58) 0%,transparent 62%)",
    sideGlow: "radial-gradient(ellipse 40% 60% at 0% 50%,rgba(125,211,252,0.16) 0%,transparent 70%),radial-gradient(ellipse 40% 60% at 100% 50%,rgba(251,191,36,0.12) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 92% 32% at 50% 108%,rgba(125,211,252,0.34) 0%,rgba(251,191,36,0.14) 42%,transparent 68%)",
    ringColor: "rgba(56,189,248,0.60)",
    ringGlow: "56,189,248",
    scanColor: "rgba(56,189,248,0.14)",
    grid: "rgba(56,189,248,0.052)",
    cornerColor: "rgba(56,189,248,0.54)",
  },
  dashboard: {
    base: "linear-gradient(135deg,rgba(255,255,255,0.94) 0%,rgba(224,242,254,0.72) 45%,rgba(255,247,237,0.58) 100%)",
    orb1: "radial-gradient(ellipse 80% 55% at 65% 35%,rgba(125,211,252,0.42) 0%,rgba(251,191,36,0.16) 42%,transparent 70%)",
    orb2: "radial-gradient(ellipse 60% 40% at 20% 60%,rgba(255,255,255,0.62) 0%,transparent 65%)",
    sideGlow: "radial-gradient(ellipse 50% 70% at 0% 50%,rgba(125,211,252,0.16) 0%,transparent 70%),radial-gradient(ellipse 40% 50% at 100% 40%,rgba(251,191,36,0.12) 0%,transparent 70%)",
    floorGlow: "radial-gradient(ellipse 100% 30% at 50% 115%,rgba(125,211,252,0.30) 0%,transparent 65%)",
    ringColor: "rgba(56,189,248,0.52)",
    ringGlow: "56,189,248",
    scanColor: "rgba(56,189,248,0.12)",
    grid: "rgba(56,189,248,0.045)",
    cornerColor: "rgba(251,191,36,0.48)",
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
