import type { ScreenDefinition } from '../types';
import { AvatarStudioContextPanel, AvatarStudioScreen } from './AvatarStudioScreen';

export const AVATAR_SCREENS: ScreenDefinition[] = [
  {
    id: 'avatar-studio',
    name: 'Living Avatar',
    group: 'Live',
    navId: 'studio',
    preferredDevice: 'desktop',
    immersive: true,
    purpose:
      'Photoreal female AI co-host presence with human blink, breath, gaze, speech articulation and social gestures.',
    component: AvatarStudioScreen,
    contextPanel: AvatarStudioContextPanel,
    contextPanelTitle: 'Avatar life',
  },
];
