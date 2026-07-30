/**
 * Wallet
 * ---------------------------------------------------------------------------
 * Money surfaces get exactly one hero. Everything a creator worries about —
 * what is mine, what is not mine yet, and how do I get it out — resolves in the
 * first card, so the rest of the screen can be calm.
 *
 * Two currencies live here and they must never blur together: euro is real
 * money that leaves the platform, credits are a closed-loop balance that only
 * buys gifts and boosts. They are separated by section, by glyph and by type
 * treatment rather than by a label alone, because a person topping up 5,000
 * credits should never wonder whether they just spent €5,000.
 *
 * Amount signs are literal "+" and "−" characters, not colour. A red number in
 * a monochrome screenshot, in a colour-blind eye, or under a blue-light filter
 * is just a number.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  Select,
  Surface,
} from '../../design-system/primitives';
import { Donut, ScreenSection } from '../components';
import { TRANSACTIONS } from '../data';

/**
 * The credit glyph.
 * Drawn rather than typeset so credits are never mistaken for a currency with
 * a real exchange rate: no country has this mark.
 */
function CreditGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="sy-credit-glyph"
    >
      <path
        d="M12 2.6 20.4 7.4v9.2L12 21.4 3.6 16.6V7.4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.8 9.4a3.4 3.4 0 0 0-2.9-1.4c-1.8 0-3 1-3 2.3 0 2.9 6 1.6 6 4.6 0 1.3-1.3 2.3-3.2 2.3a3.6 3.6 0 0 1-3-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PACKAGES = [
  { id: 'tp1', credits: '1,000', price: '€9.99', bonus: null, note: 'Roughly 8 Prism Waves' },
  { id: 'tp2', credits: '5,500', price: '€49.99', bonus: '+10%', note: 'Most popular top-up' },
  { id: 'tp3', credits: '12,000', price: '€99.99', bonus: '+20%', note: 'Two Supernovas, with change' },
  { id: 'tp4', credits: '32,000', price: '€249.99', bonus: '+28%', note: 'Best rate per credit' },
];

const METHODS = [
  { id: 'pm1', kind: 'card' as const, label: 'Visa ···· 4417', detail: 'Expires 04 / 2028', default: true },
  { id: 'pm2', kind: 'card' as const, label: 'Mastercard ···· 9902', detail: 'Expires 11 / 2026', default: false },
  { id: 'pm3', kind: 'bank' as const, label: 'SEPA · Revolut Bank UAB', detail: 'LT52 3250 ···· 8841 · payouts only', default: false },
];

const TX_META: Record<string, { icon: 'gift' | 'premium' | 'marketplace' | 'business' | 'wallet' | 'courses'; tone: string }> = {
  'Gift revenue': { icon: 'gift', tone: 'sy-tone-creator' },
  'Subscription renewals': { icon: 'premium', tone: 'sy-tone-accent' },
  'Marketplace sale': { icon: 'marketplace', tone: 'sy-tone-success' },
  'Platform fee': { icon: 'business', tone: 'sy-tone-neutral' },
  'Payout to bank': { icon: 'wallet', tone: 'sy-tone-neutral' },
  'Course enrolments': { icon: 'courses', tone: 'sy-tone-accent' },
};

const STATUS_TONE = { Cleared: 'success', Pending: 'warning', Processing: 'accent' } as const;
const STATUS_ICON = { Cleared: 'check', Pending: 'clock', Processing: 'refresh' } as const;

const DATE_ORDER = ['Today', 'Yesterday', '2 Feb', '1 Feb'];

