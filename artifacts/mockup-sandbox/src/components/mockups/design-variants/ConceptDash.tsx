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
        backgroundImage: "url('/__mockup/dash-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay — light enough to let bg show through */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgba(5, 2, 20, 0.48)",
          zIndex: 0,
        }}
      />
      {/* Purple tint */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 90% at 65% 50%, rgba(120,60,240,0.30) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />
      {/* Storm AI Girl Avatar */}
      <img
        src="/__mockup/storm-girl.png"
        alt="Storm AI"
        style={{
          position: "absolute",
          bottom: 0,
          right: 180,
          height: "96%",
          objectFit: "contain",
          objectPosition: "bottom",
          filter: "drop-shadow(0 0 40px rgba(139,92,246,0.7)) drop-shadow(0 0 80px rgba(103,232,249,0.3))",
          zIndex: 1,
          pointerEvents: "none",
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

        <div className="cd-sidebar-user">
          <div className="cd-user-avatar">J</div>
          <div>
            <div className="cd-user-name">Jan Streamer</div>
            <div className="cd-user-level">
              Level 24 <span className="cd-pro-badge">PRO</span>
            </div>
          </div>
        </div>
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

          {/* Left CTA */}
          <div className="cd-hero-left">
            <h1 className="cd-greeting">Добрий вечір,<br />Jan! 👋</h1>
            <p className="cd-hero-sub">Storm готовий до стріму. Погнали!</p>
            <button className="cd-btn-start">⚡ Почати стрім</button>
            <button className="cd-btn-test">Тест стріму</button>
          </div>

          {/* Center — art shows through */}
          <div className="cd-hero-center" />

          {/* Right panel */}
          <div className="cd-hero-right">
            <div className="cd-status-card">
              <div className="cd-live-indicator">
                <div className="cd-live-dot" />
                <span>LIVE</span>
                <span className="cd-live-time">02:47:32</span>
              </div>
              <div className="cd-status-label">Стрім тривае</div>
              <div className="cd-waveform">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="cd-wave-bar"
                    style={{
                      height: `${6 + Math.abs(Math.sin(i * 0.7)) * 14 + (i % 3) * 3}px`,
                      animationDelay: `${i * 0.07}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="cd-mood-card">
              <div className="cd-card-title">AI Mood</div>
              <div className="cd-mood-row">
                <span className="cd-mood-emoji">😊</span>
                <div className="cd-mood-info">
                  <div className="cd-mood-state">Happy</div>
                  <div className="cd-mood-bar-wrap">
                    <div className="cd-mood-bar" style={{ width: "72%" }} />
                  </div>
                </div>
              </div>
              <div className="cd-mood-row" style={{ marginTop: 8 }}>
                <span className="cd-mood-emoji">⚡</span>
                <div className="cd-mood-info">
                  <div className="cd-mood-state">Energy</div>
                  <div className="cd-mood-bar-wrap">
                    <div className="cd-mood-bar energy" style={{ width: "88%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="cd-event-card">
              <div className="cd-card-title">Активна подія</div>
              <div className="cd-event-name">GALAXY B…</div>
              <div className="cd-event-time">⏱ 02:15:16</div>
              <div className="cd-event-hint">Всі подарунки події</div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="cd-bottom">
          <div className="cd-bottom-card">
            <div className="cd-bottom-card-title">Топ подарунки</div>
            <div className="cd-gifts-row">
              {TOP_GIFTS.map((g) => (
                <div key={g.name} className="cd-gift-item">
                  <div className="cd-gift-emoji">{g.emoji}</div>
                  <div className="cd-gift-name">{g.name}</div>
                  <div className="cd-gift-coins">✦ {g.coins}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cd-bottom-card">
            <div className="cd-bottom-card-title">Швидкі дії</div>
            <div className="cd-actions-list">
              <div className="cd-action-item">🎬 Запустити сцену</div>
              <div className="cd-action-item">🎁 Ефекти подарунків</div>
              <div className="cd-action-item">🤖 AI Talk</div>
              <div className="cd-action-item">⚙️ Налаштування бота</div>
            </div>
          </div>

          <div className="cd-bottom-card">
            <div className="cd-bottom-card-title">Storm Pass</div>
            <div className="cd-pass-content">
              <div className="cd-pass-badge">⭐</div>
              <div className="cd-pass-info">
                <div className="cd-pass-level">Level 24</div>
                <div className="cd-pass-xp-bar">
                  <div className="cd-pass-xp-fill" style={{ width: "88%" }} />
                </div>
                <div className="cd-pass-xp-text">2,660 / 3,000 XP</div>
              </div>
              <div className="cd-pass-coins">💰 12,450</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
