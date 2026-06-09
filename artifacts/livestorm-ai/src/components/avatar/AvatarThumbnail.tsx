// Lightweight SVG-based avatar thumbnail — no WebGL needed.

interface AvatarThumbnailProps {
  avatarKey: string;
  accentColor: string;
  skinTone?: string;
  hairColor?: string;
  clothingColor?: string;
  eyeColor?: string;
  size?: number;
  selected?: boolean;
}

// ── Marcus — professional male, short dark hair, dark suit ────────────────────
function MarcusSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <ellipse cx="30" cy="40" rx="28" ry="32" fill={c} opacity="0.06" />
      {/* Hair — short professional, textured */}
      <ellipse cx="30" cy="13.5" rx="11.5" ry="8.5" fill={hair} opacity="0.97" />
      <rect x="18.5" y="13" width="23" height="6" rx="1" fill={hair} opacity="0.92" />
      {/* Hair texture/highlight */}
      <path d="M22 10 Q28 8 36 10" stroke={hair} strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M24 10 Q30 8.5 36 10" stroke="white" strokeWidth="0.4" fill="none" opacity="0.1" />
      {/* Fade sides */}
      <rect x="18.5" y="15" width="4" height="5" rx="1" fill={skin} opacity="0.4" />
      <rect x="37.5" y="15" width="4" height="5" rx="1" fill={skin} opacity="0.4" />
      {/* Head */}
      <ellipse cx="30" cy="22" rx="10.5" ry="11.5" fill={skin} />
      {/* Forehead */}
      <ellipse cx="30" cy="16" rx="8" ry="3" fill={skin} opacity="0.5" />
      {/* Eyebrows */}
      <path d="M23.5 17.5 Q26.5 16 29.5 17.5" stroke="#1a0a00" strokeWidth="0.95" strokeLinecap="round" fill="none" />
      <path d="M30.5 17.5 Q33.5 16 36.5 17.5" stroke="#1a0a00" strokeWidth="0.95" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <ellipse cx="26" cy="20.5" rx="2.3" ry="1.9" fill="white" />
      <ellipse cx="34" cy="20.5" rx="2.3" ry="1.9" fill="white" />
      <ellipse cx="26" cy="20.5" rx="1.4" ry="1.4" fill="#3a4a60" />
      <ellipse cx="34" cy="20.5" rx="1.4" ry="1.4" fill="#3a4a60" />
      <ellipse cx="26" cy="20.5" rx="0.65" ry="0.65" fill="#0a0a14" />
      <ellipse cx="34" cy="20.5" rx="0.65" ry="0.65" fill="#0a0a14" />
      <circle cx="26.8" cy="19.7" r="0.42" fill="white" opacity="0.85" />
      <circle cx="34.8" cy="19.7" r="0.42" fill="white" opacity="0.85" />
      {/* Eyelids */}
      <path d="M23.7 19.2 Q26 18.2 28.3 19.2" stroke="#1a0a00" strokeWidth="0.5" fill="none" />
      <path d="M31.7 19.2 Q34 18.2 36.3 19.2" stroke="#1a0a00" strokeWidth="0.5" fill="none" />
      {/* Nose */}
      <path d="M30 22 L29.2 26.5 Q30 27.5 30.8 26.5 L30 22" fill={skin} opacity="0.35" />
      {/* Mouth */}
      <path d="M27.5 29 Q30 30.2 32.5 29" stroke="#9a5845" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      {/* Jawline */}
      <ellipse cx="30" cy="32" rx="5" ry="1.5" fill={skin} opacity="0.3" />
      {/* Ears */}
      <ellipse cx="19.2" cy="22" rx="1.5" ry="2.1" fill={skin} opacity="0.9" />
      <ellipse cx="40.8" cy="22" rx="1.5" ry="2.1" fill={skin} opacity="0.9" />
      {/* Neck */}
      <rect x="27" y="32.5" width="6" height="5" rx="2.5" fill={skin} opacity="0.9" />
      {/* Dark suit jacket */}
      <path d="M16 38 Q20 35.5 27 36.5 L30 41 L33 36.5 Q40 35.5 44 38 L45 64 L15 64 Z" fill={cloth} opacity="0.95" />
      {/* Dress shirt */}
      <path d="M27 36.5 L30 41 L33 36.5 L31.5 39 L30 44.5 L28.5 39 Z" fill="white" opacity="0.8" />
      {/* Tie */}
      <path d="M29.6 40.5 L29 46 L30 48 L31 46 L30.4 40.5 Z" fill={c} opacity="0.88" />
      {/* Lapels */}
      <path d="M27 36.5 L21.5 41 L23.5 38" fill={cloth} opacity="0.7" stroke={cloth} strokeWidth="0.3" />
      <path d="M33 36.5 L38.5 41 L36.5 38" fill={cloth} opacity="0.7" stroke={cloth} strokeWidth="0.3" />
      {/* Arms */}
      <path d="M16 38 L10 56 Q12.5 58 15.5 56 L19 41" fill={cloth} opacity="0.9" />
      <path d="M44 38 L50 56 Q47.5 58 44.5 56 L41 41" fill={cloth} opacity="0.9" />
      <ellipse cx="12" cy="57" rx="2.4" ry="1.6" fill={skin} />
      <ellipse cx="48" cy="57" rx="2.4" ry="1.6" fill={skin} />
      {/* Trousers */}
      <rect x="19.5" y="63" width="9" height="15" rx="3" fill={cloth} opacity="0.78" />
      <rect x="31.5" y="63" width="9" height="15" rx="3" fill={cloth} opacity="0.78" />
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="16" ry="2.5" fill={c} opacity="0.22" />
    </svg>
  );
}

