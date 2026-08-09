import type { ScreenDefinition } from '../types';
import { AssistantContextPanel, AssistantScreen } from './AssistantScreen';

export const ASSISTANT_SCREENS: ScreenDefinition[] = [
  {
    id: 'assistant',
    name: 'AI Assistant',
    group: 'Core',
    navId: 'home',
    purpose:
      'Living presence for Lira, the photoreal AI assistant — natural blink, breath, gaze and lip cadence — with cited answers and actions that only run once the creator approves them.',
    component: AssistantScreen,
    contextPanel: AssistantContextPanel,
    contextPanelTitle: 'Assistant',
  },
];
