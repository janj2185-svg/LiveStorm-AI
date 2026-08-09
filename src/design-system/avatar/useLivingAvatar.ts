import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { AvatarReaction, LivingPersona } from './persona';
import { LIORA_PERSONA } from './persona';
import { PhysiologyEngine, type PhysiologySample } from './physiology';

export interface UseLivingAvatarOptions {
  persona?: LivingPersona;
  reaction?: AvatarReaction;
  /** 0…1 microphone / TTS amplitude for true lip-sync. */
  audioLevel?: number;
  /** Pause the rAF loop (e.g. off-screen). */
  paused?: boolean;
}

export interface LivingAvatarController {
  sample: PhysiologySample;
  setReaction: (reaction: AvatarReaction) => void;
  persona: LivingPersona;
}

const REST: PhysiologySample = {
  blink: 0,
  gazeX: 0,
  gazeY: 0,
  breath: 0.5,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  mouthOpen: 0,
  smile: 0.18,
  weights: {
    neutral: 0.78,
    smile: 0.22,
    speak: 0,
    listen: 0,
    think: 0,
    blink: 0,
  },
  reaction: 'idle',
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Drives the physiology engine on animation frames and exposes the latest
 * sample for rendering. Reaction changes from props or `setReaction` are
 * applied on the next frame without tearing down the engine.
 */
export function useLivingAvatar(options: UseLivingAvatarOptions = {}): LivingAvatarController {
  const persona = options.persona ?? LIORA_PERSONA;
  const engineRef = useRef<PhysiologyEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PhysiologyEngine(persona);

  const [sample, setSample] = useState<PhysiologySample>(REST);
  const audioLevelRef = useRef(options.audioLevel ?? 0);
  const pausedRef = useRef(Boolean(options.paused));
  const reducedRef = useRef(prefersReducedMotion());

  const onFrame = useEffectEvent((next: PhysiologySample) => {
    setSample(next);
  });

  useEffect(() => {
    audioLevelRef.current = options.audioLevel ?? 0;
  }, [options.audioLevel]);

  useEffect(() => {
    pausedRef.current = Boolean(options.paused);
  }, [options.paused]);

  useEffect(() => {
    if (!options.reaction) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    engineRef.current?.setReaction(options.reaction, now);
  }, [options.reaction]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      reducedRef.current = Boolean(media?.matches);
    };
    media?.addEventListener?.('change', onChange);

    let frame = 0;
    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      if (pausedRef.current) return;
      const next = engineRef.current!.sample({
        reducedMotion: reducedRef.current,
        audioLevel: audioLevelRef.current,
      });
      onFrame(next);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      media?.removeEventListener?.('change', onChange);
    };
  }, [onFrame]);

  const setReaction = (reaction: AvatarReaction) => {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    engineRef.current?.setReaction(reaction, now);
  };

  return { sample, setReaction, persona };
}