// ── Kai — male streamer, spiky dark hair, gaming jacket, cyan accent ───────────
function KaiSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow — cyan */}
      <ellipse cx="30" cy="40" rx="28" ry="32" fill={c} opacity="0.08" />
      {/* Spiky hair base volume */}
      <ellipse cx="30" cy="14" rx="11.5" ry="8" fill={hair} opacity="0.96" />
      <rect x="18.5" y="12" width="23" height="7" rx="1" fill={hair} opacity="0.92" />
      {/* Spiky tips */}
      <path d="M21 12 L20 5.5 L23.5 10" fill={hair} opacity="0.92" />
      <path d="M26.5 11 L26 4.5 L29.5 9.5" fill={hair} opacity="0.92" />
      <path d="M33.5 11 L34 4.5 L30.5 9.5" fill={hair} opacity="0.88" />
      <path d="M39 12 L40 5.5 L36.5 10" fill={hair} opacity="0.88" />
      {/* Cyan highlight streak on one spike */}
      <path d="M30.5 9.5 L31 4.5 L33.5 8" fill={c} opacity="0.45" />
      {/* Hair sheen */}
      <path d="M23 10 Q29 8 35 10" stroke="white" strokeWidth="0.4" fill="none" opacity="0.1" />
      {/* Fade sides */}
      <rect x="18.5" y="15" width="3.5" height="5" rx="1" fill={skin} opacity="0.45" />
      <rect x="38" y="15" width="3.5" height="5" rx="1" fill={skin} opacity="0.45" />
      {/* Head */}
      <ellipse cx="30" cy="22" rx="10.5" ry="11" fill={skin} />
      {/* Forehead */}
      <ellipse cx="30" cy="16" rx="8" ry="2.8" fill={skin} opacity="0.5" />
      {/* Eyebrows — slightly arched, strong */}
      <path d="M23.5 17.5 Q26.5 16.2 29.5 17.5" stroke="#1a0a00" strokeWidth="0.95" strokeLinecap="round" fill="none" />
      <path d="M30.5 17.5 Q33.5 16.2 36.5 17.5" stroke="#1a0a00" strokeWidth="0.95" strokeLinecap="round" fill="none" />
      {/* Eyes — amber/brown */}
      <ellipse cx="26" cy="20.5" rx="2.3" ry="1.9" fill="white" />
      <ellipse cx="34" cy="20.5" rx="2.3" ry="1.9" fill="white" />
      <ellipse cx="26" cy="20.5" rx="1.4" ry="1.4" fill="#8b6020" />
      <ellipse cx="34" cy="20.5" rx="1.4" ry="1.4" fill="#8b6020" />
      <ellipse cx="26" cy="20.5" rx="0.65" ry="0.65" fill="#0a0808" />
      <ellipse cx="34" cy="20.5" rx="0.65" ry="0.65" fill="#0a0808" />
      <circle cx="26.8" cy="19.7" r="0.42" fill="white" opacity="0.85" />
      <circle cx="34.8" cy="19.7" r="0.42" fill="white" opacity="0.85" />
      {/* Eyelids */}
      <path d="M23.7 19.2 Q26 18.2 28.3 19.2" stroke="#1a0800" strokeWidth="0.5" fill="none" />
      <path d="M31.7 19.2 Q34 18.2 36.3 19.2" stroke="#1a0800" strokeWidth="0.5" fill="none" />
      {/* Nose */}
      <path d="M30 22 L29.2 26.5 Q30 27.5 30.8 26.5 L30 22" fill={skin} opacity="0.35" />
      {/* Mouth — slight confident grin */}
      <path d="M27.8 29.2 Q30 30.5 32.2 29.2" stroke="#9a5845" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      {/* Jawline */}
      <ellipse cx="30" cy="32" rx="5" ry="1.4" fill={skin} opacity="0.3" />
      {/* Ears */}
      <ellipse cx="19.2" cy="22" rx="1.5" ry="2.1" fill={skin} opacity="0.9" />
      <ellipse cx="40.8" cy="22" rx="1.5" ry="2.1" fill={skin} opacity="0.9" />
      {/* Neck */}
      <rect x="27" y="32.5" width="6" height="5" rx="2.5" fill={skin} opacity="0.9" />
      {/* Gaming jacket body */}
      <path d="M16 38 Q20 35.5 27 36.5 L30 41 L33 36.5 Q40 35.5 44 38 L45 64 L15 64 Z" fill={cloth} opacity="0.95" />
      {/* Racing stripe accents */}
      <path d="M16.5 42 L17 58 L19.5 58 L19.5 42 Z" fill={c} opacity="0.38" />
      <path d="M43.5 42 L43 58 L40.5 58 L40.5 42 Z" fill={c} opacity="0.38" />
      {/* Stand collar */}
      <path d="M27 36.5 Q30 38 33 36.5 L33 38 Q30 39.5 27 38 Z" fill={cloth} stroke={c} strokeWidth="0.5" opacity="0.8" />
      {/* Chest logo — triangle icon */}
      <path d="M28.5 43.5 L30 41.5 L31.5 43.5 L30 45.5 Z" fill={c} opacity="0.9" />
      {/* Arms */}
      <path d="M16 38 L10 56 Q12.5 58 15.5 56 L19 41" fill={cloth} opacity="0.9" />
      <path d="M44 38 L50 56 Q47.5 58 44.5 56 L41 41" fill={cloth} opacity="0.9" />
      <ellipse cx="12" cy="57" rx="2.4" ry="1.6" fill={skin} />
      <ellipse cx="48" cy="57" rx="2.4" ry="1.6" fill={skin} />
      {/* Trousers — dark with subtle accent stripe */}
      <rect x="19.5" y="63" width="9" height="15" rx="3" fill="#0d1a2a" opacity="0.85" />
      <rect x="31.5" y="63" width="9" height="15" rx="3" fill="#0d1a2a" opacity="0.85" />
      <rect x="21" y="63" width="1.5" height="15" rx="0.75" fill={c} opacity="0.28" />
      <rect x="37.5" y="63" width="1.5" height="15" rx="0.75" fill={c} opacity="0.28" />
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="16" ry="2.5" fill={c} opacity="0.28" />
    </svg>
  );
}

