import type { ScreenDefinition } from '../types';

import { DigitalProductsScreen } from './DigitalProductsScreen';
import { GiftsScreen } from './GiftsScreen';
import { InventoryScreen } from './InventoryScreen';
import { MarketplaceScreen } from './MarketplaceScreen';
import { WalletContextPanel, WalletScreen } from './WalletScreen';

export const COMMERCE_SCREENS: ScreenDefinition[] = [
  {
    id: 'marketplace',
    name: 'Marketplace',
    group: 'Commerce',
    navId: 'marketplace',
    purpose:
      'A storefront where the creator is the unit of trust: the maker sits above the rating on every card, and browsing narrows by kind before it narrows by budget.',
    component: MarketplaceScreen,
  },
  {
    id: 'digital-products',
    name: 'Digital Products',
    group: 'Commerce',
    navId: 'marketplace',
    purpose:
      'The seller side of the marketplace — catalogue performance first, then a single product to edit, with a publish checklist that blocks rather than warns.',
    component: DigitalProductsScreen,
  },
  {
    id: 'wallet',
    name: 'Wallet',
    group: 'Commerce',
    navId: 'wallet',
    purpose:
      'One hero answers what is mine, what is pending and how to move it. Euro and credits are kept visually separate so a top-up can never be mistaken for a cash charge.',
    component: WalletScreen,
    contextPanel: WalletContextPanel,
    contextPanelTitle: 'Earnings',
  },
  {
    id: 'gifts',
    name: 'Virtual Gifts',
    group: 'Commerce',
    navId: 'wallet',
    purpose:
      'A rarity-first catalogue and a composer that shows recipient, total and remaining balance together, so nobody learns what a gift cost after sending it.',
    component: GiftsScreen,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    group: 'Commerce',
    navId: 'wallet',
    purpose:
      'What you are wearing before what you own: four named loadout slots at the top, then the collection, then everything that is about to expire.',
    component: InventoryScreen,
  },
];
