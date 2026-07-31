import type { Timeline, TimelineKeyframe, Vector3Value } from "./schema";

export type TimelineValue = TimelineKeyframe["value"];
export type TimelineApply = (target: string, property: string, value: TimelineValue) => void;

function isVector(value: TimelineValue): value is Vector3Value {
  return typeof value === "object" && value !== null && "x" in value && "y" in value && "z" in value;
}

export function applyEasing(progress: number, easing: TimelineKeyframe["easing"]): number {
  const value = Math.min(1, Math.max(0, progress));
  switch (easing) {
    case "ease_in": return value * value;
    case "ease_out": return 1 - (1 - value) * (1 - value);
    case "ease_in_out": return value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2;
    case "step": return value < 1 ? 0 : 1;
    default: return value;
  }
}

export function interpolateKeyframes(frames: readonly TimelineKeyframe[], timeMs: number): TimelineValue {
  if (frames.length === 0) throw new Error("Cannot interpolate an empty keyframe track");
  if (timeMs <= frames[0]!.time_ms) return frames[0]!.value;
  const final = frames[frames.length - 1]!;
  if (timeMs >= final.time_ms) return final.value;
  const rightIndex = frames.findIndex((frame) => frame.time_ms >= timeMs);
  const left = frames[rightIndex - 1]!;
  const right = frames[rightIndex]!;
  const span = right.time_ms - left.time_ms;
  const progress = applyEasing(span === 0 ? 1 : (timeMs - left.time_ms) / span, right.easing);
  if (typeof left.value === "number" && typeof right.value === "number") {
    return left.value + (right.value - left.value) * progress;
  }
  if (isVector(left.value) && isVector(right.value)) {
    return {
      x: left.value.x + (right.value.x - left.value.x) * progress,
      y: left.value.y + (right.value.y - left.value.y) * progress,
      z: left.value.z + (right.value.z - left.value.z) * progress
    };
  }
  return progress < 1 ? left.value : right.value;
}

export class TimelineEngine {
  readonly #timelines: readonly Timeline[];
  readonly #apply: TimelineApply;
  #startedAt = 0;
  #pausedAt = 0;
  #pauseStartedAt = 0;
  #running = false;

  constructor(timelines: readonly Timeline[], apply: TimelineApply) {
    this.#timelines = timelines;
    this.#apply = apply;
  }

  start(now = performance.now()): void {
    this.#startedAt = now;
    this.#pausedAt = 0;
    this.#pauseStartedAt = 0;
    this.#running = true;
  }

  update(now = performance.now()): void {
    if (!this.#running) return;
    const elapsed = Math.max(0, now - this.#startedAt - this.#pausedAt);
    for (const timeline of this.#timelines) {
      const time = timeline.loop ? elapsed % timeline.duration_ms : Math.min(elapsed, timeline.duration_ms);
      for (const track of timeline.tracks) {
        this.#apply(track.target, track.property, interpolateKeyframes(track.keyframes, time));
      }
    }
  }

  seek(timeMs: number): void {
    const safeTime = Math.max(0, timeMs);
    for (const timeline of this.#timelines) {
      const time = timeline.loop ? safeTime % timeline.duration_ms : Math.min(safeTime, timeline.duration_ms);
      for (const track of timeline.tracks) {
        this.#apply(track.target, track.property, interpolateKeyframes(track.keyframes, time));
      }
    }
  }

  pause(now = performance.now()): void {
    if (!this.#running || this.#pauseStartedAt) return;
    this.#pauseStartedAt = now;
  }

  resume(now = performance.now()): void {
    if (!this.#pauseStartedAt) return;
    this.#pausedAt += now - this.#pauseStartedAt;
    this.#pauseStartedAt = 0;
  }

  stop(): void {
    this.#running = false;
  }
}
