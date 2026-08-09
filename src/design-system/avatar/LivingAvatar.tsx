/**
 * LivingAvatar
 * ---------------------------------------------------------------------------
 * Photoreal presence for the SYLORA assistant. Expression plates crossfade
 * while a motion rig applies the micro-behaviours that make a still face read
 * as a living person: irregular blinks, breath, gaze drift, lip cadence and
 * gesture-shaped head motion.
 *
 * Variants:
 *   - `stage` — shoulders-up presence for the assistant surface
 *   - `compact` — circular crop for turn headers / rails
 */

import { useEffect, type CSSProperties } from 'react';

import { EXPRESSION_FILES, LIRA_PERSONA, expressionUrl, type AvatarReaction, type ExpressionKey } from './persona';
import { useLivingAvatar } from './useLivingAvatar';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

const ALL_EXPRESSIONS = Object.keys(EXPRESSION_FILES) as ExpressionKey[];

export interface LivingAvatarProps {
  /** Visual density. */
  variant?: 'stage' | 'compact';
  /** Controlled reaction from co-host / UI. */
  reaction?: AvatarReaction;
  /** Optional WebAudio amplitude 0–1 for lip sync. */
  audioLevel?: number;
  /** Disable sparse ambient glance/smile. */
  ambientLife?: boolean;
  /** Accessible name override. */
  label?: string;
  className?: string;
  /** Expose the imperative reaction setter (e.g. demo controls). */
  onReady?: (api: { setReaction: (reaction: AvatarReaction) => void }) => void;
}

export function LivingAvatar({
  variant = 'stage',
  reaction,
  audioLevel,
  ambientLife = true,
  label = `${LIRA_PERSONA.name}, ${LIRA_PERSONA.role}`,
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
              const isNeutral = key === 'neutral';
              const isActive = key === pose.expression;
              // Neutral is always the base layer; active expression overlays it.
              const layerOpacity = isNeutral ? 1 : isActive ? pose.expressionMix : 0;
              return (
                <img
                  key={key}
                  className={cx(
                    'sy-living-avatar__plate',
                    isNeutral && 'sy-living-avatar__plate--base',
                    isActive && 'sy-living-avatar__plate--active',
                  )}
                  src={expressionUrl(key)}
                  alt=""
                  draggable={false}
                  decoding="async"
                  style={{ opacity: layerOpacity }}
                />
              );
            })}
          </div>

          {/* Soft lower-face pulse while speaking — sells lip motion on the speak plate. */}
          <div className="sy-living-avatar__mouth" />

          {/* Eyelid shutters — asymmetric close feels biological. */}
          <div className="sy-living-avatar__lids">
            <span className="sy-living-avatar__lid sy-living-avatar__lid--left" />
            <span className="sy-living-avatar__lid sy-living-avatar__lid--right" />
          </div>

          {/* Specular catch-light that drifts with gaze. */}
          <div className="sy-living-avatar__gaze" />
        </div>

        <div className="sy-living-avatar__atmosphere" />
      </div>

      {variant === 'stage' && (
        <figcaption className="sy-living-avatar__caption">
          <span className="sy-living-avatar__name">{LIRA_PERSONA.name}</span>
          <span className="sy-living-avatar__meta">{LIRA_PERSONA.presenceLine}</span>
        </figcaption>
      )}
    </figure>
  );
}

export type { AvatarReaction };
