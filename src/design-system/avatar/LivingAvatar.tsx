/**
 * LivingAvatar
 * ---------------------------------------------------------------------------
 * Photoreal presence for Sylora. Identity is one locked base plate; expression
 * overlays are capped and hard-cut for pose-changing plates so the face never
 * ghost-fragments. Motion (breath, blink, gaze, lip) keeps her assembled and alive.
 */

import { useEffect, type CSSProperties } from 'react';

import {
  EXPRESSION_FILES,
  POSE_CHANGE_EXPRESSIONS,
  SYLORA_PERSONA,
  expressionUrl,
  type AvatarReaction,
  type ExpressionKey,
} from './persona';
import { useLivingAvatar } from './useLivingAvatar';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

const ALL_EXPRESSIONS = Object.keys(EXPRESSION_FILES) as ExpressionKey[];

export interface LivingAvatarProps {
  variant?: 'stage' | 'compact';
  reaction?: AvatarReaction;
  audioLevel?: number;
  ambientLife?: boolean;
  label?: string;
  className?: string;
  onReady?: (api: { setReaction: (reaction: AvatarReaction) => void }) => void;
}

function plateOpacity(
  key: ExpressionKey,
  active: ExpressionKey,
  mix: number,
): number {
  const isNeutral = key === 'neutral';
  const isActive = key === active;
  const poseChange = POSE_CHANGE_EXPRESSIONS.has(active);

  if (poseChange) {
    // Hard cut — never blend wave/nod with neutral (those plates shift shoulders).
    if (mix >= 0.35) {
      return isActive ? 1 : 0;
    }
    return isNeutral ? 1 : 0;
  }

  // Face-aligned expressions: solid base + capped overlay (no double-face ghosting).
  if (isNeutral) return 1;
  if (isActive) return Math.min(mix, 0.48);
  return 0;
}

export function LivingAvatar({
  variant = 'stage',
  reaction,
  audioLevel,
  ambientLife = true,
  label = `${SYLORA_PERSONA.name}, ${SYLORA_PERSONA.role}`,
  className,
  onReady,
}: LivingAvatarProps) {
  const { pose, reaction: activeReaction, setReaction } = useLivingAvatar({
    reaction,
    audioLevel,
    ambientLife,
  });

  useEffect(() => {
    onReady?.({ setReaction });
  }, [onReady, setReaction]);

  const rigStyle = {
    '--sy-avatar-yaw': `${pose.headYaw.toFixed(3)}deg`,
    '--sy-avatar-pitch': `${pose.headPitch.toFixed(3)}deg`,
    '--sy-avatar-roll': `${pose.headRoll.toFixed(3)}deg`,
    '--sy-avatar-breath': pose.breath.toFixed(4),
    '--sy-avatar-blink': pose.blink.toFixed(4),
    '--sy-avatar-gaze-x': pose.gazeX.toFixed(4),
    '--sy-avatar-gaze-y': pose.gazeY.toFixed(4),
    '--sy-avatar-lip': pose.lipOpen.toFixed(4),
    '--sy-avatar-warmth': pose.warmth.toFixed(4),
    '--sy-avatar-mix': pose.expressionMix.toFixed(4),
  } as CSSProperties;

  return (
    <figure
      className={cx('sy-living-avatar', `sy-living-avatar--${variant}`, className)}
      style={rigStyle}
      data-reaction={activeReaction}
      aria-label={label}
      role="img"
    >
      <div className="sy-living-avatar__stage" aria-hidden="true">
        <div className="sy-living-avatar__rig">
          <div className="sy-living-avatar__plates">
            {ALL_EXPRESSIONS.map((key) => {
              const opacity = plateOpacity(key, pose.expression, pose.expressionMix);
              return (
                <img
                  key={key}
                  className={cx(
                    'sy-living-avatar__plate',
                    key === 'neutral' && 'sy-living-avatar__plate--base',
                    key === pose.expression && 'sy-living-avatar__plate--active',
                  )}
                  src={expressionUrl(key)}
                  alt=""
                  draggable={false}
                  decoding="async"
                  style={{ opacity }}
                />
              );
            })}
          </div>

          <div className="sy-living-avatar__mouth" />

          <div className="sy-living-avatar__lids">
            <span className="sy-living-avatar__lid sy-living-avatar__lid--left" />
            <span className="sy-living-avatar__lid sy-living-avatar__lid--right" />
          </div>

          <div className="sy-living-avatar__gaze" />
        </div>

        <div className="sy-living-avatar__atmosphere" />
      </div>

      {variant === 'stage' && (
        <figcaption className="sy-living-avatar__caption">
          <span className="sy-living-avatar__name">{SYLORA_PERSONA.name}</span>
          <span className="sy-living-avatar__meta">{SYLORA_PERSONA.presenceLine}</span>
        </figcaption>
      )}
    </figure>
  );
}

export type { AvatarReaction };
