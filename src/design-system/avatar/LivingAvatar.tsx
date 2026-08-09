/**
 * LivingAvatar — photoreal female AI co-host with continuous human life.
 * ---------------------------------------------------------------------------
 * Driven by `@sylora/avatar-runtime` (breath, blink, saccades, gestures,
 * viseme lip-sync). Expression plates are real photographic stills of Liora
 * crossfaded by the engine; micro-motion is applied as living head/shoulder
 * transforms so the figure never freezes like a static portrait.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from 'react';

import {
  AvatarLifeEngine,
  LIORA_PERSONA,
  type AvatarPose,
  type AvatarReaction,
  type SpeakOptions,
} from '@sylora/avatar-runtime';

import neutralUrl from '../../assets/avatar/liora/neutral.jpg';
import smileUrl from '../../assets/avatar/liora/smile.jpg';
import listenUrl from '../../assets/avatar/liora/listen.jpg';
import talkUrl from '../../assets/avatar/liora/talk.jpg';
import giftUrl from '../../assets/avatar/liora/gift.jpg';

const PLATES = {
  neutral: neutralUrl,
  smile: smileUrl,
  listen: listenUrl,
  talk: talkUrl,
  gift: giftUrl,
} as const;

export type LivingAvatarSize = 'sm' | 'md' | 'lg' | 'hero';

const SIZE_PX: Record<LivingAvatarSize, number> = {
  sm: 96,
  md: 168,
  lg: 280,
  hero: 420,
};

export interface LivingAvatarHandle {
  react: (reaction: AvatarReaction | string) => void;
  speak: (options: SpeakOptions) => number;
  interrupt: () => void;
  getPose: () => AvatarPose;
}

export interface LivingAvatarProps {
  size?: LivingAvatarSize | number;
  /** Initial / ambient reaction while idle life runs. */
  reaction?: AvatarReaction | string;
  /** When set, avatar speaks this line with lip sync. */
  speakText?: string;
  cameraEngaged?: boolean;
  seed?: number;
  className?: string;
  label?: string;
  showNameplate?: boolean;
  /** Expose imperative controls to the parent. */
  avatarRef?: MutableRefObject<LivingAvatarHandle | null>;
  onPose?: (pose: AvatarPose) => void;
  children?: ReactNode;
}

export function LivingAvatar({
  size = 'md',
  reaction = 'idle',
  speakText,
  cameraEngaged = true,
  seed = 42,
  className,
  label = LIORA_PERSONA.displayName,
  showNameplate = false,
  avatarRef,
  onPose,
  children,
}: LivingAvatarProps) {
  const engineRef = useRef<AvatarLifeEngine | null>(null);
  const [pose, setPose] = useState<AvatarPose | null>(null);
  const px = typeof size === 'number' ? size : SIZE_PX[size];

  if (!engineRef.current) {
    engineRef.current = new AvatarLifeEngine({ seed, cameraEngaged, persona: LIORA_PERSONA });
  }

  useEffect(() => {
    engineRef.current?.setCameraEngaged(cameraEngaged);
  }, [cameraEngaged]);

  useEffect(() => {
    engineRef.current?.react(reaction);
  }, [reaction]);

  useEffect(() => {
    if (!speakText) return;
    engineRef.current?.speak({ text: speakText });
  }, [speakText]);

  useEffect(() => {
    const engine = engineRef.current!;
    let frame = 0;
    let last = performance.now();

    const handle: LivingAvatarHandle = {
      react: (r) => engine.react(r),
      speak: (opts) => engine.speak(opts),
      interrupt: () => engine.interruptSpeech(),
      getPose: () => engine.pose,
    };
    if (avatarRef) avatarRef.current = handle;

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = engine.tick(dt);
      setPose(next);
      onPose?.(next);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      if (avatarRef) avatarRef.current = null;
    };
  }, [avatarRef, onPose]);

  if (!pose) {
    return (
      <div
        className={['sy-living-avatar', 'sy-living-avatar--loading', className].filter(Boolean).join(' ')}
        style={{ width: px, height: px * (4 / 3) }}
        aria-label={label}
      />
    );
  }

  const transform = [
    `perspective(${Math.round(px * 3.2)}px)`,
    `rotateY(${pose.head.yaw.toFixed(3)}deg)`,
    `rotateX(${(-pose.head.pitch).toFixed(3)}deg)`,
    `rotateZ(${pose.head.roll.toFixed(3)}deg)`,
    `translateY(${((-pose.breath) * px * 0.012).toFixed(3)}px)`,
    `scale(${(1 + pose.breath * 0.012).toFixed(4)})`,
  ].join(' ');

  const figureStyle: CSSProperties = {
    width: px,
    height: px * (4 / 3),
    transform,
    ['--sy-avatar-gaze-x' as string]: pose.gaze.x,
    ['--sy-avatar-gaze-y' as string]: pose.gaze.y,
    ['--sy-avatar-blink-l' as string]: pose.blinkL,
    ['--sy-avatar-blink-r' as string]: pose.blinkR,
    ['--sy-avatar-jaw' as string]: pose.jawOpen,
    ['--sy-avatar-smile' as string]: pose.mouthSmile,
    ['--sy-avatar-shoulder' as string]: `${pose.shoulderRoll}deg`,
  };

  return (
    <figure
      className={['sy-living-avatar', className].filter(Boolean).join(' ')}
      style={figureStyle}
      data-emotion={pose.emotion}
      data-reaction={pose.reaction}
      aria-label={`${label}, ${pose.emotion}`}
    >
      <div className="sy-living-avatar__stage" aria-hidden="true">
        {(Object.keys(PLATES) as (keyof typeof PLATES)[]).map((key) => (
          <img
            key={key}
            className="sy-living-avatar__plate"
            src={PLATES[key]}
            alt=""
            draggable={false}
            style={{ opacity: pose.expressions[key] }}
          />
        ))}

        <span className="sy-living-avatar__lid sy-living-avatar__lid--l" />
        <span className="sy-living-avatar__lid sy-living-avatar__lid--r" />
        <span className="sy-living-avatar__gaze" />
        <span className="sy-living-avatar__mouth" />
        <span className="sy-living-avatar__sheen" />
      </div>

      {showNameplate ? (
        <figcaption className="sy-living-avatar__nameplate">
          <span className="sy-living-avatar__name">{label}</span>
          <span className="sy-living-avatar__meta">AI co-host · {pose.emotion}</span>
        </figcaption>
      ) : null}
      {children}
    </figure>
  );
}
