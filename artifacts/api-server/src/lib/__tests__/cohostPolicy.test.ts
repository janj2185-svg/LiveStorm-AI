import { describe, expect, it } from "vitest";
import { autoReplyForOperatingMode, shouldAllowCoHostReply } from "../cohostPolicy";

describe("AI Co-Host policy", () => {
  it("syncs auto replies for supported operating modes", () => {
    expect(autoReplyForOperatingMode("assistant")).toBe(false);
    expect(autoReplyForOperatingMode("semi-auto")).toBe(true);
    expect(autoReplyForOperatingMode("autopilot")).toBe(true);
    expect(autoReplyForOperatingMode("unknown")).toBeUndefined();
  });

  it("always allows streamer speech because it is manual co-host input", () => {
    expect(
      shouldAllowCoHostReply({
        operatingMode: "assistant",
        autoReplyEnabled: false,
        eventType: "streamer_speech",
        priority: 1,
      }),
    ).toBe(true);
  });

  it("keeps assistant mode manual-only for viewer events", () => {
    expect(
      shouldAllowCoHostReply({
        operatingMode: "assistant",
        autoReplyEnabled: true,
        eventType: "gift",
        priority: 1,
      }),
    ).toBe(false);
  });

  it("allows all eligible queued events in autopilot when auto replies are enabled", () => {
    expect(
      shouldAllowCoHostReply({
        operatingMode: "autopilot",
        autoReplyEnabled: true,
        eventType: "comment",
        priority: 6,
      }),
    ).toBe(true);
  });

  it("blocks autonomous replies when the master auto-reply toggle is off", () => {
    expect(
      shouldAllowCoHostReply({
        operatingMode: "autopilot",
        autoReplyEnabled: false,
        eventType: "gift",
        priority: 1,
      }),
    ).toBe(false);
  });

  it("semi-auto allows high-signal events but suppresses generic chat", () => {
    expect(
      shouldAllowCoHostReply({
        operatingMode: "semi-auto",
        autoReplyEnabled: true,
        eventType: "gift",
        priority: 1,
      }),
    ).toBe(true);

    expect(
      shouldAllowCoHostReply({
        operatingMode: "semi-auto",
        autoReplyEnabled: true,
        eventType: "comment",
        priority: 4,
      }),
    ).toBe(true);

    expect(
      shouldAllowCoHostReply({
        operatingMode: "semi-auto",
        autoReplyEnabled: true,
        eventType: "comment",
        priority: 6,
      }),
    ).toBe(false);
  });
});
