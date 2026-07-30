import type { ScreenDefinition } from '../types';

import { AnalyticsScreen } from './AnalyticsScreen';
import { CreatorDashboardScreen, CreatorDashboardContextPanel } from './CreatorDashboardScreen';
import { MonetizationScreen } from './MonetizationScreen';
import { PremiumScreen } from './PremiumScreen';

export const CREATOR_SCREENS: ScreenDefinition[] = [
  {
    id: 'creator-dashboard',
    name: 'Creator dashboard',
    group: 'Creator',
    navId: 'studio',
    purpose:
      'The creator\u2019s home base, ordered by what can still be changed: the scoreboard, then the one thing with a deadline, then the evidence, then a single AI reading of it.',
    component: CreatorDashboardScreen,
    contextPanel: CreatorDashboardContextPanel,
    contextPanelTitle: 'Today',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    group: 'Creator',
    navId: 'analytics',
    purpose:
      'Deep channel analytics: a comparison chart against the previous period, breakdowns by source, device and country, a retention curve with the drop-off marked, and a sortable table of top content.',
    component: AnalyticsScreen,
  },
  {
    id: 'monetization',
    name: 'Monetization',
    group: 'Creator',
    navId: 'wallet',
    purpose:
      'Shows gross revenue by source, which streams are switched on, when the payout lands, and the full subtraction from gross to net with nothing rounded away.',
    component: MonetizationScreen,
  },
  {
    id: 'premium',
    name: 'Premium subscription',
    group: 'Creator',
    purpose:
      'The consumer subscription upsell: three plans, a monthly/annual toggle that does the arithmetic for the reader, and a full capability matrix rather than a curated one.',
    component: PremiumScreen,
  },
];
