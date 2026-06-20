export function GamingCenter() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-sans text-white overflow-hidden" style={{background:"#050505",fontFamily:"'Rajdhani',Inter,sans-serif"}}>
      {/* RGB border top */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:"linear-gradient(90deg,#ff0040,#ff8800,#00ff41,#00d4ff,#7c3aed,#ff0040)"}}/>
      
      <aside className="w-52 flex flex-col py-5 px-3 flex-shrink-0 relative" style={{background:"#0a0a0a",borderRight:"1px solid #1a1a1a"}}>
        <div className="mb-6 px-2">
          <div className="font-black text-xl tracking-widest" style={{background:"linear-gradient(135deg,#ff0040,#ff8800)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>LIVESTORM</div>
          <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase">AI Gaming Control</div>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-2.5 px-3 py-2 text-sm mb-0.5 cursor-pointer transition-all ${i===0?"text-[#ff0040] border-l-2 border-[#ff0040] font-bold":"text-white/30 border-l-2 border-transparent hover:text-white/60 hover:border-white/20"}`}
            style={i===0?{background:"rgba(255,0,64,0.08)"}:{}}>
            <span className="text-base">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span className="font-bold tracking-wide">{n.toUpperCase()}</span>
          </div>
        ))}
        <div className="mt-auto px-2">
          <div className="border border-[#ff0040]/20 rounded p-2.5" style={{background:"rgba(255,0,64,0.05)"}}>
            <div className="text-[9px] tracking-widest text-[#ff0040]/50 mb-1">// PLAYER</div>
            <div className="font-black text-sm">@gaming_pro_ua</div>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff0040] animate-pulse"/>
              <div className="text-[9px] text-[#ff0040]">STREAMING</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-2.5 flex items-center justify-between" style={{background:"#0a0a0a",borderBottom:"1px solid #1a1a1a"}}>
          <div className="flex items-center gap-4">
            <div className="font-black text-base tracking-widest">CONTROL CENTER</div>
            <div className="flex gap-2">
              {[["#ff0040","●LIVE"],["#00ff41","●SYS OK"],["#00d4ff","●AI ONLINE"]].map(([c,t])=>(
                <div key={t} className="text-[10px] font-bold border rounded px-2 py-0.5" style={{color:c,borderColor:`${c}40`,background:`${c}10`}}>{t}</div>
              ))}
            </div>
          </div>
          <div className="font-black text-[#ff0040] tracking-widest text-sm border border-[#ff0040]/30 px-3 py-1 rounded" style={{background:"rgba(255,0,64,0.1)"}}>
            ▶ 2:47:33
          </div>
        </div>

        <div className="flex-1 flex gap-3 p-3 overflow-hidden">
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Stats HUD */}
            <div className="grid grid-cols-4 gap-2">
              {[{v:"12,847",l:"VIEWERS",c:"#ff0040"},{v:"89.2K",l:"LIKES",c:"#ff8800"},{v:"4,231",l:"MESSAGES",c:"#00ff41"},{v:"$1,590",l:"GIFTS",c:"#00d4ff"}].map(s=>(
                <div key={s.l} className="rounded p-3 text-center" style={{background:`${s.c}08`,border:`1px solid ${s.c}30`,clipPath:"polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))"}}>
                  <div className="text-2xl font-black" style={{color:s.c,textShadow:`0 0 15px ${s.c}`}}>{s.v}</div>
                  <div className="text-[9px] tracking-widest mt-0.5" style={{color:`${s.c}80`}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* AI */}
              <div className="rounded border border-[#ff0040]/20 p-3" style={{background:"rgba(255,0,64,0.05)",clipPath:"polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))"}}>
                <div className="text-[10px] tracking-widest text-[#ff0040]/60 mb-2 font-bold">// AI_COHOST.EXE</div>
                <div className="flex items-center gap-3 mb-3 p-2 border border-[#ff0040]/15 rounded" style={{background:"rgba(255,0,64,0.08)"}}>
                  <div className="w-12 h-12 flex items-center justify-center text-3xl border border-[#ff0040]/30 rounded" style={{background:"rgba(255,0,64,0.1)"}}>🤖</div>
                  <div>
                    <div className="font-black text-sm text-[#ff6b6b]">COMBAT_AI</div>
                    <div className="text-[9px] text-[#ff0040]/60">KILLS: 847 replies/hr</div>
                    <div className="text-[9px] text-[#00ff41] font-bold">MODE: AGGRESSIVE</div>
                  </div>
                </div>
                {["» GG! Ти переміг! 💥","» @fan: Легенда! Підтримую!","» WTF! Той подарунок 🔥"].map((m,i)=>(
                  <div key={i} className="text-[9px] font-bold mb-1 text-white/50 border-l-2 border-[#ff0040]/40 pl-2">{m}</div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {/* Avatar */}
                <div className="rounded border border-[#00d4ff]/20 p-3 flex-1" style={{background:"rgba(0,212,255,0.04)"}}>
                  <div className="text-[9px] tracking-widest text-[#00d4ff]/60 mb-2 font-bold">// AVATAR_UNIT</div>
                  <div className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded flex items-center justify-center text-3xl" style={{background:"rgba(0,212,255,0.1)",border:"1px solid rgba(0,212,255,0.2)"}}>🤖</div>
                    <div>
                      <div className="font-black text-[#00d4ff]">MECH-3000</div>
                      <div className="text-[9px] text-white/30">TRACK: FULL_BODY</div>
                      <div className="flex gap-1 mt-1">
                        {["😤","😡","🔥"].map(e=>(
                          <div key={e} className="w-6 h-6 flex items-center justify-center text-sm border border-[#00d4ff]/20 rounded" style={{background:e==="😤"?"rgba(0,212,255,0.2)":"transparent"}}>{e}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* TikTok */}
                <div className="rounded border border-[#00ff41]/20 p-3 flex-1" style={{background:"rgba(0,255,65,0.04)"}}>
                  <div className="text-[9px] tracking-widest text-[#00ff41]/60 mb-2 font-bold">// TIKTOK_FEED</div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[{v:"12.8K",l:"VIEW"},{v:"98ms",l:"PING"},{v:"4K",l:"RES"}].map(s=>(
                      <div key={s.l} className="p-2 rounded border border-[#00ff41]/15" style={{background:"rgba(0,255,65,0.05)"}}>
                        <div className="text-xs font-black" style={{color:"#00ff41"}}>{s.v}</div>
                        <div className="text-[8px] text-[#00ff41]/40">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="rounded border border-[#ff8800]/20 p-3" style={{background:"rgba(255,136,0,0.04)",height:"80px"}}>
              <div className="text-[9px] tracking-widest text-[#ff8800]/60 mb-1 font-bold">// ANALYTICS — VIEWER_LOG</div>
              <div className="flex items-end gap-0.5 h-10">
                {[15,40,25,65,45,80,55,95,65,100].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===9?"#ff8800":i>6?"rgba(255,136,0,0.5)":"rgba(255,136,0,0.2)"}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile - Gaming phone */}
          <div className="w-40 flex-shrink-0 flex flex-col items-center">
            <div className="text-[9px] tracking-widest text-white/20 mb-2 font-bold">// MOBILE</div>
            <div className="w-30 rounded-2xl overflow-hidden" style={{border:"2px solid rgba(255,0,64,0.4)",height:"255px",background:"#050505",boxShadow:"0 0 20px rgba(255,0,64,0.15)",width:"118px"}}>
              <div className="h-1 w-full" style={{background:"linear-gradient(90deg,#ff0040,#ff8800,#00ff41,#00d4ff)"}}/>
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-black tracking-widest text-[#ff0040]">LSTORM</div>
                  <div className="text-[7px] border border-[#ff0040]/40 text-[#ff0040] px-1 rounded font-bold">LIVE</div>
                </div>
                <div className="rounded p-2 mb-1" style={{background:"rgba(255,0,64,0.1)",border:"1px solid rgba(255,0,64,0.2)"}}>
                  <div className="text-[8px] text-[#ff0040]/60">VIEWERS</div>
                  <div className="text-sm font-black text-[#ff0040]">12.8K</div>
                </div>
                {[{l:"LIKES",v:"89K",c:"#ff8800"},{l:"AI KILLS",v:"847",c:"#00ff41"}].map(s=>(
                  <div key={s.l} className="flex justify-between items-center rounded px-2 py-1 mb-1 border" style={{background:`${s.c}08`,borderColor:`${s.c}20`}}>
                    <div className="text-[7px] font-bold" style={{color:`${s.c}80`}}>{s.l}</div>
                    <div className="text-[9px] font-black" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
                <div className="flex justify-around mt-2">
                  {["⊞","🤖","📊"].map(i=>(
                    <div key={i} className="w-7 h-7 flex items-center justify-center text-sm rounded border border-[#ff0040]/20" style={{background:"rgba(255,0,64,0.08)"}}>{i}</div>
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
