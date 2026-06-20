export function TwitchStyle() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-sans text-[#efeff1] overflow-hidden" style={{background:"#0e0e10",fontFamily:"'Roobert',Inter,sans-serif"}}>
      {/* Sidebar */}
      <aside className="w-54 flex flex-col py-4 flex-shrink-0" style={{background:"#1f1f23",borderRight:"1px solid #2a2a2d",width:"220px"}}>
        <div className="flex items-center gap-2.5 px-4 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#9147ff] flex items-center justify-center text-white text-xs font-black">LS</div>
          <div>
            <div className="font-bold text-sm">LiveStorm AI</div>
            <div className="text-[10px] text-[#adadb8]">Streamer Dashboard</div>
          </div>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${i===0?"bg-[#9147ff]/20 text-[#bf94ff] border-l-2 border-[#9147ff]":"text-[#adadb8] hover:bg-white/5 hover:text-[#efeff1] border-l-2 border-transparent"}`}>
            <span className="text-base">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span className="font-medium">{n}</span>
          </div>
        ))}
        <div className="mt-auto px-3">
          <div className="rounded-lg p-3" style={{background:"#2a2a2d"}}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9147ff] to-[#6441a5]"/>
              <div>
                <div className="text-xs font-bold">@purple_stream</div>
                <div className="text-[9px] text-[#adadb8]">Affiliate ★</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#9147ff]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#9147ff] animate-pulse"/>STREAMING LIVE
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{background:"#18181b",borderBottom:"1px solid #2a2a2d"}}>
          <div className="flex items-center gap-3">
            <div className="font-bold text-base">Dashboard</div>
            <div className="text-xs text-[#adadb8] bg-[#2a2a2d] rounded px-2 py-0.5">Cьогодні</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#9147ff] text-white text-xs font-bold px-3 py-1.5 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse"/>LIVE • 2:47:33
            </div>
            <div className="w-7 h-7 rounded bg-[#2a2a2d] flex items-center justify-center text-sm cursor-pointer">🔔</div>
          </div>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[{v:"12,847",l:"Глядачі",c:"#9147ff"},{v:"89.2K",l:"Лайки",c:"#ff4040"},{v:"4,231",l:"Повідомлення",c:"#00b5ad"},{v:"$1,590",l:"Підписки+Гіфти",c:"#f59e0b"}].map(s=>(
                <div key={s.l} className="rounded-lg p-3 border" style={{background:"#18181b",borderColor:"#2a2a2d"}}>
                  <div className="text-xl font-black" style={{color:s.c}}>{s.v}</div>
                  <div className="text-[10px] text-[#adadb8] mt-0.5">{s.l}</div>
                  <div className="text-[9px] text-[#adadb8] mt-1 flex items-center gap-1">
                    <span className="text-[#30d158]">▲ 12%</span> vs вчора
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-3 flex-1">
              {/* Chat feed - Twitch-like */}
              <div className="col-span-2 rounded-lg border overflow-hidden flex flex-col" style={{background:"#18181b",borderColor:"#2a2a2d"}}>
                <div className="px-3 py-2 border-b font-semibold text-xs" style={{background:"#1f1f23",borderColor:"#2a2a2d"}}>💬 AI Co-Host Chat</div>
                <div className="flex-1 overflow-hidden px-3 py-2 space-y-1">
                  {[{u:"viewer_1",c:"#ff6b6b",m:"Привіт! Круто стрімиш!"},{u:"AI Хост",c:"#9147ff",m:"Привіт! Дякую, дуже рада ♥"},
                    {u:"fan_ua",c:"#ffd700",m:"★ Sub Gift x5 ★"},{u:"AI Хост",c:"#9147ff",m:"WOW! Дякую @fan_ua! 🎉"},
                    {u:"maria_k",c:"#00b5ad",m:"Продовжуй! Ти найкраща!"}].map((c,i)=>(
                    <div key={i} className="text-xs">
                      <span className="font-bold" style={{color:c.c}}>{c.u}: </span>
                      <span className="text-[#efeff1]">{c.m}</span>
                    </div>
                  ))}
                </div>
                <div className="px-2 py-2 border-t" style={{background:"#1f1f23",borderColor:"#2a2a2d"}}>
                  <div className="bg-[#2a2a2d] rounded px-2 py-1.5 text-xs text-[#adadb8]">AI пише відповідь...</div>
                </div>
              </div>

              {/* Right panels */}
              <div className="col-span-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Avatar */}
                  <div className="rounded-lg border p-3" style={{background:"#18181b",borderColor:"#2a2a2d"}}>
                    <div className="text-xs font-semibold mb-2 text-[#adadb8]">🎭 Avatar Studio</div>
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#9147ff] to-[#6441a5] flex items-center justify-center text-3xl">🎭</div>
                      <div>
                        <div className="text-sm font-bold text-[#bf94ff]">Streamer AI</div>
                        <div className="text-[9px] text-[#adadb8]">Emotions: Happy</div>
                        <div className="flex gap-1 mt-1">
                          {["😊","😂","🥳"].map(e=>(
                            <div key={e} className={`text-sm rounded px-1 ${e==="😊"?"bg-[#9147ff]/20":""}`}>{e}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* TikTok */}
                  <div className="rounded-lg border p-3" style={{background:"#18181b",borderColor:"#2a2a2d"}}>
                    <div className="text-xs font-semibold mb-2 text-[#adadb8]">📱 TikTok LIVE</div>
                    <div className="space-y-1.5">
                      {[{l:"Viewers",v:"12.8K",c:"#9147ff"},{l:"Latency",v:"98ms",c:"#30d158"},{l:"Quality",v:"1080p",c:"#00b5ad"}].map(s=>(
                        <div key={s.l} className="flex justify-between items-center">
                          <span className="text-[10px] text-[#adadb8]">{s.l}</span>
                          <span className="text-xs font-bold" style={{color:s.c}}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Analytics */}
                <div className="rounded-lg border p-3 flex-1" style={{background:"#18181b",borderColor:"#2a2a2d"}}>
                  <div className="text-xs font-semibold mb-2 text-[#adadb8]">📊 Analytics</div>
                  <div className="flex items-end gap-1 h-14">
                    {[25,45,35,70,50,80,60,90,70,100,80,88].map((h,i)=>(
                      <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i>=10?"#9147ff":i>=8?"rgba(145,71,255,0.5)":"rgba(145,71,255,0.2)"}}/>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-[#adadb8]">
                    <span>20 хв тому</span><span>Зараз</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="w-40 flex-shrink-0 flex flex-col items-center">
            <div className="text-xs text-[#adadb8] mb-2">Мобільний</div>
            <div className="w-32 rounded-[28px] overflow-hidden" style={{border:"4px solid #2a2a2d",height:"250px",background:"#0e0e10"}}>
              <div className="h-4 bg-black flex items-center justify-center">
                <div className="w-8 h-0.5 bg-[#2a2a2d] rounded-full"/>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-bold">LiveStorm</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#9147ff] animate-pulse"/>
                </div>
                <div className="rounded-lg p-2 mb-1.5" style={{background:"#18181b"}}>
                  <div className="text-[8px] text-[#adadb8]">Viewers</div>
                  <div className="text-sm font-black text-[#9147ff]">12.8K</div>
                </div>
                {[{l:"Likes",v:"89K"},{l:"AI Replies",v:"847"}].map(s=>(
                  <div key={s.l} className="rounded p-1.5 mb-1 flex justify-between" style={{background:"#18181b"}}>
                    <span className="text-[8px] text-[#adadb8]">{s.l}</span>
                    <span className="text-[9px] font-bold text-[#bf94ff]">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
