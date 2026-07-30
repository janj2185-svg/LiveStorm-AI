import type { ScreenDefinition } from '../types';
import { AssistantContextPanel, AssistantScreen } from './AssistantScreen';

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
];
