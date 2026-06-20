export function DarkUltra() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen text-white overflow-hidden" style={{background:"#080808",fontFamily:"'Cormorant Garamond','Playfair Display',Georgia,serif"}}>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-3 pointer-events-none" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='%23d4a94a10'/%3E%3C/svg%3E\")"}}/>

      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{background:"linear-gradient(90deg,transparent,#d4a94a,transparent)"}}/>

      {/* Sidebar */}
      <aside className="relative z-10 w-56 flex flex-col py-6 px-4 flex-shrink-0" style={{background:"#0c0c0c",borderRight:"1px solid #1e1e1e"}}>
        <div className="px-2 mb-8">
          <div className="text-xl font-black tracking-[0.15em]" style={{color:"#d4a94a",letterSpacing:"0.2em"}}>LIVESTORM</div>
          <div className="text-[9px] tracking-[0.5em] mt-0.5" style={{color:"#d4a94a60",fontFamily:"Inter,sans-serif"}}>AI · ULTRA PREMIUM</div>
          <div className="h-px mt-3" style={{background:"linear-gradient(90deg,#d4a94a40,transparent)"}}/>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-3 px-3 py-2.5 text-sm mb-0.5 cursor-pointer transition-all ${i===0?"text-[#d4a94a]":"text-white/20 hover:text-white/50"}`}
            style={i===0?{fontStyle:"italic"}:{fontFamily:"Inter,sans-serif",fontSize:"11px",letterSpacing:"0.1em"}}>
            {i===0 ? <span className="text-[#d4a94a] text-xs">◆</span> : <span className="text-white/10 text-xs">·</span>}
            <span className={i===0?"":"uppercase tracking-widest"}>{n}</span>
          </div>
        ))}
        <div className="mt-auto">
          <div className="h-px mb-4" style={{background:"linear-gradient(90deg,#d4a94a20,transparent)"}}/>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full border" style={{background:"linear-gradient(135deg,#1a1a1a,#0c0c0c)",borderColor:"#d4a94a40"}}/>
            <div>
              <div className="text-xs text-white/60 italic">@prestige.stream</div>
              <div className="text-[9px] tracking-widest" style={{color:"#d4a94a60",fontFamily:"Inter,sans-serif"}}>ULTRA TIER</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top */}
        <div className="px-7 py-4 flex items-center justify-between" style={{background:"#0a0a0a",borderBottom:"1px solid #1a1a1a"}}>
          <div>
            <div className="text-lg font-black italic tracking-wide text-white/90">Dashboard</div>
            <div className="text-[10px] tracking-widest text-white/20" style={{fontFamily:"Inter,sans-serif"}}>SATURDAY · JUNE 21 · SESSION XXIV</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs tracking-widest text-white/30" style={{fontFamily:"Inter,sans-serif"}}>2:47:33</div>
            <div className="flex items-center gap-2 px-4 py-1.5 border text-xs tracking-widest" style={{borderColor:"#dc262640",color:"#dc2626",background:"#dc262608",fontFamily:"Inter,sans-serif"}}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse"/>LIVE
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-5 p-5 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Elegant stats */}
            <div className="grid grid-cols-4 gap-3">
              {[{v:"12,847",l:"Viewers",c:"#d4a94a"},{v:"89.2K",l:"Likes",c:"#b8c5d6"},{v:"4,231",l:"Messages",c:"#d4a94a80"},{v:"$1,590",l:"Gifts",c:"#d4a94a"}].map(s=>(
                <div key={s.l} className="p-4 border" style={{background:"#0c0c0c",borderColor:"#1e1e1e"}}>
                  <div className="text-[10px] tracking-[0.3em] mb-2 uppercase" style={{color:"#d4a94a50",fontFamily:"Inter,sans-serif"}}>{s.l}</div>
                  <div className="text-2xl font-black italic" style={{color:s.c}}>{s.v}</div>
                  <div className="h-px mt-2" style={{background:"linear-gradient(90deg,#d4a94a20,transparent)"}}/>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* AI Co-Host */}
              <div className="p-5 border" style={{background:"#0c0c0c",borderColor:"#1e1e1e"}}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-black italic text-[#d4a94a]">AI Co-Host</div>
                  <div className="text-[9px] tracking-[0.3em]" style={{color:"#d4a94a60",fontFamily:"Inter,sans-serif"}}>ACTIVE</div>
                </div>
                <div className="flex items-center gap-4 mb-4 p-3 border-l-2" style={{borderColor:"#d4a94a30",background:"#d4a94a05"}}>
                  <div className="w-12 h-12 border flex items-center justify-center text-2xl" style={{borderColor:"#d4a94a30",background:"#d4a94a08"}}>✦</div>
                  <div>
                    <div className="text-sm font-black italic text-[#d4a94a]">Aurelius</div>
                    <div className="text-[9px] text-white/30" style={{fontFamily:"Inter,sans-serif"}}>847 responses · Eloquent</div>
                  </div>
                </div>
                {[
                  "«Ваша підтримка нескінченно надихає — щиро дякую кожному.»",
                  "«Той подарунок — справжня розкіш. Безмежно вдячна.»",
                  "«@Maria — ваша вірність робить цей стрім особливим.»"
                ].map((m,i)=>(
                  <div key={i} className="text-[10px] text-white/40 italic mb-2 py-2 border-b" style={{borderColor:"#1e1e1e",fontFamily:"Georgia,serif"}}>{m}</div>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                {/* Avatar */}
                <div className="p-4 border flex-1" style={{background:"#0c0c0c",borderColor:"#1e1e1e"}}>
                  <div className="text-xs italic text-[#d4a94a] mb-3">Avatar Studio</div>
                  <div className="flex gap-3 items-center">
                    <div className="w-14 h-14 border flex items-center justify-center text-3xl" style={{borderColor:"#d4a94a30",background:"#d4a94a05"}}>👸</div>
                    <div>
                      <div className="text-sm font-black italic text-[#d4a94a]">Aurelius AI</div>
                      <div className="text-[9px] text-white/20" style={{fontFamily:"Inter,sans-serif"}}>Prestige Model</div>
                      <div className="flex gap-1 mt-2">
                        {["🎭","👑","✨"].map(e=>(
                          <div key={e} className="w-6 h-6 flex items-center justify-center text-sm border" style={{borderColor:`${e==="🎭"?"#d4a94a":"#1e1e1e"}30`,background:`${e==="🎭"?"#d4a94a":"transparent"}08`}}>{e}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* TikTok */}
                <div className="p-4 border flex-1" style={{background:"#0c0c0c",borderColor:"#1e1e1e"}}>
                  <div className="text-xs italic text-[#d4a94a] mb-2">TikTok LIVE</div>
                  <div className="space-y-1.5">
                    {[{l:"Viewers",v:"12,847"},{l:"Latency",v:"98ms"},{l:"Quality",v:"4K HDR"}].map(s=>(
                      <div key={s.l} className="flex justify-between py-1 border-b" style={{borderColor:"#1e1e1e"}}>
                        <span className="text-[10px] text-white/20" style={{fontFamily:"Inter,sans-serif",letterSpacing:"0.1em"}}>{s.l.toUpperCase()}</span>
                        <span className="text-xs italic text-[#d4a94a]">{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="p-4 border" style={{background:"#0c0c0c",borderColor:"#1e1e1e",height:"85px"}}>
              <div className="text-[9px] tracking-[0.4em] text-white/20 mb-2" style={{fontFamily:"Inter,sans-serif"}}>ANALYTICS — VIEWER TRAJECTORY</div>
              <div className="flex items-end gap-1 h-11">
                {[20,42,30,65,45,78,58,90,65,100].map((h,i)=>(
                  <div key={i} className="flex-1" style={{height:`${h}%`,background:i===9?"#d4a94a":i>6?"#d4a94a50":"#d4a94a15"}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile — Ultra Premium style */}
          <div className="w-44 flex-shrink-0 flex flex-col items-center">
            <div className="text-[9px] tracking-[0.4em] text-white/20 mb-3" style={{fontFamily:"Inter,sans-serif"}}>MOBILE</div>
            <div className="w-36 overflow-hidden" style={{border:"1px solid #d4a94a30",height:"280px",background:"#0a0a0a",boxShadow:"0 0 40px rgba(212,169,74,0.08)"}}>
              <div className="h-px" style={{background:"linear-gradient(90deg,transparent,#d4a94a,transparent)"}}/>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs italic text-[#d4a94a]">LiveStorm</div>
                  <div className="text-[8px] tracking-widest text-[#dc2626]" style={{fontFamily:"Inter,sans-serif"}}>LIVE</div>
                </div>
                <div className="p-3 mb-3 border" style={{background:"#d4a94a08",borderColor:"#d4a94a20"}}>
                  <div className="text-[9px] text-white/20 uppercase tracking-widest mb-1" style={{fontFamily:"Inter,sans-serif"}}>Viewers</div>
                  <div className="text-lg italic text-[#d4a94a]">12,847</div>
                </div>
                {[{l:"LIKES",v:"89.2K"},{l:"GIFTS",v:"$1,590"}].map(s=>(
                  <div key={s.l} className="flex justify-between py-2 border-b" style={{borderColor:"#1e1e1e"}}>
                    <div className="text-[8px] tracking-widest text-white/20" style={{fontFamily:"Inter,sans-serif"}}>{s.l}</div>
                    <div className="text-xs italic text-[#d4a94a]">{s.v}</div>
                  </div>
                ))}
                <div className="flex justify-around mt-4">
                  {["⊞","✦","◈","⚙"].map(i=>(
                    <div key={i} className="text-sm text-[#d4a94a60]">{i}</div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px" style={{background:"linear-gradient(90deg,transparent,#d4a94a,transparent)"}}/>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
