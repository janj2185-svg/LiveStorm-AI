export function FuturisticAI() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-sans text-white overflow-hidden" style={{background:"radial-gradient(ellipse at 10% 30%, #0d0025 0%, #000008 70%)",fontFamily:"'Space Grotesk',sans-serif"}}>
      {/* Animated grid overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage:"linear-gradient(#a78bfa 1px,transparent 1px),linear-gradient(90deg,#a78bfa 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

      {/* Sidebar */}
      <aside className="relative z-10 w-52 flex flex-col py-5 px-3 flex-shrink-0 border-r border-white/5" style={{background:"rgba(13,0,37,0.8)",backdropFilter:"blur(20px)"}}>
        <div className="flex items-center gap-2 px-2 mb-7">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",boxShadow:"0 0 15px #7c3aed50"}}>LS</div>
          <span className="font-bold text-sm tracking-wide" style={{background:"linear-gradient(90deg,#a78bfa,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>LIVESTORM AI</span>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 cursor-pointer transition-all ${i===0?"border border-[#7c3aed]/40 text-[#a78bfa]":"text-white/30 hover:text-white/60"}`}
            style={i===0?{background:"rgba(124,58,237,0.15)"}:{}}>
            <span className="text-base">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span className="text-xs">{n}</span>
          </div>
        ))}
        <div className="mt-auto px-3">
          <div className="border border-[#7c3aed]/20 rounded-lg p-2.5" style={{background:"rgba(124,58,237,0.1)"}}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}/>
              <div><div className="text-xs font-medium">@ai_streamer</div><div className="text-[9px] text-[#7c3aed]">◈ ACTIVE</div></div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-white/5" style={{background:"rgba(0,0,8,0.5)",backdropFilter:"blur(10px)"}}>
          <div className="flex items-center gap-4">
            <div className="text-base font-bold tracking-wide">CONTROL CENTER</div>
            <div className="flex items-center gap-1.5 text-xs text-[#a78bfa] border border-[#7c3aed]/30 rounded px-2 py-0.5" style={{background:"rgba(124,58,237,0.1)"}}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"/>SYSTEM ONLINE
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[#a78bfa] text-xs font-mono border border-[#7c3aed]/30 rounded px-3 py-1" style={{background:"rgba(124,58,237,0.1)"}}>▶ 2:47:33</div>
            <div className="flex items-center gap-1.5 text-xs text-[#f87171] border border-[#f87171]/30 rounded px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse"/>LIVE
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Left column */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Holographic stats */}
            <div className="grid grid-cols-4 gap-3">
              {[{v:"12,847",l:"VIEWERS",c:"#a78bfa",g:"#7c3aed"},{v:"89.2K",l:"LIKES",c:"#f472b6",g:"#db2777"},{v:"4,231",l:"MESSAGES",c:"#67e8f9",g:"#0891b2"},{v:"$1,590",l:"GIFTS",c:"#fbbf24",g:"#d97706"}].map(s=>(
                <div key={s.l} className="rounded-xl p-3 border text-center" style={{background:`linear-gradient(145deg, ${s.g}15, transparent)`,borderColor:`${s.c}25`,boxShadow:`0 0 20px ${s.c}15`}}>
                  <div className="text-xl font-black" style={{color:s.c,textShadow:`0 0 15px ${s.c}`}}>{s.v}</div>
                  <div className="text-[10px] tracking-widest mt-0.5 text-white/30">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* AI Co-Host */}
              <div className="rounded-xl border border-[#7c3aed]/20 p-4" style={{background:"rgba(124,58,237,0.08)"}}>
                <div className="text-xs tracking-widest text-[#a78bfa] mb-3 font-bold">// AI CO-HOST</div>
                <div className="flex gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl relative" style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",boxShadow:"0 0 20px #7c3aed50"}}>
                    🤖
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-black"/>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#a78bfa]">NEXUS AI</div>
                    <div className="text-[10px] text-white/40">GPT-4o • Emotion: +87%</div>
                    <div className="text-[10px] text-[#22c55e] font-mono mt-0.5">AUTOPILOT_ACTIVE</div>
                  </div>
                </div>
                {["«Твій ентузіазм заряджає всіх! 🔥»","«@user: Рада тебе бачити знову!»","«3 подарунки підряд — ЛЕГЕНДА! 👑»"].map((m,i)=>(
                  <div key={i} className="text-[10px] text-[#a78bfa] border border-[#7c3aed]/20 rounded-lg px-2 py-1.5 mb-1 font-mono" style={{background:"rgba(124,58,237,0.05)"}}>{m}</div>
                ))}
              </div>

              {/* Avatar + TikTok */}
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-[#67e8f9]/15 p-3 flex-1" style={{background:"rgba(6,182,212,0.05)"}}>
                  <div className="text-xs tracking-widest text-[#67e8f9] mb-2 font-bold">// AVATAR STUDIO</div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl" style={{background:"linear-gradient(135deg,#0d0025,#1a0040)",border:"1px solid #67e8f920"}}>🧑‍🚀</div>
                    <div>
                      <div className="text-xs font-bold text-[#67e8f9]">NEXUS-3D</div>
                      <div className="text-[9px] text-white/40">Tracking: Face + Body</div>
                      <div className="flex gap-1 mt-1">
                        {["😊","😮","😄"].map(e=><div key={e} className="text-sm border border-[#67e8f9]/20 rounded w-6 h-6 flex items-center justify-center" style={{background:"rgba(103,232,249,0.05)"}}>{e}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#f472b6]/15 p-3 flex-1" style={{background:"rgba(244,114,182,0.05)"}}>
                  <div className="text-xs tracking-widest text-[#f472b6] mb-2 font-bold">// TIKTOK LIVE</div>
                  <div className="flex gap-2">
                    {[{v:"12.8K",l:"Viewers"},{v:"98ms",l:"Ping"},{v:"4K",l:"Quality"}].map(s=>(
                      <div key={s.l} className="flex-1 text-center rounded-lg p-2" style={{background:"rgba(244,114,182,0.1)",border:"1px solid rgba(244,114,182,0.15)"}}>
                        <div className="text-sm font-bold text-[#f472b6]">{s.v}</div>
                        <div className="text-[9px] text-white/30">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics bar */}
            <div className="rounded-xl border border-[#fbbf24]/15 p-3" style={{background:"rgba(251,191,36,0.05)"}}>
              <div className="text-xs tracking-widest text-[#fbbf24] mb-2 font-bold">// ANALYTICS — VIEWERS / 10min</div>
              <div className="flex items-end gap-1 h-12">
                {[30,55,40,75,50,85,65,95,70,100].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===9?"#fbbf24":`rgba(251,191,36,${0.2+h/200})`}}/>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Mobile mockup */}
          <div className="w-44 flex-shrink-0 flex flex-col items-center">
            <div className="text-[10px] tracking-widest text-white/30 mb-3">// MOBILE</div>
            <div className="w-32 rounded-3xl overflow-hidden shadow-2xl" style={{border:"3px solid #7c3aed40",height:"260px",background:"#0d0025",boxShadow:"0 0 30px #7c3aed30"}}>
              <div className="h-4 flex items-center justify-center bg-black/50">
                <div className="w-8 h-0.5 bg-white/20 rounded-full"/>
              </div>
              <div className="p-2 h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-bold text-[#a78bfa]">LIVESTORM</div>
                  <div className="text-[7px] text-[#f87171] border border-[#f87171]/30 px-1 rounded">LIVE</div>
                </div>
                <div className="rounded-lg p-2 mb-1.5 border border-[#7c3aed]/20" style={{background:"rgba(124,58,237,0.1)"}}>
                  <div className="text-[9px] text-white/40">Viewers</div>
                  <div className="text-sm font-black" style={{color:"#a78bfa"}}>12.8K</div>
                </div>
                {[{l:"Likes",v:"89K",c:"#f472b6"},{l:"AI Replies",v:"847",c:"#67e8f9"}].map(s=>(
                  <div key={s.l} className="rounded-lg p-2 mb-1 border border-white/5 flex justify-between items-center" style={{background:"rgba(255,255,255,0.03)"}}>
                    <div className="text-[8px] text-white/30">{s.l}</div>
                    <div className="text-xs font-bold" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
                <div className="mt-2 flex justify-around">
                  {["⊞","🤖","📊"].map(i=>(
                    <div key={i} className="w-7 h-7 rounded-xl flex items-center justify-center text-sm border border-white/10" style={{background:"rgba(124,58,237,0.2)"}}>{i}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-[9px] text-white/20">v2.0 • iOS+Android</div>
              <div className="text-[9px] text-[#a78bfa] mt-0.5">Dark Neural</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
