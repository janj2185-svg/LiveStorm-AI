export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import { customFetch } from "./custom-fetch";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  MutationFunction,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from "@tanstack/react-query";
import type {
  LuckyDropRecord,
  ViewerProfile,
  TriggerLuckyDropBody,
  TriggerLuckyDropResult,
  GetLuckyDropHistoryParams,
} from "./generated/api.schemas";

// ---------------------------------------------------------------------------
// Lucky Drop hooks
// ---------------------------------------------------------------------------

export const getLuckyDropHistory = async (
  params?: GetLuckyDropHistoryParams,
  options?: RequestInit,
): Promise<LuckyDropRecord[]> => {
  const qs = params?.limit ? `?limit=${params.limit}` : "";
  return customFetch<LuckyDropRecord[]>(`/api/gamification/lucky-drops${qs}`, {
    ...options,
    method: "GET",
  });
};

export const useGetLuckyDropHistory = <TData = LuckyDropRecord[], TError = unknown>(
  params?: GetLuckyDropHistoryParams,
  options?: { query?: UseQueryOptions<LuckyDropRecord[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryKey = options?.query?.queryKey ?? ["/api/gamification/lucky-drops", params];
  const queryOptions = {
    queryKey,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      getLuckyDropHistory(params, { signal }),
    ...options?.query,
  } as UseQueryOptions<LuckyDropRecord[], TError, TData>;
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
};

export const triggerLuckyDrop = async (
  body: TriggerLuckyDropBody,
  options?: RequestInit,
): Promise<TriggerLuckyDropResult> => {
  return customFetch<TriggerLuckyDropResult>("/api/gamification/lucky-drops/trigger", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
  });
};

export const useTriggerLuckyDrop = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<TriggerLuckyDropResult, TError, TriggerLuckyDropBody, TContext>;
  },
): UseMutationResult<TriggerLuckyDropResult, TError, TriggerLuckyDropBody, TContext> => {
  const mutationFn: MutationFunction<TriggerLuckyDropResult, TriggerLuckyDropBody> = (body) =>
    triggerLuckyDrop(body);
  return useMutation({ mutationKey: ["triggerLuckyDrop"], mutationFn, ...options?.mutation });
};

// ---------------------------------------------------------------------------
// Viewer Profile hook
// ---------------------------------------------------------------------------

export const getViewerProfile = async (
  tiktokViewerId: string,
  params?: { streamerId?: number },
  options?: RequestInit,
): Promise<ViewerProfile> => {
  const qs = params?.streamerId ? `?streamerId=${params.streamerId}` : "";
  return customFetch<ViewerProfile>(
    `/api/gamification/viewer/${encodeURIComponent(tiktokViewerId)}${qs}`,
    { ...options, method: "GET" },
  );
};

export const useGetViewerProfile = <TData = ViewerProfile, TError = unknown>(
  tiktokViewerId: string | null | undefined,
  params?: { streamerId?: number },
  options?: { query?: UseQueryOptions<ViewerProfile, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryKey = options?.query?.queryKey ?? [
    "/api/gamification/viewer",
    tiktokViewerId,
    params,
  ];
  const queryOptions = {
    queryKey,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      getViewerProfile(tiktokViewerId!, params, { signal }),
    enabled: !!tiktokViewerId,
    ...options?.query,
  } as UseQueryOptions<ViewerProfile, TError, TData>;
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
};

// ---------------------------------------------------------------------------
// Moderation Rules hooks
// ---------------------------------------------------------------------------

export type ModerationRule = {
  id: number;
  streamerId: number;
  ruleKey: string;
  isActive: boolean;
  updatedAt: string;
};

export const getModerationRules = async (
  options?: RequestInit,
): Promise<ModerationRule[]> => {
  return customFetch<ModerationRule[]>("/api/moderation/rules", {
    ...options,
    method: "GET",
  });
};

export const useGetModerationRules = <TData = ModerationRule[], TError = unknown>(
  options?: { query?: UseQueryOptions<ModerationRule[], TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryKey = options?.query?.queryKey ?? ["/api/moderation/rules"];
  const queryOptions = {
    queryKey,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      getModerationRules({ signal }),
    ...options?.query,
  } as UseQueryOptions<ModerationRule[], TError, TData>;
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey };
};

export const updateModerationRule = async (
  id: number,
  body: { isActive: boolean },
  options?: RequestInit,
): Promise<ModerationRule> => {
  return customFetch<ModerationRule>(`/api/moderation/rules/${id}`, {
    ...options,
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
  });
};

export const useUpdateModerationRule = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      ModerationRule,
      TError,
      { id: number; isActive: boolean },
      TContext
    >;
  },
): UseMutationResult<ModerationRule, TError, { id: number; isActive: boolean }, TContext> => {
  const mutationFn: MutationFunction<ModerationRule, { id: number; isActive: boolean }> = ({
    id,
    isActive,
  }) => updateModerationRule(id, { isActive });
  return useMutation({
    mutationKey: ["updateModerationRule"],
    mutationFn,
    ...options?.mutation,
  });
};

