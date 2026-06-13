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
    <div className="cd-root">
      {/* Animated background */}
      <div className="cd-bg">
        <div className="cd-bg-gradient" />
        <div className="cd-bg-glow-1" />
        <div className="cd-bg-glow-2" />
        <div className="cd-bg-glow-3" />
        {/* Stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="cd-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }} />
        ))}
      </div>

      {/* SIDEBAR */}
      <aside className="cd-sidebar">
        {/* Logo */}
        <div className="cd-logo">
          <div className="cd-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
            </svg>
          </div>
          <div>
            <div className="cd-logo-name">LIVESTORM AI</div>
            <div className="cd-logo-sub">NEXT GEN STREAMING</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="cd-nav">
          {NAV.map((item) => (
            <div key={item.label} className={`cd-nav-item ${item.active ? "active" : ""}`}>
              <span className="cd-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="cd-sidebar-user">
          <div className="cd-user-avatar">J</div>
          <div>
            <div className="cd-user-name">Jan Streamer</div>
            <div className="cd-user-level">Level 24 <span className="cd-pro-badge">PRO</span></div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="cd-main">
        {/* Top bar */}
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
              <span>🔔</span>
              <span>⚙️</span>
              <span>👤</span>
            </div>
          </div>
        </div>

        {/* Hero area */}
        <div className="cd-hero">
          {/* Left text */}
          <div className="cd-hero-left">
            <h1 className="cd-greeting">Добрий вечір,<br />Jan! 👋</h1>
            <p className="cd-hero-sub">Storm готовий до стріму. Погнали!</p>
            <button className="cd-btn-start">⚡ Почати стрім</button>
            <button className="cd-btn-test">Тест стріму</button>
          </div>

          {/* Center — AI character */}
          <div className="cd-hero-center">
            {/* Glowing platform rings */}
            <div className="cd-platform">
              <div className="cd-ring cd-ring-1" />
              <div className="cd-ring cd-ring-2" />
              <div className="cd-ring cd-ring-3" />
              <div className="cd-platform-glow" />
            </div>
            {/* Character silhouette */}
            <div className="cd-character">
              <div className="cd-char-body">
                {/* AI host head */}
                <div className="cd-char-head">
                  <div className="cd-char-face" />
                  <div className="cd-char-hair" />
                  <div className="cd-char-hair-side" />
                </div>
                {/* Body */}
                <div className="cd-char-torso">
                  <div className="cd-char-badge">STORM</div>
                </div>
                {/* Mic stand */}
                <div className="cd-mic-stand">
                  <div className="cd-mic-head" />
                  <div className="cd-mic-pole" />
                </div>
              </div>
            </div>
            {/* Black cat companion */}
            <div className="cd-cat">
              <div className="cd-cat-body">
                <div className="cd-cat-head">
                  <div className="cd-cat-ear cd-cat-ear-l" />
                  <div className="cd-cat-ear cd-cat-ear-r" />
                  <div className="cd-cat-eyes" />
                </div>
                <div className="cd-cat-torso" />
                <div className="cd-cat-tail" />
                <div className="cd-cat-glow" />
              </div>
            </div>
            {/* Floating city silhouette */}
            <div className="cd-city">
              <div className="cd-city-buildings" />
              <div className="cd-city-glow" />
              {/* Floating ships */}
              <div className="cd-ship cd-ship-1" />
              <div className="cd-ship cd-ship-2" />
            </div>
          </div>

          {/* Right panel */}
          <div className="cd-hero-right">
            {/* Stream status */}
            <div className="cd-status-card">
              <div className="cd-live-indicator">
                <div className="cd-live-dot" />
                <span>LIVE</span>
                <span className="cd-live-time">02:47:32</span>
              </div>
              <div className="cd-status-label">Стрім тривае</div>
              <div className="cd-waveform">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="cd-wave-bar" style={{
                    height: `${8 + Math.sin(i * 0.9) * 10 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.08}s`,
                  }} />
                ))}
              </div>
            </div>

            {/* AI Mood */}
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

            {/* Active event */}
            <div className="cd-event-card">
              <div className="cd-card-title">Активна подія</div>
              <div className="cd-event-name">GALAXY B…</div>
              <div className="cd-event-time">⏱ 02:15:16</div>
              <div className="cd-event-hint">Всі подарунки події</div>
            </div>
          </div>
        </div>

        {/* Bottom cards */}
        <div className="cd-bottom">
          {/* Top Gifts */}
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

          {/* Quick Actions */}
          <div className="cd-bottom-card">
            <div className="cd-bottom-card-title">Швидкі дії</div>
            <div className="cd-actions-list">
              <div className="cd-action-item">🎬 Запустити сцену</div>
              <div className="cd-action-item">🎁 Ефекти подарунків</div>
              <div className="cd-action-item">🤖 AI Talk</div>
              <div className="cd-action-item">⚙️ Налаштування бота</div>
            </div>
          </div>

          {/* Storm Pass */}
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
