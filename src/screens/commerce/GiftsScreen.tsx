/**
 * Virtual gifts
 * ---------------------------------------------------------------------------
 * Gifting is the most emotional transaction on SYLORA and the one most easily
 * turned predatory, so this screen is built to slow the moment down by exactly
 * one beat: catalogue, then a composer that shows the recipient, the total in
 * credits and the remaining balance together before the send button is
 * reachable. Nobody should discover what a gift cost after sending it.
 *
 * The catalogue is grouped by rarity rather than price because rarity is what
 * people actually shop by — "something legendary for Priya's finale" — and
 * price within a tier is the secondary sort.
 *
 * RARITY WITHOUT COLOUR
 * Each tier carries four independent signals: the written tier name on the
 * section and the tile, a pip count (one to four diamonds) that is countable
 * in greyscale, a border that thickens with tier, and finally hue. Legendary
 * additionally gets a halo glow, which survives as a luminance difference. Any
 * one of these alone would fail somebody; together they hold up in monochrome,
 * for every kind of colour vision, and at a glance in peripheral view.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  Progress,
  Surface,
  Textarea,
} from '../../design-system/primitives';
import { Media, ScreenSection } from '../components';
import { CREATORS, GIFTS, type Gift } from '../data';

/**
 * Extra catalogue entries so every rarity reads as a real shelf. A tier holding
 * two or three tiles looks like a bug on a wide display, and the cheap tiers
 * genuinely are the deepest ones on a live platform.
 */
const EXTRA_GIFTS: Gift[] = [
  { id: 'g7', name: 'Tide Line', price: 180, tier: 'rare', icon: '≋' },
  { id: 'g8', name: 'Kiln Flash', price: 260, tier: 'rare', icon: '◉' },
  { id: 'g9', name: 'Lantern', price: 25, tier: 'common', icon: '✧' },
  { id: 'g10', name: 'Deep Field', price: 7500, tier: 'legendary', icon: '❈' },
  { id: 'g11', name: 'Ember', price: 15, tier: 'common', icon: '✦' },
  { id: 'g12', name: 'Ripple', price: 30, tier: 'common', icon: '◌' },
  { id: 'g13', name: 'Beacon', price: 75, tier: 'common', icon: '⌾' },
  { id: 'g14', name: 'Salt Flare', price: 140, tier: 'rare', icon: '✵' },
  { id: 'g15', name: 'Cold Front', price: 320, tier: 'rare', icon: '❄' },
  { id: 'g16', name: 'Kelp Bloom', price: 780, tier: 'epic', icon: '❋' },
  { id: 'g17', name: 'Sonar Ping', price: 950, tier: 'epic', icon: '◎' },
  { id: 'g18', name: 'Trench Light', price: 6200, tier: 'legendary', icon: '✺' },
];

const CATALOGUE = [...GIFTS, ...EXTRA_GIFTS];

const TIERS = [
  { id: 'common' as const, label: 'Common', pips: 1, note: 'Sent thousands of times a night. The applause of the platform.' },
  { id: 'rare' as const, label: 'Rare', pips: 2, note: 'Animated on stream for four seconds and pinned in chat.' },
  { id: 'epic' as const, label: 'Epic', pips: 3, note: 'Takes over the lower third and unlocks a reply from the creator.' },
  { id: 'legendary' as const, label: 'Legendary', pips: 4, note: 'Full-screen celebration, a permanent entry in the stream recap, and a profile badge for 30 days.' },
];

const RECENT = [
  { id: 'r1', direction: 'sent' as const, person: 'Priya Raghunathan', gift: 'Aurora Burst', amount: '500', when: '12 minutes ago' },
  { id: 'r2', direction: 'received' as const, person: 'marcus_ade', gift: 'Prism Wave', amount: '120', when: '1 hour ago' },
  { id: 'r3', direction: 'received' as const, person: 'nadia_h', gift: 'Signal Flare', amount: '1,200', when: '3 hours ago' },
  { id: 'r4', direction: 'sent' as const, person: 'Dr. Ngozi Adeyemi', gift: 'Spark', amount: '10', when: 'Yesterday' },
  { id: 'r5', direction: 'received' as const, person: 'ellis.j', gift: 'Pulse', amount: '50', when: 'Yesterday' },
];

function RarityPips({ count, label }: { count: number; label: string }) {
  return (
    <span className="sy-gift-pips" title={`${label} tier`}>
      <span aria-hidden="true">
        {[1, 2, 3, 4].map((pip) => (
          <span key={pip} className={pip <= count ? 'is-on' : 'is-off'} />
        ))}
      </span>
      <span className="sy-sr-only">{label} tier</span>
    </span>
  );
}