// ---------------------------------------------------------------------------
// Avatar config
// ---------------------------------------------------------------------------

export type BuiltInAvatar = {
  key: string;
  name: string;
  tagline: string;
  description: string;
  style: string;
  accentColor: string;
  personalities: string[];
};

export type AvatarConfig = {
  id: number;
  streamerId: number;
  avatarEnabled: boolean;
  avatarKey: string;
  avatarUrl: string | null;
  avatarThumbnailUrl: string | null;
  renderer: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  scale: number;
  backgroundType: string;
  backgroundValue: string | null;
  lightingPreset: string;
  shadowEnabled: boolean;
  lipSyncEnabled: boolean;
  lipSyncSensitivity: number;
  expressionIntensity: number;
  blinkEnabled: boolean;
  blinkIntervalMs: number;
  obsWidth: number;
  obsHeight: number;
  obsShowSpeechBubble: boolean;
  obsShowNameTag: boolean;
  createdAt: string;
  updatedAt: string;
  builtInAvatars: BuiltInAvatar[];
};

export type AvatarAnimationPreset = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  glbUrl: string;
  previewGifUrl: string | null;
  durationMs: number;
  isLoop: boolean;
  isDefault: boolean;
  createdAt: string;
};

export const getAvatarConfig = async (options?: RequestInit): Promise<AvatarConfig> =>
  customFetch<AvatarConfig>("/api/avatar/config", options);

export const useGetAvatarConfig = <TData = AvatarConfig, TError = unknown>(options?: {
  query?: UseQueryOptions<AvatarConfig, TError, TData>;
}): UseQueryResult<TData, TError> => {
  const queryOptions = {
    queryKey: ["avatarConfig"],
    queryFn: ({ signal }: { signal?: AbortSignal }) => getAvatarConfig({ signal }),
    ...options?.query,
  } as UseQueryOptions<AvatarConfig, TError, TData>;
  return useQuery(queryOptions);
};

export const updateAvatarConfig = async (
  body: Partial<Omit<AvatarConfig, "id" | "streamerId" | "createdAt" | "updatedAt" | "builtInAvatars">>,
  options?: RequestInit,
): Promise<AvatarConfig> =>
  customFetch<AvatarConfig>("/api/avatar/config", {
    ...options,
    method: "PUT",
    body: JSON.stringify(body),
  });

export const useUpdateAvatarConfig = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    AvatarConfig,
    TError,
    Partial<Omit<AvatarConfig, "id" | "streamerId" | "createdAt" | "updatedAt" | "builtInAvatars">>,
    TContext
  >;
}): UseMutationResult<
  AvatarConfig,
  TError,
  Partial<Omit<AvatarConfig, "id" | "streamerId" | "createdAt" | "updatedAt" | "builtInAvatars">>,
  TContext
> => {
  const mutationFn = (
    body: Partial<Omit<AvatarConfig, "id" | "streamerId" | "createdAt" | "updatedAt" | "builtInAvatars">>,
  ) => updateAvatarConfig(body);
  return useMutation({ mutationKey: ["updateAvatarConfig"], mutationFn, ...options?.mutation });
};

export const getAvatarPresets = async (options?: RequestInit): Promise<AvatarAnimationPreset[]> =>
  customFetch<AvatarAnimationPreset[]>("/api/avatar/presets", options);

export const useGetAvatarPresets = <TData = AvatarAnimationPreset[], TError = unknown>(options?: {
  query?: UseQueryOptions<AvatarAnimationPreset[], TError, TData>;
}): UseQueryResult<TData, TError> => {
  const queryOptions = {
    queryKey: ["avatarPresets"],
    queryFn: ({ signal }: { signal?: AbortSignal }) => getAvatarPresets({ signal }),
    ...options?.query,
  } as UseQueryOptions<AvatarAnimationPreset[], TError, TData>;
  return useQuery(queryOptions);
};

// ---------------------------------------------------------------------------
// Force stop session
// ---------------------------------------------------------------------------

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
