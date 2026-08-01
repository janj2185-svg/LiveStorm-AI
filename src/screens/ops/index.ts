import type { ScreenDefinition } from '../types';

import { AdminScreen } from './AdminScreen';
import { BusinessScreen } from './BusinessScreen';
import { DiagnosticsScreen } from './DiagnosticsScreen';
import { ModeratorScreen } from './ModeratorScreen';

export const OPS_SCREENS: ScreenDefinition[] = [
  {
    id: 'diagnostics',
    name: 'Diagnostics',
    group: 'Operations',
    preferredDevice: 'desktop',
    purpose:
      'Owner local testing board: backend, database, Redis, WebSocket, storage, workers, migrations, providers, and honest gift-library counts. Development only.',
    dataSource: 'live',
    component: DiagnosticsScreen,
  },
  {
    id: 'admin',
    name: 'Admin panel',
    group: 'Operations',
    preferredDevice: 'desktop',
    purpose:
      'Platform operations ordered by response time: health, then services, then the open incident, then the slow work of accounts, flags and the audit trail.',
    component: AdminScreen,
  },
  {
    id: 'moderator',
    name: 'Moderator dashboard',
    group: 'Operations',
    preferredDevice: 'desktop',
    purpose:
      'A two-pane triage tool where the AI states a recommendation and a numeric confidence, the evidence is shown in context, and the irreversible actions are fenced behind an acknowledgement.',
    component: ModeratorScreen,
  },
  {
    id: 'business',
    name: 'Business dashboard',
    group: 'Operations',
    preferredDevice: 'desktop',
    purpose:
      'The brand-side view: unit cost alongside reach, planned against actual spend, and the creator roster ranked by what it returns rather than by audience size.',
    component: BusinessScreen,
  },
];
