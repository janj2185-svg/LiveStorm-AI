export function Emerald() {
  return (
    <div className="min-h-screen bg-[#021a0e] font-sans text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#065f46] border border-[#10b981]/30 flex items-center justify-center text-sm font-bold text-[#6ee7b7]">LS</div>
            <span className="font-bold text-sm text-[#6ee7b7] tracking-widest">LIVESTORM AI</span>
          </div>
          <div className="flex items-center gap-2 bg-[#dc2626]/15 border border-[#dc2626]/30 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-[#f87171] animate-pulse" />
            <span className="text-xs font-bold text-[#f87171]">LIVE</span>
          </div>
        </div>

        <div className="bg-[#042f1e] border border-[#065f46] rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[#34d399] text-xs mb-1">@gaming_master_ua</div>
              <div className="text-lg font-bold">Warzone Squad 🎮</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#10b981]">2:47:33</div>
              <div className="text-[#064e3b] text-xs">тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", color: "#34d399" },
              { label: "Лайки", value: "89K", color: "#6ee7b7" },
              { label: "Чат", value: "4.2K", color: "#a7f3d0" },
              { label: "Gifts", value: "1.5K", color: "#fde68a" },
            ].map((s) => (
              <div key={s.label} className="bg-[#021a0e] rounded-xl p-3 text-center border border-[#065f46]">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[#065f46] text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-[#065f46]/20 border border-[#10b981]/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#065f46] flex items-center justify-center text-sm">🤖</div>
            <div className="flex-1">
              <div className="text-xs text-[#6ee7b7] font-medium">AI Хост активний</div>
              <div className="text-xs text-[#065f46]">Режим Gaming • Агресивна реакція</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        <div className="bg-[#042f1e] border border-[#065f46] rounded-2xl p-4">
          <div className="text-xs text-[#065f46] font-bold mb-3 uppercase tracking-widest">ЧАТ</div>
          {[
            { user: "pro_gamer", msg: "GG! Ти переміг!", color: "#34d399" },
            { user: "fan_2025", msg: "Підписуюсь 🎮", color: "#6ee7b7" },
            { user: "quest99", msg: "🔥🔥🔥", color: "#a7f3d0" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.7 }} />
              <div className="text-xs text-[#34d39980]"><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
