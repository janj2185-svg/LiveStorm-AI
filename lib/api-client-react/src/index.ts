export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import { customFetch } from "./custom-fetch";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions, UseMutationResult, MutationFunction } from "@tanstack/react-query";

export const forceStopSession = async (
  options?: RequestInit,
): Promise<{ ok: boolean; clearedSessionId: number | null }> => {
  return customFetch(`/api/sessions/force-stop`, {
    ...options,
    method: "POST",
  });
};

export const useForceStopSession = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      Awaited<ReturnType<typeof forceStopSession>>,
      TError,
      void,
      TContext
    >;
  },
): UseMutationResult<
  Awaited<ReturnType<typeof forceStopSession>>,
  TError,
  void,
  TContext
> => {
  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof forceStopSession>>,
    void
  > = () => forceStopSession();
  return useMutation({ mutationKey: ["forceStopSession"], mutationFn, ...options?.mutation });
};
