import "./variants.css";

const NAV = ["Dashboard","AI Storm","Live Studio","Scenes","Gifts","Community","Storm Pass","Boss Battle","Analytics","Settings"];

export function IceAurora() {
  return (
    <div className="aurora-root">
      {/* Sidebar */}
      <aside className="aurora-sidebar">
        <div className="aurora-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#aGrad)"/>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8"/>
                <stop offset="100%" stopColor="#818cf8"/>
              </linearGradient>
            </defs>
          </svg>
          <span style={{fontSize:15,fontWeight:800,letterSpacing:"-0.02em"}}>LiveStorm <span className="aurora-accent">AI</span></span>
        </div>
        <nav style={{flex:1,padding:"8px 0",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map((item, i) => (
            <div key={item} className={`aurora-nav-item ${i === 0 ? "active" : ""}`}>
              {item}
            </div>
          ))}
        </nav>
        <div className="aurora-user-block">
          <div className="aurora-avatar-ring">
            <div className="aurora-avatar">J</div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>@jan85oks</div>
            <div style={{fontSize:10,color:"#38bdf8",fontWeight:600}}>PRO · Active</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="aurora-main">
        <div className="aurora-topbar">
          <div>
            <div style={{fontSize:10,letterSpacing:"0.15em",color:"#38bdf8",textTransform:"uppercase",fontWeight:700}}>Overview</div>
            <h1 className="aurora-title">Dashboard</h1>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div className="aurora-live-pill">
              <span className="aurora-live-dot"/>
              LIVE — 27:09
            </div>
            <button className="aurora-btn">⚡ End Stream</button>
          </div>
        </div>

        {/* Aurora hero */}
        <div className="aurora-hero">
          <div className="aurora-aurora-bg"/>
          <div className="aurora-hero-inner">
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span className="aurora-pill sky">● Connected</span>
                <span className="aurora-pill indigo">Friendly</span>
                <span className="aurora-pill slate">Autopilot</span>
              </div>
              <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.03em"}}>@jan85oks</div>
              <div style={{fontSize:12,color:"rgba(186,230,253,0.65)"}}>Session #55 · AI Storm active · TikTok Live connected</div>
            </div>
            <div style={{display:"flex",gap:24}}>
              {[["1,247","Viewers","#38bdf8"],["10.5K","Gifts","#f0abfc"],["19.9K","Likes","#f472b6"],["240","Follows","#818cf8"]].map(([v,l,c])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:24,fontWeight:900,color:c,letterSpacing:"-0.02em"}}>{v}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="aurora-stats-row">
          {[
            {l:"Peak Viewers",v:"1,247",sub:"+12% vs last",c:"sky"},
            {l:"Total Gifts",v:"10,502",sub:"coins received",c:"purple"},
            {l:"Total Likes",v:"19,900",sub:"this session",c:"pink"},
            {l:"New Follows",v:"240",sub:"since stream start",c:"indigo"},
            {l:"Comments",v:"3,851",sub:"messages in chat",c:"cyan"},
            {l:"Shares",v:"89",sub:"stream shares",c:"violet"},
          ].map(s=>(
            <div key={s.l} className={`aurora-stat-card aurora-stat-${s.c}`}>
              <div className="aurora-stat-val">{s.v}</div>
              <div className="aurora-stat-label">{s.l}</div>
              <div className="aurora-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Bottom panels */}
        <div className="aurora-panels">
          <div className="aurora-panel">
            <div className="aurora-panel-head">Live Activity <span className="aurora-pill sky" style={{fontSize:9,padding:"1px 6px"}}>● Live</span></div>
            <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {[
                ["🎁","DarkLord","sent Rose (500 coins)","sky"],
                ["💬","storm_fan","let's gooo!","blue"],
                ["♥","hype.master","liked ×47","pink"],
                ["➕","new_viewer","started following","green"],
                ["💬","chill.zone","best stream today","blue"],
              ].map(([icon,user,msg,c],i)=>(
                <div key={i} className={`aurora-event aurora-ev-${c}`}>
                  <span style={{fontSize:14}}>{icon}</span>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:700,fontSize:12}}>{user} </span>
                    <span style={{fontSize:12,opacity:0.6}}>{msg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="aurora-panel">
            <div className="aurora-panel-head">AI Storm</div>
            <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:8}}>
              <div className="aurora-chat-msg">Привіт чат! Хто сьогодні в ефірі? 🌍</div>
              <div className="aurora-chat-msg">DarkLord, дякую за троянди! VIP today! 💜</div>
              <div className="aurora-chat-msg">1200 глядачів! Розгойдаємо ефір! ⚡</div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <div className="aurora-mode active">Autopilot</div>
                <div className="aurora-mode">Semi-Auto</div>
                <div className="aurora-mode">Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