export function WalletScreen() {
  const [selectedPackage, setSelectedPackage] = useState('tp2');

  const grouped = DATE_ORDER.map((date) => ({
    date,
    items: TRANSACTIONS.filter((tx) => tx.date === date),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-wallet">
        {/*
          The balance card is the emotional centre of the product for a creator,
          so it is the only place in the wallet that uses a gradient fill and
          display-scale numerals. Pending sits directly beneath available with
          the same alignment: the gap between those two numbers is the single
          thing people check most often.
        */}
        <ScreenSection>
          <Surface className="sy-balance" padding="none" elevation="lifted" radius="2xl">
            <span className="sy-balance__wash" aria-hidden="true" />
            <span className="sy-balance__grid" aria-hidden="true" />
            <div className="sy-balance__body">
              <div className="sy-balance__top">
                <span className="sy-overline sy-balance__eyebrow">Available balance</span>
                <Badge tone="success" variant="soft" icon="check">
                  Verified account
                </Badge>
              </div>
              <p className="sy-balance__amount">
                <span className="sy-balance__currency">€</span>
                <span className="sy-mono sy-balance__figure">7,412.68</span>
              </p>
              <dl className="sy-balance__meta">
                <div>
                  <dt className="sy-caption">Pending clearance</dt>
                  <dd className="sy-mono">€1,284.40</dd>
                </div>
                <div>
                  <dt className="sy-caption">Next payout</dt>
                  <dd className="sy-mono">5 Mar</dd>
                </div>
                <div>
                  <dt className="sy-caption">Lifetime earnings</dt>
                  <dd className="sy-mono">€214,908</dd>
                </div>
              </dl>
              <div className="sy-balance__actions">
                <Button variant="primary" icon="plus" size="lg">
                  Add credits
                </Button>
                <Button variant="glass" icon="download" size="lg">
                  Withdraw
                </Button>
                <IconButton icon="analytics" label="Earnings breakdown" variant="glass" size="lg" />
              </div>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="Credits"
          eyebrow="Closed-loop balance · gifts, boosts and event entry"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              History
            </Button>
          }
        >
          <div className="sy-wallet-credits">
            <Surface className="sy-credit-balance" elevation="surface" padding="lg" radius="lg">
              <span className="sy-credit-balance__mark">
                <CreditGlyph size={30} />
              </span>
              <div>
                <p className="sy-caption sy-fg-muted">Your credit balance</p>
                <p className="sy-mono-lg sy-credit-balance__figure">18,420</p>
                <p className="sy-caption sy-fg-quiet">4,000 expire on 31 March</p>
              </div>
            </Surface>

            <div className="sy-grid sy-topups" role="radiogroup" aria-label="Top-up package">
              {PACKAGES.map((pack) => {
                const selected = pack.id === selectedPackage;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`sy-topup${selected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedPackage(pack.id)}
                  >
                    {pack.bonus && (
                      <span className="sy-topup__bonus">
                        <Icon name="sparkles" size={12} />
                        {pack.bonus} bonus
                      </span>
                    )}
                    <span className="sy-topup__credits">
                      <CreditGlyph size={18} />
                      <span className="sy-mono">{pack.credits}</span>
                    </span>
                    <span className="sy-topup__price sy-mono">{pack.price}</span>
                    <span className="sy-caption sy-fg-quiet sy-topup__note">{pack.note}</span>
                    {selected && (
                      <span className="sy-topup__check">
                        <Icon name="check" size={13} />
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </ScreenSection>

        <ScreenSection title="Payment methods">
          <Surface elevation="surface" padding="none" radius="lg" className="sy-methods">
            <ul>
              {METHODS.map((method) => (
                <li key={method.id} className="sy-method">
                  <span className={`sy-tile-icon ${method.kind === 'bank' ? 'sy-tone-success' : 'sy-tone-accent'}`}>
                    <Icon name={method.kind === 'bank' ? 'business' : 'creditCard'} size={19} />
                  </span>
                  <span className="sy-method__text">
                    <span className="sy-label">{method.label}</span>
                    <span className="sy-caption sy-fg-quiet">{method.detail}</span>
                  </span>
                  {method.default && (
                    <Badge tone="accent" variant="outline" icon="check">
                      Default
                    </Badge>
                  )}
                  <IconButton icon="moreVertical" label={`Manage ${method.label}`} variant="ghost" size="sm" />
                </li>
              ))}
              <li>
                <button type="button" className="sy-method sy-method--add">
                  <span className="sy-tile-icon sy-tone-neutral">
                    <Icon name="plus" size={19} />
                  </span>
                  <span className="sy-method__text">
                    <span className="sy-label">Add a payment method</span>
                    <span className="sy-caption sy-fg-quiet">Card, SEPA direct debit or bank account</span>
                  </span>
                  <Icon name="chevronRight" size={16} />
                </button>
              </li>
            </ul>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Transactions">
          <div className="sy-tx-filters">
            <Select
              label="Type"
              defaultValue="all"
              options={[
                { value: 'all', label: 'All activity' },
                { value: 'in', label: 'Money in' },
                { value: 'out', label: 'Money out' },
                { value: 'gifts', label: 'Gifts' },
                { value: 'fees', label: 'Fees and adjustments' },
              ]}
            />
            <Select
              label="Period"
              defaultValue="30"
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'This quarter' },
                { value: 'year', label: 'This tax year' },
              ]}
            />
            <Button variant="outline" icon="download" className="sy-tx-filters__export">
              Export CSV
            </Button>
          </div>

          <Surface elevation="surface" padding="none" radius="lg" className="sy-tx">
            {grouped.map((group) => (
              <section key={group.date}>
                <h3 className="sy-tx__date sy-overline sy-fg-quiet">{group.date}</h3>
                <ul>
                  {group.items.map((tx) => {
                    const meta = TX_META[tx.label];
                    return (
                      <li key={tx.id} className="sy-tx-row">
                        <span className={`sy-tile-icon ${meta.tone}`}>
                          <Icon name={meta.icon} size={19} />
                        </span>
                        <span className="sy-tx-row__text">
                          <span className="sy-label">{tx.label}</span>
                          <span className="sy-caption sy-fg-quiet sy-truncate">{tx.detail}</span>
                        </span>
                        <Badge tone={STATUS_TONE[tx.status]} variant="soft" icon={STATUS_ICON[tx.status]}>
                          {tx.status}
                        </Badge>
                        <span className={`sy-mono sy-tx-row__amount${tx.positive ? ' is-in' : ''}`}>
                          {tx.amount}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <button type="button" className="sy-tx__more">
              <Icon name="refresh" size={15} />
              Load 43 earlier transactions
            </button>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}

/**
 * Context panel.
 * The breakdown answers "where did this month come from", which is useful but
 * never urgent — exactly the test for panel content. The payout row repeats
 * the date from the hero on purpose: it is the one number people re-check.
 */
export function WalletContextPanel() {
  const segments = [
    { label: 'Subscriptions', value: 1918, tone: 'var(--sy-accent-solid)' },
    { label: 'Gifts', value: 843, tone: 'var(--sy-creator-solid)' },
    { label: 'Marketplace', value: 566, tone: 'var(--sy-live-solid)' },
    { label: 'Courses', value: 1246, tone: 'var(--sy-success-solid)' },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="sy-stack sy-gap-6">
      <section>
        <h3 className="sy-label sy-context-title">February so far</h3>
        <div className="sy-wallet-panel__donut">
          <Donut
            segments={segments}
            size={132}
            thickness={14}
            centre={
              <span className="sy-stack sy-center">
                <span className="sy-mono sy-wallet-panel__total">€{total.toLocaleString('en-GB')}</span>
                <span className="sy-caption sy-fg-quiet">gross</span>
              </span>
            }
          />
        </div>
        <ul className="sy-wallet-panel__legend">
          {segments.map((segment) => (
            <li key={segment.label}>
              <span className="sy-wallet-panel__swatch" style={{ background: segment.tone }} aria-hidden="true" />
              <span className="sy-caption sy-grow">{segment.label}</span>
              <span className="sy-mono sy-caption">€{segment.value.toLocaleString('en-GB')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="sy-label sy-context-title">Next payout</h3>
        <Surface elevation="raised" padding="md" radius="lg" className="sy-stack sy-gap-2">
          <div className="sy-row sy-between">
            <span className="sy-caption sy-fg-muted">Scheduled</span>
            <span className="sy-label">Wed 5 March</span>
          </div>
          <div className="sy-row sy-between">
            <span className="sy-caption sy-fg-muted">Amount</span>
            <span className="sy-mono">€7,412.68</span>
          </div>
          <div className="sy-row sy-between">
            <span className="sy-caption sy-fg-muted">Destination</span>
            <span className="sy-caption">SEPA ···· 4417</span>
          </div>
          <div className="sy-divider" />
          <p className="sy-caption sy-fg-quiet">
            Platform fee of 8% and EU VAT are deducted before transfer. Payouts land within two
            working days.
          </p>
        </Surface>
      </section>

      <section>
        <h3 className="sy-label sy-context-title">Top supporters this month</h3>
        <ul className="sy-stack sy-gap-3">
          {[
            { name: 'marcus_ade', amount: '€412' },
            { name: 'nadia_h', amount: '€288' },
            { name: 'lin.wei', amount: '€164' },
          ].map((person) => (
            <li key={person.name} className="sy-row sy-gap-3">
              <Avatar name={person.name} size={30} />
              <span className="sy-caption sy-grow sy-truncate">{person.name}</span>
              <span className="sy-mono sy-caption">{person.amount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
