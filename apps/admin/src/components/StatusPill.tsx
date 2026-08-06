import styles from "./StatusPill.module.css";

export type PillTone = "success" | "danger" | "warning" | "neutral" | "violet" | "sky";

const STATUS_TONE: Record<string, PillTone> = {
  active: "success",
  connected: "success",
  live: "success",
  resolved: "success",
  refunded: "success",
  suspended: "danger",
  invalid: "danger",
  expired: "danger",
  dismissed: "neutral",
  pending: "warning",
  missing: "warning",
  reviewing: "warning",
  open: "warning",
  deleted: "neutral",
};

export function toneForStatus(status: string): PillTone {
  return STATUS_TONE[status.toLowerCase()] ?? "neutral";
}

export function StatusPill({ label, tone }: { label: string; tone?: PillTone }) {
  const resolvedTone = tone ?? toneForStatus(label);
  return (
    <span className={[styles.pill, styles[resolvedTone]].join(" ")}>
      <span className={styles.dot} aria-hidden />
      {label}
    </span>
  );
}
