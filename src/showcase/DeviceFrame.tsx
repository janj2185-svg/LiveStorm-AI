/**
 * Device frame
 * ---------------------------------------------------------------------------
 * Renders a screen at true logical resolution inside hardware chrome, then
 * scales the whole frame down to fit the gallery viewport.
 *
 * The scale is applied with a CSS transform on a wrapper, never by shrinking
 * the screen's own width. That distinction is the entire point: the screen
 * always believes it is 393px wide, so its container queries, safe areas and
 * type sizes resolve exactly as they will on the device.
 */

import type { ReactNode } from 'react';

import { DEVICES, type DeviceId } from './devices';

export interface DeviceFrameProps {
  device: DeviceId;
  children: ReactNode;
  /** Scale factor applied to the whole frame. 1 = true size. */
  scale?: number;
  /** Hide the bezel and render the viewport alone. */
  bare?: boolean;
  label?: string;
}

export function DeviceFrame({ device, children, scale = 1, bare = false, label }: DeviceFrameProps) {
  const spec = DEVICES[device];

  return (
    <figure className="sy-device" style={{ width: spec.width * scale, height: spec.height * scale }}>
      <div
        className={`sy-device__frame sy-device__frame--${spec.chrome}${bare ? ' is-bare' : ''}`}
        style={{
          width: spec.width,
          height: spec.height,
          borderRadius: spec.radius,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {spec.chrome === 'browser' && (
          <div className="sy-device__browser-bar">
            <span className="sy-device__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="sy-device__url">sylora.com</span>
          </div>
        )}

        <div
          className="sy-device__viewport"
          style={{
            ['--safe-top' as string]: `${spec.safeTop}px`,
            ['--safe-bottom' as string]: `${spec.safeBottom}px`,
            borderRadius: Math.max(0, spec.radius - 6),
          }}
        >
          {children}
        </div>

        {/* Hardware overlays sit above the viewport, exactly as they do on device. */}
        {spec.chrome === 'phone-island' && <span className="sy-device__island" aria-hidden="true" />}
        {spec.chrome === 'phone-punch' && <span className="sy-device__punch" aria-hidden="true" />}
        {(spec.chrome === 'phone-island' || spec.chrome === 'phone-punch') && (
          <span className="sy-device__home-indicator" aria-hidden="true" />
        )}
      </div>

      {label && (
        <figcaption className="sy-device__caption sy-caption sy-fg-muted">
          {label} · {spec.width}×{spec.height}
        </figcaption>
      )}
    </figure>
  );
}
