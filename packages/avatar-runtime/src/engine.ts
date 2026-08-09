import {
  blendExpressions,
  blendHead,
  gestureDuration,
  normalizeReaction,
  sampleGesture,
} from "./gestures.js";
import { clamp, createRng, lerp, pickRange } from "./math.js";
import { LIORA_PERSONA } from "./persona.js";
import type {
  AvatarEmotion,
  AvatarPose,
  AvatarReaction,
  ExpressionWeights,
  GazeTarget,
  HeadPose,
  LifeEngineOptions,
  PersonaProfile,
  SpeakOptions,
  VisemeId,
} from "./types.js";
import { buildVisemeTrack } from "./visemes.js";

interface BlinkState {
  nextAt: number;
  phase: "open" | "closing" | "closed" | "opening";
  phaseStarted: number;
  /** occasional asymmetric blink */
  leftOnly: boolean;
}

interface GazeState {
  current: GazeTarget;
  target: GazeTarget;
  retargetAt: number;
}

interface GestureState {
  reaction: AvatarReaction;
  startedAt: number;
  duration: number;
  hold: boolean;
}

interface SpeechState {
  startedAt: number;
  duration: number;
  sample: (t: number) => { viseme: VisemeId; weight: number; jawOpen: number };
  emotion: AvatarEmotion;
}

const REST_EXPR: ExpressionWeights = {
  neutral: 0.72,
  smile: 0.18,
  listen: 0.05,
  talk: 0.03,
  gift: 0.02,
};

/**
 * Continuous human-life simulation for a photoreal co-host avatar.
 *
 * Call `tick(dt)` every animation frame. Drive reactions with `react()` /
 * `speak()` — matching the backend AvatarController vocabulary.
 */
export class AvatarLifeEngine {
  readonly persona: PersonaProfile;
  private readonly rng: () => number;
  private time = 0;
  private cameraEngaged: boolean;
  private blink: BlinkState;
  private gaze: GazeState;
  private gesture: GestureState | null = null;
  private speech: SpeechState | null = null;
  private baseEmotion: AvatarEmotion;
  private lastPose: AvatarPose;

