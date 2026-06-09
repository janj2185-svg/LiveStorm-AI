// Lightweight SVG-based avatar thumbnail — no WebGL needed.
// Used in the avatar selector grid for fast rendering of all 3 avatars.

interface AvatarThumbnailProps {
  avatarKey: string;
  accentColor: string;
  size?: number;
  selected?: boolean;
}

// SVG path sets per style
function AnimeSilhouette({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair spikes */}
      <polygon points="30,4 24,14 28,12" fill={c} opacity="0.95" />
      <polygon points="30,4 36,14 32,12" fill={c} opacity="0.95" />
      <polygon points="30,4 22,16 26,15" fill={c} opacity="0.7" />
      <polygon points="30,4 38,16 34,15" fill={c} opacity="0.7" />
      {/* Head */}
      <ellipse cx="30" cy="20" rx="11" ry="12" fill={c} opacity="0.9" />
      {/* Eyes */}
      <ellipse cx="25" cy="19" rx="3" ry="3.5" fill="white" opacity="0.95" />
      <ellipse cx="35" cy="19" rx="3" ry="3.5" fill="white" opacity="0.95" />
      <ellipse cx="25" cy="19.5" rx="1.8" ry="2.2" fill="#1a1a2e" />
      <ellipse cx="35" cy="19.5" rx="1.8" ry="2.2" fill="#1a1a2e" />
      {/* Neck */}
      <rect x="27" y="30" width="6" height="5" rx="2" fill={c} opacity="0.7" />
      {/* Torso */}
      <rect x="20" y="34" width="20" height="22" rx="5" fill={c} opacity="0.8" />
      {/* Left arm */}
      <rect x="10" y="35" width="8" height="18" rx="4" fill={c} opacity="0.7" transform="rotate(-8 14 44)" />
      {/* Right arm */}
      <rect x="42" y="35" width="8" height="18" rx="4" fill={c} opacity="0.7" transform="rotate(8 46 44)" />
      {/* Legs */}
      <rect x="21" y="55" width="7" height="20" rx="3.5" fill={c} opacity="0.75" />
      <rect x="32" y="55" width="7" height="20" rx="3.5" fill={c} opacity="0.75" />
      {/* Ground glow */}
      <ellipse cx="30" cy="77" rx="16" ry="3" fill={c} opacity="0.2" />
    </svg>
  );
}

function RealisticSilhouette({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair — neat cap */}
      <ellipse cx="30" cy="15" rx="10" ry="7" fill={c} opacity="0.9" />
      <rect x="20" y="15" width="20" height="5" rx="2" fill={c} opacity="0.9" />
      {/* Head — slightly smaller, more oval */}
      <ellipse cx="30" cy="21" rx="9" ry="10" fill={c} opacity="0.85" />
      {/* Eyes — smaller, more realistic */}
      <ellipse cx="26" cy="21" rx="2" ry="2" fill="white" opacity="0.95" />
      <ellipse cx="34" cy="21" rx="2" ry="2" fill="white" opacity="0.95" />
      <ellipse cx="26" cy="21" rx="1.2" ry="1.2" fill="#1a2a3e" />
      <ellipse cx="34" cy="21" rx="1.2" ry="1.2" fill="#1a2a3e" />
      {/* Neck */}
      <rect x="27" y="30" width="6" height="5" rx="2" fill={c} opacity="0.65" />
      {/* Torso — taller, more proportional */}
      <rect x="19" y="34" width="22" height="26" rx="5" fill={c} opacity="0.75" />
      {/* Shoulders wider */}
      <rect x="15" y="34" width="8" height="4" rx="2" fill={c} opacity="0.6" />
      <rect x="37" y="34" width="8" height="4" rx="2" fill={c} opacity="0.6" />
      {/* Arms */}
      <rect x="9" y="36" width="7" height="20" rx="3.5" fill={c} opacity="0.65" transform="rotate(-5 12 46)" />
      <rect x="44" y="36" width="7" height="20" rx="3.5" fill={c} opacity="0.65" transform="rotate(5 47 46)" />
      {/* Legs — longer */}
      <rect x="21" y="59" width="7" height="18" rx="3.5" fill={c} opacity="0.7" />
      <rect x="32" y="59" width="7" height="18" rx="3.5" fill={c} opacity="0.7" />
      {/* Ground glow */}
      <ellipse cx="30" cy="77" rx="14" ry="2.5" fill={c} opacity="0.18" />
    </svg>
  );
}

function ChibiSilhouette({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Round poofy hair — big and round */}
      <circle cx="30" cy="22" r="16" fill={c} opacity="0.9" />
      <circle cx="16" cy="26" r="8" fill={c} opacity="0.85" />
      <circle cx="44" cy="26" r="8" fill={c} opacity="0.85" />
      {/* Head — very large */}
      <circle cx="30" cy="26" r="14" fill={c} opacity="0.88" />
      {/* Big cute eyes */}
      <ellipse cx="24" cy="26" rx="4" ry="4.5" fill="white" opacity="0.96" />
      <ellipse cx="36" cy="26" rx="4" ry="4.5" fill="white" opacity="0.96" />
      <ellipse cx="24" cy="26.5" rx="2.5" ry="3" fill="#1a1a2e" />
      <ellipse cx="36" cy="26.5" rx="2.5" ry="3" fill="#1a1a2e" />
      {/* Highlight dots */}
      <circle cx="25.5" cy="25" r="0.8" fill="white" />
      <circle cx="37.5" cy="25" r="0.8" fill="white" />
      {/* Tiny neck */}
      <rect x="27" y="39" width="6" height="4" rx="2" fill={c} opacity="0.65" />
      {/* Very small torso */}
      <rect x="21" y="42" width="18" height="14" rx="5" fill={c} opacity="0.8" />
      {/* Short arms */}
      <rect x="12" y="43" width="7" height="12" rx="3.5" fill={c} opacity="0.7" transform="rotate(-10 15 49)" />
      <rect x="41" y="43" width="7" height="12" rx="3.5" fill={c} opacity="0.7" transform="rotate(10 45 49)" />
      {/* Tiny legs */}
      <rect x="23" y="55" width="6" height="14" rx="3" fill={c} opacity="0.75" />
      <rect x="31" y="55" width="6" height="14" rx="3" fill={c} opacity="0.75" />
      {/* Ground glow */}
      <ellipse cx="30" cy="70" rx="14" ry="3" fill={c} opacity="0.25" />
    </svg>
  );
}

const STYLE_MAP: Record<string, "anime" | "realistic" | "chibi"> = {
  "storm-default": "anime",
  "storm-serious": "realistic",
  "storm-cute": "chibi",
};

export function AvatarThumbnail({ avatarKey, accentColor, size = 60, selected = false }: AvatarThumbnailProps) {
  const style = STYLE_MAP[avatarKey] ?? "anime";

  return (
    <div
      style={{ width: size, height: Math.round(size * 1.35) }}
      className="relative flex items-center justify-center"
    >
      {/* Glow behind when selected */}
      {selected && (
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-30"
          style={{ background: accentColor }}
        />
      )}
      <div style={{ width: size, height: Math.round(size * 1.33) }} className="relative">
        {style === "anime" && <AnimeSilhouette c={accentColor} />}
        {style === "realistic" && <RealisticSilhouette c={accentColor} />}
        {style === "chibi" && <ChibiSilhouette c={accentColor} />}
      </div>
    </div>
  );
}
