import "./concept.css";

const NAV = [
  { icon: "🏠", label: "Головна", active: true },
  { icon: "📺", label: "Live Studio" },
  { icon: "🎬", label: "Scenes" },
  { icon: "🎁", label: "Gifts" },
  { icon: "⚡", label: "Events" },
  { icon: "👥", label: "Community" },
  { icon: "🤖", label: "AI Storm" },
  { icon: "⚔️", label: "Storm Pass" },
  { icon: "📊", label: "Analytics" },
  { icon: "⚙️", label: "Settings" },
];

const TOP_GIFTS = [
  { name: "Galaxy", coins: 500, emoji: "🌌" },
  { name: "Rocket", coins: 300, emoji: "🚀" },
  { name: "Crown", coins: 1000, emoji: "👑" },
  { name: "Lion", coins: 1000, emoji: "🦁" },
  { name: "Rose", coins: 100, emoji: "🌹" },
];

export function ConceptDash() {
  return (
    <div
      className="cd-root"
      style={{
        background: "linear-gradient(135deg, #0f0528 0%, #1e0a46 40%, #0a0532 100%)",
      }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          zIndex: 0,
        }}
      />
      {/* Purple radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 55% 90% at 65% 50%, rgba(139,92,246,0.20) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      {/* ── SIDEBAR ── */}
      <aside className="cd-sidebar">
        <div className="cd-logo">
          <div className="cd-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
            </svg>
          </div>
          <div>
            <div className="cd-logo-name">LIVESTORM AI</div>
            <div className="cd-logo-sub">NEXT GEN STREAMING</div>
          </div>
        </div>

        <nav className="cd-nav">
          {NAV.map((item) => (
            <div key={item.label} className={`cd-nav-item ${item.active ? "active" : ""}`}>
              <span className="cd-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

      </aside>

      {/* ── MAIN ── */}
      <main className="cd-main">

        {/* TOP BAR */}
        <div className="cd-topbar">
          <div className="cd-topbar-stats">
            {[
              { label: "Глядачі", value: "1,243" },
              { label: "Чат / хв", value: "342" },
              { label: "Подарунки / хв", value: "87" },
            ].map((s) => (
              <div key={s.label} className="cd-top-stat">
                <div className="cd-top-stat-val">{s.value}</div>
                <div className="cd-top-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="cd-topbar-right">
            <div className="cd-server-status">
              <span className="cd-server-dot" />
              Server: Online
            </div>
            <div className="cd-topbar-icons">
              <span>🔔</span><span>⚙️</span><span>👤</span>
            </div>
          </div>
        </div>

        {/* HERO — transparent so background art shows */}
        <div className="cd-hero">

        </div>

      </main>
    </div>
  );
}
