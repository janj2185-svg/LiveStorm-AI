export function Esports() {
  return (
    <div className="min-h-screen font-sans text-white overflow-hidden"
      style={{ background: "#060608" }}>
      {/* Diagonal accent bg */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5"
        style={{ background: "linear-gradient(135deg, #ff0040 0%, transparent 60%)" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center text-sm font-black text-[#ff0040]"
            style={{ border: "2px solid #ff0040", clipPath: "polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)" }}>LS</div>
          <div>
            <div className="font-black text-sm tracking-widest">LIVESTORM</div>
            <div className="text-[8px] tracking-[0.4em] text-[#ff0040]">AI GAMING</div>
          </div>
        </div>
        <div className="flex gap-8 text-xs font-bold tracking-widest text-white/40">
          <span>ФУНКЦІЇ</span><span>ТУРНІРИ</span><span>КОНТЕНТ</span><span>ЦІНИ</span>
        </div>
        <button className="px-5 py-2 text-xs font-black tracking-widest border border-[#ff0040] text-[#ff0040]"
          style={{ clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)" }}>
          УВІЙТИ
        </button>
      </nav>

      <div className="relative z-10 px-10 pt-14">
        <div className="flex items-start gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 mb-6 text-xs font-bold tracking-widest text-[#ff0040]">
              <div className="w-6 h-0.5 bg-[#ff0040]" />
              LEVEL UP YOUR STREAM
              <div className="w-6 h-0.5 bg-[#ff0040]" />
            </div>
            <h1 className="text-7xl font-black leading-none mb-6 tracking-tighter">
              DOMINATE<br/>
              <span style={{ WebkitTextStroke: "2px white", color: "transparent" }}>YOUR</span><br/>
              <span className="text-[#ff0040]">LIVE</span>
            </h1>
            <p className="text-white/40 max-w-sm mb-8 font-medium leading-relaxed">
              AI-хост що реагує з швидкістю реакції гравця. Твій чат ніколи не буде нудним.
            </p>
            <div className="flex gap-4">
              <button className="px-8 py-3.5 font-black text-sm tracking-widest text-black"
                style={{ background: "#ff0040", clipPath: "polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)" }}>
                ГРАТИ ЗАРАЗ
              </button>
              <button className="px-8 py-3.5 font-black text-sm tracking-widest text-[#ff0040] border border-[#ff0040]/30">
                ▶ ДИВИТИСЬ
              </button>
            </div>
          </div>

          {/* Right HUD */}
          <div className="w-80">
            <div className="border border-[#ff0040]/30 bg-[#ff0040]/5 p-4 mb-3"
              style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}>
              <div className="text-[10px] tracking-widest text-[#ff0040] mb-3 font-bold">// LIVE STATS</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "12.8K", l: "VIEWERS" },
                  { v: "89K", l: "LIKES" },
                  { v: "4.2K", l: "MESSAGES" },
                  { v: "1.5K", l: "GIFTS" },
                ].map(s => (
                  <div key={s.l} className="bg-black/40 p-2.5 border border-white/5">
                    <div className="text-xl font-black text-[#ff0040]">{s.v}</div>
                    <div className="text-[9px] tracking-widest text-white/30 font-bold">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/5 bg-white/2 p-4 text-center">
              <div className="text-[10px] tracking-widest text-white/30 mb-2">AI STATUS</div>
              <div className="text-[#22c55e] font-black tracking-widest flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                ONLINE — AUTOPILOT
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
