// Lightweight SVG-based avatar thumbnail — no WebGL needed.

interface AvatarThumbnailProps {
  avatarKey: string;
  accentColor: string;
  skinTone?: string;
  hairColor?: string;
  clothingColor?: string;
  size?: number;
  selected?: boolean;
}

function MalePresentorSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair — short professional */}
      <ellipse cx="30" cy="13" rx="11" ry="8" fill={hair} opacity="0.95" />
      <rect x="19" y="13" width="22" height="7" rx="1" fill={hair} opacity="0.9" />
      {/* Head */}
      <ellipse cx="30" cy="22" rx="10" ry="11" fill={skin} />
      {/* Jawline definition */}
      <ellipse cx="30" cy="30" rx="7" ry="4" fill={skin} opacity="0.7" />
      {/* Eyebrows */}
      <path d="M24 17.5 Q26 16.5 28 17.5" stroke="#2a1a0a" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M32 17.5 Q34 16.5 36 17.5" stroke="#2a1a0a" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Eyes — realistic with iris + pupil */}
      <ellipse cx="26" cy="20" rx="2.2" ry="1.8" fill="white" />
      <ellipse cx="34" cy="20" rx="2.2" ry="1.8" fill="white" />
      <ellipse cx="26" cy="20" rx="1.3" ry="1.3" fill="#3a5080" />
      <ellipse cx="34" cy="20" rx="1.3" ry="1.3" fill="#3a5080" />
      <ellipse cx="26" cy="20" rx="0.6" ry="0.6" fill="#0a0a18" />
      <ellipse cx="34" cy="20" rx="0.6" ry="0.6" fill="#0a0a18" />
      <circle cx="26.8" cy="19.3" r="0.4" fill="white" opacity="0.8" />
      <circle cx="34.8" cy="19.3" r="0.4" fill="white" opacity="0.8" />
      {/* Nose bridge */}
      <path d="M30 21 L29 26 Q30 27 31 26 L30 21" fill={skin} opacity="0.4" />
      {/* Mouth */}
      <path d="M27.5 29 Q30 30.5 32.5 29" stroke="#b06050" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      {/* Ears */}
      <ellipse cx="19.5" cy="22" rx="1.5" ry="2" fill={skin} opacity="0.9" />
      <ellipse cx="40.5" cy="22" rx="1.5" ry="2" fill={skin} opacity="0.9" />
      {/* Neck */}
      <rect x="27" y="32" width="6" height="5" rx="2" fill={skin} opacity="0.85" />
      {/* Suit jacket */}
      <path d="M17 37 Q20 35 27 36 L30 40 L33 36 Q40 35 43 37 L44 62 L16 62 Z" fill={cloth} opacity="0.9" />
      {/* Shirt/tie detail */}
      <path d="M27 36 L30 40 L33 36 L31 38 L30 44 L29 38 Z" fill="white" opacity="0.7" />
      <path d="M30 39 L29.2 44 L30 46 L30.8 44 Z" fill={c} opacity="0.85" />
      {/* Lapels */}
      <path d="M27 36 L22 40 L24 37" fill={cloth} opacity="0.7" stroke={cloth} strokeWidth="0.3" />
      <path d="M33 36 L38 40 L36 37" fill={cloth} opacity="0.7" stroke={cloth} strokeWidth="0.3" />
      {/* Arms */}
      <path d="M17 37 L12 55 Q14 57 16 55 L19 40" fill={cloth} opacity="0.85" />
      <path d="M43 37 L48 55 Q46 57 44 55 L41 40" fill={cloth} opacity="0.85" />
      {/* Hands */}
      <ellipse cx="14" cy="56" rx="2.2" ry="1.5" fill={skin} />
      <ellipse cx="46" cy="56" rx="2.2" ry="1.5" fill={skin} />
      {/* Trousers */}
      <rect x="19" y="61" width="9" height="16" rx="3" fill={cloth} opacity="0.75" />
      <rect x="32" y="61" width="9" height="16" rx="3" fill={cloth} opacity="0.75" />
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="15" ry="2.5" fill={c} opacity="0.2" />
    </svg>
  );
}

function FemalePresentorSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Long hair — back layer */}
      <ellipse cx="30" cy="25" rx="13" ry="20" fill={hair} opacity="0.8" />
      {/* Head */}
      <ellipse cx="30" cy="21" rx="9.5" ry="10.5" fill={skin} />
      {/* Hair — front/top layer */}
      <ellipse cx="30" cy="12" rx="10" ry="7" fill={hair} opacity="0.95" />
      <path d="M20 12 Q19 18 20 25" fill={hair} stroke={hair} strokeWidth="1.5" />
      <path d="M40 12 Q41 18 40 25" fill={hair} stroke={hair} strokeWidth="1.5" />
      {/* Eyelashes (arcs above eyes) */}
      <path d="M23.5 18.5 Q26 17 28.5 18.5" stroke={hair} strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M31.5 18.5 Q34 17 36.5 18.5" stroke={hair} strokeWidth="0.7" fill="none" opacity="0.9" />
      {/* Eyebrows */}
      <path d="M23.5 17.5 Q26 16 28.5 17.5" stroke="#2a1a0a" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <path d="M31.5 17.5 Q34 16 36.5 17.5" stroke="#2a1a0a" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <ellipse cx="26" cy="20" rx="2.4" ry="2" fill="white" />
      <ellipse cx="34" cy="20" rx="2.4" ry="2" fill="white" />
      <ellipse cx="26" cy="20" rx="1.5" ry="1.5" fill="#5a3070" />
      <ellipse cx="34" cy="20" rx="1.5" ry="1.5" fill="#5a3070" />
      <ellipse cx="26" cy="20" rx="0.7" ry="0.7" fill="#0a0a18" />
      <ellipse cx="34" cy="20" rx="0.7" ry="0.7" fill="#0a0a18" />
      <circle cx="26.9" cy="19.2" r="0.45" fill="white" opacity="0.85" />
      <circle cx="34.9" cy="19.2" r="0.45" fill="white" opacity="0.85" />
      {/* Nose */}
      <path d="M30 21 Q29.3 25 28.8 26.5 Q30 27.2 31.2 26.5 Q30.7 25 30 21" fill={skin} opacity="0.35" />
      {/* Lips */}
      <path d="M27.5 28.5 Q28.5 29.5 30 29.2 Q31.5 29.5 32.5 28.5" fill="#d4707a" opacity="0.9" />
      <path d="M27.5 28.5 Q30 27.5 32.5 28.5" stroke="#d4707a" strokeWidth="0.6" fill="none" />
      {/* Ears */}
      <ellipse cx="20" cy="21" rx="1.3" ry="1.8" fill={skin} opacity="0.9" />
      <ellipse cx="40" cy="21" rx="1.3" ry="1.8" fill={skin} opacity="0.9" />
      {/* Neck */}
      <rect x="27.5" y="30" width="5" height="5" rx="2" fill={skin} opacity="0.9" />
      {/* Blazer */}
      <path d="M19 35 Q22 33 27.5 34 L30 38 L32.5 34 Q38 33 41 35 L42 60 L18 60 Z" fill={cloth} opacity="0.88" />
      {/* Inner blouse */}
      <path d="M27.5 34 L30 38 L32.5 34 L31.5 36 Q30 40 28.5 36 Z" fill="white" opacity="0.75" />
      {/* Arms */}
      <path d="M19 35 L14 53 Q16 55 18 53 L21 38" fill={cloth} opacity="0.82" />
      <path d="M41 35 L46 53 Q44 55 42 53 L39 38" fill={cloth} opacity="0.82" />
      <ellipse cx="16" cy="54" rx="2" ry="1.4" fill={skin} />
      <ellipse cx="44" cy="54" rx="2" ry="1.4" fill={skin} />
      {/* Skirt/trousers */}
      <path d="M18 60 Q20 72 24 77 L26 77 L28 62 L32 62 L34 77 L36 77 Q40 72 42 60 Z" fill={cloth} opacity="0.78" />
      {/* Accent highlight */}
      <rect x="28" y="34" width="4" height="1" rx="0.5" fill={c} opacity="0.6" />
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="14" ry="2.5" fill={c} opacity="0.2" />
    </svg>
  );
}

function StreamerSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair — dyed streamer style */}
      <ellipse cx="30" cy="13" rx="11" ry="9" fill={hair} opacity="0.92" />
      <path d="M19 13 Q18 20 20 28" stroke={hair} strokeWidth="3" fill="none" opacity="0.85" />
      <path d="M41 13 Q42 20 40 28" stroke={hair} strokeWidth="3" fill="none" opacity="0.85" />
      {/* Hair highlights */}
      <path d="M25 10 Q27 8 29 10" stroke={c} strokeWidth="1.2" fill="none" opacity="0.7" />
      {/* Head */}
      <ellipse cx="30" cy="22" rx="10" ry="11" fill={skin} />
      {/* Eyebrows — expressive arched */}
      <path d="M23.5 17 Q26 15.5 28.5 17" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M31.5 17 Q34 15.5 36.5 17" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Eyes — bright and expressive */}
      <ellipse cx="26" cy="20.5" rx="2.5" ry="2.1" fill="white" />
      <ellipse cx="34" cy="20.5" rx="2.5" ry="2.1" fill="white" />
      <ellipse cx="26" cy="20.5" rx="1.6" ry="1.6" fill="#2d7a3a" />
      <ellipse cx="34" cy="20.5" rx="1.6" ry="1.6" fill="#2d7a3a" />
      <ellipse cx="26" cy="20.5" rx="0.75" ry="0.75" fill="#050a05" />
      <ellipse cx="34" cy="20.5" rx="0.75" ry="0.75" fill="#050a05" />
      <circle cx="26.9" cy="19.6" r="0.5" fill="white" />
      <circle cx="34.9" cy="19.6" r="0.5" fill="white" />
      {/* Nose */}
      <path d="M30 22 Q29.5 26 29 27.5 Q30 28 31 27.5 Q30.5 26 30 22" fill={skin} opacity="0.4" />
      {/* Smile */}
      <path d="M27 29.5 Q30 32 33 29.5" stroke="#c05060" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <ellipse cx="19.5" cy="22" rx="1.4" ry="2" fill={skin} opacity="0.9" />
      <ellipse cx="40.5" cy="22" rx="1.4" ry="2" fill={skin} opacity="0.9" />
      {/* Neck */}
      <rect x="27" y="32" width="6" height="5" rx="2.5" fill={skin} opacity="0.9" />
      {/* Hoodie */}
      <path d="M16 37 Q20 33 27 35 L30 40 L33 35 Q40 33 44 37 L45 62 L15 62 Z" fill={cloth} opacity="0.92" />
      {/* Hood drawstring */}
      <path d="M27 35 Q30 37 33 35" stroke={c} strokeWidth="0.8" fill="none" opacity="0.6" />
      {/* Kangaroo pocket */}
      <rect x="23" y="50" width="14" height="8" rx="3" fill={cloth} opacity="0.5" stroke={c} strokeWidth="0.5" />
      {/* Logo / streamer mark */}
      <circle cx="30" cy="43" r="3" fill={c} opacity="0.4" />
      <path d="M28.5 43 L30 41.5 L31.5 43 L30 44.5 Z" fill={c} opacity="0.9" />
      {/* Arms */}
      <path d="M16 37 L11 55 Q13 57 15 55 L18 40" fill={cloth} opacity="0.88" />
      <path d="M44 37 L49 55 Q47 57 45 55 L42 40" fill={cloth} opacity="0.88" />
      <ellipse cx="13" cy="56" rx="2.2" ry="1.5" fill={skin} />
      <ellipse cx="47" cy="56" rx="2.2" ry="1.5" fill={skin} />
      {/* Jeans */}
      <rect x="19" y="61" width="9" height="16" rx="3" fill="#1a2a4a" opacity="0.8" />
      <rect x="32" y="61" width="9" height="16" rx="3" fill="#1a2a4a" opacity="0.8" />
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="16" ry="2.5" fill={c} opacity="0.25" />
    </svg>
  );
}

function GamingCreatorSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair — bold gaming style */}
      <ellipse cx="30" cy="12" rx="12" ry="9" fill={hair} opacity="0.95" />
      <path d="M18 12 Q17 16 19 22" stroke={hair} strokeWidth="4" fill="none" opacity="0.9" />
      <path d="M42 12 Q43 16 41 22" stroke={hair} strokeWidth="4" fill="none" opacity="0.9" />
      {/* Wild hair spikes */}
      <path d="M22 8 L20 2 L24 7" fill={hair} opacity="0.85" />
      <path d="M30 7 L30 1 L33 7" fill={hair} opacity="0.85" />
      <path d="M38 8 L40 2 L36 7" fill={hair} opacity="0.85" />
      {/* Accent streaks */}
      <path d="M24 8 L22 3" stroke={c} strokeWidth="1.2" opacity="0.7" />
      <path d="M36 8 L38 3" stroke={c} strokeWidth="1.2" opacity="0.7" />
      {/* Head */}
      <ellipse cx="30" cy="22" rx="10.5" ry="11" fill={skin} />
      {/* Bold eyebrows */}
      <path d="M23 17 Q26 15 29 17" stroke="#1a0a00" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M31 17 Q34 15 37 17" stroke="#1a0a00" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Eyes — intense gaming look */}
      <ellipse cx="26" cy="20.5" rx="2.6" ry="2.2" fill="white" />
      <ellipse cx="34" cy="20.5" rx="2.6" ry="2.2" fill="white" />
      <ellipse cx="26" cy="20.5" rx="1.7" ry="1.7" fill="#8a3010" />
      <ellipse cx="34" cy="20.5" rx="1.7" ry="1.7" fill="#8a3010" />
      <ellipse cx="26" cy="20.5" rx="0.8" ry="0.8" fill="#0a0505" />
      <ellipse cx="34" cy="20.5" rx="0.8" ry="0.8" fill="#0a0505" />
      <circle cx="27" cy="19.5" r="0.5" fill="white" />
      <circle cx="35" cy="19.5" r="0.5" fill="white" />
      {/* Nose */}
      <path d="M30 22 Q29.5 26.5 29.2 28 Q30 28.6 30.8 28 Q30.5 26.5 30 22" fill={skin} opacity="0.4" />
      {/* Smirk */}
      <path d="M27.5 30 Q30 31 32 30 Q31 31.5 30 31.5 Q29 31.5 27.5 30" fill="#b05060" opacity="0.85" />
      {/* Ears */}
      <ellipse cx="19" cy="22" rx="1.5" ry="2.2" fill={skin} opacity="0.9" />
      <ellipse cx="41" cy="22" rx="1.5" ry="2.2" fill={skin} opacity="0.9" />
      {/* Earring */}
      <circle cx="19" cy="24.5" r="0.8" fill={c} opacity="0.9" />
      {/* Neck */}
      <rect x="27" y="32" width="6" height="5" rx="2" fill={skin} opacity="0.9" />
      {/* Gaming jacket */}
      <path d="M16 37 Q20 33 27 35 L30 40 L33 35 Q40 33 44 37 L45 62 L15 62 Z" fill={cloth} opacity="0.9" />
      {/* Jacket accent stripes */}
      <path d="M16 40 L18 55" stroke={c} strokeWidth="1.5" opacity="0.7" />
      <path d="M44 40 L42 55" stroke={c} strokeWidth="1.5" opacity="0.7" />
      {/* Gaming logo */}
      <polygon points="30,40 28,45 32,45" fill={c} opacity="0.85" />
      {/* Collar */}
      <path d="M27 35 L25 38 L30 40 L35 38 L33 35" fill={cloth} opacity="0.6" stroke={c} strokeWidth="0.4" />
      {/* Arms */}
      <path d="M16 37 L10 55 Q12 57.5 14.5 55 L18 40" fill={cloth} opacity="0.88" />
      <path d="M44 37 L50 55 Q48 57.5 45.5 55 L42 40" fill={cloth} opacity="0.88" />
      <ellipse cx="12" cy="56" rx="2.3" ry="1.5" fill={skin} />
      <ellipse cx="48" cy="56" rx="2.3" ry="1.5" fill={skin} />
      {/* Dark cargo pants */}
      <rect x="19" y="61" width="9" height="16" rx="3" fill="#1a1a1a" opacity="0.85" />
      <rect x="32" y="61" width="9" height="16" rx="3" fill="#1a1a1a" opacity="0.85" />
      {/* Accent stripe on pants */}
      <rect x="20" y="63" width="1.5" height="12" rx="0.7" fill={c} opacity="0.6" />
      <rect x="39.5" y="63" width="1.5" height="12" rx="0.7" fill={c} opacity="0.6" />
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="17" ry="3" fill={c} opacity="0.3" />
    </svg>
  );
}

