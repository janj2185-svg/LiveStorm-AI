/**
 * Screen contract
 * ---------------------------------------------------------------------------
 * Every screen in SYLORA is a plain component that renders inside
 * `.sy-screen`, which establishes a CSS container named `screen`. Screens
 * therefore respond to the width of the surface they were handed, never to the
 * viewport — which is what makes one implementation correct on a 393px phone,
 * an 834px tablet and a 1512px desktop.
 *
 * Screens do not own navigation chrome. The shell supplies it, except for
 * `immersive` screens which deliberately take over the full surface.
 */

import type { ComponentType } from 'react';

export type ScreenGroup =
  | 'Entry'
  | 'Core'
  | 'Media'
  | 'Live'
  | 'Communication'
  | 'Creator'
  | 'Commerce'
  | 'Learning'
  | 'Gamification'
  | 'Account'
  | 'Operations'
  | 'Foundations';

export interface ScreenDefinition {
  id: string;
  /** Human name, as it appears in the gallery and the specification. */
  name: string;
  group: ScreenGroup;
  /** One sentence on what this screen is for and the decision it optimises. */
  purpose: string;
  component: ComponentType;
  /**
   * Content for the shell's right-hand context panel. Only rendered in the
   * expanded posture, so it must never hold anything essential.
   */
  contextPanel?: ComponentType;
  contextPanelTitle?: string;
  /**
   * `immersive` screens render edge-to-edge with no shell chrome: the video
   * player, live viewer, stories and the short-video feed.
   */
  immersive?: boolean;
  /** Device the gallery opens this screen on, when one posture is canonical. */
  preferredDevice?: 'iphone' | 'android' | 'tablet' | 'desktop' | 'web';
  /** Which shell destination is highlighted while this screen is shown. */
  navId?: string;
}
