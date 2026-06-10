import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, mockFindFirst } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@workspace/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => mockSelect()),
  };
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  const insertChain = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  return {
    db: {
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
      insert: vi.fn(() => insertChain),
      query: {
        streamersTable: { findFirst: mockFindFirst },
        aiPersonaConfigsTable: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    },
    automationsTable: {},
    automationLogsTable: {},
    streamersTable: {},
    eq: vi.fn(),
    and: vi.fn(),
  };
});

vi.mock("../aiAnnouncer", () => ({
  emitAiAutomationAnnouncement: vi.fn().mockResolvedValue("Great gift from Alice!"),
}));

vi.mock("../aiService", () => ({
  generateVoice: vi.fn().mockResolvedValue(Buffer.from("fake-audio")),
}));

import { processAutomations } from "../automationEngine";
import { emitAiAutomationAnnouncement } from "../aiAnnouncer";
import { generateVoice } from "../aiService";
import type { TikTokEvent } from "../tiktokSimulator";

function makeAutomation(overrides: Record<string, unknown>) {
  return {
    id: 1,
    userId: 10,
    name: "Test Rule",
    eventType: "gift",
    conditionOperator: "gte",
    conditionValue: "1",
    actionType: "ai_response",
    actionPayload: "",
    isEnabled: true,
    triggerCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeIo() {
  const emissions: { event: string; payload: unknown }[] = [];
  const mockRoom = {
    emit: vi.fn((event: string, payload: unknown) => {
      emissions.push({ event, payload });
    }),
  };
  const io = { to: vi.fn(() => mockRoom) } as unknown as import("socket.io").Server;
  return { io, emissions };
}

describe("Automation Engine – action execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({ id: 5 });
  });

  it("gift trigger → fires ai_response and emits ai:announcement", async () => {
    mockSelect.mockResolvedValue([
      makeAutomation({ eventType: "gift", actionType: "ai_response" }),
    ]);

    const { io, emissions } = makeIo();
    const event: TikTokEvent = {
      type: "gift",
      sessionId: 99,
      timestamp: Date.now(),
      username: "Alice",
      data: { giftName: "Rose", coins: 100 },
    };

    await processAutomations(io, "room:99", 10, event, 5);

    expect(emitAiAutomationAnnouncement).toHaveBeenCalledOnce();
    expect(emitAiAutomationAnnouncement).toHaveBeenCalledWith(
      io,
      "room:99",
      5,
      expect.objectContaining({ viewerName: "Alice" }),
      "Test Rule",
    );
    const fired = emissions.find((e) => e.event === "automation:fired");
    expect(fired).toBeDefined();
    expect((fired!.payload as Record<string, unknown>).actionType).toBe("ai_response");
  });

  it("comment keyword trigger → fires tts and emits tts:play", async () => {
    mockSelect.mockResolvedValue([
      makeAutomation({
        eventType: "comment",
        conditionOperator: "contains",
        conditionValue: "hello",
        actionType: "tts",
        actionPayload: "Welcome to the stream!",
      }),
    ]);

    const { io, emissions } = makeIo();
    const event: TikTokEvent = {
      type: "comment",
      sessionId: 99,
      timestamp: Date.now(),
      username: "Bob",
      data: { text: "hello world" },
    };

    await processAutomations(io, "room:99", 10, event, 5);

    expect(generateVoice).toHaveBeenCalledWith("Welcome to the stream!");
    const ttsEvent = emissions.find((e) => e.event === "tts:play");
    expect(ttsEvent).toBeDefined();
    const payload = ttsEvent!.payload as Record<string, unknown>;
    expect(payload.audioBase64).toBeTruthy();
    expect(payload.mimeType).toBe("audio/mpeg");
    expect(payload.text).toBe("Welcome to the stream!");
  });

  it("follow trigger → fires custom_message and emits system:message", async () => {
    mockSelect.mockResolvedValue([
      makeAutomation({
        eventType: "follow",
        conditionOperator: "gte",
        conditionValue: "1",
        actionType: "custom_message",
        actionPayload: "Thanks for following!",
      }),
    ]);

    const { io, emissions } = makeIo();
    const event: TikTokEvent = {
      type: "follow",
      sessionId: 99,
      timestamp: Date.now(),
      username: "Carol",
      data: {},
    };

    await processAutomations(io, "room:99", 10, event, 5);

    const sysMsg = emissions.find((e) => e.event === "system:message");
    expect(sysMsg).toBeDefined();
    const payload = sysMsg!.payload as Record<string, unknown>;
    expect(payload.text).toBe("Thanks for following!");
    expect(payload.automationName).toBe("Test Rule");
  });
});