function AnimeSilhouette({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="30,4 24,14 28,12" fill={c} opacity="0.95" />
      <polygon points="30,4 36,14 32,12" fill={c} opacity="0.95" />
      <polygon points="30,4 22,16 26,15" fill={c} opacity="0.7" />
      <polygon points="30,4 38,16 34,15" fill={c} opacity="0.7" />
      <ellipse cx="30" cy="20" rx="11" ry="12" fill={c} opacity="0.9" />
      <ellipse cx="25" cy="19" rx="3" ry="3.5" fill="white" opacity="0.95" />
      <ellipse cx="35" cy="19" rx="3" ry="3.5" fill="white" opacity="0.95" />
      <ellipse cx="25" cy="19.5" rx="1.8" ry="2.2" fill="#1a1a2e" />
      <ellipse cx="35" cy="19.5" rx="1.8" ry="2.2" fill="#1a1a2e" />
      <circle cx="25.8" cy="18.5" r="0.6" fill="white" />
      <circle cx="35.8" cy="18.5" r="0.6" fill="white" />
      <rect x="27" y="30" width="6" height="5" rx="2" fill={c} opacity="0.7" />
      <rect x="20" y="34" width="20" height="22" rx="5" fill={c} opacity="0.8" />
      <rect x="10" y="35" width="8" height="18" rx="4" fill={c} opacity="0.7" transform="rotate(-8 14 44)" />
      <rect x="42" y="35" width="8" height="18" rx="4" fill={c} opacity="0.7" transform="rotate(8 46 44)" />
      <rect x="21" y="55" width="7" height="20" rx="3.5" fill={c} opacity="0.75" />
      <rect x="32" y="55" width="7" height="20" rx="3.5" fill={c} opacity="0.75" />
      <ellipse cx="30" cy="77" rx="16" ry="3" fill={c} opacity="0.2" />
    </svg>
  );
}

function RealisticSilhouette({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="15" rx="10" ry="7" fill={c} opacity="0.9" />
      <rect x="20" y="15" width="20" height="5" rx="2" fill={c} opacity="0.9" />
      <ellipse cx="30" cy="21" rx="9" ry="10" fill={c} opacity="0.85" />
      <ellipse cx="26" cy="21" rx="2" ry="2" fill="white" opacity="0.95" />
      <ellipse cx="34" cy="21" rx="2" ry="2" fill="white" opacity="0.95" />
      <ellipse cx="26" cy="21" rx="1.2" ry="1.2" fill="#1a2a3e" />
      <ellipse cx="34" cy="21" rx="1.2" ry="1.2" fill="#1a2a3e" />
      <rect x="27" y="30" width="6" height="5" rx="2" fill={c} opacity="0.65" />
      <rect x="19" y="34" width="22" height="26" rx="5" fill={c} opacity="0.75" />
      <rect x="15" y="34" width="8" height="4" rx="2" fill={c} opacity="0.6" />
      <rect x="37" y="34" width="8" height="4" rx="2" fill={c} opacity="0.6" />
      <rect x="9" y="36" width="7" height="20" rx="3.5" fill={c} opacity="0.65" transform="rotate(-5 12 46)" />
      <rect x="44" y="36" width="7" height="20" rx="3.5" fill={c} opacity="0.65" transform="rotate(5 47 46)" />
      <rect x="21" y="59" width="7" height="18" rx="3.5" fill={c} opacity="0.7" />
      <rect x="32" y="59" width="7" height="18" rx="3.5" fill={c} opacity="0.7" />
      <ellipse cx="30" cy="77" rx="14" ry="2.5" fill={c} opacity="0.18" />
    </svg>
  );
}

