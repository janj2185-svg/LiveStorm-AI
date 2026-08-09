import type { CSSProperties } from 'react';

import type { AvatarExpression, AvatarReaction, LivingPersona } from './persona';
import { LIORA_PERSONA } from './persona';
import type { PhysiologySample } from './physiology';
import { useLivingAvatar } from './useLivingAvatar';

export type LivingAvatarSize = 'sm' | 'md' | 'lg' | 'hero';

export interface LivingAvatarProps {
  /** Override the default Liora persona. */
  persona?: LivingPersona;
  /** High-level co-host reaction. */
  reaction?: AvatarReaction;
  /** Optional TTS / mic envelope 0…1. */
  audioLevel?: number;
  size?: LivingAvatarSize;
  /** Show nameplate under the portrait. */
  showIdentity?: boolean;
  /** Pause physiology (off-screen / tab hidden). */
  paused?: boolean;
  className?: string;
  /** Accessible name override. */
  label?: string;
}

const SIZE_CLASS: Record<LivingAvatarSize, string> = {
  sm: 'sy-living-avatar--sm',
  md: 'sy-living-avatar--md',
  lg: 'sy-living-avatar--lg',
  hero: 'sy-living-avatar--hero',
};

const EXPRESSIONS: AvatarExpression[] = ['neutral', 'smile', 'speak', 'listen', 'think', 'blink'];

function poseStyle(sample: PhysiologySample, breathScale: number): CSSProperties {
  const scale = 1 + (sample.breath - 0.5) * breathScale * 2;
  return {
    transform: [
      `rotateY(${sample.headYaw.toFixed(3)}deg)`,
      `rotateX(${(-sample.headPitch).toFixed(3)}deg)`,
      `rotateZ(${sample.headRoll.toFixed(3)}deg)`,
      `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`,
    ].join(' '),
  };
}

function gazeStyle(sample: PhysiologySample, landmarks: LivingPersona['landmarks']): CSSProperties {
  const left = landmarks.leftEye;
  const right = landmarks.rightEye;
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;
  return {
    ['--sy-gaze-x' as string]: `${((midX + sample.gazeX * 0.018) * 100).toFixed(2)}%`,
    ['--sy-gaze-y' as string]: `${((midY + sample.gazeY * 0.012) * 100).toFixed(2)}%`,
    ['--sy-blink' as string]: sample.blink.toFixed(3),
    ['--sy-mouth' as string]: sample.mouthOpen.toFixed(3),
  };
}

/**
 * Photoreal living avatar. Cross-fades expression stills while a physiology
 * engine drives blink, breath, gaze saccades, head micro-motion and speech.
 */
export function LivingAvatar({
  persona = LIORA_PERSONA,
  reaction = 'idle',
  audioLevel,
  size = 'md',
  showIdentity = false,
  paused = false,
  className = '',
  label,
}: LivingAvatarProps) {
  const { sample } = useLivingAvatar({ persona, reaction, audioLevel, paused });
  const classes = ['sy-living-avatar', SIZE_CLASS[size], className].filter(Boolean).join(' ');
  const status = statusLabel(sample.reaction, sample.mouthOpen);

  return (
    <figure
      className={classes}
      aria-label={label ?? `${persona.name}, ${persona.role}. ${status}`}
      data-reaction={sample.reaction}
      style={gazeStyle(sample, persona.landmarks)}
    >
      <div className="sy-living-avatar__stage" style={poseStyle(sample, persona.physiology.shoulderBreathScale)}>
        <div className="sy-living-avatar__light" aria-hidden="true" />
        <div className="sy-living-avatar__frames" aria-hidden="true">
          {EXPRESSIONS.map((expression) => (
            <img
              key={expression}
              className="sy-living-avatar__frame"
              src={persona.frames[expression]}
              alt=""
              draggable={false}
              style={{ opacity: sample.weights[expression] }}
            />
          ))}
        </div>
        <div className="sy-living-avatar__lids" aria-hidden="true" />
        <div className="sy-living-avatar__gaze" aria-hidden="true" />
        <div className="sy-living-avatar__mouth" aria-hidden="true" />
        <div className="sy-living-avatar__vignette" aria-hidden="true" />
      </div>
      {showIdentity ? (
        <figcaption className="sy-living-avatar__identity">
          <span className="sy-living-avatar__name">{persona.name}</span>
          <span className="sy-living-avatar__role">{persona.role}</span>
          <span className="sy-living-avatar__status" aria-live="polite">
            {status}
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}

function statusLabel(reaction: AvatarReaction, mouthOpen: number): string {
  if (reaction === 'talk' || mouthOpen > 0.35) return 'Speaking';
  switch (reaction) {
    case 'listen':
      return 'Listening';
    case 'thinking':
      return 'Thinking';
    case 'wave':
      return 'Greeting';
    case 'gift_react':
      return 'Thanking';
    case 'glance':
      return 'Noticing';
    case 'smile':
      return 'Smiling';
    default:
      return 'Present';
  }
}
