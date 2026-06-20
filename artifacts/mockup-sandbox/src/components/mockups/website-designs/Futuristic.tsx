export function Futuristic() {
  return (
    <div className="min-h-screen font-sans text-white overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 20% 50%, #0d0025 0%, #000000 60%)" }}>
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(#7c3aed 1px, transparent 1px), linear-gradient(90deg, #7c3aed 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-12 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 20px #7c3aed50" }}>LS</div>
          <span className="font-bold tracking-widest text-sm"
            style={{ background: "linear-gradient(90deg, #a78bfa, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LIVESTORM AI</span>
        </div>
        <div className="flex items-center gap-8 text-sm text-white/40">
          <span className="hover:text-white/80 cursor-pointer">Функції</span>
          <span className="hover:text-white/80 cursor-pointer">Ціни</span>
          <span className="hover:text-white/80 cursor-pointer">Блог</span>
        </div>
        <button className="text-sm px-5 py-2 rounded-full border border-[#7c3aed]/50 text-[#a78bfa] hover:bg-[#7c3aed]/20 transition-colors">
          Увійти →
        </button>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center text-center pt-20 px-8">
        <div className="inline-flex items-center gap-2 text-xs text-[#a78bfa] border border-[#7c3aed]/30 rounded-full px-4 py-1.5 mb-8 bg-[#7c3aed]/10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          Новий TikTok AI Streamer — v2.0
        </div>

        <h1 className="text-6xl font-black mb-6 leading-tight max-w-4xl"
          style={{ background: "linear-gradient(180deg, #ffffff 30%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Твій AI-хост<br/>стрімить за тебе
        </h1>

        <p className="text-lg text-white/40 max-w-xl mb-10 leading-relaxed">
          Автоматичні відповіді, реакція на подарунки, аналітика в реальному часі — поки ти фокусуєшся на контенті.
        </p>

        <div className="flex gap-4 mb-16">
          <button className="px-8 py-3.5 rounded-full font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 30px #7c3aed40" }}>
            Почати безкоштовно
          </button>
          <button className="px-8 py-3.5 rounded-full text-sm text-white/60 border border-white/10 hover:border-white/20">
            ▶ Переглянути демо
          </button>
        </div>

        {/* Dashboard preview card */}
        <div className="w-full max-w-3xl rounded-2xl border border-[#7c3aed]/20 p-4"
          style={{ background: "linear-gradient(145deg, #0d0025, #000000)", boxShadow: "0 0 80px #7c3aed20" }}>
          <div className="flex gap-3 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Активні стріми", val: "2,847", color: "#a78bfa" },
              { label: "AI відповідей/год", val: "12.4K", color: "#818cf8" },
              { label: "Середній дохід", val: "$847", color: "#22c55e" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border border-white/5 bg-white/2">
                <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.val}</div>
                <div className="text-xs text-white/30">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
