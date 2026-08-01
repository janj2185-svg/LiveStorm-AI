import type { ScreenDefinition } from '../types';
import { ChatScreen } from './ChatScreen';
import { MessagesScreen } from './MessagesScreen';
import { FriendsScreen } from './FriendsScreen';
import { CommunitiesScreen } from './CommunitiesScreen';

export const COMMS_SCREENS: ScreenDefinition[] = [
  {
    id: 'chat',
    name: 'Chat',
    group: 'Communication',
    navId: 'messages',
    purpose:
      'A one-to-one conversation that grows panes as the surface allows: thread only on a phone, an index at 768px, and shared files last because they are the first thing worth cutting.',
    component: ChatScreen,
  },
  {
    id: 'messages',
    name: 'Messages',
    group: 'Communication',
    navId: 'messages',
    purpose:
      'The triage inbox. Unread is carried by tint, weight and a count together, and the policy on messages from strangers is stated in words rather than implied by a tab.',
    dataSource: 'demo',
    component: MessagesScreen,
  },
  {
    id: 'friends',
    name: 'Friends',
    group: 'Communication',
    navId: 'profile',
    purpose:
      'Relationships split by decision type: a short stack of requests to answer at the top, then a directory to browse, with Accept and Decline given identical weight.',
    component: FriendsScreen,
  },
  {
    id: 'communities',
    name: 'Communities',
    group: 'Communication',
    navId: 'discover',
    purpose:
      'Spaces you belong to and spaces worth joining, where privacy is communicated three redundant ways — icon, word, and the label on the join control itself.',
    component: CommunitiesScreen,
  },
];
