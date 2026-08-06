import type { CSSProperties, ReactNode } from "react";

import styles from "./GlassCard.module.css";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  style?: CSSProperties;
}

export function GlassCard({ children, className, padding = "md", style }: GlassCardProps) {
  const paddingClass =
    padding === "sm"
      ? styles["padded-sm"]
      : padding === "lg"
        ? styles["padded-lg"]
        : padding === "none"
          ? styles.flush
          : "";

  return (
    <div className={[styles.card, paddingClass, className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}
