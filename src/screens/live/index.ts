import type { ScreenDefinition } from '../types';
import { LiveViewerScreen } from './LiveViewerScreen';

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
];
