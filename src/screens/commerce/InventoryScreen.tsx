/**
 * Inventory
 * ---------------------------------------------------------------------------
 * An inventory is only useful if it answers "what am I wearing right now"
 * before "what do I own", so the equipped loadout is pinned at the top as four
 * named slots. Empty slots are shown rather than hidden — a gap is the clearest
 * possible prompt to fill it, and it also explains why some items in the grid
 * below cannot be equipped simultaneously.
 *
 * Expiry is the other thing a collection screen habitually hides. Time-limited
 * items get their own band with a countdown in mono, because a badge that
 * vanishes silently feels like theft even when the terms said 30 days.
 *
 * Equipped state is a filled check plus the word "Equipped" plus a border
 * change. Rarity repeats the catalogue's pip system, and the legend at the
 * bottom names each tier in text so nothing depends on remembering a hue.
 */

import { useState } from 'react';

import { Badge, Button, Icon, Surface, Tabs } from '../../design-system/primitives';
import { ScreenSection } from '../components';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
type Kind = 'Gifts' | 'Badges' | 'Effects' | 'Frames' | 'Passes';

interface Item {
  id: string;
  name: string;
  kind: Kind;
  rarity: Rarity;
  glyph: string;
  quantity: number;
  acquired: string;
  equipped?: boolean;
  expires?: string;
}

const ITEMS: Item[] = [
  { id: 'iv1', name: 'Aurora Burst', kind: 'Gifts', rarity: 'epic', glyph: '✵', quantity: 12, acquired: 'Bought 2 Feb' },
  { id: 'iv2', name: 'Prism Wave', kind: 'Gifts', rarity: 'rare', glyph: '◆', quantity: 48, acquired: 'Bought 28 Jan' },
  { id: 'iv3', name: 'Spark', kind: 'Gifts', rarity: 'common', glyph: '✦', quantity: 320, acquired: 'Bundle, 4 Jan' },
  { id: 'iv4', name: 'Supernova', kind: 'Gifts', rarity: 'legendary', glyph: '✷', quantity: 1, acquired: 'Season 3 reward' },
  { id: 'iv5', name: 'Founding Member', kind: 'Badges', rarity: 'legendary', glyph: '❂', quantity: 1, acquired: 'Earned 11 Nov', equipped: true },
  { id: 'iv6', name: 'Design Systems Guild', kind: 'Badges', rarity: 'rare', glyph: '◈', quantity: 1, acquired: 'Joined 3 Sep' },
  { id: 'iv7', name: 'Twelve Week Streak', kind: 'Badges', rarity: 'epic', glyph: '❋', quantity: 1, acquired: 'Earned 19 Jan' },
  { id: 'iv8', name: 'Slow Fade Entry', kind: 'Effects', rarity: 'common', glyph: '◐', quantity: 1, acquired: 'Free with tier 1' },
  { id: 'iv9', name: 'Tide Entrance', kind: 'Effects', rarity: 'epic', glyph: '≋', quantity: 1, acquired: 'Mission reward, 22 Jan', equipped: true },
  { id: 'iv10', name: 'Aurora Frame', kind: 'Frames', rarity: 'legendary', glyph: '⬡', quantity: 1, acquired: 'Creator Summit 2025', equipped: true, expires: '18 days' },
  { id: 'iv11', name: 'Kiln Frame', kind: 'Frames', rarity: 'rare', glyph: '⬢', quantity: 1, acquired: 'Bought 14 Dec' },
  { id: 'iv12', name: 'Summit Pass, Lisbon', kind: 'Passes', rarity: 'epic', glyph: '✧', quantity: 2, acquired: 'Bought 30 Jan', expires: '26 days' },
  { id: 'iv13', name: 'Workshop Pass — token pipeline', kind: 'Passes', rarity: 'rare', glyph: '◉', quantity: 1, acquired: 'Bought 6 Feb', expires: '4 days' },
];

const SLOTS = [
  { id: 'sl1', slot: 'Avatar frame', item: 'Aurora Frame', glyph: '⬡', rarity: 'legendary' as Rarity },
  { id: 'sl2', slot: 'Chat badge', item: 'Founding Member', glyph: '❂', rarity: 'legendary' as Rarity },
  { id: 'sl3', slot: 'Entry effect', item: 'Tide Entrance', glyph: '≋', rarity: 'epic' as Rarity },
  { id: 'sl4', slot: 'Profile theme', item: null, glyph: '◇', rarity: 'common' as Rarity },
];

const RARITY_PIPS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };
const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const LEGEND: { rarity: Rarity; note: string }[] = [
  { rarity: 'common', note: 'Included with any tier or bundle' },
  { rarity: 'rare', note: 'Bought, or earned from a weekly mission' },
  { rarity: 'epic', note: 'Seasonal rewards and limited drops' },
  { rarity: 'legendary', note: 'Event-only. Never re-issued.' },
];

const EXPIRING = ITEMS.filter((item) => item.expires);

function Pips({ rarity }: { rarity: Rarity }) {
  const count = RARITY_PIPS[rarity];
  return (
    <span className="sy-gift-pips">
      <span aria-hidden="true">
        {[1, 2, 3, 4].map((pip) => (
          <span key={pip} className={pip <= count ? 'is-on' : 'is-off'} />
        ))}
      </span>
      <span className="sy-sr-only">{RARITY_LABEL[rarity]} tier</span>
    </span>
  );
}

