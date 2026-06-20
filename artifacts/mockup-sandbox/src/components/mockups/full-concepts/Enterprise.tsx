export function Enterprise() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen font-sans text-[#111827] overflow-hidden" style={{background:"#f8fafc",fontFamily:"'Inter',sans-serif"}}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col py-5 flex-shrink-0" style={{background:"#1e3a5f",color:"white"}}>
        <div className="flex items-center gap-2.5 px-5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1e3a5f] text-xs font-black">LS</div>
          <div>
            <div className="font-bold text-sm text-white">LiveStorm AI</div>
            <div className="text-[10px] text-blue-200/60">Enterprise Edition</div>
          </div>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-3 px-5 py-2.5 text-sm cursor-pointer transition-colors ${i===0?"bg-white/15 text-white font-semibold border-l-4 border-white":"text-blue-100/50 hover:bg-white/5 hover:text-blue-100 border-l-4 border-transparent"}`}>
            <span className="text-base opacity-80">{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>
            <span>{n}</span>
          </div>
        ))}
        <div className="mt-auto px-4">
          <div className="rounded-xl p-3 border border-white/10 bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">AN</div>
              <div>
                <div className="text-xs font-semibold text-white">Andrii N.</div>
                <div className="text-[9px] text-blue-200/60">Enterprise Admin</div>
              </div>
            </div>
            <div className="text-[9px] text-[#30d158] flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#30d158]"/>System Operational
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-[#e2e8f0] px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-base font-bold text-[#1e293b]">Operations Dashboard</div>
              <div className="text-xs text-[#64748b]">Saturday, June 21, 2025 — Session #847</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#dc2626] border border-[#dc2626]/20 bg-[#dc2626]/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse"/>LIVE • 2:47:33
            </div>
            <button className="px-4 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold">Export Report</button>
          </div>
        </div>

        <div className="flex-1 flex gap-5 p-5 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* KPI Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[{v:"12,847",l:"Active Viewers",c:"#1e3a5f",chg:"+12.3%",chgc:"#16a34a"},{v:"89,200",l:"Total Likes",c:"#dc2626",chg:"+8.1%",chgc:"#16a34a"},{v:"4,231",l:"Comments",c:"#0369a1",chg:"+23.7%",chgc:"#16a34a"},{v:"$1,590",l:"Gift Revenue",c:"#b45309",chg:"+31.2%",chgc:"#16a34a"}].map(s=>(
                <div key={s.l} className="bg-white rounded-xl p-4 border border-[#e2e8f0] shadow-sm">
                  <div className="text-xs text-[#64748b] font-medium mb-1 uppercase tracking-wide">{s.l}</div>
                  <div className="text-2xl font-bold" style={{color:s.c}}>{s.v}</div>
                  <div className="text-xs mt-1 font-semibold" style={{color:s.chgc}}>{s.chg} vs yesterday</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 flex-1">
              {/* AI Co-Host */}
              <div className="col-span-1 bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">AI Co-Host</div>
                  <div className="text-[10px] text-[#16a34a] bg-[#dcfce7] px-2 py-0.5 rounded font-semibold">ACTIVE</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg mb-3 border border-[#e2e8f0] bg-[#f8fafc]">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold">AI</div>
                  <div>
                    <div className="font-semibold text-sm">Enterprise Bot</div>
                    <div className="text-[10px] text-[#64748b]">847 replies • Professional tone</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {["Reply to @user_1: Дякуємо за ваш коментар. Ми цінуємо вашу підтримку ♥","Gift acknowledgment: Дуже вдячні @fan_ua! Це надихає продовжувати!","Moderation: Неприйнятний коментар видалено."].map((m,i)=>(
                    <div key={i} className="text-[10px] rounded-lg p-2 border border-[#e2e8f0] bg-[#f8fafc] text-[#374151]">{m}</div>
                  ))}
                </div>
              </div>

              {/* Avatar + TikTok */}
              <div className="col-span-1 flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm flex-1">
                  <div className="font-semibold text-sm mb-3">Avatar Studio</div>
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-[#f1f5f9] flex items-center justify-center text-3xl border border-[#e2e8f0]">🧑‍💼</div>
                    <div>
                      <div className="font-semibold text-sm">Professional</div>
                      <div className="text-[9px] text-[#64748b]">Neutral expression</div>
                      <div className="flex gap-1 mt-1.5">
                        {["🙂","😊","😐"].map(e=>(
                          <div key={e} className={`text-sm w-7 h-7 rounded flex items-center justify-center border ${e==="🙂"?"bg-[#eff6ff] border-[#1e3a5f]/20":"bg-[#f8fafc] border-[#e2e8f0]"}`}>{e}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm flex-1">
                  <div className="font-semibold text-sm mb-2">TikTok LIVE</div>
                  <div className="space-y-2">
                    {[{l:"Viewers",v:"12,847"},{l:"Latency",v:"98ms"},{l:"Quality",v:"1080p HDR"}].map(s=>(
                      <div key={s.l} className="flex items-center justify-between text-sm">
                        <span className="text-[#64748b] text-xs">{s.l}</span>
                        <span className="font-semibold text-[#1e293b] text-xs">{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="col-span-1 bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm">
                <div className="font-semibold text-sm mb-3">Analytics</div>
                <div className="space-y-2 mb-3">
                  {[{l:"Retention Rate",v:"78%",c:"#1e3a5f"},{l:"Engagement Rate",v:"34%",c:"#0369a1"},{l:"Conversion",v:"12%",c:"#16a34a"}].map(s=>(
                    <div key={s.l}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-[#64748b]">{s.l}</span><span className="font-semibold" style={{color:s.c}}>{s.v}</span></div>
                      <div className="h-1.5 bg-[#f1f5f9] rounded-full"><div className="h-1.5 rounded-full" style={{width:s.v,background:s.c}}/></div>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-1 h-16">
                  {[30,55,40,75,50,88,65,95,70,100].map((h,i)=>(
                    <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:i===9?"#1e3a5f":"rgba(30,58,95,0.2)"}}/>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="w-44 flex-shrink-0 flex flex-col items-center">
            <div className="text-xs text-[#64748b] font-semibold mb-3">Mobile App</div>
            <div className="w-36 rounded-3xl overflow-hidden shadow-xl" style={{border:"6px solid #1e3a5f",height:"280px",background:"#f8fafc"}}>
              <div className="bg-[#1e3a5f] h-5 flex items-center justify-center">
                <div className="w-12 h-1 bg-white/20 rounded-full"/>
              </div>
              <div className="p-3 bg-white h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-[#1e3a5f]">LiveStorm</div>
                  <div className="text-[9px] bg-[#dcfce7] text-[#16a34a] px-1.5 py-0.5 rounded font-semibold">LIVE</div>
                </div>
                <div className="rounded-xl p-2.5 mb-2 bg-[#eff6ff] border border-[#bfdbfe]">
                  <div className="text-[9px] text-[#64748b]">Active Viewers</div>
                  <div className="text-lg font-bold text-[#1e3a5f]">12,847</div>
                </div>
                {[{l:"Total Likes",v:"89.2K"},{l:"Comments",v:"4,231"}].map(s=>(
                  <div key={s.l} className="flex justify-between py-1.5 border-b border-[#e2e8f0] text-xs">
                    <span className="text-[#64748b]">{s.l}</span>
                    <span className="font-semibold text-[#1e293b]">{s.v}</span>
                  </div>
                ))}
                <div className="flex justify-around mt-4">
                  {["⊞","🤖","📊","⚙️"].map(i=><div key={i} className="text-base">{i}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
