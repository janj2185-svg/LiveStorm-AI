"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/components/app-provider";
import { ApiError, apiFetch } from "@/lib/api";

export function useApiData<T>(path: string) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<T>(path, token)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason: unknown) => {
        const apiError =
          reason instanceof ApiError
            ? reason
            : new ApiError(reason instanceof Error ? reason.message : "Unknown API error.", 0);
        if (apiError.status === 401) void logout();
        if (active) setError(apiError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, logout, path, token]);

  return { data, error, loading, reload };
}

export function PageIntro({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pageIntro">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading live data…" }: { label?: string }) {
  return (
    <div className="statePanel" role="status">
      <span className="spinner" />
      <h2>{label}</h2>
      <p>The console is waiting for the SYLORA API.</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  unavailableLabel = "Live data unavailable",
}: {
  error: ApiError;
  onRetry: () => void;
  unavailableLabel?: string;
}) {
  return (
    <div className="statePanel errorPanel" role="alert">
      <span className="stateIcon">!</span>
      <h2>{unavailableLabel}</h2>
      <p>{error.message}</p>
      <div className="errorMeta">
        {error.status ? `HTTP ${error.status}` : "Network error"}
        {error.code ? ` · ${error.code}` : ""}
      </div>
      <button type="button" className="secondaryButton" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="statePanel">
      <span className="stateIcon soft">○</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export function StatusPill({ value }: { value?: string | boolean | null }) {
  const normalized =
    typeof value === "boolean" ? (value ? "enabled" : "disabled") : String(value || "unknown");
  const positive = ["active", "ready", "live", "enabled", "published", "available"].includes(
    normalized.toLowerCase(),
  );
  return <span className={positive ? "pill positive" : "pill"}>{normalized}</span>;
}
