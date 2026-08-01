import type { ScreenDefinition } from '../types';
import { LiveViewerScreen } from './LiveViewerScreen';
import { LiveStudioScreen } from './LiveStudioScreen';

export const LIVE_SCREENS: ScreenDefinition[] = [
  {
    id: 'live-viewer',
    name: 'Live Streaming',
    group: 'Live',
    navId: 'live',
    immersive: true,
    preferredDevice: 'iphone',
    purpose:
      'The broadcast is the interface. Chrome is capped so a 16:9 stream stays fully visible, and the gift rail sits in the easiest thumb position on the screen.',
    component: LiveViewerScreen,
  },
  {
    id: 'live-studio',
    name: 'Live Studio',
    group: 'Live',
    navId: 'studio',
    preferredDevice: 'desktop',
    purpose:
      'The broadcaster’s control room, laid out left to right as three time horizons: what is staged next, what is on air now, and what the audience just did about it.',
    dataSource: 'demo',
    component: LiveStudioScreen,
  },
];
