/**
 * Human physiology clocks — blink cadence, breath, micro-saccades.
 * Values are tuned to adult conversational face-to-face ranges, not cartoon timing.
 */

export interface BlinkClock {
  nextBlinkAt: number;
  phase: 'open' | 'closing' | 'closed' | 'opening';
  phaseStartedAt: number;
  doublePending: boolean;
  amount: number;
}

export interface GazeClock {
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  nextSaccadeAt: number;
}

export interface BreathClock {
  phase: number;
}

function rand(min: number, max: number, random: () => number): number {
  return min + (max - min) * random();
}

/** Average human blink interval is ~2–6s; we bias slightly longer for on-camera calm. */
export function scheduleNextBlink(now: number, random: () => number, soon = false): number {
  if (soon) return now + rand(120, 280, random);
  return now + rand(2400, 5600, random);
}

export function createBlinkClock(now: number, random: () => number = Math.random): BlinkClock {
  return {
    nextBlinkAt: scheduleNextBlink(now, random),
    phase: 'open',
    phaseStartedAt: now,
    doublePending: false,
    amount: 0,
  };
}

export function createGazeClock(now: number, random: () => number = Math.random): GazeClock {
  return {
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    nextSaccadeAt: now + rand(900, 2200, random),
  };
}

export function createBreathClock(now = 0): BreathClock {
  return { phase: (now % 4000) / 4000 };
}

/**
 * Advance blink state. A full blink is ~140ms close + 40ms closed + 160ms open.
 * Occasional double-blinks (~18%) keep the face from feeling metronomic.
 */
export function tickBlink(
  clock: BlinkClock,
  now: number,
  random: () => number = Math.random,
): number {
  if (clock.phase === 'open') {
    clock.amount = 0;
    if (now >= clock.nextBlinkAt) {
      clock.phase = 'closing';
      clock.phaseStartedAt = now;
      clock.doublePending = random() < 0.18;
    }
    return clock.amount;
  }

  const elapsed = now - clock.phaseStartedAt;

  if (clock.phase === 'closing') {
    const t = Math.min(1, elapsed / 140);
    clock.amount = easeInCubic(t);
    if (t >= 1) {
      clock.phase = 'closed';
      clock.phaseStartedAt = now;
    }
    return clock.amount;
  }

  if (clock.phase === 'closed') {
    clock.amount = 1;
    if (elapsed >= 40) {
      clock.phase = 'opening';
      clock.phaseStartedAt = now;
    }
    return clock.amount;
  }

  // opening
  const t = Math.min(1, elapsed / 160);
  clock.amount = 1 - easeOutCubic(t);
  if (t >= 1) {
    clock.phase = 'open';
    clock.phaseStartedAt = now;
    clock.amount = 0;
    if (clock.doublePending) {
      clock.doublePending = false;
      clock.nextBlinkAt = scheduleNextBlink(now, random, true);
    } else {
      clock.nextBlinkAt = scheduleNextBlink(now, random);
    }
  }
  return clock.amount;
}

/** Quiet tidal breath ~15 breaths/min → 4s cycle; amplitude is applied by the pose composer. */
export function tickBreath(clock: BreathClock, dtMs: number): number {
  clock.phase = (clock.phase + dtMs / 4000) % 1;
  return Math.sin(clock.phase * Math.PI * 2);
}

/**
 * Micro-saccades: hold a fixation, then jump a few degrees of visual angle.
 * Gaze is eased rather than snapped so the composite head/eye motion stays soft.
 */
export function tickGaze(
  clock: GazeClock,
  now: number,
  dtMs: number,
  biasX: number,
  biasY: number,
  random: () => number = Math.random,
): { x: number; y: number } {
  if (now >= clock.nextSaccadeAt) {
    clock.targetX = biasX + rand(-0.16, 0.16, random);
    clock.targetY = biasY + rand(-0.1, 0.1, random);
    clock.nextSaccadeAt = now + rand(800, 2600, random);
  }

  const alpha = 1 - Math.exp(-dtMs / 120);
  clock.currentX += (clock.targetX - clock.currentX) * alpha;
  clock.currentY += (clock.targetY - clock.currentY) * alpha;
  return { x: clock.currentX, y: clock.currentY };
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
