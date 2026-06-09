export type AnimationState =
  | "idle"
  | "talking"
  | "happy"
  | "excited"
  | "gift_reaction"
  | "follow_reaction"
  | "victory";

export const ANIMATION_PRIORITY: Record<AnimationState, number> = {
  idle: 0,
  talking: 3,
  happy: 5,
  excited: 6,
  follow_reaction: 7,
  gift_reaction: 8,
  victory: 9,
};

const DEFAULT_DURATION_MS: Record<AnimationState, number> = {
  idle: 0,
  talking: 0,
  happy: 2500,
  excited: 3200,
  gift_reaction: 3800,
  follow_reaction: 3200,
  victory: 5000,
};

export const ANIMATION_LABELS: Record<AnimationState, string> = {
  idle: "Idle",
  talking: "Talking",
  happy: "Happy",
  excited: "Excited",
  gift_reaction: "Gift!",
  follow_reaction: "Follow!",
  victory: "Victory!",
};

export const ANIMATION_EMOJI: Record<AnimationState, string> = {
  idle: "😐",
  talking: "🗣️",
  happy: "😊",
  excited: "🤩",
  gift_reaction: "🎁",
  follow_reaction: "💜",
  victory: "🏆",
};

interface ActiveAnimation {
  state: AnimationState;
  priority: number;
  expiresAt: number | null;
}

export class AvatarAnimationMachine {
  private active: ActiveAnimation = {
    state: "idle",
    priority: ANIMATION_PRIORITY.idle,
    expiresAt: null,
  };
  private baseState: "idle" | "talking" = "idle";
  private listeners: Array<(state: AnimationState) => void> = [];

  push(state: AnimationState, durationMs?: number): void {
    const now = Date.now();
    const priority = ANIMATION_PRIORITY[state];
    const isExpired =
      this.active.expiresAt !== null && now >= this.active.expiresAt;

    if (priority >= this.active.priority || isExpired) {
      const duration = durationMs ?? DEFAULT_DURATION_MS[state];
      this.active = {
        state,
        priority,
        expiresAt: duration > 0 ? now + duration : null,
      };
      this.emit(state);
    }
  }

  setBase(base: "idle" | "talking"): void {
    this.baseState = base;
    if (this.active.priority <= ANIMATION_PRIORITY.talking) {
      const prev = this.active.state;
      this.active = {
        state: base,
        priority: ANIMATION_PRIORITY[base],
        expiresAt: null,
      };
      if (prev !== base) this.emit(base);
    }
  }

  tick(): AnimationState {
    const now = Date.now();
    if (this.active.expiresAt !== null && now >= this.active.expiresAt) {
      const next = this.baseState;
      if (next !== this.active.state) {
        this.active = {
          state: next,
          priority: ANIMATION_PRIORITY[next],
          expiresAt: null,
        };
        this.emit(next);
      } else {
        this.active.expiresAt = null;
      }
    }
    return this.active.state;
  }

  get currentState(): AnimationState {
    return this.active.state;
  }

  subscribe(fn: (state: AnimationState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(state: AnimationState): void {
    this.listeners.forEach((fn) => fn(state));
  }
}
