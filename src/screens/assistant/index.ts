import type { ScreenDefinition } from '../types';
import { AssistantContextPanel, AssistantScreen } from './AssistantScreen';
import { AvatarLifeContextPanel, AvatarLifeScreen } from './AvatarLifeScreen';

export const ASSISTANT_SCREENS: ScreenDefinition[] = [
  {
    id: 'assistant',
    name: 'AI Assistant',
    group: 'Core',
    navId: 'home',
    purpose:
      'The conversational surface where the assistant answers with cited sources and proposes actions that only run once the creator approves them.',
    component: AssistantScreen,
    contextPanel: AssistantContextPanel,
    contextPanelTitle: 'Assistant',
  },
  {
    id: 'avatar-life',
    name: 'Avatar Life — Liora',
    group: 'Core',
    navId: 'home',
    purpose:
      'Living female AI co-host avatar with continuous human micro-behaviour, gestures and lip-sync wired to Live Hub reactions.',
    component: AvatarLifeScreen,
    contextPanel: AvatarLifeContextPanel,
    contextPanelTitle: 'Liora',
  },
];
