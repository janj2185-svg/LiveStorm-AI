export function Glassmorphism() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-sans text-white overflow-hidden relative" style={{fontFamily:"'Inter',sans-serif",background:"linear-gradient(135deg,#1a0050 0%,#0d0030 25%,#001a4d 50%,#0d0040 75%,#1a0050 100%)"}}>
      {/* Ambient blobs */}
      <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-30" style={{background:"#7c3aed"}}/>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{background:"#2563eb"}}/>
      <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full blur-3xl opacity-15" style={{background:"#db2777"}}/>

      {/* Sidebar */}
      <aside className="relative z-10 w-52 flex flex-col py-5 px-3 flex-shrink-0" style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(30px)",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="flex items-center gap-2.5 px-2 mb-7">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{background:"rgba(255,255,255,0.2)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.3)"}}>LS</div>
          <span className="font-semibold text-sm">LiveStorm AI</span>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm mb-0.5 cursor-pointer transition-all ${i===0?"text-white":"text-white/40 hover:text-white/70"}`}
            style={i===0?{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.2)"}:{}}>
            <span className="text-base">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span className="font-medium">{n}</span>
          </div>
        ))}
        <div className="mt-auto">
          <div className="rounded-xl p-3" style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(15px)",border:"1px solid rgba(255,255,255,0.1)"}}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full" style={{background:"linear-gradient(135deg,#7c3aed,#db2777)"}}/>
              <div>
                <div className="text-xs font-semibold">@glass.stream</div>
                <div className="text-[9px] text-white/40">Pro Plan</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 flex items-center justify-between" style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div>
            <div className="font-bold text-base">Dashboard</div>
            <div className="text-xs text-white/40">Субота, 21 червня 2025</div>
          </div>
          <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold" style={{background:"rgba(220,38,38,0.3)",backdropFilter:"blur(10px)",border:"1px solid rgba(220,38,38,0.4)"}}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>LIVE • 2:47:33
          </div>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[{v:"12,847",l:"Глядачі",c:"#a78bfa"},{v:"89.2K",l:"Лайки",c:"#f472b6"},{v:"4,231",l:"Коментарі",c:"#67e8f9"},{v:"$1,590",l:"Подарунки",c:"#fbbf24"}].map(s=>(
                <div key={s.l} className="rounded-2xl p-3.5 text-center" style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.12)",boxShadow:"0 4px 24px rgba(0,0,0,0.15)"}}>
                  <div className="text-2xl font-bold" style={{color:s.c}}>{s.v}</div>
                  <div className="text-[10px] text-white/40 mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* AI */}
              <div className="rounded-3xl p-4" style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(25px)",border:"1px solid rgba(255,255,255,0.1)"}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">🤖 AI Co-Host</div>
                  <div className="text-[10px] rounded-full px-2 py-0.5 text-[#4ade80] font-semibold" style={{background:"rgba(74,222,128,0.15)",border:"1px solid rgba(74,222,128,0.3)"}}>Online</div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl p-3 mb-3" style={{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.2)"}}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:"linear-gradient(135deg,#7c3aed,#db2777)"}}>🤖</div>
                  <div>
                    <div className="font-semibold text-sm">Nova AI</div>
                    <div className="text-[9px] text-white/40">847 відповідей • Щасливий ✨</div>
                  </div>
                </div>
                {["«Дякую всім! Ви найкращі ✨»","«@Maria, дуже рада тебе бачити! 💜»","«Який чудовий подарунок! 🌟»"].map((m,i)=>(
                  <div key={i} className="text-[10px] text-white/70 rounded-xl px-3 py-2 mb-1.5" style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(10px)"}}>{m}</div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {/* Avatar */}
                <div className="rounded-3xl p-3 flex-1" style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(25px)",border:"1px solid rgba(255,255,255,0.1)"}}>
                  <div className="font-semibold text-xs text-white/60 mb-2">🎭 Avatar Studio</div>
                  <div className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{background:"linear-gradient(135deg,rgba(124,58,237,0.4),rgba(219,39,119,0.4))",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.15)"}}>🧝‍♀️</div>
                    <div>
                      <div className="font-semibold text-sm">Crystal</div>
                      <div className="text-[9px] text-white/40">Live expressions</div>
                      <div className="flex gap-1 mt-1">
                        {["😊","✨","🌟"].map(e=>(
                          <div key={e} className="text-sm w-6 h-6 flex items-center justify-center rounded-full" style={{background:e==="😊"?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}}>{e}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* TikTok */}
                <div className="rounded-3xl p-3 flex-1" style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(25px)",border:"1px solid rgba(255,255,255,0.1)"}}>
                  <div className="font-semibold text-xs text-white/60 mb-2">📱 TikTok LIVE</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{v:"12.8K",l:"Viewers"},{v:"98ms",l:"Ping"},{v:"4K",l:"Quality"}].map(s=>(
                      <div key={s.l} className="rounded-2xl p-2 text-center" style={{background:"rgba(255,255,255,0.06)"}}>
                        <div className="text-sm font-bold text-white">{s.v}</div>
                        <div className="text-[9px] text-white/30">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="rounded-3xl p-4" style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",height:"88px"}}>
              <div className="text-xs text-white/40 font-semibold mb-2">📊 Analytics</div>
              <div className="flex items-end gap-1 h-12">
                {[25,50,35,70,48,82,60,95,68,100].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===9?"rgba(167,139,250,1)":i>6?"rgba(167,139,250,0.5)":"rgba(255,255,255,0.15)"}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="w-44 flex-shrink-0 flex flex-col items-center">
            <div className="text-xs text-white/30 mb-2 font-semibold">Mobile</div>
            <div className="w-36 rounded-[36px] overflow-hidden" style={{border:"2px solid rgba(255,255,255,0.2)",height:"280px",background:"rgba(255,255,255,0.05)",backdropFilter:"blur(30px)",boxShadow:"0 0 40px rgba(124,58,237,0.3)"}}>
              <div className="h-5 flex items-center justify-center" style={{background:"rgba(0,0,0,0.3)"}}>
                <div className="w-10 h-1 rounded-full" style={{background:"rgba(255,255,255,0.2)"}}/>
              </div>
              <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[9px] font-semibold">LiveStorm</div>
                  <div className="text-[7px] rounded-full px-1.5 py-0.5 font-bold" style={{background:"rgba(220,38,38,0.3)",border:"1px solid rgba(220,38,38,0.4)"}}>LIVE</div>
                </div>
                <div className="rounded-2xl p-2.5 mb-2" style={{background:"rgba(124,58,237,0.2)",border:"1px solid rgba(124,58,237,0.3)"}}>
                  <div className="text-[8px] text-white/40">Viewers</div>
                  <div className="text-base font-bold text-[#a78bfa]">12.8K</div>
                </div>
                {[{l:"Likes",v:"89K",c:"#f472b6"},{l:"AI Replies",v:"847",c:"#67e8f9"}].map(s=>(
                  <div key={s.l} className="rounded-xl p-2 mb-1 flex justify-between" style={{background:"rgba(255,255,255,0.06)"}}>
                    <div className="text-[8px] text-white/30">{s.l}</div>
                    <div className="text-[9px] font-semibold" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
                <div className="flex justify-around mt-3">
                  {["⊞","🤖","📊","⚙️"].map(i=>(
                    <div key={i} className="w-7 h-7 rounded-xl flex items-center justify-center text-base" style={{background:"rgba(255,255,255,0.1)"}}>{i}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
