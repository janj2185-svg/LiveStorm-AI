export function Cherry() {
  return (
    <div className="min-h-screen font-sans text-white flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #0f0005 0%, #1a0010 50%, #0a000a 100%)" }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #e11d48, #9f1239)", boxShadow: "0 0 20px #e11d4840" }}>LS</div>
            <span className="font-bold text-sm tracking-wide"
              style={{ background: "linear-gradient(90deg, #fb7185, #e11d48)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-2 border rounded-full px-3 py-1"
            style={{ background: "#e11d4815", borderColor: "#e11d4840" }}>
            <div className="w-2 h-2 rounded-full bg-[#fb7185] animate-pulse" style={{ boxShadow: "0 0 8px #fb7185" }} />
            <span className="text-xs font-bold text-[#fb7185]">LIVE</span>
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-4 border"
          style={{ background: "linear-gradient(145deg, #1a001080, #0a000a80)", borderColor: "#e11d4820", boxShadow: "0 0 40px #e11d4810" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs mb-1 text-[#fb7185]">@cherry.stream.ua</div>
              <div className="text-lg font-bold">Cherry Mode 🍒</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold"
                style={{ background: "linear-gradient(90deg, #fb7185, #e11d48)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>2:47:33</div>
              <div className="text-xs text-[#9f1239]">тривалість</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Глядачі", value: "12.8K", color: "#fb7185" },
              { label: "Лайки", value: "89K", color: "#e11d48" },
              { label: "Чат", value: "4.2K", color: "#fda4af" },
              { label: "Gifts", value: "1.5K", color: "#f472b6" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center border"
                style={{ background: "#0f000560", borderColor: "#e11d4820" }}>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-0.5 text-[#9f1239]">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl p-3 border"
            style={{ background: "#e11d4810", borderColor: "#e11d4820" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #e11d48, #9f1239)", boxShadow: "0 0 12px #e11d4840" }}>🤖</div>
            <div className="flex-1">
              <div className="text-xs font-medium text-[#fb7185]">AI Хост • Агресивний режим</div>
              <div className="text-xs text-[#9f1239]">Максимальна енергетика</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          </div>
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: "#1a001060", borderColor: "#e11d4815" }}>
          <div className="text-xs font-bold mb-3 uppercase tracking-widest text-[#9f1239]">ЧАТ</div>
          {[
            { user: "hot_fan_1", msg: "🍒 Ти вогонь!", color: "#fb7185" },
            { user: "red_army", msg: "Не зупиняйся!", color: "#e11d48" },
            { user: "cherry99", msg: "❤️❤️❤️", color: "#fda4af" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: c.color, opacity: 0.8 }} />
              <div className="text-xs text-[#9f1239]"><span className="font-semibold" style={{ color: c.color }}>{c.user}:</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