export function GiftsScreen() {
  const [selected, setSelected] = useState<Gift>(GIFTS[3]);
  const [quantity, setQuantity] = useState(2);
  const balance = 18420;
  const total = selected.price * quantity;

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-gifts">
        {/* Scarcity is stated in numbers as well as words. "Limited" alone is a
            marketing claim; 1,412 of 5,000 remaining is a fact people can act on. */}
        <ScreenSection>
          <Surface className="sy-gift-featured" padding="none" elevation="raised" radius="xl">
            <div className="sy-gift-featured__art">
              <span className="sy-gift-featured__glow" aria-hidden="true" />
              <span className="sy-gift-featured__glyph" aria-hidden="true">
                ✷
              </span>
            </div>
            <div className="sy-gift-featured__body">
              <div className="sy-row sy-gap-2 sy-wrap">
                <Badge tone="warning" variant="solid" icon="clock">
                  Limited edition
                </Badge>
                <Badge tone="neutral" variant="outline">
                  1,412 of 5,000 remaining
                </Badge>
              </div>
              <h2 className="sy-title-3">Supernova — Kermadec cut</h2>
              <p className="sy-body-sm sy-fg-muted sy-measure">
                Minted for the deep-sea premiere. Sending one adds your name to the expedition
                credits and funds four minutes of ROV dive time through the SYLORA science fund.
              </p>
              <div className="sy-gift-featured__stock">
                <Progress value={28} tone="warning" label="Remaining stock" />
                <span className="sy-caption sy-fg-muted">28% of the mint left</span>
              </div>
              <div className="sy-gift-featured__foot">
                <span className="sy-gift-featured__countdown">
                  <Icon name="clock" size={16} />
                  <span className="sy-mono">06:41:18</span>
                  <span className="sy-caption sy-fg-quiet">until the mint closes</span>
                </span>
                <span className="sy-grow" />
                <span className="sy-gift-price sy-mono">
                  <Icon name="coin" size={15} />
                  5,000
                </span>
                <Button variant="primary" tone="creator" icon="gift">
                  Send now
                </Button>
              </div>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Catalogue" eyebrow="Grouped by rarity">
          <div className="sy-stack sy-gap-8">
            {TIERS.map((tier) => {
              const items = CATALOGUE.filter((gift) => gift.tier === tier.id);
              return (
                <section key={tier.id} className={`sy-gift-tier is-${tier.id}`}>
                  <header className="sy-gift-tier__head">
                    <RarityPips count={tier.pips} label={tier.label} />
                    <h3 className="sy-headline">{tier.label}</h3>
                    <span className="sy-caption sy-fg-quiet sy-gift-tier__count">{items.length} gifts</span>
                    <p className="sy-caption sy-fg-muted sy-gift-tier__note">{tier.note}</p>
                  </header>
                  <div className="sy-grid" style={{ ['--min' as string]: '124px' }}>
                    {items.map((gift) => {
                      const isSelected = gift.id === selected.id;
                      return (
                        <button
                          key={gift.id}
                          type="button"
                          className={`sy-gift-tile is-${gift.tier}${isSelected ? ' is-selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => setSelected(gift)}
                        >
                          <span className="sy-gift-tile__glyph" aria-hidden="true">
                            {gift.icon}
                          </span>
                          <span className="sy-label sy-truncate sy-gift-tile__name">{gift.name}</span>
                          <span className="sy-gift-price sy-mono">
                            <Icon name="coin" size={13} />
                            {gift.price.toLocaleString('en-GB')}
                          </span>
                          <RarityPips count={tier.pips} label={tier.label} />
                          {isSelected && (
                            <span className="sy-gift-tile__check">
                              <Icon name="check" size={12} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </ScreenSection>

        <ScreenSection title="Send a gift" eyebrow={`${selected.name} selected`}>
          <div className="sy-cols sy-cols--sidebar">
            <Surface className="sy-gift-send" elevation="surface" padding="lg" radius="lg">
              <div className="sy-gift-send__recipient">
                <span className="sy-label sy-fg-muted">Recipient</span>
                <button type="button" className="sy-gift-recipient">
                  <Avatar name={CREATORS[2].name} size={44} verified ring="live" />
                  <span className="sy-gift-recipient__text">
                    <span className="sy-label">{CREATORS[2].name}</span>
                    <span className="sy-caption sy-fg-quiet">
                      {CREATORS[2].handle} · live now, 8.9K watching
                    </span>
                  </span>
                  <Icon name="chevronDown" size={16} />
                </button>
              </div>

              <div className="sy-gift-send__row">
                <div className="sy-gift-send__chosen">
                  <span className={`sy-gift-send__glyph is-${selected.tier}`} aria-hidden="true">
                    {selected.icon}
                  </span>
                  <span>
                    <span className="sy-label">{selected.name}</span>
                    <span className="sy-caption sy-fg-quiet sy-gift-send__unit">
                      {selected.price.toLocaleString('en-GB')} credits each
                    </span>
                  </span>
                </div>

                <div className="sy-stepper" role="group" aria-label="Quantity">
                  <IconButton
                    icon="minus"
                    label="Decrease quantity"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  />
                  <span className="sy-mono sy-stepper__value" aria-live="polite">
                    {quantity}
                  </span>
                  <IconButton
                    icon="plus"
                    label="Increase quantity"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                  />
                </div>
              </div>

              <Textarea
                label="Message to the creator"
                rows={3}
                defaultValue="Congratulations on dive 214 — the sequence at 42 minutes was extraordinary."
                hint="Shown on stream for 8 seconds and kept in the creator's inbox."
              />

              <div className="sy-gift-total">
                <div className="sy-row sy-between">
                  <span className="sy-body-sm sy-fg-muted">
                    {selected.name} × {quantity}
                  </span>
                  <span className="sy-mono">{total.toLocaleString('en-GB')}</span>
                </div>
                <div className="sy-row sy-between">
                  <span className="sy-body-sm sy-fg-muted">Balance after sending</span>
                  <span className="sy-mono sy-fg-muted">{(balance - total).toLocaleString('en-GB')}</span>
                </div>
                <div className="sy-divider" />
                <div className="sy-row sy-between sy-gift-total__final">
                  <span className="sy-label">Total in credits</span>
                  <span className="sy-mono-lg sy-fg-creator">{total.toLocaleString('en-GB')}</span>
                </div>
              </div>

              <div className="sy-gift-send__actions">
                <Button variant="primary" tone="creator" size="lg" icon="gift" fullWidth>
                  Send {selected.name}
                </Button>
                <p className="sy-caption sy-fg-quiet">
                  You hold {balance.toLocaleString('en-GB')} credits. Gifts are final and cannot be
                  refunded once they play on stream.
                </p>
              </div>
            </Surface>

            <div className="sy-stack sy-gap-5">
              {/* A preview, not a promise: the frame is labelled as a simulation so
                  nobody thinks their gift is already live. */}
              <Surface elevation="surface" padding="md" radius="lg">
                <div className="sy-between sy-row sy-gift-preview__head">
                  <h3 className="sy-headline">On-stream preview</h3>
                  <Badge tone="neutral" variant="outline" icon="eye">
                    Simulation
                  </Badge>
                </div>
                <div className="sy-gift-preview">
                  <Media seed="gift-preview-stream" ratio="16/9" radius="md" scrim>
                    <div className="sy-gift-preview__chrome">
                      <span className="sy-gift-preview__live">
                        <span className="sy-gift-preview__dot" aria-hidden="true" />
                        LIVE
                      </span>
                      <span className="sy-gift-preview__viewers sy-mono">8.9K</span>
                    </div>
                    <div className={`sy-gift-cheer is-${selected.tier}`} role="status">
                      <span className="sy-gift-cheer__glyph" aria-hidden="true">
                        {selected.icon}
                      </span>
                      <span className="sy-gift-cheer__text">
                        <span className="sy-label">Jordan Reyes sent {selected.name}</span>
                        <span className="sy-caption sy-gift-cheer__meta">
                          ×{quantity} · {total.toLocaleString('en-GB')} credits
                        </span>
                      </span>
                    </div>
                  </Media>
                </div>
                <p className="sy-caption sy-fg-quiet sy-gift-preview__note">
                  Epic and legendary gifts hold for eight seconds; common gifts stack into a single
                  toast so chat is never buried.
                </p>
              </Surface>

              <Surface elevation="surface" padding="md" radius="lg">
                <h3 className="sy-headline sy-gift-recent__head">Recent gifts</h3>
                <ul className="sy-gift-recent">
                  {RECENT.map((entry) => (
                    <li key={entry.id}>
                      <span className={`sy-tile-icon ${entry.direction === 'sent' ? 'sy-tone-creator' : 'sy-tone-success'}`}>
                        <Icon name={entry.direction === 'sent' ? 'send' : 'gift'} size={17} />
                      </span>
                      <span className="sy-gift-recent__text">
                        <span className="sy-label sy-truncate">
                          {entry.direction === 'sent' ? 'To' : 'From'} {entry.person}
                        </span>
                        <span className="sy-caption sy-fg-quiet">
                          {entry.gift} · {entry.when}
                        </span>
                      </span>
                      <span className="sy-gift-price sy-mono">
                        <Icon name="coin" size={13} />
                        {entry.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              </Surface>
            </div>
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}
