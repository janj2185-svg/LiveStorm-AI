import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { ProgressRing } from "@/components/ui/premium";

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
interface StormPassData {
  viewerName: string;
  tiktokViewerId: string;
  streamerId: number;
  preferredName: string | null;
  customNickname: string | null;
  displayName: string;
  xp: number;
  xpToNextLevel: number;
  xpProgress: number;
  level: number;
  levelTitle: string;
  loyaltyTier: "bronze" | "silver" | "gold" | "legend";
  title: string;
  titleEmoji: string;
  stats: {
    totalGifts: number;
    totalComments: number;
    totalLikes: number;
    totalCoinsSpent: number;
  };
  sessionsAttended: number;
  streakDays: number;
  firstSeen: string;
  lastSeen: string;
  personalityTags: string[];
  achievements: Array<{
    key: string;
    name: string;
    description: string;
    iconType: string;
    xpReward: number;
    unlockedAt: string | null;
  }>;
  memories: Array<{
    icon: string;
    value: string;
    learnedAt: string;
  }>;
}

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  bronze: {
    label:       "Bronze",
    emoji:       "🥉",
    border:      "border-amber-700",
    glow:        "shadow-amber-700/30",
    ring:        "#b45309",
    strokeClass: "stroke-amber-600",
    badge:       "bg-amber-950 text-amber-400 border border-amber-700",
    gradient:    "from-amber-950/40 to-transparent",
  },
  silver: {
    label:       "Silver",
    emoji:       "🥈",
    border:      "border-slate-400",
    glow:        "shadow-slate-400/30",
    ring:        "#94a3b8",
    strokeClass: "stroke-slate-400",
    badge:       "bg-slate-800 text-slate-300 border border-slate-500",
    gradient:    "from-slate-800/40 to-transparent",
  },
  gold: {
    label:       "Gold",
    emoji:       "🥇",
    border:      "border-yellow-500",
    glow:        "shadow-yellow-500/30",
    ring:        "#eab308",
    strokeClass: "stroke-yellow-500",
    badge:       "bg-yellow-950 text-yellow-400 border border-yellow-600",
    gradient:    "from-yellow-950/40 to-transparent",
  },
  legend: {
    label:       "Legend",
    emoji:       "💜",
    border:      "border-violet-500",
    glow:        "shadow-violet-500/40",
    ring:        "#a855f7",
    strokeClass: "stroke-violet-500",
    badge:       "bg-violet-950 text-violet-300 border border-violet-500",
    gradient:    "from-violet-950/40 to-transparent",
    pulse:       true,
  },
} as const;

const TAG_LABELS: Record<string, string> = {
  helpful:    "💬 Корисний",
  gifter:     "🎁 Дарувальник",
  questioner: "❓ Допитливий",
  troll:      "😈 Тролль",
  loyal:      "💙 Лояльний",
  fan:        "⭐ Фанат",
  boss_slayer:"🐉 Вбивця боса",
  regular:    "🔄 Постійний",
  enthusiast: "🔥 Ентузіаст",
  supporter:  "🙏 Підтримувач",
  joker:      "😂 Жартівник",
  battle_fan: "⚔️ Фанат битв",
  lurker:     "👻 Тихоня",
  hype:       "📣 Хайп-майстер",
  vip:        "💎 VIP",
};

const ACHIEVEMENT_ICONS: Record<string, string> = {
  trophy:  "🏆", star: "⭐", gift: "🎁", fire: "🔥",
  crown:   "👑", sword: "⚔️", shield: "🛡️", diamond: "💎",
  heart:   "❤️", lightning: "⚡", dragon: "🐉", crystal: "💠",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}
function fmtShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "сьогодні";
  if (diffDays === 1) return "вчора";
  if (diffDays < 7)  return `${diffDays} дні тому`;
  return fmt(iso);
}
function num(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Empty state ───────────────────────────────────────────────────────────────
function NotFound({ viewerId, streamerId }: { viewerId: string; streamerId: string }) {
  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">⚡</div>
        <h1 className="text-2xl font-bold text-white mb-3">Глядача не знайдено</h1>
        <p className="text-slate-400 mb-2">
          Storm ще не знає нікого з ніком{" "}
          <span className="text-violet-400 font-mono">{decodeURIComponent(viewerId)}</span>
        </p>
        <p className="text-slate-500 text-sm">
          Напиши в чаті стрімера {streamerId} — Storm запам'ятає тебе!
        </p>
        <div className="mt-8 text-xs text-slate-600">Storm Pass · LiveStorm AI</div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Loading() {
  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl animate-pulse mb-4">⚡</div>
        <p className="text-slate-400 text-sm">Завантаження Storm Pass…</p>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
function StormPassCard({ data }: { data: StormPassData }) {
  const [copied, setCopied] = useState(false);
  const tier = TIER_CONFIG[data.loyaltyTier];

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const ringColor = tier.ring;
  const displayName = data.preferredName || data.customNickname || data.displayName;

  return (
    <div className="min-h-screen bg-[#060810] py-8 px-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-violet-400 text-xl">⚡</span>
          <span className="text-white font-bold tracking-widest text-sm uppercase">Storm Pass</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${tier.badge} ${(tier as any).pulse ? "animate-pulse" : ""}`}>
          {tier.emoji} {tier.label}
        </span>
      </div>

      {/* Main card */}
      <div className={`w-full max-w-lg rounded-2xl border-2 ${tier.border} shadow-2xl ${tier.glow} bg-[#0d1120] overflow-hidden`}>

        {/* Hero section */}
        <div className={`bg-gradient-to-br ${tier.gradient} p-6 flex items-center gap-5`}>
          {/* Level ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing value={isNaN(data.xpProgress) ? 0 : Math.max(0, Math.min(100, data.xpProgress))} size={88} strokeWidth={7} colorClass={tier.strokeClass}>
              <div className="text-center">
                <div className="text-white font-black text-lg leading-none">{data.level}</div>
                <div className="text-slate-400 text-[10px] leading-none mt-0.5">LVL</div>
              </div>
            </ProgressRing>
          </div>

          {/* Name + title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-2xl leading-tight truncate">{displayName}</h1>
            {data.preferredName && data.preferredName !== data.viewerName && (
              <div className="text-slate-500 text-xs truncate">@{data.viewerName}</div>
            )}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-base">{data.titleEmoji}</span>
              <span className="text-slate-300 text-sm font-medium">{data.title}</span>
            </div>
            <div className="mt-1 text-slate-500 text-xs">{data.levelTitle}</div>
          </div>
        </div>

        {/* XP bar */}
        <div className="px-6 py-3 bg-[#080d1a] border-t border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-xs">XP</span>
            <span className="text-slate-400 text-xs font-mono">{num(data.xp)} / {num(data.xp + data.xpToNextLevel)}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${data.xpProgress}%`, background: `linear-gradient(90deg, ${ringColor}88, ${ringColor})` }}
            />
          </div>
          <div className="text-right mt-1 text-xs text-slate-600">→ Lv.{data.level + 1}: ще {num(data.xpToNextLevel)} XP</div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 divide-x divide-white/5 border-t border-b border-white/5">
          {[
            { label: "Подарунки",  value: data.stats.totalGifts,      icon: "🎁" },
            { label: "Коментарі", value: data.stats.totalComments,    icon: "💬" },
            { label: "Сесії",     value: data.sessionsAttended,        icon: "📅" },
            { label: "Streak",    value: data.streakDays,              icon: "🔥", suffix: "d" },
          ].map(s => (
            <div key={s.label} className="py-4 text-center">
              <div className="text-lg mb-0.5">{s.icon}</div>
              <div className="text-white font-bold text-lg leading-none">{num(s.value)}{s.suffix ?? ""}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Coins + dates */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 gap-4 flex-wrap">
          <div className="text-sm text-slate-400">
            💰 <span className="text-white font-semibold">{num(data.stats.totalCoinsSpent)}</span>{" "}
            <span className="text-slate-500">монет витрачено</span>
          </div>
          <div className="text-xs text-slate-500 text-right space-y-0.5">
            <div>Перший візит: <span className="text-slate-400">{fmt(data.firstSeen)}</span></div>
            <div>Останній:     <span className="text-slate-400">{fmtShort(data.lastSeen)}</span></div>
          </div>
        </div>

        {/* Personality tags */}
        {data.personalityTags.length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Характер</div>
            <div className="flex flex-wrap gap-2">
              {data.personalityTags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {TAG_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {data.achievements.length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Досягнення ({data.achievements.length})
            </div>
            <div className="grid grid-cols-3 gap-2">
              {data.achievements.slice(0, 9).map(a => (
                <div key={a.key} title={a.description}
                  className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-2.5 py-2 border border-slate-700/50">
                  <span className="text-base flex-shrink-0">
                    {ACHIEVEMENT_ICONS[a.iconType ?? "trophy"] ?? "🏆"}
                  </span>
                  <span className="text-slate-300 text-xs leading-tight truncate">{a.name}</span>
                </div>
              ))}
            </div>
            {data.achievements.length > 9 && (
              <div className="text-xs text-slate-600 mt-2 text-right">
                +{data.achievements.length - 9} більше
              </div>
            )}
          </div>
        )}

        {/* Storm memories */}
        {data.memories.length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              ⚡ Storm пам'ятає
            </div>
            <div className="space-y-2">
              {data.memories.map((m, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="text-base flex-shrink-0 mt-0.5">{m.icon}</span>
                  <span className="text-slate-300 leading-snug">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share button + footer */}
        <div className="px-6 py-5">
          <button
            onClick={copyLink}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: copied
                ? "linear-gradient(135deg, #16a34a, #15803d)"
                : `linear-gradient(135deg, ${ringColor}33, ${ringColor}55)`,
              border: `1px solid ${ringColor}55`,
              color: copied ? "#86efac" : "#e2e8f0",
            }}
          >
            {copied ? "✅ Посилання скопійовано!" : "🔗 Поділитися Storm Pass"}
          </button>
          <div className="text-center mt-3 text-xs text-slate-700">
            Storm Pass · LiveStorm AI
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StormPass() {
  const params = useParams<{ streamerId: string; viewerId: string }>();
  const streamerId = params.streamerId ?? "";
  const viewerId   = params.viewerId   ?? "";

  const [data,    setData]    = useState<StormPassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!streamerId || !viewerId) { setLoading(false); setNotFound(true); return; }
    setLoading(true);
    setNotFound(false);
    setData(null);

    fetch(`${BASE_URL}/api/storm-pass/${encodeURIComponent(streamerId)}/${encodeURIComponent(viewerId)}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        setData(json);
      })
      .catch(err => {
        console.error("[StormPass] fetch error:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [streamerId, viewerId]);

  if (loading)  return <Loading />;
  if (notFound) return <NotFound viewerId={viewerId} streamerId={streamerId} />;
  if (data)     return <StormPassCard data={data} />;
  return <Loading />;
}