// ── Aria — professional female, dark long hair, blazer ────────────────────────
function AriaSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <ellipse cx="30" cy="40" rx="28" ry="32" fill={c} opacity="0.06" />
      {/* Long hair — back layer flowing */}
      <ellipse cx="30" cy="27" rx="13.5" ry="22" fill={hair} opacity="0.75" />
      {/* Head */}
      <ellipse cx="30" cy="21" rx="9.5" ry="10.8" fill={skin} />
      {/* Hair — front/top */}
      <ellipse cx="30" cy="11.5" rx="10.5" ry="7.5" fill={hair} opacity="0.97" />
      {/* Side hair curtains */}
      <path d="M19.5 12 Q18 19 19 28" fill={hair} stroke={hair} strokeWidth="1.8" opacity="0.9" />
      <path d="M40.5 12 Q42 19 41 28" fill={hair} stroke={hair} strokeWidth="1.8" opacity="0.9" />
      {/* Hair highlight/sheen */}
      <path d="M27 10 Q30 8.5 34 10" stroke="white" strokeWidth="0.8" fill="none" opacity="0.12" />
      {/* Eyelashes */}
      <path d="M23.2 18.2 Q26 16.6 28.8 18.2" stroke={hair} strokeWidth="0.8" fill="none" opacity="0.85" />
      <path d="M31.2 18.2 Q34 16.6 36.8 18.2" stroke={hair} strokeWidth="0.8" fill="none" opacity="0.85" />
      {/* Eyebrows — arched, feminine */}
      <path d="M23.2 17.2 Q26 15.6 28.8 17.2" stroke="#1a0a00" strokeWidth="0.75" strokeLinecap="round" fill="none" />
      <path d="M31.2 17.2 Q34 15.6 36.8 17.2" stroke="#1a0a00" strokeWidth="0.75" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <ellipse cx="26" cy="20.2" rx="2.5" ry="2.1" fill="white" />
      <ellipse cx="34" cy="20.2" rx="2.5" ry="2.1" fill="white" />
      <ellipse cx="26" cy="20.2" rx="1.55" ry="1.55" fill="#4a3060" />
      <ellipse cx="34" cy="20.2" rx="1.55" ry="1.55" fill="#4a3060" />
      <ellipse cx="26" cy="20.2" rx="0.72" ry="0.72" fill="#0a0014" />
      <ellipse cx="34" cy="20.2" rx="0.72" ry="0.72" fill="#0a0014" />
      <circle cx="26.9" cy="19.3" r="0.48" fill="white" opacity="0.9" />
      <circle cx="34.9" cy="19.3" r="0.48" fill="white" opacity="0.9" />
      {/* Nose — feminine */}
      <path d="M30 21 Q29.4 25 28.9 26.5 Q30 27.2 31.1 26.5 Q30.6 25 30 21" fill={skin} opacity="0.32" />
      {/* Lips — full, natural */}
      <path d="M27.5 28.8 Q28.5 29.8 30 29.5 Q31.5 29.8 32.5 28.8" fill="#c86878" opacity="0.85" />
      <path d="M27.5 28.8 Q30 27.8 32.5 28.8" stroke="#c86878" strokeWidth="0.65" fill="none" />
      {/* Light lip highlight */}
      <path d="M29 29.2 Q30 28.8 31 29.2" stroke="white" strokeWidth="0.3" fill="none" opacity="0.3" />
      {/* Ears */}
      <ellipse cx="20.2" cy="21" rx="1.3" ry="1.8" fill={skin} opacity="0.9" />
      <ellipse cx="39.8" cy="21" rx="1.3" ry="1.8" fill={skin} opacity="0.9" />
      {/* Earring */}
      <circle cx="20.2" cy="23" r="0.7" fill={c} opacity="0.85" />
      {/* Neck */}
      <rect x="27.5" y="31" width="5" height="5" rx="2.2" fill={skin} opacity="0.92" />
      {/* Necklace */}
      <path d="M26 35 Q30 37 34 35" stroke={c} strokeWidth="0.5" fill="none" opacity="0.6" />
      <circle cx="30" cy="36.5" r="0.7" fill={c} opacity="0.8" />
      {/* Blazer */}
      <path d="M18 36 Q22 33.5 27.5 34.5 L30 38.5 L32.5 34.5 Q38 33.5 42 36 L43 62 L17 62 Z" fill={cloth} opacity="0.92" />
      {/* Inner blouse */}
      <path d="M27.5 34.5 L30 38.5 L32.5 34.5 L31.5 36.8 Q30 41 28.5 36.8 Z" fill="white" opacity="0.78" />
      {/* Lapels */}
      <path d="M27.5 34.5 L22 38.5 L24.5 36" fill={cloth} opacity="0.6" stroke={cloth} strokeWidth="0.25" />
      <path d="M32.5 34.5 L38 38.5 L35.5 36" fill={cloth} opacity="0.6" stroke={cloth} strokeWidth="0.25" />
      {/* Arms */}
      <path d="M18 36 L13 54 Q15 56 17.5 54 L21 39" fill={cloth} opacity="0.85" />
      <path d="M42 36 L47 54 Q45 56 42.5 54 L39 39" fill={cloth} opacity="0.85" />
      <ellipse cx="15" cy="55" rx="2.1" ry="1.4" fill={skin} />
      <ellipse cx="45" cy="55" rx="2.1" ry="1.4" fill={skin} />
      {/* Skirt / trousers */}
      <path d="M17 62 Q19 74 23 79 L25 79 L28 64 L32 64 L35 79 L37 79 Q41 74 43 62 Z" fill={cloth} opacity="0.78" />
      {/* Cloth sheen */}
      <rect x="28.5" y="34.5" width="3" height="0.8" rx="0.4" fill="white" opacity="0.15" />
      {/* Ground glow */}
      <ellipse cx="30" cy="79" rx="14" ry="2" fill={c} opacity="0.2" />
    </svg>
  );
}

