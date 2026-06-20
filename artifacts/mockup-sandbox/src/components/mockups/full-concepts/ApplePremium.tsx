export function ApplePremium() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen text-[#1d1d1f] overflow-hidden" style={{background:"#f5f5f7",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif"}}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col py-6 px-4 flex-shrink-0" style={{background:"rgba(255,255,255,0.7)",backdropFilter:"blur(40px)",borderRight:"1px solid rgba(0,0,0,0.06)"}}>
        <div className="flex items-center gap-2.5 px-1 mb-8">
          <div className="w-8 h-8 rounded-[10px] shadow-sm flex items-center justify-center text-white text-xs font-black" style={{background:"linear-gradient(145deg,#1c1c1e,#3a3a3c)"}}>LS</div>
          <div>
            <div className="font-semibold text-sm text-[#1d1d1f]">LiveStorm AI</div>
            <div className="text-[10px] text-[#86868b]">Streaming Platform</div>
          </div>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 cursor-pointer ${i===0?"bg-[#1c1c1e] text-white font-medium":"text-[#6e6e73] hover:bg-black/5"}`}>
            <span className="text-base opacity-70">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span className="font-medium">{n}</span>
          </div>
        ))}
        <div className="mt-auto">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:"rgba(0,0,0,0.04)"}}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5856d6] to-[#32ade6] shadow-sm"/>
            <div>
              <div className="text-sm font-medium">@premium.ua</div>
              <div className="text-xs text-[#86868b]">Pro ∙ Active</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top */}
        <div className="px-7 py-4 flex items-center justify-between" style={{background:"rgba(245,245,247,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
          <div>
            <div className="text-lg font-semibold text-[#1d1d1f]">Dashboard</div>
            <div className="text-xs text-[#86868b]">Ваш стрім • Субота, 21 червня 2025</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-md" style={{background:"linear-gradient(135deg,#30d158,#25a244)"}}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>Live • 2:47:33
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-5 p-6 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[{v:"12,847",l:"Глядачі",c:"#5856d6"},{v:"89.2K",l:"Лайки",c:"#ff375f"},{v:"4,231",l:"Коментарі",c:"#32ade6"},{v:"$1,590",l:"Подарунки",c:"#ff9f0a"}].map(s=>(
                <div key={s.l} className="rounded-2xl p-4 shadow-sm" style={{background:"rgba(255,255,255,0.8)",backdropFilter:"blur(10px)"}}>
                  <div className="w-8 h-8 rounded-xl mb-2 flex items-center justify-center text-white text-sm shadow-sm" style={{background:s.c}}>
                    {["👥","❤️","💬","🎁"][["Глядачі","Лайки","Коментарі","Подарунки"].indexOf(s.l)]}
                  </div>
                  <div className="text-xl font-semibold" style={{color:s.c}}>{s.v}</div>
                  <div className="text-xs text-[#86868b] mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* AI Co-Host */}
              <div className="rounded-3xl p-5 shadow-sm" style={{background:"rgba(255,255,255,0.8)",backdropFilter:"blur(20px)"}}>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-sm">AI Co-Host</div>
                  <div className="flex items-center gap-1.5 text-xs text-[#30d158] font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse"/>Autopilot
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl mb-3" style={{background:"rgba(88,86,214,0.06)"}}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{background:"linear-gradient(135deg,#5856d6,#32ade6)"}}>🤖</div>
                  <div>
                    <div className="font-semibold text-sm">Alex AI</div>
                    <div className="text-xs text-[#86868b]">847 відповідей • Щасливий</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {["«Дякую всім за лайки! 🎉»","«Привіт @maria_k, як справи?»","«Wow, який подарунок! ❤️»"].map((m,i)=>(
                    <div key={i} className="text-xs rounded-2xl p-3" style={{background:i===0?"rgba(88,86,214,0.08)":"rgba(0,0,0,0.03)",color:"#1d1d1f"}}>{m}</div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Avatar */}
                <div className="rounded-3xl p-4 flex-1 shadow-sm" style={{background:"rgba(255,255,255,0.8)"}}>
                  <div className="font-semibold text-sm mb-3">Avatar Studio</div>
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner" style={{background:"linear-gradient(145deg,#f2f2f7,#e8e8ed)"}}>🧑‍💻</div>
                    <div>
                      <div className="text-sm font-semibold">Nova</div>
                      <div className="text-xs text-[#86868b]">Face tracking active</div>
                      <div className="flex gap-1.5 mt-2">
                        {["😊","😮","🥳"].map(e=>(
                          <div key={e} className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm" style={{background:e==="😊"?"rgba(88,86,214,0.1)":"rgba(0,0,0,0.04)"}}>{e}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* TikTok */}
                <div className="rounded-3xl p-4 flex-1 shadow-sm" style={{background:"rgba(255,255,255,0.8)"}}>
                  <div className="font-semibold text-sm mb-2">TikTok LIVE</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{v:"12.8K",l:"Viewers"},{v:"98ms",l:"Latency"},{v:"1080p",l:"Quality"}].map(s=>(
                      <div key={s.l} className="rounded-xl p-2 text-center" style={{background:"rgba(0,0,0,0.03)"}}>
                        <div className="text-sm font-semibold text-[#ff375f]">{s.v}</div>
                        <div className="text-[10px] text-[#86868b]">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="rounded-3xl p-4 shadow-sm" style={{background:"rgba(255,255,255,0.8)",height:"90px"}}>
              <div className="font-semibold text-xs text-[#86868b] mb-2">ANALYTICS — Viewers / 10 min</div>
              <div className="flex items-end gap-1 h-10">
                {[30,55,40,75,50,88,65,95,70,100].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-full" style={{height:`${h}%`,background:i===9?"#5856d6":i>6?"rgba(88,86,214,0.3)":"rgba(88,86,214,0.15)"}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile mockup */}
          <div className="w-44 flex-shrink-0 flex flex-col items-center">
            <div className="text-xs text-[#86868b] font-medium mb-3">Mobile App</div>
            <div className="w-36 rounded-[36px] overflow-hidden shadow-2xl" style={{border:"8px solid #1c1c1e",height:"280px",background:"#f5f5f7"}}>
              <div className="bg-[#1c1c1e] h-6 flex items-center justify-center">
                <div className="w-12 h-1 bg-[#3a3a3c] rounded-full"/>
              </div>
              <div className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-semibold">LiveStorm</div>
                  <div className="text-[10px] bg-[#30d158] text-white px-2 py-0.5 rounded-full font-medium">Live</div>
                </div>
                <div className="rounded-2xl p-3 mb-2 shadow-sm bg-white">
                  <div className="text-[10px] text-[#86868b]">Viewers</div>
                  <div className="text-lg font-semibold text-[#5856d6]">12.8K</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[{l:"Likes",v:"89K",c:"#ff375f"},{l:"Chat",v:"4.2K",c:"#32ade6"}].map(s=>(
                    <div key={s.l} className="rounded-xl p-2 shadow-sm bg-white">
                      <div className="text-[9px] text-[#86868b]">{s.l}</div>
                      <div className="text-sm font-semibold" style={{color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-around px-2">
                  {["⊞","🤖","📊","⚙️"].map(i=>(
                    <div key={i} className="text-lg text-center">{i}</div>
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
