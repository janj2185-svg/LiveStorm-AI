import { useEffect, useState } from "react";
import { useObsSocket, type ObsAttack } from "@/hooks/useObsSocket";
import { useOverlayTheme } from "@/lib/obsTheme";

interface DamageNumber {
  id: number;
  value: number;
  x: number;
}

let dmgId = 0;

export function ObsBossBattle() {
  const params = new URLSearchParams(window.location.search);
  const streamerId = Number(params.get("streamerId"));
  const token = params.get("token") ?? "";
  const { fontScale, transitionMs } = useOverlayTheme();

  const { overlayState, attacks } = useObsSocket(streamerId || null, token || null);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [isDefeated, setIsDefeated] = useState(false);
  const [shake, setShake] = useState(false);
  const [lastAttackCount, setLastAttackCount] = useState(0);

  useEffect(() => {
    document.body.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  useEffect(() => {
    if (attacks.length === 0 || attacks.length === lastAttackCount) return;
    setLastAttackCount(attacks.length);

    const latest = attacks[0];
    const newDmg: DamageNumber = {
      id: ++dmgId,
      value: latest.damage,
      x: 30 + Math.random() * 40,
    };
    setDamageNumbers((prev) => [...prev, newDmg]);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== newDmg.id));
    }, 1500);
  }, [attacks, lastAttackCount]);

  useEffect(() => {
    const boss = overlayState?.activeBossBattle;
    if (boss && boss.currentHp <= 0) {
      setIsDefeated(true);
      setTimeout(() => setIsDefeated(false), 4000);
    }
  }, [overlayState?.activeBossBattle]);

  const boss = overlayState?.activeBossBattle;
  const hpPct = boss ? Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100)) : 0;
  const bossEmoji = boss?.bossEmoji ?? "🐉";
  const hpColor = hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#f59e0b" : "#ef4444";

  const recentAttacks = attacks.slice(0, 8);

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
        gap: "32px",
        zoom: fontScale,
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
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "80px", marginBottom: "16px", filter: "drop-shadow(0 0 40px rgba(255,215,0,0.8))" }}>🏆</div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: "#fbbf24", textShadow: "0 0 40px rgba(251,191,36,0.8)" }}>
            BOSS DEFEATED!
          </div>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.7)", marginTop: "8px" }}>
            {boss.bossName}
          </div>
        </div>
      ) : (
        <>
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
                filter: "drop-shadow(0 0 24px rgba(239,68,68,0.4))",
                transform: shake ? "scale(1.05) rotate(-3deg)" : "scale(1) rotate(0deg)",
                transition: "transform 0.15s ease",
                marginBottom: "16px",
              }}
            >
              {bossEmoji}
            </div>

            <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {boss.bossName}
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
                  transition: transitionMs > 0 ? `width ${transitionMs}ms ease, background ${transitionMs}ms ease` : "none",
                  boxShadow: `0 0 12px ${hpColor}66`,
                }}
              />
            </div>

            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "6px", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              HP: {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
            </div>
          </div>

          {recentAttacks.length > 0 && (
            <div
              style={{
                width: "240px",
                background: "rgba(10,10,20,0.82)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px",
                overflow: "hidden",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#ef4444",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>⚔️</span> Attack Feed
              </div>
              {recentAttacks.map((attack, i) => (
                <div
                  key={`${attack.battleId}-${attack.timestamp}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderBottom: i < recentAttacks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    animation: i === 0 ? "slideIn 0.3s ease-out" : "none",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>
                    {attack.attackType === "gift" ? "🎁" : attack.attackType === "like" ? "❤️" : "⚔️"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {attack.viewerName}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#ef4444", flexShrink: 0 }}>
                    -{attack.damage}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
