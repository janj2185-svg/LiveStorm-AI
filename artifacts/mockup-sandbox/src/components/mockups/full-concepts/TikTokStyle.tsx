export function TikTokStyle() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-sans text-white overflow-hidden" style={{background:"#121212",fontFamily:"'TikTok Sans',Inter,sans-serif"}}>
      {/* Sidebar */}
      <aside className="w-52 flex flex-col py-5 px-3 flex-shrink-0 border-r border-white/5" style={{background:"#1a1a1a"}}>
        <div className="flex items-center gap-2 px-2 mb-7">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black" style={{background:"linear-gradient(135deg,#fe2c55,#25f4ee)"}}>LS</div>
          <div>
            <div className="font-black text-sm">LiveStorm AI</div>
            <div className="text-[10px] text-white/40">TikTok Creator Hub</div>
          </div>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 cursor-pointer transition-colors ${i===0?"bg-white/10 text-white font-bold":"text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
            <span className="text-base">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span>{n}</span>
          </div>
        ))}
        <div className="mt-auto px-2">
          <div className="rounded-2xl p-3" style={{background:"linear-gradient(135deg,#fe2c5520,#25f4ee20)",border:"1px solid rgba(254,44,85,0.2)"}}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full" style={{background:"linear-gradient(135deg,#fe2c55,#25f4ee)"}}/>
              <div>
                <div className="text-xs font-bold">@tiktok_star_ua</div>
                <div className="text-[9px] text-[#fe2c55]">● LIVE зараз</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/5" style={{background:"#1a1a1a"}}>
          <div className="flex items-center gap-3">
            <div className="font-black text-base">Creator Dashboard</div>
            <div className="text-[10px] bg-white/10 text-white/60 rounded-full px-2 py-0.5">21 червня 2025</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-white" style={{background:"linear-gradient(135deg,#fe2c55,#ff6b6b)"}}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE • 2:47:33
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-3 p-4 overflow-hidden">
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Stats - TikTok style cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {v:"12,847",l:"Глядачі",c:"#25f4ee",bg:"rgba(37,244,238,0.08)"},
                {v:"89.2K",l:"Лайки",c:"#fe2c55",bg:"rgba(254,44,85,0.08)"},
                {v:"4,231",l:"Коментарі",c:"#ffffff",bg:"rgba(255,255,255,0.06)"},
                {v:"$1,590",l:"Подарунки",c:"#ffd700",bg:"rgba(255,215,0,0.08)"},
              ].map(s=>(
                <div key={s.l} className="rounded-2xl p-4" style={{background:s.bg,border:`1px solid ${s.c}20`}}>
                  <div className="text-2xl font-black" style={{color:s.c}}>{s.v}</div>
                  <div className="text-[10px] text-white/40 mt-1">{s.l}</div>
                  <div className="text-[9px] text-[#25f4ee] mt-0.5">↑ 12% від вчора</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* AI Co-Host */}
              <div className="rounded-2xl p-4" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-sm flex items-center gap-2">🤖 AI Co-Host</div>
                  <div className="text-[10px] bg-[#25f4ee]/20 text-[#25f4ee] rounded-full px-2 py-0.5 font-bold">Autopilot ON</div>
                </div>
                <div className="flex items-center gap-3 rounded-xl p-3 mb-3" style={{background:"rgba(254,44,85,0.1)"}}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background:"linear-gradient(135deg,#fe2c55,#25f4ee)"}}>🤖</div>
                  <div>
                    <div className="font-bold text-sm">TikAI Host</div>
                    <div className="text-[10px] text-white/40">847 відповідей • Хвиля ❤️</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {["«Ти абсолютно права @maria! 💯»","«Дякуємо за подарунок! 🌹»","«Наступний стрім — завтра о 19:00!»"].map((m,i)=>(
                    <div key={i} className="text-[10px] text-white/70 rounded-xl px-3 py-2" style={{background:"rgba(255,255,255,0.05)"}}>{m}</div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Avatar */}
                <div className="rounded-2xl p-3 flex-1" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(37,244,238,0.15)"}}>
                  <div className="font-bold text-xs text-[#25f4ee] mb-2">🎭 Avatar Studio</div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{background:"linear-gradient(135deg,#fe2c55,#25f4ee)"}}>🦋</div>
                    <div>
                      <div className="text-sm font-bold">TikStar AI</div>
                      <div className="text-[9px] text-white/40">Live motion capture</div>
                      <div className="flex gap-1 mt-1">
                        {["😍","🥳","😊"].map(e=>(
                          <div key={e} className="text-sm rounded-lg px-1 py-0.5" style={{background:e==="😍"?"rgba(254,44,85,0.2)":"rgba(255,255,255,0.05)"}}>{e}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* TikTok LIVE stats */}
                <div className="rounded-2xl p-3 flex-1" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(254,44,85,0.15)"}}>
                  <div className="font-bold text-xs text-[#fe2c55] mb-2">📱 TikTok LIVE</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{v:"12.8K",l:"Views"},{v:"98ms",l:"Ping"},{v:"4K",l:"HDR"}].map(s=>(
                      <div key={s.l} className="text-center rounded-xl py-2" style={{background:"rgba(254,44,85,0.1)"}}>
                        <div className="text-sm font-black text-[#fe2c55]">{s.v}</div>
                        <div className="text-[9px] text-white/30">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics - TikTok-style bar chart */}
            <div className="rounded-2xl p-4" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",height:"100px"}}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-white/60">📊 Перегляди за 10 хв</div>
                <div className="text-xs text-[#25f4ee] font-bold">↑ Пік о 21:42</div>
              </div>
              <div className="flex items-end gap-1 h-12">
                {[20,45,30,70,50,85,65,100,70,90].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===7?"linear-gradient(180deg,#fe2c55,#ff6b6b)":i>5?"rgba(254,44,85,0.4)":"rgba(255,255,255,0.1)"}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile - TikTok phone style */}
          <div className="w-40 flex-shrink-0 flex flex-col items-center">
            <div className="text-xs text-white/30 mb-2 font-bold">MOBILE APP</div>
            <div className="w-32 rounded-[32px] overflow-hidden" style={{border:"3px solid rgba(254,44,85,0.4)",height:"260px",background:"#121212",boxShadow:"0 0 30px rgba(254,44,85,0.15)"}}>
              <div className="h-4 bg-black flex items-center justify-center">
                <div className="w-10 h-1 bg-white/10 rounded-full"/>
              </div>
              <div className="p-2.5">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black" style={{background:"linear-gradient(135deg,#fe2c55,#25f4ee)"}}>L</div>
                  <div className="text-[9px] font-black">LiveStorm</div>
                  <div className="ml-auto text-[7px] bg-[#fe2c55] rounded px-1 font-bold">LIVE</div>
                </div>
                <div className="rounded-xl p-2 mb-1.5" style={{background:"rgba(254,44,85,0.15)",border:"1px solid rgba(254,44,85,0.2)"}}>
                  <div className="text-[8px] text-white/50">Viewers 👁️</div>
                  <div className="text-base font-black text-[#fe2c55]">12.8K</div>
                </div>
                {[{l:"❤️ Лайки",v:"89K"},{l:"💬 Коменти",v:"4.2K"}].map(s=>(
                  <div key={s.l} className="rounded-xl p-1.5 mb-1 flex justify-between items-center" style={{background:"rgba(255,255,255,0.05)"}}>
                    <div className="text-[8px] text-white/50">{s.l}</div>
                    <div className="text-[9px] font-black text-[#25f4ee]">{s.v}</div>
                  </div>
                ))}
                <div className="flex justify-around mt-3">
                  {["🏠","🤖","📊","⚙️"].map(i=><div key={i} className="text-base">{i}</div>)}
                </div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-[9px] text-white/30">TikTok Creator Mode</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
