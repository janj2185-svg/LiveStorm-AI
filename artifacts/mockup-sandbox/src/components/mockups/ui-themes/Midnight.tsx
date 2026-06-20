export function Midnight() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] font-sans text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center text-sm font-bold">LS</div>
            <span className="font-semibold text-[#e2e8f0] tracking-wide text-sm uppercase">LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-2 bg-[#dc2626]/20 border border-[#dc2626]/40 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
            <span className="text-xs font-semibold text-[#fca5a5]">LIVE</span>
          </div>
        </div>

        {/* Main panel */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[#94a3b8] text-xs mb-1">TikTok @streamer_ua</div>
              <div className="text-lg font-bold text-white">Ранковий стрім 🌅</div>
            </div>
            <div className="text-right">
              <div className="text-[#3b82f6] text-2xl font-bold">2:47:33</div>
              <div className="text-[#64748b] text-xs">тривалість</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12,847", color: "#3b82f6" },
              { label: "Лайки", value: "89.2K", color: "#8b5cf6" },
              { label: "Коментарі", value: "4,231", color: "#06b6d4" },
              { label: "Подарунки", value: "1,590", color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0f172a] rounded-xl p-3 text-center border border-[#1e293b]">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[#475569] text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI status */}
          <div className="flex items-center gap-3 bg-[#1e3a8a]/20 border border-[#1e3a8a]/40 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center text-sm">🤖</div>
            <div className="flex-1">
              <div className="text-xs text-[#93c5fd] font-medium">AI Хост активний</div>
              <div className="text-xs text-[#475569]">Відповідає на коментарі • GPT-4o</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        {/* Chat feed */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-4">
          <div className="text-xs text-[#475569] font-medium mb-3 uppercase tracking-widest">Чат</div>
          {[
            { user: "user_alex", msg: "Привіт! Давно дивлюсь 🙌", color: "#3b82f6" },
            { user: "maria_k", msg: "Ти найкращий стрімер!", color: "#8b5cf6" },
            { user: "TikTok_fan", msg: "❤️❤️❤️", color: "#06b6d4" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.8 }} />
              <div className="text-xs text-[#94a3b8]"><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
