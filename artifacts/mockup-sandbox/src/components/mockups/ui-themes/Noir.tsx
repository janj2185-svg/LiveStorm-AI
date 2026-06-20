export function Noir() {
  return (
    <div className="min-h-screen bg-[#000000] font-sans text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold text-white border border-white/20">LS</div>
            <span className="font-light text-sm text-white/70 tracking-[0.3em] uppercase">LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-2 border border-white/10 rounded px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-light text-white/60 tracking-widest">LIVE</span>
          </div>
        </div>

        <div className="border border-white/10 rounded p-5 mb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-white/30 text-xs mb-1 tracking-widest uppercase">@noir.stream</div>
              <div className="text-xl font-light text-white tracking-wide">Чорно-білий стрім</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-thin text-white/80 tracking-widest">2:47:33</div>
              <div className="text-white/20 text-xs tracking-widest">duration</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Viewers", value: "12.8K" },
              { label: "Likes", value: "89K" },
              { label: "Chat", value: "4.2K" },
              { label: "Gifts", value: "1.5K" },
            ].map((s) => (
              <div key={s.label} className="border border-white/10 rounded p-3 text-center">
                <div className="text-lg font-light text-white">{s.value}</div>
                <div className="text-white/20 text-xs mt-0.5 tracking-widest uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 border-t border-white/10 pt-4">
            <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-xs">AI</div>
            <div className="flex-1">
              <div className="text-xs text-white/50 tracking-widest">AI HOST — ACTIVE</div>
              <div className="text-xs text-white/20 tracking-widest">AUTOPILOT MODE</div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
          </div>
        </div>

        <div className="border border-white/10 rounded p-4">
          <div className="text-xs text-white/20 font-light mb-4 tracking-[0.5em] uppercase">Chat</div>
          {[
            { user: "user_01", msg: "Мінімалізм — це мистецтво" },
            { user: "user_02", msg: "Підписуюсь на стиль" },
            { user: "user_03", msg: "🖤🖤🖤" },
          ].map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="w-1 flex-shrink-0 mt-1 bg-white/20 rounded-full self-stretch" />
              <div className="text-xs text-white/30"><span className="text-white/50">{c.user} —</span> {c.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
