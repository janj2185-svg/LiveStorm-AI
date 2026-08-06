"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "./auth-context";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
}

export function useAuthedQuery<T>(
  fetcher: (accessToken: string) => Promise<T>,
  deps: React.DependencyList = [],
) {
  const { callWithAuth } = useAuth();
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    callWithAuth((token) => fetcherRef.current(token))
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callWithAuth, reloadToken, ...deps]);

  return { ...state, reload };
}
