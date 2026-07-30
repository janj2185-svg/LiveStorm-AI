/**
 * SYLORA motion system
 * ---------------------------------------------------------------------------
 * Motion in SYLORA has one job: explain what just happened, before the user
 * has to think about it. Decoration is a side effect, never the goal.
 *
 * FIVE LAWS
 *
 * 1. Origin. Things enter from where they came from. A menu opened by a button
 *    grows out of that button. A sheet summoned from the bottom bar rises from
 *    the bottom bar. Motion is a line drawn between cause and effect.
 *
 * 2. Duration follows distance. A 4px checkbox tick and a full-screen page
 *    transition cannot share a duration. Larger travel and larger area get
 *    more time, or the motion reads as a teleport.
 *
 * 3. Exits are faster than entrances. The user has already decided; making
 *    them watch the decision play out is a tax. Exits run at ~0.6x entrance.
 *
 * 4. Nothing important waits on an animation. Content is interactive the frame
 *    it is committed. Animation is never on the critical path of intent.
 *
 * 5. Reduced motion is a real mode, not a downgrade. When requested, movement
 *    is replaced by instant state plus a short opacity fade so causality is
 *    still legible without vestibular cost.
 */

/**
 * Duration scale, milliseconds.
 *
 * Anchored at 200ms because that is roughly the threshold where a transition
 * stops registering as "a change" and starts registering as "a movement".
 * Below ~100ms motion is subliminal, above ~500ms it becomes something the
 * user waits for.
 */
export const DURATION = {
  /** State flips that must feel like the click itself: toggles, ticks. */
  instant: 80,
  /** Hover, focus, small colour and elevation changes. */
  fast: 140,
  /** The default. Most enter/exit, most component state. */
  base: 200,
  /** Popovers, dropdowns, medium travel. */
  moderate: 280,
  /** Sheets, drawers, dialogs. */
  slow: 380,
  /** Full page and shared-element transitions. */
  slower: 520,
  /** Ambient, looping, non-blocking atmosphere only. */
  ambient: 900,
} as const;

export type DurationToken = keyof typeof DURATION;

/**
 * Easing curves.
 *
 * Named by physical intent so the right curve is obvious at the call site.
 * The asymmetry between `enter` and `exit` is the single highest-leverage
 * detail in the whole motion system.
 */
export const EASING = {
  /**
   * Entering the screen. Decelerates hard: the element arrives already moving
   * and settles, which reads as "it was always on its way here".
   */
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /**
   * Leaving the screen. Accelerates away — no lingering, no deceleration to
   * watch.
   */
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  /**
   * Moving between two on-screen positions. Symmetric ease-in-out with a
   * slightly weighted end so the element seems to have mass.
   */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /**
   * Emphasised travel for hero and shared-element transitions. A long, fast
   * middle with a soft landing.
   */
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  /**
   * Overshoot. For elements that should feel physical and confident:
   * a sent message, a claimed reward, a gift landing. Never for anything the
   * user must read immediately, because the overshoot delays legibility.
   */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Anticipation: pulls back slightly before moving. Playful, use sparingly. */
  anticipate: 'cubic-bezier(0.68, -0.4, 0.32, 1.4)',
  /** Constant rate. Only for continuous loops such as spinners and marquees. */
  linear: 'linear',
} as const;

export type EasingToken = keyof typeof EASING;

/**
 * Canonical transition recipes.
 *
 * Pairing a duration with an easing is where most motion goes wrong, so the
 * valid pairs are enumerated rather than left to judgement.
 */
export const TRANSITION = {
  hover: `${DURATION.fast}ms ${EASING.standard}`,
  press: `${DURATION.instant}ms ${EASING.standard}`,
  enter: `${DURATION.base}ms ${EASING.enter}`,
  exit: `${DURATION.fast}ms ${EASING.exit}`,
  popover: `${DURATION.moderate}ms ${EASING.enter}`,
  sheet: `${DURATION.slow}ms ${EASING.emphasized}`,
  page: `${DURATION.slower}ms ${EASING.emphasized}`,
  celebrate: `${DURATION.moderate}ms ${EASING.spring}`,
} as const;

export type TransitionToken = keyof typeof TRANSITION;

/**
 * Choreography.
 *
 * Lists animate as a cascade, not in unison, because a unison entrance reads
 * as one object while a cascade reads as many. 40ms is the smallest delay the
 * eye reliably resolves as sequence; beyond ~8 items the cascade is capped so
 * long lists do not become a loading bar.
 */
export const STAGGER = {
  tight: 30,
  base: 40,
  loose: 60,
  /** Never stagger more than this many items; the rest enter with the last. */
  maxItems: 8,
} as const;

/**
 * Travel distances for enter/exit transforms.
 *
 * Small, because large translations at speed cause motion sickness and, at
 * these durations, read as sliding rather than arriving.
 */
export const TRAVEL = {
  micro: 2,
  small: 8,
  medium: 16,
  large: 32,
} as const;

/**
 * Ambient motion.
 *
 * The aurora backdrop, the live pulse, the AI thinking shimmer. All are
 * strictly decorative, run below 1% CPU on integrated graphics, and are the
 * first thing disabled under reduced motion or low battery.
 */
export const AMBIENT = {
  /** Aurora field drift. Deliberately slow enough to be felt, not watched. */
  auroraDrift: 24000,
  /** Live indicator pulse. Matched to a resting heart rate for calm urgency. */
  livePulse: 1800,
  /** AI processing shimmer sweep. */
  thinkingSweep: 1600,
  /** Skeleton loading sweep. */
  skeletonSweep: 1400,
} as const;

/**
 * Reduced motion.
 *
 * Under `prefers-reduced-motion`, transforms are dropped entirely and opacity
 * carries the change. 1ms rather than 0 keeps transition-end events firing so
 * component logic that awaits them does not stall.
 */
export const REDUCED_MOTION = {
  duration: 1,
  fadeDuration: 120,
} as const;

/**
 * Sound feedback.
 *
 * SYLORA ships an optional, off-by-default audio layer. Sound is used only
 * where a state change happens outside the user's gaze — a gift arriving, a
 * stream going live, a message received. Confirmation of something the user is
 * already looking at gets haptics, not audio.
 *
 * Frequencies sit in the 400-1000Hz band where small speakers are honest, and
 * every cue is under 200ms so it never overlaps the next one.
 */
export const SOUND = {
  tap: { duration: 40, frequency: 660, gain: 0.03, rationale: 'Primary press. Barely audible.' },
  toggle: { duration: 60, frequency: 520, gain: 0.04, rationale: 'Switch and checkbox commit.' },
  success: { duration: 180, frequency: 880, gain: 0.06, rationale: 'Action completed.' },
  error: { duration: 160, frequency: 220, gain: 0.07, rationale: 'Action rejected.' },
  message: { duration: 120, frequency: 740, gain: 0.05, rationale: 'Incoming message.' },
  gift: { duration: 200, frequency: 960, gain: 0.08, rationale: 'Gift received on stream.' },
  live: { duration: 200, frequency: 480, gain: 0.06, rationale: 'A followed creator went live.' },
} as const;

export type SoundToken = keyof typeof SOUND;

/** Haptic patterns, in milliseconds, for the Vibration API. */
export const HAPTIC = {
  tap: [8],
  select: [12],
  success: [12, 40, 18],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
  gift: [10, 30, 10, 30, 24],
} as const;
