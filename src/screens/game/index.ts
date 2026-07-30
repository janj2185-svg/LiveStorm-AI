import type { ScreenDefinition } from '../types';

import { AchievementsScreen } from './AchievementsScreen';
import { LeaderboardsScreen } from './LeaderboardsScreen';
import { MissionsScreen } from './MissionsScreen';

export const GAME_SCREENS: ScreenDefinition[] = [
  {
    id: 'leaderboards',
    name: 'Leaderboards',
    group: 'Gamification',
    navId: 'discover',
    purpose:
      'A ceremonial podium for the top three and a dense table for everyone else, with the current user pinned to the bottom so finding yourself never costs a scroll.',
    component: LeaderboardsScreen,
  },
  {
    id: 'achievements',
    name: 'Achievements',
    group: 'Gamification',
    navId: 'profile',
    purpose:
      'Built around the ones you have not earned yet: locked cards keep full text contrast and an exact "x of y" count, because that is what brings people back.',
    component: AchievementsScreen,
  },
  {
    id: 'missions',
    name: 'Missions',
    group: 'Gamification',
    navId: 'profile',
    purpose:
      'The season track is the hero because it is the only thing that shows distance travelled; missions are sorted by closeness to completion rather than reward size.',
    component: MissionsScreen,
  },
];
