export function Vaporwave() {
  return (
    <div className="min-h-screen font-sans text-white overflow-hidden relative"
      style={{ background: "linear-gradient(180deg, #0d001f 0%, #1a0035 40%, #2d0050 70%, #4a0080 100%)" }}>
      {/* Grid floor */}
      <div className="absolute bottom-0 left-0 right-0 h-64 opacity-40"
        style={{ background: "linear-gradient(180deg, transparent, #ff00ff10)", backgroundImage: "linear-gradient(#ff00ff 1px, transparent 1px), linear-gradient(90deg, #ff00ff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Sun */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-60"
        style={{ background: "linear-gradient(180deg, #ff6ec7 0%, #ffb347 50%, #ff6347 100%)", boxShadow: "0 0 80px #ff6ec760" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-12 py-5">
        <div className="font-black text-xl tracking-widest" style={{ color: "#ff6ec7", textShadow: "0 0 20px #ff6ec7" }}>
          ✦ LIVESTORM.AI ✦
        </div>
        <div className="flex gap-8 text-sm" style={{ color: "#b57bee" }}>
          <span>VИБІР ПЛАНУ</span><span>ОСОБЛИВОСТІ</span><span>КОНТАКТ</span>
        </div>
        <button className="px-5 py-2 text-sm font-bold border"
          style={{ borderColor: "#ff6ec7", color: "#ff6ec7", background: "rgba(255,110,199,0.1)", textShadow: "0 0 10px #ff6ec7", boxShadow: "0 0 15px #ff6ec720" }}>
          УВІЙТИ
        </button>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center text-center pt-12 px-8">
        <div className="text-xs tracking-[0.5em] mb-4" style={{ color: "#ff6ec7", textShadow: "0 0 15px #ff6ec7" }}>
          ✦ A E S T H E T I C   S T R E A M I N G ✦
        </div>
        <h1 className="text-7xl font-black mb-6 leading-tight"
          style={{ background: "linear-gradient(180deg, #ff6ec7, #b57bee, #6ec6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px #ff6ec750)" }}>
          STREAM<br/>INTO THE<br/>FUTURE
        </h1>
        <p className="text-base mb-8 max-w-md" style={{ color: "#b57bee" }}>
          Перенесись у майбутнє стрімінгу. AI-хост що говорить, реагує та розважає — у стилі 80-х.
        </p>
        <div className="flex gap-4">
          <button className="px-8 py-3.5 font-black text-sm"
            style={{ background: "linear-gradient(135deg, #ff6ec7, #b57bee)", boxShadow: "0 0 30px #ff6ec750, 0 0 60px #b57bee30" }}>
            ✦ ПОЧАТИ ✦
          </button>
          <button className="px-8 py-3.5 font-bold text-sm border"
            style={{ borderColor: "#6ec6ff40", color: "#6ec6ff", background: "rgba(110,198,255,0.05)" }}>
            ПЕРЕГЛЯД ДЕМО
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-12 mt-12">
          {[
            { v: "50K+", l: "СТРІМЕРІВ" },
            { v: "2.8M", l: "AI ВІДПОВІДЕЙ" },
            { v: "98%", l: "ЗАДОВОЛЕНІ" },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="text-3xl font-black" style={{ color: "#ff6ec7", textShadow: "0 0 20px #ff6ec7" }}>{s.v}</div>
              <div className="text-xs tracking-widest mt-1" style={{ color: "#b57bee" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
