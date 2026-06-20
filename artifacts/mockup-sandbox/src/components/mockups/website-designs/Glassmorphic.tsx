export function Glassmorphic() {
  return (
    <div className="min-h-screen font-sans text-white overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 70%, #f5576c 100%)" }}>
      {/* Blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full opacity-30 blur-3xl" style={{ background: "#667eea" }} />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "#f5576c" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: "#f093fb" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-12 py-5"
        style={{ backdropFilter: "blur(20px)", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="font-bold text-lg">LiveStorm <span className="opacity-60">AI</span></div>
        <div className="flex gap-8 text-sm text-white/60">
          <span>Можливості</span><span>Ціни</span><span>Про нас</span>
        </div>
        <button className="px-5 py-2 rounded-full text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)" }}>
          Спробувати
        </button>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center text-center pt-16 px-8">
        <h1 className="text-6xl font-black mb-5 leading-tight max-w-3xl" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.2)" }}>
          AI-хост для<br/>твого стріму
        </h1>
        <p className="text-white/70 text-lg max-w-lg mb-10">
          Автоматичні відповіді, аналітика та 3D аватар — все в одному місці.
        </p>
        <button className="px-10 py-4 rounded-2xl text-base font-bold mb-12"
          style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          Почати безкоштовно ✦
        </button>

        {/* Glass cards row */}
        <div className="flex gap-5 w-full max-w-3xl">
          {[
            { icon: "🤖", title: "AI Хост", desc: "Реагує на кожен коментар та подарунок" },
            { icon: "📊", title: "Аналітика", desc: "Статистика стріму в реальному часі" },
            { icon: "🎭", title: "3D Аватар", desc: "Кастомний аватар з анімаціями" },
          ].map(c => (
            <div key={c.title} className="flex-1 rounded-3xl p-5 text-left"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
              <div className="text-3xl mb-3">{c.icon}</div>
              <div className="font-bold mb-2">{c.title}</div>
              <div className="text-white/60 text-sm leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
