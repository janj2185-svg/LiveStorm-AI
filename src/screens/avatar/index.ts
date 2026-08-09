import type { ScreenDefinition } from '../types';
import { LivingAvatarContextPanel, LivingAvatarScreen } from './LivingAvatarScreen';

export const AVATAR_SCREENS: ScreenDefinition[] = [
  {
    id: 'living-avatar',
    name: 'Living Avatar',
    group: 'Core',
    navId: 'home',
    purpose:
      'Photoreal female AI presence with human blink, breath, gaze and gesture physiology for the assistant and live co-host.',
    component: LivingAvatarScreen,
    contextPanel: LivingAvatarContextPanel,
    contextPanelTitle: 'Liora',
    preferredDevice: 'desktop',
  },
];
