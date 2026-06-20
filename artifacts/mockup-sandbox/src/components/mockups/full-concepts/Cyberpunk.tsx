export function Cyberpunk() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-mono text-white overflow-hidden" style={{background:"#020208",fontFamily:"'Courier New',monospace"}}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage:"linear-gradient(#00ff4140 1px,transparent 1px),linear-gradient(90deg,#00ff4140 1px,transparent 1px)",backgroundSize:"30px 30px"}}/>

      {/* Sidebar */}
      <aside className="relative z-10 w-52 flex flex-col py-4 px-3 flex-shrink-0 border-r-2 border-[#00ff41]/20">
        <div className="mb-6 px-1">
          <div className="text-[#00ff41] font-black text-lg" style={{textShadow:"0 0 15px #00ff41"}}>LIVEST//RM</div>
          <div className="text-[9px] text-[#00ff41]/40 tracking-widest">AI_v2.0.1 :: ONLINE</div>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-2 px-2 py-1.5 text-xs mb-0.5 cursor-pointer border-l-2 ${i===0?"border-[#00ff41] text-[#00ff41]":"border-transparent text-[#00ff41]/30 hover:text-[#00ff41]/60 hover:border-[#00ff41]/40"}`}>
            <span className="text-[#00ff41]/50">{"[0"+i+"]"}</span>{n.toUpperCase()}
          </div>
        ))}
        <div className="mt-auto border border-[#00ff41]/20 rounded p-2">
          <div className="text-[9px] text-[#00ff41]/40">// USER</div>
          <div className="text-[#00ff41] text-xs font-bold">@cyber_streamer</div>
          <div className="text-[9px] text-[#ff0040]">■ PLAN: PRO_TIER</div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-2.5 border-b-2 border-[#00ff41]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[#00ff41] font-black text-sm" style={{textShadow:"0 0 10px #00ff41"}}>// MAIN_CONTROL</div>
            <div className="text-[10px] text-[#00ff41]/50 font-mono">SYS_OK ✓</div>
          </div>
          <div className="flex gap-3">
            <div className="text-[10px] border border-[#ff0040]/40 text-[#ff0040] px-2 py-0.5 rounded">
              <span className="animate-pulse">●</span> LIVE 2:47:33
            </div>
            <div className="text-[10px] border border-[#00ff41]/30 text-[#00ff41]/60 px-2 py-0.5 rounded">CPU:34% MEM:61%</div>
          </div>
        </div>

        <div className="flex-1 flex gap-3 p-3 overflow-hidden">
          <div className="flex-1 flex flex-col gap-3">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[{v:"12,847",l:"VIEWERS",c:"#00ff41"},{v:"89.2K",l:"LIKES",c:"#ff0040"},{v:"4,231",l:"MSG",c:"#00d4ff"},{v:"$1,590",l:"GIFTS",c:"#ffff00"}].map(s=>(
                <div key={s.l} className="rounded border-2 p-2.5 text-center" style={{borderColor:`${s.c}40`,background:`${s.c}08`}}>
                  <div className="text-xl font-black font-mono" style={{color:s.c,textShadow:`0 0 10px ${s.c}`}}>{s.v}</div>
                  <div className="text-[9px] tracking-widest mt-0.5" style={{color:`${s.c}70`}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* AI */}
              <div className="border-2 border-[#00ff41]/30 rounded p-3" style={{background:"#00ff4108"}}>
                <div className="text-[10px] text-[#00ff41]/60 mb-2">// AI_COHOST_MODULE</div>
                <div className="flex items-center gap-2 mb-2 border border-[#00ff41]/20 rounded p-2" style={{background:"#00ff4110"}}>
                  <div className="text-3xl">🤖</div>
                  <div>
                    <div className="text-[#00ff41] text-xs font-bold">NEXUS_BOT</div>
                    <div className="text-[9px] text-[#00ff41]/40">MODE: AUTOPILOT</div>
                    <div className="text-[9px] text-[#00ff41]/40">REPLIES: 847/hr</div>
                  </div>
                </div>
                {["&gt; Replying to @user_1337...","&gt; Processing gift event...","&gt; EMOTION: +HAPPY detected"].map((m,i)=>(
                  <div key={i} className="text-[9px] text-[#00ff41]/70 font-mono py-0.5 border-b border-[#00ff41]/10">{m}</div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {/* Avatar */}
                <div className="border-2 border-[#00d4ff]/20 rounded p-2.5 flex-1" style={{background:"#00d4ff08"}}>
                  <div className="text-[9px] text-[#00d4ff]/60 mb-1.5">// AVATAR_SYS</div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded border border-[#00d4ff]/30 flex items-center justify-center text-3xl" style={{background:"#00d4ff10"}}>🤖</div>
                    <div>
                      <div className="text-[#00d4ff] text-xs">UNIT_ALPHA</div>
                      <div className="text-[9px] text-[#00d4ff]/40">FACE_TRACK: ON</div>
                      <div className="text-[9px] text-[#00ff41]">RENDER: 60fps</div>
                    </div>
                  </div>
                </div>
                {/* TikTok */}
                <div className="border-2 border-[#ff0040]/20 rounded p-2.5 flex-1" style={{background:"#ff004008"}}>
                  <div className="text-[9px] text-[#ff0040]/60 mb-1">// TIKTOK_LIVE</div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[{v:"12.8K",l:"VIEW"},{v:"98ms",l:"PING"},{v:"4K",l:"RES"}].map(s=>(
                      <div key={s.l}>
                        <div className="text-xs font-bold" style={{color:"#ff0040"}}>{s.v}</div>
                        <div className="text-[8px]" style={{color:"#ff004060"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="border-2 border-[#ffff00]/20 rounded p-2.5" style={{background:"#ffff0005"}}>
              <div className="text-[9px] text-[#ffff00]/50 mb-1">// ANALYTICS — viewer_count[t]</div>
              <div className="flex items-end gap-0.5 h-10">
                {[20,45,30,70,45,80,60,95,65,100,80,90].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===11?"#ffff00":`#ffff00${Math.floor(h/2).toString(16).padStart(2,"0")}`}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="w-40 flex-shrink-0 flex flex-col items-center">
            <div className="text-[9px] text-[#00ff41]/40 mb-2 tracking-widest">// MOBILE</div>
            <div className="w-28 rounded-2xl overflow-hidden" style={{border:"2px solid #00ff4140",height:"240px",background:"#020208",boxShadow:"0 0 20px #00ff4120"}}>
              <div className="h-3 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-0.5 bg-[#00ff41]/20 rounded-full"/>
              </div>
              <div className="p-1.5 font-mono">
                <div className="text-[8px] text-[#00ff41] mb-1.5">LIVEST//RM v2</div>
                <div className="border border-[#00ff41]/20 rounded p-1.5 mb-1" style={{background:"#00ff4108"}}>
                  <div className="text-[8px] text-[#00ff41]/50">VIEWERS</div>
                  <div className="text-xs font-black text-[#00ff41]">12.8K</div>
                </div>
                {["LIKES: 89K","AI: ACTIVE","PING: 98ms"].map(s=>(
                  <div key={s} className="text-[8px] text-[#00ff41]/50 py-0.5 border-b border-[#00ff41]/10">&gt; {s}</div>
                ))}
                <div className="flex justify-around mt-2">
                  {["⊞","🤖","📊"].map(i=><div key={i} className="text-base">{i}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