// ── Sofia — streamer female, wavy warm hair, casual hoodie ────────────────────
function SofiaSilhouette({ c, skin, hair, cloth }: { c: string; skin: string; hair: string; cloth: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow — pink/warm */}
      <ellipse cx="30" cy="40" rx="28" ry="32" fill={c} opacity="0.08" />
      {/* Wavy hair — back volume */}
      <ellipse cx="30" cy="28" rx="14" ry="23" fill={hair} opacity="0.70" />
      {/* Head */}
      <ellipse cx="30" cy="21" rx="9.8" ry="11" fill={skin} />
      {/* Wavy hair — top + front */}
      <ellipse cx="30" cy="12" rx="10.8" ry="7.8" fill={hair} opacity="0.96" />
      {/* Wavy side pieces */}
      <path d="M19 13 Q16 22 18 32" stroke={hair} strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.82" />
      <path d="M41 13 Q44 22 42 32" stroke={hair} strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.82" />
      {/* Wave detail */}
      <path d="M17 20 Q14 24 17 28 Q14 32 17 36" stroke={hair} strokeWidth="2" fill="none" opacity="0.55" />
      <path d="M43 20 Q46 24 43 28 Q46 32 43 36" stroke={hair} strokeWidth="2" fill="none" opacity="0.55" />
      {/* Hair highlights — warm */}
      <path d="M25 10 Q29 8 33 10" stroke="white" strokeWidth="0.9" fill="none" opacity="0.12" />
      <path d="M22 14 Q24 12 26 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.1" />
      {/* Eyelashes */}
      <path d="M23.5 18 Q26 16.5 28.5 18" stroke={hair} strokeWidth="0.75" fill="none" opacity="0.8" />
      <path d="M31.5 18 Q34 16.5 36.5 18" stroke={hair} strokeWidth="0.75" fill="none" opacity="0.8" />
      {/* Eyebrows */}
      <path d="M23.5 17 Q26 15.5 28.5 17" stroke="#2a1010" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M31.5 17 Q34 15.5 36.5 17" stroke="#2a1010" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Eyes — bright green-hazel */}
      <ellipse cx="26" cy="20" rx="2.5" ry="2.1" fill="white" />
      <ellipse cx="34" cy="20" rx="2.5" ry="2.1" fill="white" />
      <ellipse cx="26" cy="20" rx="1.58" ry="1.58" fill="#3a6030" />
      <ellipse cx="34" cy="20" rx="1.58" ry="1.58" fill="#3a6030" />
      <ellipse cx="26" cy="20" rx="0.74" ry="0.74" fill="#050a05" />
      <ellipse cx="34" cy="20" rx="0.74" ry="0.74" fill="#050a05" />
      <circle cx="26.9" cy="19.1" r="0.5" fill="white" opacity="0.9" />
      <circle cx="34.9" cy="19.1" r="0.5" fill="white" opacity="0.9" />
      {/* Nose */}
      <path d="M30 21.5 Q29.4 25.2 29 27 Q30 27.7 31 27 Q30.6 25.2 30 21.5" fill={skin} opacity="0.33" />
      {/* Lips — full, friendly smile */}
      <path d="M27.5 29.5 Q30 31.5 32.5 29.5" stroke="#c05868" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M27.5 29.5 Q28.5 30.5 30 30.2 Q31.5 30.5 32.5 29.5" fill="#c05868" opacity="0.7" />
      {/* Ear */}
      <ellipse cx="19.8" cy="21.5" rx="1.4" ry="2" fill={skin} opacity="0.9" />
      <ellipse cx="40.2" cy="21.5" rx="1.4" ry="2" fill={skin} opacity="0.9" />
      {/* Small earring */}
      <circle cx="19.8" cy="23.5" r="0.65" fill={c} opacity="0.85" />
      <circle cx="40.2" cy="23.5" r="0.65" fill={c} opacity="0.85" />
      {/* Neck */}
      <rect x="27" y="32" width="6" height="5.5" rx="2.5" fill={skin} opacity="0.9" />
      {/* Hoodie */}
      <path d="M14 38 Q18.5 33 27 35 L30 40 L33 35 Q41.5 33 46 38 L47 64 L13 64 Z" fill={cloth} opacity="0.95" />
      {/* Hood seam */}
      <path d="M27 35 Q30 37 33 35" stroke={c} strokeWidth="0.7" fill="none" opacity="0.5" />
      {/* Kangaroo pocket */}
      <rect x="22" y="51" width="16" height="9" rx="3.5" fill={cloth} opacity="0.5" stroke={c} strokeWidth="0.5" />
      {/* Logo / streamer icon */}
      <circle cx="30" cy="44" r="3.2" fill={c} opacity="0.35" />
      <path d="M28.5 44 L30 42.5 L31.5 44 L30 45.5 Z" fill={c} opacity="0.9" />
      {/* Arms */}
      <path d="M14 38 L8 56 Q10.5 58.5 13.5 56 L17.5 41" fill={cloth} opacity="0.92" />
      <path d="M46 38 L52 56 Q49.5 58.5 46.5 56 L42.5 41" fill={cloth} opacity="0.92" />
      <ellipse cx="10" cy="57" rx="2.5" ry="1.6" fill={skin} />
      <ellipse cx="50" cy="57" rx="2.5" ry="1.6" fill={skin} />
      {/* Jeans */}
      <rect x="18" y="63" width="10" height="15" rx="3" fill="#1a2a4a" opacity="0.82" />
      <rect x="32" y="63" width="10" height="15" rx="3" fill="#1a2a4a" opacity="0.82" />
      {/* LIVE sign glow in bg */}
      <rect x="38" y="6" width="16" height="6" rx="2" fill={c} opacity="0.18" />
      <text x="46" y="11" textAnchor="middle" fill={c} fontSize="3.5" fontFamily="monospace" opacity="0.6">LIVE</text>
      {/* Ground glow */}
      <ellipse cx="30" cy="78" rx="17" ry="2.5" fill={c} opacity="0.28" />
    </svg>
  );
}

