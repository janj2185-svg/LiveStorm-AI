export function Arctic() {
  return (
    <div className="min-h-screen font-sans text-slate-900 flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)" }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white shadow-md flex items-center justify-center text-sm font-bold text-[#0284c7]">LS</div>
            <span className="font-bold text-sm text-[#0369a1] tracking-wide">LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-2 bg-[#dc2626]/10 border border-[#dc2626]/20 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
            <span className="text-xs font-bold text-[#dc2626]">LIVE</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl p-5 mb-4 shadow-xl shadow-sky-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs text-[#0284c7] mb-1">@arctic_calm</div>
              <div className="text-lg font-bold text-[#0c4a6e]">Мінімалістичний стрім ❄️</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#0284c7]">2:47:33</div>
              <div className="text-xs text-[#bae6fd]">тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", color: "#0284c7" },
              { label: "Лайки", value: "89K", color: "#0ea5e9" },
              { label: "Чат", value: "4.2K", color: "#38bdf8" },
              { label: "Gifts", value: "1.5K", color: "#7c3aed" },
            ].map((s) => (
              <div key={s.label} className="bg-[#f0f9ff] rounded-xl p-3 text-center border border-[#bae6fd]">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5 text-[#7dd3fc]">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-[#e0f2fe] border border-[#bae6fd] rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-sm">🤖</div>
            <div className="flex-1">
              <div className="text-xs text-[#0369a1] font-medium">AI Хост активний</div>
              <div className="text-xs text-[#7dd3fc]">Спокійний тон • Розслаблена атмосфера</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur border border-white/50 rounded-2xl p-4 shadow-lg shadow-sky-100">
          <div className="text-xs text-[#7dd3fc] font-bold mb-3 uppercase tracking-widest">ЧАТ</div>
          {[
            { user: "chill_mode", msg: "Дуже спокійна атмосфера ❄️", color: "#0284c7" },
            { user: "minimal_fan", msg: "Підписуюсь на чистий контент", color: "#0ea5e9" },
            { user: "ice_99", msg: "💙💙💙", color: "#38bdf8" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.6 }} />
              <div className="text-xs text-[#0c4a6e]/60"><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