function ChibiSilhouette({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="22" r="16" fill={c} opacity="0.9" />
      <circle cx="16" cy="26" r="8" fill={c} opacity="0.85" />
      <circle cx="44" cy="26" r="8" fill={c} opacity="0.85" />
      <circle cx="30" cy="26" r="14" fill={c} opacity="0.88" />
      <ellipse cx="24" cy="26" rx="4" ry="4.5" fill="white" opacity="0.96" />
      <ellipse cx="36" cy="26" rx="4" ry="4.5" fill="white" opacity="0.96" />
      <ellipse cx="24" cy="26.5" rx="2.5" ry="3" fill="#1a1a2e" />
      <ellipse cx="36" cy="26.5" rx="2.5" ry="3" fill="#1a1a2e" />
      <circle cx="25.5" cy="25" r="0.8" fill="white" />
      <circle cx="37.5" cy="25" r="0.8" fill="white" />
      <rect x="27" y="39" width="6" height="4" rx="2" fill={c} opacity="0.65" />
      <rect x="21" y="42" width="18" height="14" rx="5" fill={c} opacity="0.8" />
      <rect x="12" y="43" width="7" height="12" rx="3.5" fill={c} opacity="0.7" transform="rotate(-10 15 49)" />
      <rect x="41" y="43" width="7" height="12" rx="3.5" fill={c} opacity="0.7" transform="rotate(10 45 49)" />
      <rect x="23" y="55" width="6" height="14" rx="3" fill={c} opacity="0.75" />
      <rect x="31" y="55" width="6" height="14" rx="3" fill={c} opacity="0.75" />
      <ellipse cx="30" cy="70" rx="14" ry="3" fill={c} opacity="0.25" />
    </svg>
  );
}

const STYLE_MAP: Record<string, "anime" | "realistic" | "chibi" | "human-male" | "human-female" | "streamer" | "gaming"> = {
  "storm-default": "anime",
  "storm-serious": "realistic",
  "storm-cute": "chibi",
  "presenter-male": "human-male",
  "presenter-female": "human-female",
  "streamer-friendly": "streamer",
  "creator-gaming": "gaming",
};

import { BUILT_IN_AVATARS } from "./avatarAssets";

export function AvatarThumbnail({
  avatarKey,
  accentColor,
  skinTone,
  hairColor,
  clothingColor,
  size = 60,
  selected = false,
}: AvatarThumbnailProps) {
  const style = STYLE_MAP[avatarKey] ?? "anime";
  const asset = BUILT_IN_AVATARS[avatarKey as keyof typeof BUILT_IN_AVATARS];
  const skin = skinTone ?? asset?.skinTone ?? "#e8d5c0";
  const hair = hairColor ?? asset?.hairColor ?? accentColor;
  const cloth = clothingColor ?? asset?.clothingColor ?? accentColor;

  return (
    <div
      style={{ width: size, height: Math.round(size * 1.35) }}
      className="relative flex items-center justify-center"
    >
      {selected && (
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-30"
          style={{ background: accentColor }}
        />
      )}
      <div style={{ width: size, height: Math.round(size * 1.33) }} className="relative">
        {style === "human-male" && <MalePresentorSilhouette c={accentColor} skin={skin} hair={hair} cloth={cloth} />}
        {style === "human-female" && <FemalePresentorSilhouette c={accentColor} skin={skin} hair={hair} cloth={cloth} />}
        {style === "streamer" && <StreamerSilhouette c={accentColor} skin={skin} hair={hair} cloth={cloth} />}
        {style === "gaming" && <GamingCreatorSilhouette c={accentColor} skin={skin} hair={hair} cloth={cloth} />}
        {style === "anime" && <AnimeSilhouette c={accentColor} />}
        {style === "realistic" && <RealisticSilhouette c={accentColor} />}
        {style === "chibi" && <ChibiSilhouette c={accentColor} />}
      </div>
    </div>
  );
}
