/**
 * Screen registry
 * ---------------------------------------------------------------------------
 * The single index of every screen in SYLORA. Each product area owns its own
 * group module and exports a `ScreenDefinition[]`; this file only assembles
 * them and defines the shell navigation they all render inside.
 */

import type { ScreenDefinition, ScreenGroup } from './types';

import { ENTRY_SCREENS } from './entry';
import { CORE_SCREENS } from './core';
import { ASSISTANT_SCREENS } from './assistant';
import { MEDIA_SCREENS } from './media';
import { LIVE_SCREENS } from './live';
import { COMMS_SCREENS } from './comms';
import { CREATOR_SCREENS } from './creator';
import { COMMERCE_SCREENS } from './commerce';
import { LEARNING_SCREENS } from './learning';
import { GAME_SCREENS } from './game';
import { OPS_SCREENS } from './ops';
import { FOUNDATION_SCREENS } from './foundations';

export const SCREENS: ScreenDefinition[] = [
  ...ENTRY_SCREENS,
  ...CORE_SCREENS,
  ...ASSISTANT_SCREENS,
  ...MEDIA_SCREENS,
  ...LIVE_SCREENS,
  ...COMMS_SCREENS,
  ...CREATOR_SCREENS,
  ...COMMERCE_SCREENS,
  ...LEARNING_SCREENS,
  ...GAME_SCREENS,
  ...OPS_SCREENS,
  ...FOUNDATION_SCREENS,
];

export const SCREEN_GROUPS: ScreenGroup[] = [
  'Entry',
  'Core',
  'Media',
  'Live',
  'Communication',
  'Creator',
  'Commerce',
  'Learning',
  'Gamification',
  'Account',
  'Operations',
  'Foundations',
];

/**
 * Shell navigation.
 *
 * Five primary destinations, because a bottom tab bar with more than five
 * targets pushes each below the comfortable thumb width on a 393px screen.
 * Everything else is a secondary destination reachable from the rail on larger
 * surfaces and from the profile sheet on phones.
 */
export const SHELL_NAV = [
  { id: 'home', label: 'Home', icon: 'home' as const },
  { id: 'discover', label: 'Discover', icon: 'discover' as const },
  { id: 'live', label: 'Live', icon: 'live' as const, live: true },
  { id: 'messages', label: 'Messages', icon: 'messages' as const, badge: 3 },
  { id: 'profile', label: 'You', icon: 'profile' as const },
];

export const SHELL_NAV_SECONDARY = [
  { id: 'studio', label: 'Studio', icon: 'studio' as const },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' as const },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' as const },
  { id: 'marketplace', label: 'Marketplace', icon: 'marketplace' as const },
  { id: 'settings', label: 'Settings', icon: 'settings' as const },
];
