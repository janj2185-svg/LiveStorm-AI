export function Agency() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans text-[#1a1a1a] overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-12 py-6 border-b-2 border-[#1a1a1a]">
        <div className="font-black text-xl tracking-tight">LIVESTORM<span className="text-[#e63946]">.</span>AI</div>
        <div className="flex items-center gap-8 text-sm font-medium text-[#1a1a1a]/60">
          <span>Продукт</span><span>Ціни</span><span>Кейси</span>
        </div>
        <button className="px-6 py-2.5 bg-[#1a1a1a] text-[#f5f0e8] text-sm font-bold rounded-none hover:bg-[#e63946] transition-colors">
          СПРОБУВАТИ →
        </button>
      </nav>

      <div className="px-12 pt-16">
        {/* Asymmetric layout */}
        <div className="flex items-start gap-16">
          <div className="flex-1">
            <div className="text-xs font-bold tracking-[0.4em] text-[#e63946] mb-6 uppercase">AI для TikTok Стрімерів</div>
            <h1 className="text-7xl font-black leading-none mb-8 tracking-tight">
              LIVE<br/>
              <span className="text-[#e63946]">STREA</span><br/>
              MING
            </h1>
            <p className="text-lg text-[#1a1a1a]/50 max-w-sm mb-10 leading-relaxed">
              Революційний AI-хост що реагує на чат, подарунки та емоції глядачів у реальному часі.
            </p>
            <div className="flex gap-4">
              <button className="px-8 py-4 bg-[#e63946] text-white font-black text-sm">ПОЧАТИ ЗАРАЗ</button>
              <button className="px-8 py-4 border-2 border-[#1a1a1a] font-black text-sm">ДЕМО</button>
            </div>
          </div>

          {/* Right side stats */}
          <div className="w-80 pt-4">
            <div className="border-2 border-[#1a1a1a] p-6 mb-4 bg-white">
              <div className="text-5xl font-black text-[#e63946]">98%</div>
              <div className="text-sm font-bold mt-1">Задоволених стрімерів</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "2.8M", l: "Відповідей AI" },
                { v: "50K+", l: "Стрімерів" },
                { v: "4.9★", l: "Рейтинг" },
                { v: "24/7", l: "Підтримка" },
              ].map(s => (
                <div key={s.l} className="border-2 border-[#1a1a1a] p-4 bg-[#f5f0e8]">
                  <div className="text-2xl font-black">{s.v}</div>
                  <div className="text-xs font-medium text-[#1a1a1a]/50 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="mt-16 border-t-2 border-[#1a1a1a] py-4 flex gap-12 text-sm font-bold text-[#1a1a1a]/30 overflow-hidden">
          {["TikTok LIVE", "YouTube Live", "AI Chat", "Voice TTS", "3D Avatar", "Analytics", "Automation"].map(t => (
            <span key={t} className="whitespace-nowrap">{t} ★</span>
          ))}
        </div>
      </div>
    </div>
  );
}