const STYLE_MAP: Record<string, "marcus" | "kai" | "aria" | "sofia"> = {
  "marcus": "marcus",
  "kai":    "kai",
  "aria":   "aria",
  "sofia":  "sofia",
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
  const style = STYLE_MAP[avatarKey] ?? "marcus";
  const asset = BUILT_IN_AVATARS[avatarKey as keyof typeof BUILT_IN_AVATARS];
  const skin  = skinTone      ?? asset?.skinTone      ?? "#c47050";
  const hair  = hairColor     ?? asset?.hairColor     ?? "#1a1008";
  const cloth = clothingColor ?? asset?.clothingColor ?? "#1a2a44";
  const c     = accentColor;

  return (
    <div
      style={{ width: size, height: Math.round(size * 1.35) }}
      className="relative flex items-center justify-center"
    >
      {selected && (
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-35"
          style={{ background: c }}
        />
      )}
      <div style={{ width: size, height: Math.round(size * 1.33) }} className="relative">
        {style === "marcus" && <MarcusSilhouette c={c} skin={skin} hair={hair} cloth={cloth} />}
        {style === "kai"    && <KaiSilhouette    c={c} skin={skin} hair={hair} cloth={cloth} />}
        {style === "aria"   && <AriaSilhouette   c={c} skin={skin} hair={hair} cloth={cloth} />}
        {style === "sofia"  && <SofiaSilhouette  c={c} skin={skin} hair={hair} cloth={cloth} />}
      </div>
    </div>
  );
}
