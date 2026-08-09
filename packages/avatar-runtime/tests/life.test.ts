import { describe, expect, it } from "vitest";

import { AvatarLifeEngine } from "../src/engine.js";
import { normalizeReaction } from "../src/gestures.js";
import { LIORA_PERSONA } from "../src/persona.js";
import { buildVisemeTrack } from "../src/visemes.js";

describe("Liora persona", () => {
  it("is a feminine she/her co-host", () => {
    expect(LIORA_PERSONA.genderPresentation).toBe("feminine");
    expect(LIORA_PERSONA.pronouns).toBe("she/her");
    expect(LIORA_PERSONA.displayName).toBe("Liora");
  });
});

describe("AvatarLifeEngine", () => {
  it("keeps continuous breath and blink life while idle", () => {
    const engine = new AvatarLifeEngine({ seed: 7 });
    const samples = [];
    // Cover > max blink interval so at least one blink is observed.
    for (let i = 0; i < 60 * 7; i += 1) {
      samples.push(engine.tick(1 / 60));
    }
    const breaths = new Set(samples.map((s) => s.breath.toFixed(2)));
    expect(breaths.size).toBeGreaterThan(5);
    expect(samples.some((s) => s.blinkL < 0.5)).toBe(true);
    expect(samples.at(-1)?.reaction).toBe("idle");
  });

  it("plays a human nod gesture then returns to idle", () => {
    const engine = new AvatarLifeEngine({ seed: 3 });
    engine.react("nod");
    const mid = engine.tick(0.2);
    expect(mid.gestureName).toBe("nod");
    expect(Math.abs(mid.head.pitch)).toBeGreaterThan(0.5);
    for (let i = 0; i < 90; i += 1) engine.tick(1 / 60);
    expect(engine.pose.gestureName).toBeNull();
  });

  it("drives jaw motion while speaking Ukrainian or English", () => {
    const engine = new AvatarLifeEngine({ seed: 11 });
    const duration = engine.speak({ text: "Привіт, я Ліора — ваш AI-асистент." });
    expect(duration).toBeGreaterThan(0.5);
    let maxJaw = 0;
    for (let t = 0; t < duration; t += 1 / 30) {
      const pose = engine.tick(1 / 30);
      maxJaw = Math.max(maxJaw, pose.jawOpen);
    }
    expect(maxJaw).toBeGreaterThan(0.2);
    expect(engine.pose.viseme).toBe("sil");
  });

  it("maps gift_react to delighted expression weights", () => {
    const engine = new AvatarLifeEngine({ seed: 5 });
    engine.react("gift_react");
    const pose = engine.tick(0.4);
    expect(pose.emotion).toBe("delighted");
    expect(pose.expressions.gift).toBeGreaterThan(0.3);
  });
});

describe("normalizeReaction", () => {
  it("accepts co-host vocabulary", () => {
    expect(normalizeReaction("gift_react")).toBe("gift_react");
    expect(normalizeReaction("WAVE")).toBe("wave");
    expect(normalizeReaction("unknown")).toBe("idle");
  });
});

describe("visemes", () => {
  it("builds a non-empty track", () => {
    const track = buildVisemeTrack("hello world");
    expect(track.duration).toBeGreaterThan(0.4);
    const mid = track.sample(track.duration / 2);
    expect(mid.weight).toBeGreaterThan(0);
  });
});
