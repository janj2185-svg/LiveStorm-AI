import type { ReactNode } from "react";

import { GlassCard } from "./GlassCard";
import styles from "./Kpi.module.css";

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = "gold",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: "gold" | "violet" | "sky";
}) {
  return (
    <GlassCard padding="md">
      <div className={styles.kpi}>
        {icon ? <div className={[styles.accent, styles[accent]].join(" ")}>{icon}</div> : null}
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {sub ? <span className={styles.sub}>{sub}</span> : null}
      </div>
    </GlassCard>
  );
}
