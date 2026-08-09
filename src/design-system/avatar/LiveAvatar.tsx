/**
 * LiveAvatar — photorealistic SYLORA assistant presence.
 *
 * Renders a studio portrait on canvas with procedural micro-motion: breathing,
 * blinking, gaze, lip-sync visemes, and gesture overlays. The goal is motion
 * that reads as a living person rather than a looping video or a static photo.
 */

import { useEffect, useId, useRef } from 'react';

import { ASSISTANT_PORTRAIT_SRC, EYE_BLINK, LUNA_LANDMARKS, MOUTH_REGION } from './faceLandmarks';
import {
  type LiveAvatarConfig,
  type LiveAvatarFrame,
  type LiveAvatarState,
  assistantAvatarConfig,
  computeLiveAvatarFrame,
} from './liveAvatarEngine';

export type { LiveAvatarConfig, LiveAvatarFrame, LiveAvatarState };

export interface LiveAvatarProps {
  size?: number;
  state?: LiveAvatarState;
  /** When true, drives lip-sync visemes even if state is not `speaking`. */
  speaking?: boolean;
  className?: string;
  /** Accessible label. Defaults to a Ukrainian description of the assistant. */
  label?: string;
  /** Show a subtle live ring around the portrait. */
  liveRing?: boolean;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: LiveAvatarFrame,
  size: number,
  dpr: number,
): void {
  const w = size * dpr;
  const h = size * dpr;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2 + frame.headShiftX * w + frame.gazeX * w;
  const cy = h / 2 + frame.headShiftY * h + frame.gazeY * h;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((frame.headRotate * Math.PI) / 180);
  ctx.scale(1, frame.breathScale);

  const imgAspect = image.naturalWidth / image.naturalHeight;
  let drawW = w * 1.08;
  let drawH = drawW / imgAspect;
  if (drawH < h * 1.08) {
    drawH = h * 1.08;
    drawW = drawH * imgAspect;
  }

  const offsetX = -drawW / 2 + frame.gazeX * w * 0.25;
  const offsetY = -drawH / 2 + frame.gazeY * h * 0.2;

  ctx.drawImage(image, offsetX, offsetY, drawW, drawH);

  // Mouth viseme: stretch lower-face slice vertically.
  if (frame.mouthOpen > 0.06) {
    const mouthY = MOUTH_REGION.top * drawH + offsetY;
    const mouthH = MOUTH_REGION.height * drawH;
    const mouthW = MOUTH_REGION.width * drawW;
    const mouthX = offsetX + (0.5 - MOUTH_REGION.width / 2) * drawW;
    const open = 1 + frame.mouthOpen * 0.22;

    ctx.save();
    ctx.beginPath();
    ctx.rect(mouthX, mouthY, mouthW, mouthH * open);
    ctx.clip();
    ctx.drawImage(
      image,
      (0.5 - MOUTH_REGION.width / 2) * image.naturalWidth,
      MOUTH_REGION.top * image.naturalHeight,
      MOUTH_REGION.width * image.naturalWidth,
      MOUTH_REGION.height * image.naturalHeight * open,
      mouthX,
      mouthY,
      mouthW,
      mouthH * open,
    );
    ctx.restore();
  }

  // Smile: subtle corner lift via warm overlay on cheeks.
  if (frame.smile > 0.1) {
    ctx.globalAlpha = frame.smile * 0.12;
    ctx.fillStyle = 'rgba(255, 210, 190, 0.35)';
    for (const cheek of [LUNA_LANDMARKS.leftCheek, LUNA_LANDMARKS.rightCheek]) {
      const px = offsetX + cheek.x * drawW;
      const py = offsetY + cheek.y * drawH;
      ctx.beginPath();
      ctx.ellipse(px, py, drawW * 0.06, drawH * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Brow raise: soft highlight above brows.
  if (frame.browRaise > 0.05) {
    ctx.globalAlpha = frame.browRaise * 0.18;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (const brow of [LUNA_LANDMARKS.leftBrow, LUNA_LANDMARKS.rightBrow]) {
      const px = offsetX + brow.x * drawW;
      const py = offsetY + (brow.y - 0.02) * drawH;
      ctx.beginPath();
      ctx.ellipse(px, py, drawW * 0.07, drawH * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Blink: skin-toned eyelid ellipses.
  if (frame.blinkAmount > 0.02) {
    const lidColor = 'rgba(72, 52, 44, 0.92)';
    ctx.fillStyle = lidColor;
    for (const eye of [LUNA_LANDMARKS.leftEye, LUNA_LANDMARKS.rightEye]) {
      const px = offsetX + eye.x * drawW;
      const py = offsetY + eye.y * drawH;
      const rx = EYE_BLINK.rx * drawW;
      const ry = EYE_BLINK.ry * drawH * frame.blinkAmount * 2.2;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, Math.max(ry, 1), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function LiveAvatar({
  size = 120,
  state = 'idle',
  speaking = false,
  className,
  label = 'Живий аватар AI-асистентки SYLORA',
  liveRing = false,
}: LiveAvatarProps) {
  const labelId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const configRef = useRef<LiveAvatarConfig>(assistantAvatarConfig(state, speaking));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    configRef.current = assistantAvatarConfig(speaking ? 'speaking' : state, speaking);
  }, [state, speaking]);

  useEffect(() => {
    const image = new Image();
    image.decoding = 'async';
    image.src = ASSISTANT_PORTRAIT_SRC;
    imageRef.current = image;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const render = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;

      if (image.complete && image.naturalWidth > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pixelSize = Math.round(size * dpr);
        if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
          canvas.width = pixelSize;
          canvas.height = pixelSize;
        }
        const frame = computeLiveAvatarFrame(elapsed, configRef.current);
        drawFrame(ctx, image, frame, size, dpr);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    const onLoad = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
    };

    image.addEventListener('load', onLoad);
    if (image.complete) onLoad();

    return () => {
      image.removeEventListener('load', onLoad);
      cancelAnimationFrame(rafRef.current);
    };
  }, [size]);

  return (
    <div
      className={[
        'sy-live-avatar',
        liveRing && 'sy-live-avatar--live',
        `sy-live-avatar--${speaking ? 'speaking' : state}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
      role="img"
      aria-labelledby={labelId}
    >
      <canvas
        ref={canvasRef}
        className="sy-live-avatar__canvas"
        width={size}
        height={size}
        aria-hidden="true"
      />
      <span id={labelId} className="sy-sr-only">
        {label}
      </span>
    </div>
  );
}
