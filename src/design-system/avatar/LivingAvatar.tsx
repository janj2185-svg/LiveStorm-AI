import {
  AvatarLifeController,
  type AvatarLifeState,
  type AvatarReaction,
  type AvatarReactionEvent,
  type FrameWeights,
} from '@sylora/avatar-runtime';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

export const AVATAR_FRAMES = {
  neutral: '/avatars/neutral.jpg',
  warm: '/avatars/warm.jpg',
  listen: '/avatars/listen.jpg',
  speak: '/avatars/speak.jpg',
  blink: '/avatars/blink.jpg',
} as const;

export interface LivingAvatarProps {
  /** Display name — defaults to Sylora. */
  name?: string;
  /** Pixel height of the portrait stage. Width follows 3:4. */
  size?: number;
  /** External reaction drive (co-host scheduler / UI controls). */
  reaction?: AvatarReaction | AvatarReactionEvent | null;
  /** Bump to re-fire the same reaction (e.g. Speak pressed twice). */
  reactionNonce?: number;
  /** Spoken line used for lip cadence when no audio RMS is available. */
  utterance?: string | null;
  /** Show the soft stage glow and caption strip. */
  showMeta?: boolean;
  /** Transparent stage for OBS browser sources. */
  transparent?: boolean;
  className?: string;
  onState?: (state: AvatarLifeState) => void;
}

/**
 * Photoreal female co-host presence.
 *
 * Five expression stills are cross-faded from the physiology engine while the
 * whole plate is transformed with breath, gaze and gesture — the combination
 * reads as a living person rather than a slideshow.
 */
export function LivingAvatar({
  name = 'Sylora',
  size = 360,
  reaction = null,
  reactionNonce = 0,
  utterance = null,
  showMeta = true,
  transparent = false,
  className,
  onState,
}: LivingAvatarProps) {
  const lifeRef = useRef<AvatarLifeController | null>(null);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  const [state, setState] = useState<AvatarLifeState | null>(null);

  if (!lifeRef.current) {
    lifeRef.current = new AvatarLifeController({ name });
  }

  useEffect(() => {
    if (utterance !== undefined) lifeRef.current?.setUtterance(utterance);
  }, [utterance]);

  useEffect(() => {
    if (!reaction) return;
    lifeRef.current?.react(reaction);
  }, [reaction, reactionNonce]);

  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      const next = lifeRef.current?.tick(now);
      if (next) {
        setState(next);
        onStateRef.current?.(next);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const pose = state?.pose;
  const frames = state?.frames;
  const width = Math.round(size * 0.75);

  const plateStyle: CSSProperties = {
    width,
    height: size,
    transform: pose
      ? [
          `translate3d(0, ${(-pose.breath * 2.2 - pose.shoulder * 4).toFixed(2)}px, 0)`,
          `rotateX(${(pose.headPitch + pose.gazeY * 4).toFixed(2)}deg)`,
          `rotateY(${(pose.headYaw + pose.gazeX * 6).toFixed(2)}deg)`,
          `rotateZ(${pose.headRoll.toFixed(2)}deg)`,
          `scale(${(1 + pose.breath * 0.008 + pose.shoulder * 0.01).toFixed(4)})`,
        ].join(' ')
      : undefined,
  };

  return (
    <figure
      className={[
        'sy-living-avatar',
        transparent && 'sy-living-avatar--transparent',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width }}
      aria-label={`${name}, AI co-host avatar`}
    >
      <div className="sy-living-avatar__stage" style={{ width, height: size }}>
        <div className="sy-living-avatar__plate" style={plateStyle}>
          {(Object.keys(AVATAR_FRAMES) as Array<keyof typeof AVATAR_FRAMES>).map((key) => (
            <img
              key={key}
              className="sy-living-avatar__frame"
              src={AVATAR_FRAMES[key]}
              alt=""
              draggable={false}
              style={{ opacity: frameOpacity(frames, key) }}
            />
          ))}
          <span
            className="sy-living-avatar__gaze"
            style={{
              transform: pose
                ? `translate(${(pose.gazeX * 10).toFixed(2)}%, ${(pose.gazeY * 8).toFixed(2)}%)`
                : undefined,
            }}
            aria-hidden
          />
        </div>
        {!transparent && <div className="sy-living-avatar__glow" aria-hidden />}
      </div>

      {showMeta && (
        <figcaption className="sy-living-avatar__meta">
          <span className="sy-living-avatar__name">{name}</span>
          <span className="sy-living-avatar__status">
            {statusLabel(state)}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function frameOpacity(frames: FrameWeights | undefined, key: keyof FrameWeights): number {
  if (!frames) return key === 'neutral' ? 1 : 0;
  return Math.max(0, Math.min(1, frames[key]));
}

function statusLabel(state: AvatarLifeState | null): string {
  if (!state) return 'waking…';
  switch (state.reaction) {
    case 'talk':
      return 'speaking';
    case 'listen':
      return 'listening';
    case 'think':
      return 'thinking';
    case 'wave':
      return 'greeting';
    case 'glance':
      return 'glancing';
    case 'gift_react':
      return 'delighted';
    default:
      return 'present';
  }
}

export function useAvatarDriver() {
  const [reaction, setReaction] = useState<AvatarReaction>('idle');
  const [reactionNonce, setReactionNonce] = useState(0);
  const [utterance, setUtterance] = useState<string | null>(null);
  const [state, setState] = useState<AvatarLifeState | null>(null);

  const drive = (next: AvatarReaction, line?: string) => {
    setReaction(next);
    setReactionNonce((value) => value + 1);
    if (line !== undefined) setUtterance(line);
  };

  return {
    reaction,
    reactionNonce,
    utterance,
    state,
    setState,
    drive,
    setReaction,
    setUtterance,
  };
}
