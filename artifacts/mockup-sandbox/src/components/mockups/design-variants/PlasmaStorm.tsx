import "./variants.css";

const NAV = ["Dashboard","AI Storm","Live Studio","Scenes","Gifts","Community","Storm Pass","Boss Battle","Analytics","Settings"];

export function PlasmaStorm() {
  return (
    <div className="plasma-root">
      {/* Sidebar */}
      <aside className="plasma-sidebar">
        <div className="plasma-logo">
          <div className="plasma-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",lineHeight:1}}>LiveStorm</div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",color:"#c084fc",textTransform:"uppercase"}}>AI Platform</div>
          </div>
        </div>
        <nav style={{flex:1,padding:"12px 0",display:"flex",flexDirection:"column",gap:1}}>
          {NAV.map((item, i) => (
            <div key={item} className={`plasma-nav-item ${i === 0 ? "active" : ""}`}>
              <div className="plasma-nav-indicator" />
              {item}
            </div>
          ))}
        </nav>
        <div className="plasma-plan-badge">
          <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>PRO Creator</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>Storm Pass active</div>
        </div>
      </aside>

      {/* Main */}
      <main className="plasma-main">
        {/* Topbar */}
        <div className="plasma-topbar">
          <div>
            <h1 className="plasma-page-title">Dashboard</h1>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>Saturday, June 13, 2026 · Session #55</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div className="plasma-live-badge">
              <div className="plasma-live-ring"/>
              LIVE · 27:09
            </div>
            <button className="plasma-end-btn">■ End Stream</button>
          </div>
        </div>

        {/* Big hero */}
        <div className="plasma-hero">
          {/* Mesh gradient bg */}
          <div className="plasma-mesh"/>
          <div className="plasma-noise"/>
          <div className="plasma-hero-body">
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <span className="plasma-chip connected">● Connected</span>
                <span className="plasma-chip">Friendly</span>
                <span className="plasma-chip">Autopilot</span>
              </div>
              <div style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:"-0.04em",lineHeight:1}}>@jan85oks</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:6}}>TikTok Live · AI Storm active · 1,247 viewers right now</div>
            </div>
            <div style={{display:"flex",gap:20,alignItems:"center"}}>
              {[["1,247","VIEWERS"],["10.5K","GIFTS"],["19.9K","LIKES"],["240","FOLLOWS"]].map(([v,l])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.03em"}}>{v}</div>
                  <div style={{fontSize:9,letterSpacing:"0.14em",color:"rgba(192,132,252,0.7)",textTransform:"uppercase",marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="plasma-kpi-strip">
          {[
            {l:"Peak Viewers",v:"1,247",trend:"+12%",up:true},
            {l:"Total Gifts",v:"10,502",trend:"2× avg",up:true},
            {l:"Total Likes",v:"19,900",trend:"+8%",up:true},
            {l:"Follows",v:"240",trend:"new",up:true},
            {l:"Comments",v:"3,851",trend:"active",up:true},
            {l:"Shares",v:"89",trend:"viral",up:true},
          ].map(s=>(
            <div key={s.l} className="plasma-kpi">
              <div className="plasma-kpi-val">{s.v}</div>
              <div className="plasma-kpi-label">{s.l}</div>
              <div className={`plasma-kpi-trend ${s.up?"up":""}`}>{s.trend}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="plasma-content">
          <div className="plasma-panel">
            <div className="plasma-panel-head">
              <span>Live Activity</span>
              <span className="plasma-chip connected" style={{fontSize:9,padding:"2px 8px"}}>● Real-time</span>
            </div>
            {[
              ["🎁","DarkLord","sent Rose (500 coins)","violet"],
              ["💬","storm_fan","let's gooo!","blue"],
              ["♥","hype.master","liked the stream ×47","pink"],
              ["➕","new_viewer","started following","green"],
              ["💬","chill.zone","best stream today","blue"],
            ].map(([icon,user,msg,col],i)=>(
              <div key={i} className={`plasma-event plasma-ev-${col}`}>
                <span>{icon}</span>
                <div className="plasma-event-text">
                  <strong>{user}</strong> {msg}
                </div>
              </div>
            ))}
          </div>

          <div className="plasma-panel">
            <div className="plasma-panel-head">
              <span>AI Storm</span>
              <span className="plasma-chip" style={{fontSize:9,padding:"2px 8px"}}>Autopilot</span>
            </div>
            <div style={{padding:"8px 20px 20px",display:"flex",flexDirection:"column",gap:10}}>
              <div className="plasma-ai-msg">Привіт чат! Хто сьогодні в ефірі? Напишіть звідки ви! 🌍</div>
              <div className="plasma-ai-msg">DarkLord, дякую за троянди! Ти справжній VIP сьогодні! 💜</div>
              <div className="plasma-ai-msg">1200 глядачів! Розгойдаємо ефір разом! ⚡</div>
            </div>
            <div className="plasma-mode-strip">
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Operating Mode</div>
              <div style={{display:"flex",gap:6}}>
                <div className="plasma-mode-btn active">Autopilot</div>
                <div className="plasma-mode-btn">Semi-Auto</div>
                <div className="plasma-mode-btn">Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
