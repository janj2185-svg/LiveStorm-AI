import { useEffect } from "react";
import { LayoutDashboard, Bot, BarChart2, Settings, Monitor, Gift, Users, Zap, Heart, MessageSquare } from "lucide-react";

const FONT = "Outfit";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Monitor, label: "Live Studio" },
  { icon: Bot, label: "AI Storm" },
  { icon: Gift, label: "Gifts & XP" },
  { icon: Users, label: "Community" },
  { icon: BarChart2, label: "Analytics" },
  { icon: Settings, label: "Settings" },
];

const STATS = [
  { icon: Users, label: "Peak Viewers", value: "1,243", color: "#818cf8" },
  { icon: MessageSquare, label: "Comments", value: "342", color: "#34d399" },
  { icon: Gift, label: "Gifts / hr", value: "87", color: "#f59e0b" },
  { icon: Heart, label: "Likes", value: "9.4K", color: "#f472b6" },
];

export function Outfit() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  return (
    <div style={{ fontFamily: `'${FONT}', sans-serif`, background: "#0b0a1a", minHeight: "100vh", display: "flex", color: "#e8e6f0" }}>
      {/* Sidebar */}
      <aside style={{ width: 200, background: "rgba(255,255,255,0.025)", borderRight: "1px solid rgba(255,255,255,0.07)", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "0 6px" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }}>LiveStorm AI</span>
        </div>
        {NAV.map((item) => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
            borderRadius: 10, cursor: "pointer",
            background: item.active ? "rgba(124,58,237,0.18)" : "transparent",
            border: item.active ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
            color: item.active ? "#fff" : "rgba(255,255,255,0.58)",
          }}>
            <item.icon size={14} />
            <span style={{ fontSize: 12.5, fontWeight: item.active ? 600 : 500 }}>{item.label}</span>
          </div>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "28px 28px", overflow: "hidden" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(139,92,246,0.7)", marginBottom: 4 }}>Overview</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.015em", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Your stream performance at a glance</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
              <s.icon size={14} color={s.color} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: `'${FONT}', sans-serif`, cursor: "pointer", letterSpacing: "0" }}>
            Start Session
          </button>
          <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 20px", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, fontFamily: `'${FONT}', sans-serif`, cursor: "pointer" }}>
            View Details
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>TikTok Username</label>
          <input
            placeholder="@yourhandle"
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: `'${FONT}', sans-serif`, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Live Activity Feed</div>
          {["👤 viewer123 joined the stream", "🎁 galaxy_fan sent Galaxy × 2", "💬 great stream tonight!", "❤️ 47 new likes in the last minute"].map((line, i) => (
            <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", padding: "5px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>{line}</div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Font: {FONT}</div>
      </main>
    </div>
  );
}
