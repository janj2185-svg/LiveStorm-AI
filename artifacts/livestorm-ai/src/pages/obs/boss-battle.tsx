import { useEffect, useState } from "react";
import { useObsSocket } from "@/hooks/useObsSocket";

interface DamageNumber {
  id: number;
  value: number;
  x: number;
}

let dmgId = 0;

const BOSS_EMOJIS: Record<string, string> = {
  easy: "👾",
  medium: "🐉",
  hard: "💀",
  legendary: "☠️",
};

export function ObsBossBattle() {
  const params = new URLSearchParams(window.location.search);
  const streamerId = Number(params.get("streamerId"));
  const token = params.get("token") ?? "";
  const accentColor = params.get("color") ?? "ef4444";

  const { overlayState, events } = useObsSocket(streamerId || null, token || null);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [isDefeated, setIsDefeated] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    if (latest.type === "boss:attacked" || latest.type === "gift") {
      const dmg = (latest.data.damage ?? (latest.data.coins ?? 1)) as number;
      const newDmg: DamageNumber = {
        id: ++dmgId,
        value: Number(dmg),
        x: 30 + Math.random() * 40,
      };
      setDamageNumbers((prev) => [...prev, newDmg]);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setTimeout(() => {
        setDamageNumbers((prev) => prev.filter((d) => d.id !== newDmg.id));
      }, 1500);
    }
  }, [events]);

  useEffect(() => {
    const boss = overlayState?.activeBossBattle;
    if (boss && boss.currentHp <= 0) {
      setIsDefeated(true);
      setTimeout(() => setIsDefeated(false), 4000);
    }
  }, [overlayState?.activeBossBattle]);

  const boss = overlayState?.activeBossBattle;
  const hpPct = boss ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 0;
  const bossEmoji = BOSS_EMOJIS[boss?.difficulty ?? "medium"] ?? "🐉";

  const hpColor = hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {!boss ? (
        <div
          style={{
            background: "rgba(10,10,20,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "24px 36px",
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px",
            backdropFilter: "blur(12px)",
          }}
        >
          No active boss battle
        </div>
      ) : isDefeated ? (
        <div
          style={{
            textAlign: "center",
            animation: "pulse 0.6s ease-in-out infinite alternate",
          }}
        >
          <div style={{ fontSize: "80px", marginBottom: "16px", filter: "drop-shadow(0 0 40px rgba(255,215,0,0.8))" }}>🏆</div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#fbbf24", textShadow: "0 0 40px rgba(251,191,36,0.8)" }}>
            BOSS DEFEATED!
          </div>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.7)", marginTop: "8px" }}>
            {boss.bossName}
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", textAlign: "center" }}>
          {damageNumbers.map((d) => (
            <div
              key={d.id}
              style={{
                position: "absolute",
                top: "-40px",
                left: `${d.x}%`,
                transform: "translateX(-50%)",
                fontSize: "24px",
                fontWeight: 900,
                color: "#ef4444",
                textShadow: "0 0 12px rgba(239,68,68,0.8)",
                animation: "floatUp 1.5s ease-out forwards",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              -{d.value}
            </div>
          ))}

          <div
            style={{
              fontSize: "96px",
              lineHeight: 1,
              filter: `drop-shadow(0 0 24px rgba(239,68,68,0.4))`,
              transform: shake ? "scale(1.05) rotate(-3deg)" : "scale(1) rotate(0deg)",
              transition: "transform 0.15s ease",
              marginBottom: "16px",
            }}
          >
            {bossEmoji}
          </div>

          <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            {boss.bossName}
            <span style={{ fontSize: "11px", fontWeight: 500, color: `#${accentColor}`, marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {boss.difficulty}
            </span>
          </div>

          <div
            style={{
              width: "320px",
              height: "20px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              position: "relative",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${hpPct}%`,
                background: `linear-gradient(90deg, ${hpColor}cc, ${hpColor})`,
                borderRadius: "10px",
                transition: "width 0.4s ease, background 0.4s ease",
                boxShadow: `0 0 12px ${hpColor}66`,
              }}
            />
          </div>

          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "6px", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            HP: {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
        }
        @keyframes pulse {
          from { opacity: 0.8; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
