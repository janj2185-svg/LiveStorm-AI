import type { ScreenDefinition } from '../types';
import { HomeScreen, HomeContextPanel } from './HomeScreen';
import { FeedScreen } from './FeedScreen';
import { SearchScreen } from './SearchScreen';
import { DiscoverScreen } from './DiscoverScreen';
import { ProfileScreen } from './ProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { NotificationsScreen } from './NotificationsScreen';

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
  {
    id: 'feed',
    name: 'Feed',
    group: 'Core',
    navId: 'home',
    purpose:
      'The strictly chronological timeline, carrying heterogeneous item types — posts, polls and space digests — without reordering anything.',
    component: FeedScreen,
  },
  {
    id: 'search',
    name: 'Search',
    group: 'Core',
    purpose:
      'One query across six object types, blended by confidence and narrowed by facet, with every result type keeping its own shape.',
    component: SearchScreen,
  },
  {
    id: 'discover',
    name: 'Discover',
    group: 'Core',
    navId: 'discover',
    purpose:
      'The explicitly ranked surface: an editorial hero and recommendation shelves, each of which can explain why it is there.',
    component: DiscoverScreen,
  },
  {
    id: 'profile',
    name: 'Profile',
    group: 'Core',
    navId: 'profile',
    purpose:
      "A creator's public page, answering who they are and what a subscription buys before anything else.",
    component: ProfileScreen,
  },
  {
    id: 'settings',
    name: 'Settings',
    group: 'Core',
    navId: 'settings',
    purpose:
      'Ten categories in a two-pane layout, with Appearance designed in full so every control looks like what it does.',
    component: SettingsScreen,
  },
  {
    id: 'notifications',
    name: 'Notifications',
    group: 'Core',
    purpose:
      'A triage queue grouped by time, where unread is never signalled by colour alone and the gift row resolves inline.',
    component: NotificationsScreen,
  },
];
