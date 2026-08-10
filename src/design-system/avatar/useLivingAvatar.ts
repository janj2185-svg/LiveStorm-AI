import { useEffect, useRef, useState } from 'react';

import {
  nextIdleReaction,
  reactionDurationMs,
  samplePose,
  type AvatarPose,
  type EngineOptions,
} from './livingAvatarEngine';
import type { AvatarReaction } from './persona';

export interface UseLivingAvatarOptions extends EngineOptions {
  /** Initial / controlled reaction from the co-host or UI. */
  reaction?: AvatarReaction;
  /** When true, sparse ambient glance/smile while idle. */
  ambientLife?: boolean;
  /** Called when a one-shot gesture finishes and returns to idle. */
  onReactionSettled?: (reaction: AvatarReaction) => void;
}

export interface LivingAvatarController {
  pose: AvatarPose;
  reaction: AvatarReaction;
  setReaction: (reaction: AvatarReaction) => void;
}

/**
 * Drives a living pose on every animation frame and owns the reaction state
 * machine (one-shot gestures settle back to idle automatically).
 */
export function useLivingAvatar(options: UseLivingAvatarOptions = {}): LivingAvatarController {
  const {
    reaction: controlledReaction,
    ambientLife = true,
    reducedMotion = false,
    audioLevel,
    onReactionSettled,
  } = options;

  const [reaction, setReactionState] = useState<AvatarReaction>(controlledReaction ?? 'idle');
  const [pose, setPose] = useState<AvatarPose>(() =>
    samplePose(0, controlledReaction ?? 'idle', 0, { reducedMotion, audioLevel }),
  );

  const reactionRef = useRef(reaction);
  const startedAtRef = useRef(0);
  const settledRef = useRef<AvatarReaction | null>(null);
  const onSettledRef = useRef(onReactionSettled);
  onSettledRef.current = onReactionSettled;

  useEffect(() => {
    if (controlledReaction != null && controlledReaction !== reactionRef.current) {
      reactionRef.current = controlledReaction;
      startedAtRef.current = performance.now();
      settledRef.current = null;
      setReactionState(controlledReaction);
    }
  }, [controlledReaction]);

  const setReaction = useRef((next: AvatarReaction) => {
    reactionRef.current = next;
    startedAtRef.current = performance.now();
    settledRef.current = null;
    setReactionState(next);
  }).current;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let preferReduced = reducedMotion || media.matches;

    const onMotion = () => {
      preferReduced = reducedMotion || media.matches;
    };
    media.addEventListener('change', onMotion);

    let frame = 0;
    const tick = (now: number) => {
      let current = reactionRef.current;
      const started = startedAtRef.current || now;
      const duration = reactionDurationMs(current);

      if (duration != null && now - started >= duration) {
        if (settledRef.current !== current) {
          settledRef.current = current;
          onSettledRef.current?.(current);
        }
        current = ambientLife ? nextIdleReaction(now) : 'idle';
        if (current !== reactionRef.current) {
          reactionRef.current = current;
          startedAtRef.current = now;
          setReactionState(current);
        }
      } else if (ambientLife && current === 'idle') {
        const ambient = nextIdleReaction(now);
        if (ambient !== 'idle' && Math.floor(now / 9000) !== Math.floor(started / 9000)) {
          // Enter ambient gesture on bucket boundaries only.
          reactionRef.current = ambient;
          startedAtRef.current = now;
          settledRef.current = null;
          setReactionState(ambient);
          current = ambient;
        }
      }

      setPose(
        samplePose(now, current, startedAtRef.current || now, {
          reducedMotion: preferReduced,
          audioLevel,
        }),
      );
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', onMotion);
    };
  }, [ambientLife, audioLevel, reducedMotion]);

  return { pose, reaction, setReaction };
}