export function InventoryScreen() {
  const [tab, setTab] = useState('all');

  const counts: Record<string, number> = {
    all: ITEMS.length,
    Gifts: ITEMS.filter((item) => item.kind === 'Gifts').length,
    Badges: ITEMS.filter((item) => item.kind === 'Badges').length,
    Effects: ITEMS.filter((item) => item.kind === 'Effects').length,
    Frames: ITEMS.filter((item) => item.kind === 'Frames').length,
    Passes: ITEMS.filter((item) => item.kind === 'Passes').length,
  };

  const visible = tab === 'all' ? ITEMS : ITEMS.filter((item) => item.kind === tab);

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-inv">
        <ScreenSection title="Equipped loadout" eyebrow="What other people see">
          <div className="sy-grid sy-loadout" style={{ ['--min' as string]: '152px' }}>
            {SLOTS.map((slot) => (
              <Surface
                key={slot.id}
                elevation={slot.item ? 'raised' : 'sunken'}
                padding="md"
                radius="lg"
                className={`sy-slot is-${slot.rarity}${slot.item ? '' : ' is-empty'}`}
              >
                <span className="sy-caption sy-fg-quiet sy-slot__label">{slot.slot}</span>
                <span className="sy-slot__glyph" aria-hidden="true">
                  {slot.glyph}
                </span>
                {slot.item ? (
                  <>
                    <span className="sy-label sy-truncate">{slot.item}</span>
                    <Pips rarity={slot.rarity} />
                  </>
                ) : (
                  <>
                    <span className="sy-label sy-fg-muted">Slot empty</span>
                    <Button variant="outline" size="xs" icon="plus">
                      Choose
                    </Button>
                  </>
                )}
              </Surface>
            ))}
          </div>
        </ScreenSection>

        <ScreenSection
          title="Expiring soon"
          eyebrow="Time-limited items"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              Renewal options
            </Button>
          }
        >
          <Surface elevation="surface" padding="none" radius="lg" className="sy-inv-expiring">
            <ul>
              {EXPIRING.map((item) => (
                <li key={item.id}>
                  <span className={`sy-inv-expiring__glyph is-${item.rarity}`} aria-hidden="true">
                    {item.glyph}
                  </span>
                  <span className="sy-inv-expiring__text">
                    <span className="sy-label sy-truncate">{item.name}</span>
                    <span className="sy-caption sy-fg-quiet">
                      {RARITY_LABEL[item.rarity]} · {item.acquired}
                    </span>
                  </span>
                  <span className="sy-inv-expiring__count">
                    <Icon name="clock" size={14} />
                    <span className="sy-mono">{item.expires}</span>
                    <span className="sy-caption sy-fg-quiet">left</span>
                  </span>
                  <Button variant="outline" size="sm">
                    Extend
                  </Button>
                </li>
              ))}
            </ul>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Collection" eyebrow={`${ITEMS.length} items owned`}>
          <Tabs
            variant="underline"
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'all', label: 'All', badge: counts.all },
              { id: 'Gifts', label: 'Gifts', badge: counts.Gifts },
              { id: 'Badges', label: 'Badges', badge: counts.Badges },
              { id: 'Effects', label: 'Effects', badge: counts.Effects },
              { id: 'Frames', label: 'Frames', badge: counts.Frames },
              { id: 'Passes', label: 'Passes', badge: counts.Passes },
            ]}
          />

          <div className="sy-grid sy-enter" style={{ ['--min' as string]: '158px' }}>
            {visible.map((item) => (
              <Surface
                key={item.id}
                as="article"
                elevation="surface"
                padding="md"
                radius="lg"
                className={`sy-inv-card is-${item.rarity}${item.equipped ? ' is-equipped' : ''}`}
              >
                <div className="sy-inv-card__top">
                  <Pips rarity={item.rarity} />
                  {item.quantity > 1 && (
                    <Badge tone="neutral" variant="solid" className="sy-inv-card__qty">
                      ×{item.quantity}
                    </Badge>
                  )}
                </div>
                <span className="sy-inv-card__glyph" aria-hidden="true">
                  {item.glyph}
                </span>
                <h3 className="sy-label sy-clamp-2 sy-inv-card__name">{item.name}</h3>
                <p className="sy-caption sy-fg-quiet">{item.acquired}</p>
                {item.equipped ? (
                  <span className="sy-inv-card__equipped">
                    <Icon name="check" size={13} />
                    Equipped
                  </span>
                ) : (
                  <Button variant="outline" size="sm" fullWidth>
                    {item.kind === 'Gifts' || item.kind === 'Passes' ? 'Use' : 'Equip'}
                  </Button>
                )}
              </Surface>
            ))}
          </div>
        </ScreenSection>

        <ScreenSection title="Rarity legend">
          <Surface elevation="flat" padding="md" radius="lg">
            <ul className="sy-rarity-legend">
              {LEGEND.map((entry) => (
                <li key={entry.rarity} className={`is-${entry.rarity}`}>
                  <span className="sy-rarity-legend__chip" aria-hidden="true" />
                  <Pips rarity={entry.rarity} />
                  <span className="sy-label sy-rarity-legend__name">{RARITY_LABEL[entry.rarity]}</span>
                  <span className="sy-caption sy-fg-muted">{entry.note}</span>
                </li>
              ))}
            </ul>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}
