export function NeoBrutalist() {
  return (
    <div className="min-h-screen bg-[#f0e040] font-sans text-[#0a0a0a] overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-10 py-5 border-b-4 border-[#0a0a0a]">
        <div className="font-black text-2xl">LIVESTORM</div>
        <div className="flex gap-2">
          {["ФУНКЦІЇ", "ЦІНИ", "БЛОГ"].map(item => (
            <button key={item} className="px-4 py-2 border-2 border-[#0a0a0a] font-bold text-xs hover:bg-[#0a0a0a] hover:text-[#f0e040] transition-colors">
              {item}
            </button>
          ))}
        </div>
        <button className="px-6 py-3 bg-[#0a0a0a] text-[#f0e040] font-black text-sm border-2 border-[#0a0a0a]" style={{ boxShadow: "4px 4px 0 #0a0a0a" }}>
          УВІЙТИ
        </button>
      </nav>

      <div className="px-10 pt-12">
        <div className="flex items-start gap-8">
          <div className="flex-1">
            <div className="inline-block bg-[#0a0a0a] text-[#f0e040] text-xs font-black px-3 py-1.5 mb-6 border-2 border-[#0a0a0a]">
              ★ №1 AI СТРІМІНГ ПЛАТФОРМА
            </div>
            <h1 className="text-8xl font-black leading-none mb-6 tracking-tighter">
              STREAM<br/>
              SMARTER
            </h1>
            <div className="text-lg font-medium text-[#0a0a0a]/60 max-w-md mb-8 leading-relaxed">
              AI-хост який відповідає на коментарі, реагує на подарунки та розважає глядачів — автоматично.
            </div>
            <div className="flex gap-4">
              <button className="px-8 py-4 bg-[#0a0a0a] text-[#f0e040] font-black text-base border-2 border-[#0a0a0a]"
                style={{ boxShadow: "6px 6px 0 #0a0a0a80" }}>
                СПРОБУЙ ЗАРАЗ
              </button>
              <button className="px-8 py-4 bg-white font-black text-base border-2 border-[#0a0a0a]"
                style={{ boxShadow: "6px 6px 0 #0a0a0a80" }}>
                ▶ ДЕМО
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72">
            <div className="border-4 border-[#0a0a0a] bg-white p-5 mb-4" style={{ boxShadow: "8px 8px 0 #0a0a0a" }}>
              <div className="text-5xl font-black mb-1">50K+</div>
              <div className="font-bold text-[#0a0a0a]/50">СТРІМЕРІВ ВИКОРИСТОВУЮТЬ</div>
            </div>
            <div className="border-4 border-[#0a0a0a] bg-[#ff6b6b] p-5" style={{ boxShadow: "8px 8px 0 #0a0a0a" }}>
              <div className="text-5xl font-black text-white mb-1">$0</div>
              <div className="font-bold text-white/70">БЕЗКОШТОВНИЙ СТАРТ</div>
            </div>
          </div>
        </div>

        {/* Feature row */}
        <div className="mt-12 grid grid-cols-4 gap-4">
          {[
            { icon: "🤖", label: "AI ЧАТ", color: "#ff6b6b" },
            { icon: "🎭", label: "АВАТАР", color: "#4ecdc4" },
            { icon: "📊", label: "АНАЛІТ.", color: "#ffe66d" },
            { icon: "🎁", label: "ГІФТИ", color: "#a8e6cf" },
          ].map(f => (
            <div key={f.label} className="border-4 border-[#0a0a0a] p-4 text-center" style={{ background: f.color, boxShadow: "6px 6px 0 #0a0a0a" }}>
              <div className="text-4xl mb-2">{f.icon}</div>
              <div className="font-black text-sm">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
