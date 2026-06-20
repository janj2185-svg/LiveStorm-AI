export function Sunset() {
  return (
    <div className="min-h-screen font-sans text-white flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #1a0a00 0%, #2d1200 40%, #1a0505 100%)" }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}>LS</div>
            <span className="font-bold text-sm tracking-wide"
              style={{ background: "linear-gradient(90deg, #fb923c, #f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-2 rounded-full px-3 py-1 border border-[#f97316]/30 bg-[#f97316]/10">
            <div className="w-2 h-2 rounded-full bg-[#fb923c] animate-pulse" />
            <span className="text-xs font-bold text-[#fb923c]">LIVE</span>
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-4 border border-[#7c2d12]/60"
          style={{ background: "linear-gradient(145deg, #1c0a0080, #2d130080)" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs mb-1 text-[#fb923c]">@sunset_vibes_ua</div>
              <div className="text-lg font-bold">Вечірній стрім 🌅</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold"
                style={{ background: "linear-gradient(90deg, #fb923c, #f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>2:47:33</div>
              <div className="text-xs text-[#7c2d12]">тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", color: "#fb923c" },
              { label: "Лайки", value: "89K", color: "#f87171" },
              { label: "Чат", value: "4.2K", color: "#fbbf24" },
              { label: "Gifts", value: "1.5K", color: "#e879f9" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center border border-[#7c2d12]/40"
                style={{ background: "#1a060080" }}>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5 text-[#7c2d12]">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl p-3 border border-[#f97316]/20 bg-[#f97316]/10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}>🤖</div>
            <div className="flex-1">
              <div className="text-xs font-medium text-[#fb923c]">AI Хост активний</div>
              <div className="text-xs text-[#7c2d12]">Тепла енергетика • Ідеально для вечора</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        <div className="rounded-2xl p-4 border border-[#7c2d12]/40" style={{ background: "#1a060080" }}>
          <div className="text-xs font-bold mb-3 uppercase tracking-widest text-[#7c2d12]">ЧАТ</div>
          {[
            { user: "warm_soul", msg: "Такий затишний стрім ☀️", color: "#fb923c" },
            { user: "coffee_fan", msg: "Продовжуй, будь ласка!", color: "#f87171" },
            { user: "sunset99", msg: "🌅🔥", color: "#fbbf24" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.7 }} />
              <div className="text-xs text-[#78350f]"><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
