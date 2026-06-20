export function Enterprise() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#111827]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-12 py-4 border-b border-[#e5e7eb] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center text-white text-sm font-bold">LS</div>
          <span className="font-bold text-[#111827]">LiveStorm AI</span>
          <span className="text-xs bg-[#dbeafe] text-[#1d4ed8] px-2 py-0.5 rounded font-semibold">Enterprise</span>
        </div>
        <div className="flex gap-8 text-sm text-[#6b7280]">
          <span>Продукт</span><span>Рішення</span><span>Ресурси</span><span>Ціни</span>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm text-[#374151] hover:text-[#1d4ed8]">Увійти</button>
          <button className="px-5 py-2 bg-[#1d4ed8] text-white text-sm font-semibold rounded-lg hover:bg-[#1e40af]">
            Безкоштовно →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-12 pt-20 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16a34a] bg-[#dcfce7] px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
            Нова версія 2.0 доступна
          </div>
          <div className="text-xs text-[#6b7280]">Читати про оновлення →</div>
        </div>

        <div className="flex items-start gap-16">
          <div className="flex-1">
            <h1 className="text-5xl font-black leading-tight mb-6 text-[#111827]">
              AI-платформа для<br/>
              <span className="text-[#1d4ed8]">TikTok стрімерів</span><br/>
              нового покоління
            </h1>
            <p className="text-lg text-[#6b7280] max-w-lg mb-8 leading-relaxed">
              Автоматизуйте взаємодію з глядачами, збільшуйте дохід та аналізуйте ефективність кожного стріму.
            </p>
            <div className="flex gap-3 mb-10">
              <button className="px-6 py-3 bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-lg shadow-blue-200">
                Почати безкоштовно
              </button>
              <button className="px-6 py-3 border border-[#e5e7eb] text-[#374151] font-semibold rounded-lg text-sm flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#1d4ed8] flex items-center justify-center text-white text-xs">▶</div>
                Дивитись демо
              </button>
            </div>

            <div className="flex gap-8 text-sm">
              {[
                { v: "50,000+", l: "Активних стрімерів" },
                { v: "2.8M", l: "AI-відповідей/добу" },
                { v: "4.9/5", l: "App Store рейтинг" },
              ].map(s => (
                <div key={s.l}>
                  <div className="font-black text-xl text-[#111827]">{s.v}</div>
                  <div className="text-[#9ca3af]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard card */}
          <div className="w-96 bg-[#f9fafb] rounded-2xl border border-[#e5e7eb] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-sm">Панель стрімера</div>
              <div className="flex items-center gap-1.5 text-xs text-[#16a34a] bg-[#dcfce7] px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />LIVE
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "12,847", l: "Глядачів", c: "#1d4ed8" },
                { v: "89.2K", l: "Лайків", c: "#7c3aed" },
                { v: "4,231", l: "Коментарів", c: "#0891b2" },
                { v: "$1,590", l: "Подарунків", c: "#16a34a" },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-xl p-3 border border-[#e5e7eb]">
                  <div className="text-lg font-bold" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-xs text-[#9ca3af]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
