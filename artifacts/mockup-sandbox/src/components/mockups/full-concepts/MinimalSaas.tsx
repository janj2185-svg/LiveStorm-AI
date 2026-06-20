export function MinimalSaas() {
  const nav = ["Dashboard","AI Co-Host","Avatar Studio","TikTok LIVE","Analytics","Settings"];
  return (
    <div className="flex h-screen bg-[#f8f9fc] font-sans text-[#111827] overflow-hidden" style={{fontFamily:"Inter,sans-serif"}}>
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-[#e5e7eb] flex flex-col py-5 px-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-2 mb-7">
          <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center text-white text-xs font-bold">LS</div>
          <span className="font-semibold text-sm">LiveStorm AI</span>
        </div>
        {nav.map((n,i)=>(
          <div key={n} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 cursor-pointer ${i===0?"bg-[#eef2ff] text-[#6366f1] font-medium":"text-[#6b7280] hover:bg-[#f3f4f6]"}`}>
            <span>{["⊞","🤖","🎭","📱","📊","⚙️"][i]}</span>{n}
          </div>
        ))}
        <div className="mt-auto px-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-xs">A</div>
            <div><div className="text-xs font-medium">@streamer_ua</div><div className="text-[10px] text-[#9ca3af]">Pro Plan</div></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-[#e5e7eb] px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Dashboard</div>
            <div className="text-xs text-[#9ca3af]">Субота, 21 червня 2025</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#dcfce7] text-[#16a34a] text-xs font-semibold px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse"/>LIVE • 2:47:33
            </div>
            <div className="w-7 h-7 rounded-full bg-[#f3f4f6] flex items-center justify-center text-sm">🔔</div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex gap-4 p-5">
          {/* Center panels */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[{v:"12,847",l:"Глядачі",c:"#6366f1",i:"👥"},{v:"89.2K",l:"Лайки",c:"#ec4899",i:"❤️"},{v:"4,231",l:"Коментарі",c:"#0ea5e9",i:"💬"},{v:"$1,590",l:"Подарунки",c:"#f59e0b",i:"🎁"}].map(s=>(
                <div key={s.l} className="bg-white rounded-xl p-3.5 border border-[#e5e7eb] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{s.i}</span>
                    <span className="text-[10px] text-[#22c55e] font-medium bg-[#dcfce7] px-1.5 py-0.5 rounded">+12%</span>
                  </div>
                  <div className="text-xl font-bold" style={{color:s.c}}>{s.v}</div>
                  <div className="text-xs text-[#9ca3af] mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* AI Co-Host + Avatar panels */}
            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* AI Co-Host */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm flex items-center gap-2">🤖 AI Co-Host</div>
                  <div className="text-[10px] bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-full font-medium">Autopilot</div>
                </div>
                <div className="flex items-center gap-3 bg-[#f8f9fc] rounded-lg p-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-lg">🤖</div>
                  <div>
                    <div className="text-xs font-medium">Alex AI</div>
                    <div className="text-[10px] text-[#9ca3af]">Відповів 847 разів • Щасливий настрій</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {["«Дякую за підтримку! 🙌»","«Привіт Марія, радий тебе бачити!»","«Wow, який крутий подарунок! ❤️»"].map((m,i)=>(
                    <div key={i} className="text-xs bg-[#eef2ff] text-[#4f46e5] rounded-lg px-3 py-2 border border-[#e0e7ff]">{m}</div>
                  ))}
                </div>
              </div>

              {/* Avatar Studio */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-sm">
                <div className="font-semibold text-sm mb-3 flex items-center gap-2">🎭 Avatar Studio</div>
                <div className="bg-gradient-to-b from-[#eef2ff] to-[#f3f4f6] rounded-xl h-32 flex items-center justify-center mb-3 relative">
                  <div className="text-5xl">🧑‍💻</div>
                  <div className="absolute bottom-2 right-2 text-[10px] bg-white rounded px-1.5 py-0.5 text-[#6b7280] shadow-sm">Аватар активний</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Радісний","Нейтральний","Захоплений"].map(e=>(
                    <div key={e} className={`text-[10px] text-center py-1.5 rounded-lg border cursor-pointer ${e==="Радісний"?"bg-[#eef2ff] border-[#6366f1] text-[#6366f1]":"bg-[#f9fafb] border-[#e5e7eb] text-[#6b7280]"}`}>{e}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* TikTok LIVE + Analytics */}
            <div className="grid grid-cols-2 gap-4" style={{height:"170px"}}>
              {/* TikTok */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-sm">
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">📱 TikTok LIVE</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-[#f3f4f6] rounded-full h-1.5"><div className="bg-[#fe2c55] h-1.5 rounded-full" style={{width:"78%"}}/></div>
                  <span className="text-xs text-[#6b7280]">78%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[{v:"2.8K",l:"Нові"},{v:"98ms",l:"Затримка"},{v:"HD",l:"Якість"}].map(s=>(
                    <div key={s.l} className="bg-[#f8f9fc] rounded-lg p-2">
                      <div className="text-sm font-bold text-[#111827]">{s.v}</div>
                      <div className="text-[10px] text-[#9ca3af]">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Analytics mini */}
              <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-sm">
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">📊 Analytics</div>
                <div className="flex items-end gap-1 h-16">
                  {[40,65,45,80,55,90,75,95,70,85].map((h,i)=>(
                    <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background: i===9?"#6366f1":"#e0e7ff"}}/>
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-[#9ca3af]"><span>10 хв</span><span>Зараз</span></div>
              </div>
            </div>
          </div>

          {/* Right: Mobile mockup */}
          <div className="w-48 flex-shrink-0 flex flex-col items-center">
            <div className="text-xs text-[#9ca3af] font-medium mb-3 text-center">Mobile App</div>
            <div className="w-36 rounded-3xl border-4 border-[#1f2937] bg-white shadow-xl overflow-hidden" style={{height:"280px"}}>
              <div className="bg-[#111827] h-5 flex items-center justify-center">
                <div className="w-10 h-1 bg-[#374151] rounded-full"/>
              </div>
              <div className="p-2.5 bg-[#f8f9fc] h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold">LiveStorm</div>
                  <div className="text-[8px] bg-[#dcfce7] text-[#16a34a] px-1.5 py-0.5 rounded-full">LIVE</div>
                </div>
                <div className="bg-white rounded-lg p-2 mb-2 shadow-sm">
                  <div className="text-[9px] text-[#9ca3af] mb-1">Глядачі</div>
                  <div className="text-base font-bold text-[#6366f1]">12.8K</div>
                </div>
                {[{l:"Лайки",v:"89K"},{l:"Коменти",v:"4.2K"}].map(s=>(
                  <div key={s.l} className="bg-white rounded-lg p-2 mb-1 shadow-sm flex justify-between items-center">
                    <div className="text-[9px] text-[#9ca3af]">{s.l}</div>
                    <div className="text-xs font-bold">{s.v}</div>
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {["🏠","🤖","📊"].map(i=>(
                    <div key={i} className="bg-white rounded-lg p-1.5 text-center text-sm shadow-sm">{i}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-[10px] text-[#9ca3af]">iOS + Android</div>
              <div className="text-[10px] font-medium text-[#6366f1]">Тема: Мінімал</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
