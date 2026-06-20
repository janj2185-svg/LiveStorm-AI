export function Editorial() {
  return (
    <div className="min-h-screen bg-[#fafaf8] font-sans text-[#1a1a1a]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-16 py-5 border-b border-[#e5e5e0]">
        <div className="text-2xl font-black tracking-tight text-[#1a1a1a]">
          Live<em className="not-italic text-[#059669]">Storm</em>
        </div>
        <div className="flex gap-10 text-sm text-[#737373]">
          <span>Можливості</span><span>Ціни</span><span>Кейси</span><span>Блог</span>
        </div>
        <button className="px-5 py-2 bg-[#1a1a1a] text-[#fafaf8] text-sm rounded-full font-medium">
          Спробувати →
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-16 pt-16">
        {/* Editorial header */}
        <div className="text-xs font-semibold tracking-[0.3em] text-[#059669] mb-5 uppercase">
          — AI for Live Streamers
        </div>

        <div className="grid grid-cols-12 gap-8 mb-12">
          <div className="col-span-8">
            <h1 className="text-6xl font-black leading-tight mb-6 text-[#1a1a1a]" style={{ fontFamily: "Georgia, serif" }}>
              Розумний AI-хост,<br/>
              <span className="italic font-normal text-[#059669]">що слухає</span><br/>
              твоїх глядачів
            </h1>
          </div>
          <div className="col-span-4 pt-4 border-l border-[#e5e5e0] pl-8">
            <p className="text-[#737373] leading-relaxed text-sm mb-6">
              Платформа що перетворює пасивний перегляд на живе спілкування — завдяки AI, що розуміє контекст та емоції.
            </p>
            <button className="w-full py-3.5 bg-[#059669] text-white font-semibold rounded-xl text-sm">
              Почати безкоштовно
            </button>
          </div>
        </div>

        {/* Feature grid — editorial cards */}
        <div className="grid grid-cols-3 gap-px border border-[#e5e5e0]">
          {[
            { num: "01", title: "AI Відповіді", desc: "Миттєва реакція на кожен коментар із урахуванням контексту стріму.", accent: "#059669" },
            { num: "02", title: "3D Аватар", desc: "Кастомний цифровий персонаж з реалістичною мімікою та рухами.", accent: "#7c3aed" },
            { num: "03", title: "Аналітика", desc: "Детальні звіти про ефективність стріму та поведінку глядачів.", accent: "#0369a1" },
          ].map(c => (
            <div key={c.num} className="bg-white p-6 hover:bg-[#fafaf8] transition-colors">
              <div className="text-xs font-bold tracking-widest text-[#d4d4d4] mb-4">{c.num}</div>
              <div className="font-black text-lg mb-3 text-[#1a1a1a]">{c.title}</div>
              <div className="text-[#737373] text-sm leading-relaxed">{c.desc}</div>
              <div className="mt-4 h-0.5 w-8" style={{ background: c.accent }} />
            </div>
          ))}
        </div>

        {/* Bottom stats bar */}
        <div className="flex gap-16 mt-10 py-6 border-t border-[#e5e5e0]">
          {[
            { v: "50,000+", l: "Стрімерів" },
            { v: "2.8M", l: "AI-взаємодій на добу" },
            { v: "#1", l: "TikTok AI платформа" },
          ].map(s => (
            <div key={s.l}>
              <div className="text-3xl font-black text-[#1a1a1a]">{s.v}</div>
              <div className="text-sm text-[#737373] mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
