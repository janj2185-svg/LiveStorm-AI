export function GoldRush() {
  return (
    <div className="min-h-screen font-sans text-white flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #0c0800 0%, #1a1000 50%, #0c0c00 100%)" }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-[#92400e]"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 20px #f59e0b40" }}>LS</div>
            <span className="font-bold text-sm tracking-widest"
              style={{ background: "linear-gradient(90deg, #fcd34d, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LIVESTORM AI</span>
          </div>
          <div className="flex items-center gap-2 border rounded-full px-3 py-1"
            style={{ background: "#dc262615", borderColor: "#dc262640" }}>
            <div className="w-2 h-2 rounded-full bg-[#f87171] animate-pulse" />
            <span className="text-xs font-bold text-[#f87171]">LIVE</span>
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-4 border"
          style={{ background: "linear-gradient(145deg, #1c150080, #0c0a0080)", borderColor: "#f59e0b20", boxShadow: "0 0 60px #f59e0b10" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs mb-1" style={{ color: "#f59e0b" }}>@gold_premium_ua</div>
              <div className="text-lg font-bold">Преміум стрім 👑</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold"
                style={{ background: "linear-gradient(90deg, #fcd34d, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>2:47:33</div>
              <div className="text-xs" style={{ color: "#78350f" }}>тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", color: "#fcd34d" },
              { label: "Лайки", value: "89K", color: "#f59e0b" },
              { label: "Чат", value: "4.2K", color: "#fbbf24" },
              { label: "Gifts", value: "1.5K", color: "#d97706" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center border"
                style={{ background: "#0c0a0060", borderColor: "#f59e0b20" }}>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#78350f" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl p-3 border"
            style={{ background: "#f59e0b10", borderColor: "#f59e0b20" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 15px #f59e0b40" }}>🤖</div>
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "#fcd34d" }}>AI Хост • Преміум режим</div>
              <div className="text-xs" style={{ color: "#78350f" }}>VIP досвід для глядачів</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: "#1c150060", borderColor: "#f59e0b15" }}>
          <div className="text-xs font-bold mb-3 tracking-widest" style={{ color: "#78350f" }}>ЧАТ</div>
          {[
            { user: "vip_user_1", msg: "👑 Це справжній клас!", color: "#fcd34d" },
            { user: "luxury_fan", msg: "Найкращий стрім 2025", color: "#f59e0b" },
            { user: "gold_99", msg: "💰💰💰", color: "#d97706" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.8 }} />
              <div className="text-xs" style={{ color: "#78350f" }}><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