  constructor(options: LifeEngineOptions = {}) {
    this.persona = options.persona ?? LIORA_PERSONA;
    this.rng = createRng(options.seed ?? 42);
    this.cameraEngaged = options.cameraEngaged ?? true;
    this.baseEmotion = this.persona.defaultEmotion;
    this.blink = {
      nextAt: pickRange(this.rng, this.persona.blinkIntervalSec),
      phase: "open",
      phaseStarted: 0,
      leftOnly: false,
    };
    this.gaze = {
      current: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      retargetAt: pickRange(this.rng, this.persona.gazeHoldSec),
    };
    this.lastPose = this.#composePose({
      headMicro: { yaw: 0, pitch: 0, roll: 0 },
      breath: 0,
      blinkL: 1,
      blinkR: 1,
      gaze: { x: 0, y: 0 },
      gestureHead: { yaw: 0, pitch: 0, roll: 0 },
      expressions: REST_EXPR,
      mouthSmile: 0.12,
      jawOpen: 0,
      viseme: "sil",
      visemeWeight: 0,
      gestureProgress: 1,
      gestureName: null,
      reaction: "idle",
      emotion: this.baseEmotion,
      shoulderRoll: 0,
    });
  }

  get pose(): AvatarPose {
    return this.lastPose;
  }

  setCameraEngaged(engaged: boolean): void {
    this.cameraEngaged = engaged;
  }

  /** Queue a co-host reaction (nod, wave, listen, gift_react, …). */
  react(reaction: string, opts?: { hold?: boolean }): void {
    const normalized = normalizeReaction(reaction);
    if (normalized === "idle") {
      this.gesture = null;
      this.baseEmotion = this.persona.defaultEmotion;
      return;
    }
    if (normalized === "talk") {
      // talk without text still sets attentive speaking face
      this.gesture = {
        reaction: "talk",
        startedAt: this.time,
        duration: 0,
        hold: true,
      };
      this.baseEmotion = "speaking";
      return;
    }
    const duration = gestureDuration(normalized);
    this.gesture = {
      reaction: normalized,
      startedAt: this.time,
      duration: opts?.hold ? 0 : duration,
      hold: Boolean(opts?.hold) || duration === 0,
    };
    if (normalized === "listen") this.baseEmotion = "attentive";
    if (normalized === "gift_react") this.baseEmotion = "delighted";
    if (normalized === "smile" || normalized === "wave" || normalized === "nod") {
      this.baseEmotion = "warm";
    }
    if (normalized === "think") this.baseEmotion = "thoughtful";
  }

  /** Drive lip sync + talk face from assistant speech text. */
  speak(options: SpeakOptions): number {
    const track = buildVisemeTrack(options.text, options.charsPerSecond ?? 14);
    this.speech = {
      startedAt: this.time,
      duration: Math.max(0.35, track.duration),
      sample: track.sample,
      emotion: options.emotion ?? "speaking",
    };
    this.react("talk", { hold: true });
    return this.speech.duration;
  }

  interruptSpeech(): void {
    this.speech = null;
    if (this.gesture?.reaction === "talk") this.gesture = null;
    this.baseEmotion = this.persona.defaultEmotion;
  }

  tick(dt: number): AvatarPose {
    const step = clamp(dt, 0, 0.05);
    this.time += step;
    const scale = this.persona.microMotionScale;

    // --- breath (thoracic cycle + tiny arrhythmia) ---
    const breathPhase =
      this.time * this.persona.breathRateHz * Math.PI * 2 +
      Math.sin(this.time * 0.37) * 0.15;
    const breath = (Math.sin(breathPhase) * 0.5 + 0.5) * scale;

    // --- blink schedule ---
    this.#advanceBlink();

    // --- gaze saccades ---
    this.#advanceGaze(step);

    // --- idle head micro-motion (noise-ish Lissajous) ---
    const headMicro: HeadPose = {
      yaw: Math.sin(this.time * 0.35) * 1.8 * scale + Math.sin(this.time * 0.91) * 0.6,
      pitch:
        Math.sin(this.time * 0.27) * 1.2 * scale +
        breath * 0.8 -
        0.4,
      roll: Math.sin(this.time * 0.19) * 0.7 * scale,
    };

    const shoulderRoll = Math.sin(this.time * 0.23) * 1.1 * scale + breath * 0.35;

    // --- active gesture ---
    let gestureHead: HeadPose = { yaw: 0, pitch: 0, roll: 0 };
    let expressions = { ...REST_EXPR };
    let mouthSmile = 0.12 + Math.sin(this.time * 0.15) * 0.02;
    let gestureProgress = 1;
    let gestureName: AvatarReaction | null = null;
    let reaction: AvatarReaction = "idle";
    let emotion = this.baseEmotion;

    if (this.gesture) {
      const elapsed = this.time - this.gesture.startedAt;
      const sample = sampleGesture(
        this.gesture.reaction,
        elapsed,
        this.gesture.hold ? Math.max(elapsed, 0.001) : this.gesture.duration,
      );
      gestureHead = sample.head;
      expressions = sample.expressions;
      mouthSmile = Math.max(mouthSmile, sample.mouthSmile);
      gestureProgress = sample.gestureProgress;
      gestureName = this.gesture.reaction;
      reaction = this.gesture.reaction;
      emotion = sample.emotion;
      if (!this.gesture.hold && sample.done) {
        this.gesture = null;
        this.baseEmotion = this.persona.defaultEmotion;
      }
    }

    // --- speech / visemes ---
    let jawOpen = 0;
    let viseme: VisemeId = "sil";
    let visemeWeight = 0;
    if (this.speech) {
      const local = this.time - this.speech.startedAt;
      if (local >= this.speech.duration) {
        this.speech = null;
        if (this.gesture?.reaction === "talk") this.gesture = null;
        this.baseEmotion = this.persona.defaultEmotion;
      } else {
        const frame = this.speech.sample(local);
        jawOpen = frame.jawOpen;
        viseme = frame.viseme;
        visemeWeight = frame.weight;
        reaction = "talk";
        emotion = this.speech.emotion;
        expressions = blendExpressions(expressions, {
          neutral: 0.1,
          smile: 0.15,
          listen: 0.05,
          talk: 0.7,
          gift: 0,
        }, 0.85);
        // natural head bob while speaking
        gestureHead = blendHead(gestureHead, {
          yaw: Math.sin(local * 2.1) * 1.4,
          pitch: Math.sin(local * 3.2) * 1.1,
          roll: 0,
        }, 0.5);
      }
    }

    // warm resting face when idle
    if (reaction === "idle" && emotion === "warm") {
      expressions = blendExpressions(expressions, {
        neutral: 0.55,
        smile: 0.35,
        listen: 0.05,
        talk: 0.03,
        gift: 0.02,
      }, 0.35);
      mouthSmile = Math.max(mouthSmile, 0.22);
    }

    this.lastPose = this.#composePose({
      headMicro,
      breath,
      blinkL: this.#eyelidOpen("L"),
      blinkR: this.#eyelidOpen("R"),
      gaze: this.gaze.current,
      gestureHead,
      expressions,
      mouthSmile,
      jawOpen,
      viseme,
      visemeWeight,
      gestureProgress,
      gestureName,
      reaction,
      emotion,
      shoulderRoll,
    });
    return this.lastPose;
  }

  #composePose(parts: {
    headMicro: HeadPose;
    breath: number;
    blinkL: number;
    blinkR: number;
    gaze: GazeTarget;
    gestureHead: HeadPose;
    expressions: ExpressionWeights;
    mouthSmile: number;
    jawOpen: number;
    viseme: VisemeId;
    visemeWeight: number;
    gestureProgress: number;
    gestureName: AvatarReaction | null;
    reaction: AvatarReaction;
    emotion: AvatarEmotion;
    shoulderRoll: number;
  }): AvatarPose {
    return {
      time: this.time,
      reaction: parts.reaction,
      emotion: parts.emotion,
      head: {
        yaw: parts.headMicro.yaw + parts.gestureHead.yaw + parts.gaze.x * 2.5,
        pitch: parts.headMicro.pitch + parts.gestureHead.pitch - parts.gaze.y * 1.5,
        roll: parts.headMicro.roll + parts.gestureHead.roll,
      },
      gaze: parts.gaze,
      blinkL: parts.blinkL,
      blinkR: parts.blinkR,
      breath: parts.breath,
      jawOpen: parts.jawOpen,
      mouthSmile: parts.mouthSmile,
      viseme: parts.viseme,
      visemeWeight: parts.visemeWeight,
      shoulderRoll: parts.shoulderRoll,
      expressions: parts.expressions,
      gestureProgress: parts.gestureProgress,
      gestureName: parts.gestureName,
    };
  }

  #advanceBlink(): void {
    const now = this.time;
    if (this.blink.phase === "open") {
      if (now >= this.blink.nextAt) {
        this.blink.phase = "closing";
        this.blink.phaseStarted = now;
        this.blink.leftOnly = this.rng() < 0.08;
      }
      return;
    }
    const elapsed = now - this.blink.phaseStarted;
    if (this.blink.phase === "closing" && elapsed >= 0.06) {
      this.blink.phase = "closed";
      this.blink.phaseStarted = now;
    } else if (this.blink.phase === "closed" && elapsed >= 0.04) {
      this.blink.phase = "opening";
      this.blink.phaseStarted = now;
    } else if (this.blink.phase === "opening" && elapsed >= 0.09) {
      this.blink.phase = "open";
      this.blink.nextAt = now + pickRange(this.rng, this.persona.blinkIntervalSec);
      // double-blink occasionally
      if (this.rng() < 0.12) this.blink.nextAt = now + 0.18;
    }
  }

  #eyelidOpen(side: "L" | "R"): number {
    if (this.blink.phase === "open") return 1;
    if (this.blink.leftOnly && side === "R") return 1;
    const elapsed = this.time - this.blink.phaseStarted;
    if (this.blink.phase === "closing") return 1 - clamp(elapsed / 0.06, 0, 1);
    if (this.blink.phase === "closed") return 0;
    if (this.blink.phase === "opening") return clamp(elapsed / 0.09, 0, 1);
    return 1;
  }

  #advanceGaze(dt: number): void {
    if (this.time >= this.gaze.retargetAt) {
      if (this.cameraEngaged && this.rng() < 0.62) {
        this.gaze.target = {
          x: (this.rng() - 0.5) * 0.18,
          y: (this.rng() - 0.5) * 0.12,
        };
      } else {
        this.gaze.target = {
          x: (this.rng() - 0.5) * 0.85,
          y: (this.rng() - 0.5) * 0.45,
        };
      }
      this.gaze.retargetAt = this.time + pickRange(this.rng, this.persona.gazeHoldSec);
    }
    // critically-damped-ish chase
    const k = 1 - Math.exp(-dt * 6.5);
    this.gaze.current = {
      x: lerp(this.gaze.current.x, this.gaze.target.x, k),
      y: lerp(this.gaze.current.y, this.gaze.target.y, k),
    };
  }
}
