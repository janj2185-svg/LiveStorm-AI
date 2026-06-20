export function Pastel() {
  return (
    <div className="min-h-screen font-sans text-slate-700 flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fce7f3 30%, #ede9fe 70%, #dbeafe 100%)" }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl shadow-md flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #e879f9, #a78bfa)", color: "white" }}>LS</div>
            <span className="font-semibold text-sm text-[#7c3aed]">LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-2 bg-[#fce7f3] border border-[#f9a8d4] rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-[#ec4899] animate-pulse" />
            <span className="text-xs font-semibold text-[#be185d]">LIVE</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl p-5 mb-4 shadow-lg shadow-purple-100 border border-purple-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs text-[#a78bfa] mb-1">@pastel.dream.ua</div>
              <div className="text-lg font-bold text-[#4c1d95]">Мрійливий стрім 🌸</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold"
                style={{ background: "linear-gradient(90deg, #e879f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>2:47:33</div>
              <div className="text-xs text-[#c4b5fd]">тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", bg: "#fce7f3", color: "#be185d", border: "#f9a8d4" },
              { label: "Лайки", value: "89K", bg: "#ede9fe", color: "#7c3aed", border: "#c4b5fd" },
              { label: "Чат", value: "4.2K", bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
              { label: "Gifts", value: "1.5K", bg: "#fef9c3", color: "#a16207", border: "#fde68a" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-3 text-center border"
                style={{ background: s.bg, borderColor: s.border }}>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: s.color, opacity: 0.6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-2xl p-3 border border-purple-100 bg-purple-50">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center text-sm shadow"
              style={{ background: "linear-gradient(135deg, #e879f9, #a78bfa)" }}>🤖</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#7c3aed]">AI Хост активний</div>
              <div className="text-xs text-[#c4b5fd]">Лагідний тон • Тепла атмосфера</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur rounded-3xl p-4 shadow-md shadow-pink-50 border border-pink-100">
          <div className="text-xs font-semibold mb-3 text-[#f9a8d4] uppercase tracking-widest">ЧАТ</div>
          {[
            { user: "dreamer_1", msg: "Такий красивий стрім! 🌸", color: "#be185d", bg: "#fce7f3" },
            { user: "soft_fan", msg: "Пастель — найкращий вибір", color: "#7c3aed", bg: "#ede9fe" },
            { user: "pink99", msg: "💜🌸💙", color: "#1d4ed8", bg: "#dbeafe" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.bg, border: `1px solid ${c.color}40` }} />
              <div className="text-xs text-slate-400"><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
