/**
 * Device targets
 * ---------------------------------------------------------------------------
 * Logical (CSS) pixel dimensions for the five surfaces SYLORA ships to. These
 * are the real viewport sizes of current reference hardware, not rounded
 * approximations, because a layout that only works at tidy numbers is a layout
 * that has not been tested.
 *
 * Safe areas matter: on modern phones the status bar and home indicator sit
 * *inside* the viewport, so content must inset itself or it will render under
 * the hardware.
 */

export type DeviceId = 'iphone' | 'android' | 'tablet' | 'desktop' | 'web';

export interface DeviceSpec {
  id: DeviceId;
  name: string;
  /** Reference hardware this profile is measured from. */
  reference: string;
  width: number;
  height: number;
  /** Physical corner radius of the display, in logical pixels. */
  radius: number;
  safeTop: number;
  safeBottom: number;
  chrome: 'phone-island' | 'phone-punch' | 'tablet' | 'none' | 'browser';
  posture: 'compact' | 'medium' | 'expanded';
  notes: string;
}

export const DEVICES: Record<DeviceId, DeviceSpec> = {
  iphone: {
    id: 'iphone',
    name: 'iPhone',
    reference: 'iPhone 15 Pro — 393 x 852 @3x',
    width: 393,
    height: 852,
    radius: 55,
    safeTop: 59,
    safeBottom: 34,
    chrome: 'phone-island',
    posture: 'compact',
    notes:
      'Dynamic Island occupies the top centre. The tab bar floats above the home indicator rather than sitting flush, so the indicator never overlaps a target.',
  },
  android: {
    id: 'android',
    name: 'Android',
    reference: 'Pixel 8 Pro — 412 x 915 @2.625x',
    width: 412,
    height: 915,
    radius: 42,
    safeTop: 48,
    safeBottom: 24,
    chrome: 'phone-punch',
    posture: 'compact',
    notes:
      'Punch-hole camera, taller aspect and gesture navigation. 19px wider than iPhone, which is exactly why layouts are fluid rather than fixed-width.',
  },
  tablet: {
    id: 'tablet',
    name: 'Tablet',
    reference: 'iPad Pro 11-inch — 834 x 1194 portrait',
    width: 834,
    height: 1194,
    radius: 26,
    safeTop: 24,
    safeBottom: 20,
    chrome: 'tablet',
    posture: 'medium',
    notes:
      'Crosses the 768px threshold, so the icon rail replaces the bottom tab bar and two-column content becomes available.',
  },
  desktop: {
    id: 'desktop',
    name: 'Desktop',
    reference: 'MacBook Pro 14-inch — 1512 x 945 scaled',
    width: 1512,
    height: 945,
    radius: 12,
    safeTop: 0,
    safeBottom: 0,
    chrome: 'none',
    posture: 'expanded',
    notes:
      'Full three-region shell: expanded rail, content column and context panel. This is the creator and business posture.',
  },
  web: {
    id: 'web',
    name: 'Web',
    reference: 'Desktop browser — 1280 x 800 viewport',
    width: 1280,
    height: 800,
    radius: 10,
    safeTop: 0,
    safeBottom: 0,
    chrome: 'browser',
    posture: 'expanded',
    notes:
      'The narrowest expanded posture. Sits exactly on the 1280px breakpoint, which is where the context panel first appears — the single most fragile width in the system.',
  },
};

export const DEVICE_ORDER: DeviceId[] = ['iphone', 'android', 'tablet', 'web', 'desktop'];
