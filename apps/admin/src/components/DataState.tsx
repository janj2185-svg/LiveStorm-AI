import type { ReactNode } from "react";

import { ApiError, NetworkError } from "@/lib/api-client";

import { Button } from "./Button";
import styles from "./DataState.module.css";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status">
      <div className={styles.spinner} aria-hidden />
      <p className={styles.title}>{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  icon = "◇",
  action,
}: {
  title: string;
  detail?: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon} aria-hidden>
        {icon}
      </div>
      <p className={styles.title}>{title}</p>
      {detail ? <p className={styles.detail}>{detail}</p> : null}
      {action}
    </div>
  );
}

export function describeError(error: unknown): { title: string; detail: string } {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return {
        title: "Access denied",
        detail: error.detail || "Your account does not have permission to view this data.",
      };
    }
    if (error.status === 404) {
      return { title: "Not found", detail: error.detail };
    }
    return { title: error.code === "http_error" ? "Request failed" : error.detail, detail: error.detail };
  }
  if (error instanceof NetworkError) {
    return { title: "Connection problem", detail: error.message };
  }
  if (error instanceof Error) {
    return { title: "Something went wrong", detail: error.message };
  }
  return { title: "Something went wrong", detail: "An unexpected error occurred." };
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, detail } = describeError(error);
  return (
    <div className={styles.wrap}>
      <div className={[styles.icon, styles.errorIcon].join(" ")} aria-hidden>
        !
      </div>
      <p className={styles.title}>{title}</p>
      <p className={styles.detail}>{detail}</p>
      {onRetry ? (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
