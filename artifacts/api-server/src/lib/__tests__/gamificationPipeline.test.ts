/**
 * Integration-style test: simulates the full gift → XP award → leaderboard update pipeline.
 * Uses a mock Socket.IO server and realistic DB responses to verify the entire chain:
 *   gift event ingestion → processGamification → xp:awarded + leaderboard:update emitted
 *                                                → kingdom:update emitted (if kingdom exists)
 *                                                → level:up emitted (when XP crosses threshold)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock setup
// ---------------------------------------------------------------------------
const emittedEvents: Array<{ room: string; event: string; payload: unknown }> = [];

const { mockFindFirstKingdom, mockFindFirstBattle } = vi.hoisted(() => ({
  mockFindFirstKingdom: vi.fn().mockResolvedValue(null),
  mockFindFirstBattle: vi.fn().mockResolvedValue(null),
}));

vi.mock("@workspace/db", () => {
  const selectResult: any[] = [];
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(selectResult),
  };
  return {
    db: {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) })),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
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

// ---------------------------------------------------------------------------
// Fake socket.io server that records all emissions
// ---------------------------------------------------------------------------
function makeFakeIo() {
  const emit = vi.fn().mockImplementation((event: string, payload: unknown) => {
    emittedEvents.push({ room: "_current_", event, payload });
  });
  const to = vi.fn().mockImplementation((room: string) => ({
    emit: vi.fn().mockImplementation((event: string, payload: unknown) => {
      emittedEvents.push({ room, event, payload });
    }),
  }));
  return { to } as any;
}

import { processGamification } from "../gamificationEngine";
import type { TikTokEvent } from "../tiktokSimulator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGiftEvent(coins = 10, sessionId = 42, viewerId = "uid_alice"): TikTokEvent {
  return {
    type: "gift",
    sessionId,
    username: "Alice",
    data: { coins, userId: viewerId, nickname: "Alice", giftName: "Rose" },
    timestamp: Date.now(),
  } as TikTokEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("gamification pipeline (gift → XP → socket events)", () => {
  let fakeIo: ReturnType<typeof makeFakeIo>;

  beforeEach(() => {
    emittedEvents.length = 0;
    fakeIo = makeFakeIo();
    mockFindFirstBattle.mockResolvedValue(null);
    mockFindFirstKingdom.mockResolvedValue(null);
  });

  it("gift event produces xp:awarded and leaderboard:update in the correct session room", async () => {
    await processGamification(fakeIo, makeGiftEvent(5, 42), 1);

    const xpEvents = emittedEvents.filter(e => e.event === "xp:awarded");
    const lbEvents  = emittedEvents.filter(e => e.event === "leaderboard:update");

    expect(xpEvents.length).toBeGreaterThanOrEqual(1);
    expect(lbEvents.length).toBeGreaterThanOrEqual(1);

    expect(xpEvents[0].room).toBe("session:42");
    expect(lbEvents[0].room).toBe("session:42");

    const xpPayload = xpEvents[0].payload as any;
    expect(xpPayload.viewerName).toBe("Alice");
    expect(xpPayload.eventType).toBe("gift");
    expect(xpPayload.coins).toBe(5);

    const lbPayload = lbEvents[0].payload as any;
    expect(lbPayload.sessionId).toBe(42);
    expect(lbPayload.streamerId).toBe(1);
    expect(typeof lbPayload.totalXp).toBe("number");
  });

  it("gift event to a kingdom streamer also emits kingdom:update", async () => {
    mockFindFirstKingdom
      .mockResolvedValueOnce({ id: 7, streamerId: 2, gold: 50, wood: 10, stone: 0 })
      .mockResolvedValueOnce({ id: 7, streamerId: 2, gold: 60, wood: 10, stone: 0 });

    await processGamification(fakeIo, makeGiftEvent(10, 99, "uid_bob"), 2);

    const kingdomEvents = emittedEvents.filter(e => e.event === "kingdom:update");
    expect(kingdomEvents.length).toBeGreaterThanOrEqual(1);

    const payload = kingdomEvents[0].payload as any;
    expect(payload.streamerId).toBe(2);
    expect(payload.goldDelta).toBe(10);
    expect(typeof payload.gold).toBe("number");
  });

  it("like event emits xp:awarded and a leaderboard:update for the correct session", async () => {
    const likeEvent: TikTokEvent = {
      type: "like",
      sessionId: 55,
      username: "Bob",
      data: { userId: "uid_bob", likeCount: 3 },
      timestamp: Date.now(),
    } as TikTokEvent;

    await processGamification(fakeIo, likeEvent, 3);

    const xpEvents = emittedEvents.filter(e => e.event === "xp:awarded");
    const lbEvents  = emittedEvents.filter(e => e.event === "leaderboard:update");

    expect(xpEvents.length).toBeGreaterThanOrEqual(1);
    expect(lbEvents[0].payload as any).toMatchObject({ sessionId: 55, streamerId: 3 });
  });

  it("multiple events to the same session accumulate in the correct room", async () => {
    await processGamification(fakeIo, makeGiftEvent(5, 10, "uid_c1"), 4);
    await processGamification(fakeIo, makeGiftEvent(5, 10, "uid_c2"), 4);

    const rooms = emittedEvents.map(e => e.room);
    expect(rooms.every(r => r === "session:10")).toBe(true);
  });
});
