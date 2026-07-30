import type { ScreenDefinition } from '../types';

import { CoursesScreen } from './CoursesScreen';
import { EventsScreen } from './EventsScreen';

export const LEARNING_SCREENS: ScreenDefinition[] = [
  {
    id: 'courses',
    name: 'Courses',
    group: 'Learning',
    navId: 'discover',
    purpose:
      'Optimised for resuming, not for browsing: the hero names the next lesson rather than the course, and everything already owned sits above anything for sale.',
    component: CoursesScreen,
  },
  {
    id: 'events',
    name: 'Events',
    group: 'Learning',
    navId: 'discover',
    purpose:
      'A queue and a month are different questions, so the list and the calendar are both first-class views rather than one hidden behind a preference.',
    component: EventsScreen,
  },
];
