import type { ScreenDefinition } from '../types';
import { HomeScreen, HomeContextPanel } from './HomeScreen';

export const CORE_SCREENS: ScreenDefinition[] = [
  {
    id: 'home',
    name: 'Home',
    group: 'Core',
    navId: 'home',
    purpose:
      'Answers "what should I do right now?" by ordering content by how quickly it expires: live, then stories, then the chronological feed.',
    component: HomeScreen,
    contextPanel: HomeContextPanel,
    contextPanelTitle: 'Today',
  },
];
