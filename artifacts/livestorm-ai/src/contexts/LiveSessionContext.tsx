/**
 * LiveSessionContext — Single Source of Truth for Live Session State
 *
 * ARCHITECTURE DECISION
 * ─────────────────────────────────────────────────────────────────────────────
 * Before this context existed, every page (Dashboard, Live Studio, AI Co-Host,
 * Automation, Gamification) independently called:
 *   1. useGetActiveSession() → polling HTTP request every 5s (per page)
 *   2. useLiveSession(sessionId) → created a NEW Socket.IO connection per page
 *
 * With 5 pages open simultaneously, that's 5 socket connections and 5 polling
 * intervals for the exact same session data.
 *
 * This context eliminates the duplication:
 *   - ONE useGetActiveSession() call, shared via React Context
 *   - ONE useLiveSession() call → ONE Socket.IO connection per browser window
 *   - All pages call useLiveSessionContext() to read the shared state
 *
 * Mounted inside <Layout> so it persists across page navigation and auto-
 * disconnects when the user signs out or closes the tab.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  useGetActiveSession,
  getGetActiveSessionQueryKey,
} from "@workspace/api-client-react";
import { useLiveSession } from "@/hooks/useLiveSession";

export type {
  LiveEvent,
  LiveStats,
  AutomationFiredEvent,
  AiAnnouncementEvent,
  ModerationFlaggedEvent,
  TikTokStatusEvent,
  XpAwardedEvent,
  LevelUpEvent,
  AchievementUnlockEvent,
  LuckyDropEvent,
  KingdomUpdateEvent,
  LeaderboardUpdateEvent,
  ConnectionMode,
  TtsMode,
} from "@/hooks/useLiveSession";

type LiveSessionContextValue = ReturnType<typeof useLiveSession> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeSessionRes: any;
  isActive: boolean;
  isLoadingSession: boolean;
  activeSessionId: number | undefined;
  sessionMode: string | null;
};

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null);

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const { data: activeSessionRes, isLoading: isLoadingSession } = useGetActiveSession({
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 5000 },
  });

  const activeSessionId = (activeSessionRes as any)?.session?.id as number | undefined;
  const sessionMode = ((activeSessionRes as any)?.session?.mode ?? null) as string | null;

  const liveSession = useLiveSession(activeSessionId, sessionMode as import("@/hooks/useLiveSession").ConnectionMode | null);

  return (
    <LiveSessionContext.Provider
      value={{
        ...liveSession,
        activeSessionRes,
        isActive: !!(activeSessionRes as any)?.active,
        isLoadingSession,
        activeSessionId,
        sessionMode,
      }}
    >
      {children}
    </LiveSessionContext.Provider>
  );
}

export function useLiveSessionContext(): LiveSessionContextValue {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) {
    throw new Error("useLiveSessionContext must be used within <LiveSessionProvider>");
  }
  return ctx;
}
