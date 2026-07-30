import type { ScreenDefinition } from '../types';
import { PlayerScreen } from './PlayerScreen';
import { StoriesScreen } from './StoriesScreen';
import { ShortsScreen } from './ShortsScreen';
import { LongVideoScreen } from './LongVideoScreen';

export const MEDIA_SCREENS: ScreenDefinition[] = [
  {
    id: 'player',
    name: 'Video Player',
    group: 'Media',
    navId: 'home',
    immersive: true,
    purpose:
      'Playback where the picture is the product: chrome is budgeted to the top 12% and bottom 24% so the central band stays clear, and the scrubber separates elapsed, buffered and unloaded time.',
    component: PlayerScreen,
  },
  {
    id: 'stories',
    name: 'Stories',
    group: 'Media',
    navId: 'home',
    immersive: true,
    preferredDevice: 'iphone',
    purpose:
      'Twenty-four-hour cards with segmented progress, real tap zones for previous and next, and an interactive poll sticker proving the format carries live interaction layers.',
    component: StoriesScreen,
  },
  {
    id: 'shorts',
    name: 'Short Videos',
    group: 'Media',
    navId: 'discover',
    immersive: true,
    preferredDevice: 'iphone',
    purpose:
      'A vertical reel where the next item peeks over the bottom edge and the action rail sits inside the right thumb arc, because every gesture here is repeated hundreds of times.',
    component: ShortsScreen,
  },
  {
    id: 'long-video',
    name: 'Long Videos',
    group: 'Media',
    navId: 'home',
    purpose:
      'The watch page for a multi-hour recording: chapters double as the table of contents, and comments stay reachable because the related rail only appears once there is room for it.',
    component: LongVideoScreen,
  },
];
