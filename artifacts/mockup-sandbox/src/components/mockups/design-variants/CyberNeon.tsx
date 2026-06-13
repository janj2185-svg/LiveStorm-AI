import "./variants.css";

const NAV = ["Dashboard","AI Storm","Live Studio","Scenes","Gifts","Community","Storm Pass","Boss Battle","Analytics","Settings"];

export function CyberNeon() {
  return (
    <div className="cyber-root">
      {/* Sidebar */}
      <aside className="cyber-sidebar">
        <div className="cyber-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#00fff7"/>
          </svg>
          <span>LiveStorm<span style={{color:"#00fff7"}}>AI</span></span>
        </div>
        <nav className="cyber-nav">
          {NAV.map((item, i) => (
            <div key={item} className={`cyber-nav-item ${i === 0 ? "active" : ""}`}>
              <div className="cyber-nav-dot" />
              {item}
            </div>
          ))}
        </nav>
        <div className="cyber-sidebar-footer">
          <div className="cyber-user">
            <div className="cyber-avatar">J</div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>@jan85oks</div>
              <div style={{fontSize:10,color:"#00fff7",opacity:0.7}}>PRO CREATOR</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="cyber-main">
        {/* Top bar */}
        <div className="cyber-topbar">
          <div>
            <div style={{fontSize:11,letterSpacing:"0.2em",color:"#00fff7",textTransform:"uppercase",opacity:0.6}}>Control Center</div>
            <h1 className="cyber-page-title">Dashboard</h1>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div className="cyber-tag live">⬤ LIVE</div>
            <button className="cyber-btn-primary">⚡ Go Live</button>
          </div>
        </div>

        {/* Hero banner */}
        <div className="cyber-hero">
          <div className="cyber-hero-grid" />
          <div className="cyber-hero-glow" />
          <div className="cyber-hero-content">
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <div className="cyber-status-row">
                <span className="cyber-badge cyan">● CONNECTED</span>
                <span className="cyber-badge purple">FRIENDLY</span>
                <span className="cyber-badge dark">AUTOPILOT</span>
              </div>
              <div className="cyber-username">@jan85oks</div>
              <div style={{fontSize:12,color:"rgba(0,255,247,0.5)"}}>Session active · AI Storm online · 27:09 elapsed</div>
            </div>
            <div className="cyber-hero-stats">
              {[["1,247","VIEWERS"],["10.5K","GIFTS"],["19.9K","LIKES"],["240","FOLLOWS"]].map(([v,l])=>(
                <div key={l} className="cyber-hero-stat">
                  <div className="cyber-stat-val">{v}</div>
                  <div className="cyber-stat-lbl">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="cyber-grid-4">
          {[
            {label:"Viewers",val:"1,247",icon:"👁",color:"#00fff7"},
            {label:"Gifts",val:"10,502",icon:"🎁",color:"#f0abfc"},
            {label:"Likes",val:"19,900",icon:"♥",color:"#ff6b9d"},
            {label:"Follows",val:"240",icon:"＋",color:"#a78bfa"},
          ].map(s=>(
            <div key={s.label} className="cyber-card">
              <div className="cyber-card-glow" style={{"--glow-col":s.color} as any}/>
              <div className="cyber-card-icon" style={{color:s.color}}>{s.icon}</div>
              <div className="cyber-card-val" style={{color:s.color}}>{s.val}</div>
              <div className="cyber-card-lbl">{s.label}</div>
              <div className="cyber-card-bar" style={{background:s.color}}/>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="cyber-grid-2">
          <div className="cyber-panel">
            <div className="cyber-panel-head">⚡ Live Activity <span className="cyber-badge cyan" style={{fontSize:9}}>● LIVE</span></div>
            <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {[
                ["🎁","DarkLord","sent Rose (500 coins)","#f0abfc"],
                ["💬","storm_fan","let's gooo!","#60a5fa"],
                ["♥","hype.master","liked ×47","#ff6b9d"],
                ["➕","new_viewer","started following","#4ade80"],
                ["💬","chill.zone","best stream today","#60a5fa"],
              ].map(([icon,user,msg,col],i)=>(
                <div key={i} className="cyber-event" style={{"--ev-col":col} as any}>
                  <span style={{fontSize:14}}>{icon}</span>
                  <div>
                    <span style={{fontWeight:700,fontSize:12,color:"#fff"}}>{user} </span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{msg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="cyber-panel">
            <div className="cyber-panel-head">🤖 AI Storm</div>
            <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:10}}>
              <div className="cyber-ai-bubble">Привіт чат! Хто сьогодні в ефірі? Напишіть звідки ви! 🌍</div>
              <div className="cyber-ai-bubble">DarkLord, дякую за троянди! Ти справжній VIP сьогодні! 💜</div>
              <div className="cyber-ai-bubble">Ого, вже 1200 глядачів! Давайте розгойдаємо ефір! ⚡</div>
              <div style={{marginTop:4,display:"flex",gap:8}}>
                <div className="cyber-mode-btn active">Autopilot</div>
                <div className="cyber-mode-btn">Semi-Auto</div>
                <div className="cyber-mode-btn">Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
