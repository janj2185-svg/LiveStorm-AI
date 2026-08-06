"use client";

import type { ReactNode } from "react";

import { GlassCard } from "./GlassCard";
import styles from "./Modal.module.css";

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.overlay}
      data-testid="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <GlassCard padding="lg">
          <h2 className={styles.title}>{title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}
          {children}
        </GlassCard>
      </div>
    </div>
  );
}

export { styles as modalStyles };
