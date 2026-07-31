import type { ScreenDefinition } from '../types';
import { AuthScreen } from './AuthScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { WelcomeScreen } from './WelcomeScreen';

export const ENTRY_SCREENS: ScreenDefinition[] = [
  {
    id: 'welcome',
    immersive: true,
    name: 'Welcome',
    group: 'Entry',
    navId: 'home',
    purpose:
      'The unauthenticated landing surface: states what SYLORA unifies, proves it with four measurable capabilities, and demonstrates it with a preview built from the real product.',
    component: WelcomeScreen,
  },
  {
    id: 'auth',
    immersive: true,
    name: 'Authentication',
    group: 'Entry',
    purpose:
      'Sign in and account creation on one card, with the phishing-resistant passkey path presented above passwords.',
    component: AuthScreen,
  },
  {
    id: 'onboarding',
    immersive: true,
    name: 'Onboarding',
    group: 'Entry',
    purpose:
      'Step 2 of 4: choosing interests, with a live preview of what the choice changes and an explicit promise that it never reorders the chronological feed.',
    component: OnboardingScreen,
  },
];
