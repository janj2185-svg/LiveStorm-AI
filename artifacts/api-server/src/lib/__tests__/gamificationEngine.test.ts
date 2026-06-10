import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any module imports
// ---------------------------------------------------------------------------
const {
  mockEmit,
  mockTo,
  mockIo,
  mockFindFirstKingdom,
  mockFindFirstBattle,
  mockInsertValues,
  mockUpdateWhere,
  mockSelectLimit,
} = vi.hoisted(() => {
  const mockEmit = vi.fn();
  const mockTo = vi.fn(() => ({ emit: mockEmit }));
  const mockInsertValues = vi.fn().mockResolvedValue(undefined);
  const mockUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockSelectLimit = vi.fn().mockResolvedValue([]);
  const mockFindFirstKingdom = vi.fn().mockResolvedValue(null);
  const mockFindFirstBattle = vi.fn().mockResolvedValue(null);
  return {
    mockEmit,
    mockTo,
    mockIo: { to: mockTo } as any,
    mockFindFirstKingdom,
    mockFindFirstBattle,
    mockInsertValues,
    mockUpdateWhere,
    mockSelectLimit,
  };
});

vi.mock("@workspace/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: mockSelectLimit,
  };
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: mockUpdateWhere,
  };
  const insertChain = { values: mockInsertValues };

  return {
    db: {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
      insert: vi.fn(() => insertChain),
      query: {
        kingdomsTable: { findFirst: mockFindFirstKingdom },
        bossBattlesTable: { findFirst: mockFindFirstBattle },
        viewerAchievementsTable: { findFirst: vi.fn().mockResolvedValue(null) },
        achievementsTable: { findFirst: vi.fn().mockResolvedValue(null) },
        luckyDropsTable: { findFirst: vi.fn().mockResolvedValue(null) },
        streamersTable: { findFirst: vi.fn().mockResolvedValue(null) },
        kingdomBuildingsTable: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    },
    viewerXpEventsTable: {},
    viewerAchievementsTable: {},
    achievementsTable: {},
    kingdomsTable: {},
    kingdomBuildingsTable: {},
    bossBattlesTable: {},
    bossAttacksTable: {},
    luckyDropsTable: {},
    luckyDropWinnersTable: {},
    eq: vi.fn(() => ({})),
    and: vi.fn((...args: any[]) => args),
    gte: vi.fn(() => ({})),
    desc: vi.fn(() => ({})),
    count: vi.fn(() => ({})),
    sql: Object.assign(
      (strings: TemplateStringsArray, ..._values: any[]) => ({ strings }),
      { raw: (s: string) => s }
    ),
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn((...args: any[]) => args),
  gte: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
  sql: Object.assign(
    (strings: TemplateStringsArray, ..._values: any[]) => ({ strings }),
    { raw: (s: string) => s }
  ),
}));

vi.mock("../aiAnnouncer", () => ({
  emitAiLevelUpAnnouncement: vi.fn().mockResolvedValue(undefined),
  emitAiBossDefeatedAnnouncement: vi.fn().mockResolvedValue(undefined),
  emitAiLuckyDropAnnouncement: vi.fn().mockResolvedValue(undefined),
  emitAiAchievementAnnouncement: vi.fn().mockResolvedValue(undefined),
}));

// Must come AFTER vi.mock calls
import { processGamification } from "../gamificationEngine";
import type { TikTokEvent } from "../tiktokSimulator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGiftEvent(overrides: Partial<TikTokEvent> = {}): TikTokEvent {
  return {
    type: "gift",
    sessionId: 42,
    username: "TestViewer",
    data: { coins: 10, userId: "uid_test123", nickname: "TestViewer" },
    timestamp: Date.now(),
    ...overrides,
  } as TikTokEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("processGamification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstBattle.mockResolvedValue(null);
    mockFindFirstKingdom.mockResolvedValue(null);
    mockUpdateWhere.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([]);
    mockInsertValues.mockResolvedValue(undefined);
  });

  it("emits xp:awarded for a gift event with coins", async () => {
    await processGamification(mockIo, makeGiftEvent({ data: { coins: 5, userId: "uid_abc", nickname: "TestViewer" } }), 1);

    const xpCalls = mockEmit.mock.calls.filter(([evt]: [string]) => evt === "xp:awarded");
    expect(xpCalls.length).toBeGreaterThanOrEqual(1);
    const [, payload] = xpCalls[0];
    expect(payload).toMatchObject({
      viewerName: "TestViewer",
      eventType: "gift",
      xp: expect.any(Number),
      coins: 5,
    });
  });

  it("emits leaderboard:update after xp:awarded", async () => {
    await processGamification(mockIo, makeGiftEvent(), 1);

    const lbCalls = mockEmit.mock.calls.filter(([evt]: [string]) => evt === "leaderboard:update");
    expect(lbCalls.length).toBeGreaterThanOrEqual(1);
    const [, payload] = lbCalls[0];
    expect(payload).toMatchObject({
      streamerId: 1,
      sessionId: 42,
      viewerName: "TestViewer",
    });
  });

  it("emits events to the correct session room", async () => {
    await processGamification(mockIo, makeGiftEvent(), 7);

    expect(mockTo).toHaveBeenCalledWith("session:42");
  });

  it("emits kingdom:update when kingdom exists for a gift", async () => {
    mockFindFirstKingdom
      .mockResolvedValueOnce({ id: 1, streamerId: 1, gold: 0, wood: 0, stone: 0 })
      .mockResolvedValueOnce({ id: 1, streamerId: 1, gold: 10, wood: 0, stone: 0 });

    await processGamification(
      mockIo,
      makeGiftEvent({ data: { coins: 10, userId: "uid_abc", nickname: "TestViewer" } }),
      1
    );

    const kingdomCalls = mockEmit.mock.calls.filter(([evt]: [string]) => evt === "kingdom:update");
    expect(kingdomCalls.length).toBeGreaterThanOrEqual(1);
    const [, payload] = kingdomCalls[0];
    expect(payload).toMatchObject({ streamerId: 1, goldDelta: 10 });
  });

  it("does not emit xp:awarded for viewer-count events", async () => {
    const event: TikTokEvent = {
      type: "viewerCount" as any,
      sessionId: 42,
      username: "anon",
      data: { count: 100 },
      timestamp: Date.now(),
    };
    await processGamification(mockIo, event, 1);

    const xpCalls = mockEmit.mock.calls.filter(([evt]: [string]) => evt === "xp:awarded");
    expect(xpCalls.length).toBe(0);
  });
});
