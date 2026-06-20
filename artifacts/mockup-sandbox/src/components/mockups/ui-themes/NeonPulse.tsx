export function NeonPulse() {
  return (
    <div className="min-h-screen bg-[#07000f] font-sans text-white flex items-center justify-center p-4"
      style={{ backgroundImage: "radial-gradient(ellipse at top left, #1a0033 0%, #07000f 60%)" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)", boxShadow: "0 0 20px #c026d380" }}>LS</div>
            <span className="font-bold tracking-widest text-sm" style={{ background: "linear-gradient(90deg, #f0abfc, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LIVESTORM AI</span>
          </div>
          <div className="flex items-center gap-2 rounded-full px-3 py-1 border"
            style={{ background: "#ff003320", borderColor: "#ff003380", boxShadow: "0 0 12px #ff003340" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ff4d6d", boxShadow: "0 0 8px #ff4d6d" }} />
            <span className="text-xs font-bold" style={{ color: "#ff4d6d" }}>LIVE</span>
          </div>
        </div>

        {/* Main panel */}
        <div className="rounded-2xl p-5 mb-4 border"
          style={{ background: "linear-gradient(145deg, #1a0033, #0d0021)", borderColor: "#7c3aed40", boxShadow: "0 0 40px #7c3aed20" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs mb-1" style={{ color: "#a78bfa" }}>@neon_streamer</div>
              <div className="text-lg font-bold">Нічний стрім 🌙</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: "#f0abfc", textShadow: "0 0 20px #c026d3" }}>2:47:33</div>
              <div className="text-xs" style={{ color: "#6d28d9" }}>тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", color: "#f0abfc", glow: "#c026d380" },
              { label: "Лайки", value: "89K", color: "#a78bfa", glow: "#7c3aed80" },
              { label: "Чат", value: "4.2K", color: "#67e8f9", glow: "#06b6d480" },
              { label: "Gifts", value: "1.5K", color: "#fde68a", glow: "#f59e0b80" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center border"
                style={{ background: "#12002280", borderColor: s.color + "30", boxShadow: `0 0 20px ${s.glow}` }}>
                <div className="text-lg font-bold" style={{ color: s.color, textShadow: `0 0 12px ${s.color}` }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#6d28d9" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl p-3 border"
            style={{ background: "#c026d310", borderColor: "#c026d340" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)", boxShadow: "0 0 15px #c026d350" }}>🤖</div>
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "#f0abfc" }}>AI Хост • Режим Autopilot</div>
              <div className="text-xs" style={{ color: "#6d28d9" }}>Реагує на gifts та коментарі</div>
            </div>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          </div>
        </div>

        <div className="rounded-2xl p-4 border"
          style={{ background: "#1a003380", borderColor: "#7c3aed30" }}>
          <div className="text-xs font-bold mb-3 tracking-widest" style={{ color: "#7c3aed" }}>ЧАТ</div>
          {[
            { user: "night_owl", msg: "Вайб неймовірний 🔮", color: "#f0abfc" },
            { user: "rave_mode", msg: "Увімкни нові ефекти!", color: "#a78bfa" },
            { user: "glow_99", msg: "💜💜💜", color: "#67e8f9" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.7, boxShadow: `0 0 8px ${c.color}` }} />
              <div className="text-xs" style={{ color: "#a78bfa80" }}><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
