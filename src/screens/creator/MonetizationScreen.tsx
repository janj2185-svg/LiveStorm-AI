/**
 * Monetization
 * ---------------------------------------------------------------------------
 * Money screens fail in one specific way: they show a big encouraging number
 * and hide the arithmetic that turns it into the smaller number that actually
 * lands in a bank account. This screen is built the other way round.
 *
 *   1. Gross, split by source — where the money came from
 *   2. Streams — which of those sources are switched on, and which are not
 *   3. Payout — when the money moves, and to where
 *   4. Fees — the full subtraction, gross to net, with net emphasised
 *
 * The donut and the stream cards are generated from one array. A revenue chart
 * that can disagree with the revenue list beside it is a support ticket
 * waiting to happen, so the two cannot disagree by construction.
 *
 * Eligibility is a separate panel from earning, because they are separate
 * things: this creator is already earning, and the panel is about the Partner
 * Programme on top. Every state carries an icon and a word — a green tick and
 * a grey dash are the same shape to a colour-blind reader.
 */

import {
  Badge,
  Button,
  Icon,
  Progress,
  Surface,
  type IconName,
  type Tone,
} from '../../design-system/primitives';
import { TRANSACTIONS } from '../data';
import { Donut, ScreenSection } from '../components';

const MONEY = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const euro = (value: number) => `€${MONEY.format(value)}`;

interface Stream {
  id: string;
  label: string;
  icon: IconName;
  amount: number;
  trend: string;
  detail: string;
  tone: string;
  active: boolean;
}

/**
 * February to date. The donut, the total and the cards all read from this.
 *
 * Tones come from the categorical series ramp, not from each stream's brand
 * hue: on white a six-hue donut reads as a pinwheel, and the semantic families
 * are already committed to trend direction in the same view.
 */
const STREAMS: Stream[] = [
  {
    id: 'gifts',
    label: 'Gifts',
    icon: 'gift',
    amount: 1842.4,
    trend: '+12.4%',
    detail: 'Aurora Burst ×3, Prism Wave ×11, 284 smaller gifts',
    tone: 'var(--series-1)',
    active: true,
  },
  {
    id: 'memberships',
    label: 'Memberships',
    icon: 'premium',
    amount: 1918.4,
    trend: '+4.1%',
    detail: '284 members across 3 tiers · 11 cancellations',
    tone: 'var(--series-2)',
    active: true,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'marketplace',
    amount: 686.2,
    trend: '−6.8%',
    detail: 'Stream Deck Overlay Kit ×6 and 4 other listings',
    tone: 'var(--series-3)',
    active: true,
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: 'courses',
    amount: 604.75,
    trend: '+21.6%',
    detail: 'Design Systems from First Principles ×14',
    tone: 'var(--series-4)',
    active: true,
  },
  {
    id: 'tips',
    label: 'Tips',
    icon: 'coin',
    amount: 99.0,
    trend: '+2.0%',
    detail: 'One-off contributions, no membership attached',
    tone: 'var(--series-5)',
    active: true,
  },
  {
    id: 'sponsorships',
    label: 'Sponsorships',
    icon: 'business',
    amount: 0,
    trend: '—',
    detail: 'Brand briefs are matched to your category and audience',
    tone: 'var(--series-6)',
    active: false,
  },
];

const EARNING = STREAMS.filter((stream) => stream.amount > 0);
const GROSS = STREAMS.reduce((total, stream) => total + stream.amount, 0);
const PLATFORM_FEE = Number((GROSS * 0.08).toFixed(2));
const PROCESSING_FEE = 128.77;
const NET = Number((GROSS - PLATFORM_FEE - PROCESSING_FEE).toFixed(2));

interface Criterion {
  label: string;
  met: boolean;
  detail: string;
  progress?: number;
}

const ELIGIBILITY: Criterion[] = [
  { label: '10,000 followers', met: true, detail: '12,400 — cleared on 8 November' },
  {
    label: '8,000 watch hours in 12 months',
    met: false,
    detail: '6,140 of 8,000 hours',
    progress: (6140 / 8000) * 100,
  },
  { label: 'Tax and payout details complete', met: true, detail: 'Verified 14 January' },
  {
    label: 'Published in 12 consecutive weeks',
    met: false,
    detail: '9 of 12 weeks — the streak broke over the winter break',
    progress: (9 / 12) * 100,
  },
];

const STATUS_TONE: Record<string, Tone> = {
  Cleared: 'success',
  Pending: 'warning',
  Processing: 'accent',
};

export function MonetizationScreen() {
  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-mz">
        <header className="sy-mz__head">
          <div>
            <span className="sy-overline sy-fg-accent">Studio</span>
            <h1 className="sy-title-2">Monetization</h1>
            <p className="sy-body-sm sy-fg-muted">February to date · closes 28 February</p>
          </div>
          <Button variant="outline" icon="download">
            Statement
          </Button>
        </header>

        <ScreenSection>
          <Surface padding="lg" elevation="surface" className="sy-mz__summary">
            <div className="sy-mz__summary-total">
              <span className="sy-overline sy-fg-muted">Gross this month</span>
              <p className="sy-mz__total sy-mono-lg">{euro(GROSS)}</p>
              <p className="sy-mz__total-delta">
                <Icon name="trendUp" size={14} />
                <span className="sy-mono">+14.9%</span>
                <span className="sy-caption sy-fg-muted">vs January</span>
              </p>
              <p className="sy-caption sy-fg-quiet sy-measure">
                Gross is what viewers paid. The subtraction to what reaches your bank is at the
                bottom of this screen.
              </p>
            </div>

            <div className="sy-mz__donut">
              <Donut
                segments={EARNING.map((stream) => ({
                  label: stream.label,
                  value: stream.amount,
                  tone: stream.tone,
                }))}
                size={148}
                thickness={16}
                centre={
                  <span className="sy-stack sy-center">
                    <span className="sy-mono sy-mz__donut-value">{EARNING.length}</span>
                    <span className="sy-caption sy-fg-quiet">sources</span>
                  </span>
                }
              />
              <ul className="sy-mz__legend">
                {EARNING.map((stream) => (
                  <li key={stream.id}>
                    <span className="sy-mz__dot" style={{ background: stream.tone }} aria-hidden="true" />
                    <span className="sy-caption sy-grow sy-truncate">{stream.label}</span>
                    <span className="sy-caption sy-mono">{euro(stream.amount)}</span>
                    <span className="sy-caption sy-mono sy-fg-quiet sy-mz__legend-pct">
                      {((stream.amount / GROSS) * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Revenue streams" eyebrow="Six ways to earn on SYLORA">
          <div className="sy-mz__streams">
            {STREAMS.map((stream) => (
              <Surface key={stream.id} padding="md" elevation="surface" className="sy-mz-stream">
                <div className="sy-mz-stream__head">
                  <span className="sy-tile-icon">
                    <Icon name={stream.icon} size={18} />
                  </span>
                  <div className="sy-grow">
                    <h3 className="sy-label">{stream.label}</h3>
                    <Badge
                      tone={stream.active ? 'success' : 'neutral'}
                      variant="soft"
                      icon={stream.active ? 'success' : 'minus'}
                    >
                      {stream.active ? 'Active' : 'Not set up'}
                    </Badge>
                  </div>
                </div>
                <p className="sy-mz-stream__amount sy-mono">
                  {stream.active ? euro(stream.amount) : '—'}
                </p>
                <p
                  className={`sy-mz-stream__trend sy-mono${
                    stream.trend.startsWith('+') ? ' is-up' : stream.trend.startsWith('−') ? ' is-down' : ''
                  }`}
                >
                  {stream.trend}
                  {stream.active && <span className="sy-caption sy-fg-quiet"> vs January</span>}
                </p>
                <p className="sy-caption sy-fg-muted sy-clamp-2 sy-mz-stream__detail">{stream.detail}</p>
                <Button variant={stream.active ? 'ghost' : 'outline'} size="sm" fullWidth>
                  {stream.active ? 'Manage' : 'Set up'}
                </Button>
              </Surface>
            ))}
          </div>
        </ScreenSection>

        <div className="sy-mz__split">
          <ScreenSection title="Payouts">
            <Surface padding="lg" elevation="surface" className="sy-mz__payout">
              <div className="sy-mz__payout-next">
                <div>
                  <span className="sy-overline sy-fg-muted">Next payout</span>
                  <p className="sy-mz__payout-amount sy-mono">{euro(NET)}</p>
                </div>
                <div className="sy-mz__payout-when">
                  <Badge tone="accent" variant="soft" icon="calendar">
                    3 March
                  </Badge>
                  <span className="sy-caption sy-fg-quiet">Monthly, 3 working days</span>
                </div>
              </div>

              <div className="sy-mz__method">
                <span className="sy-tile-icon">
                  <Icon name="creditCard" size={18} />
                </span>
                <div className="sy-grow">
                  <p className="sy-label">SEPA transfer · ···· 4417</p>
                  <p className="sy-caption sy-fg-muted">Deutsche Bank, Berlin · verified 14 Jan</p>
                </div>
                <Button variant="ghost" size="sm">
                  Change
                </Button>
              </div>

              <h3 className="sy-label sy-mz__sub">Recent activity</h3>
              <ul className="sy-mz__tx">
                {TRANSACTIONS.map((transaction) => (
                  <li key={transaction.id}>
                    <span className="sy-mz__tx-text">
                      <span className="sy-body-sm sy-truncate">{transaction.label}</span>
                      <span className="sy-caption sy-fg-quiet sy-truncate">{transaction.detail}</span>
                    </span>
                    <span className="sy-mz__tx-meta">
                      <span
                        className={`sy-mono sy-mz__tx-amount${transaction.positive ? ' is-in' : ' is-out'}`}
                      >
                        {transaction.amount}
                      </span>
                      <span className="sy-caption sy-fg-quiet sy-mono">{transaction.date}</span>
                    </span>
                    <Badge tone={STATUS_TONE[transaction.status]} variant="soft">
                      {transaction.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Surface>
          </ScreenSection>

          <div className="sy-mz__aside">
            <ScreenSection title="Partner Programme" eyebrow="Eligibility">
              <Surface padding="lg" elevation="surface">
                <p className="sy-caption sy-fg-muted sy-mz__elig-intro">
                  Two of four met. The programme adds revenue share on ads, early access to
                  brand briefs, and a named partner manager.
                </p>
                <ul className="sy-mz__criteria">
                  {ELIGIBILITY.map((criterion) => (
                    <li key={criterion.label}>
                      <span
                        className={`sy-mz__criterion-icon${criterion.met ? ' is-met' : ''}`}
                        aria-hidden="true"
                      >
                        <Icon name={criterion.met ? 'check' : 'clock'} size={14} />
                      </span>
                      <span className="sy-mz__criterion-text">
                        <span className="sy-body-sm">
                          {criterion.label}
                          <span className="sy-sr-only">{criterion.met ? ' — met' : ' — not yet met'}</span>
                        </span>
                        <span className="sy-caption sy-fg-muted">{criterion.detail}</span>
                        {criterion.progress !== undefined && (
                          <Progress
                            value={criterion.progress}
                            size="sm"
                            tone="accent"
                            label={`${criterion.label} progress`}
                          />
                        )}
                      </span>
                      <span className={`sy-caption sy-mz__criterion-state${criterion.met ? ' is-met' : ''}`}>
                        {criterion.met ? 'Met' : `${Math.round(criterion.progress ?? 0)}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Surface>
            </ScreenSection>

            {/*
              The whole point of this panel is that nothing is rounded away and
              nothing is omitted. Net is the only emphasised row because it is
              the only number the creator can spend.
            */}
            <ScreenSection title="What you actually receive" eyebrow="February to date">
              <Surface padding="lg" elevation="surface">
                <div className="sy-kv">
                  <span className="sy-kv__key">Gross revenue</span>
                  <span className="sy-kv__value sy-mono">{euro(GROSS)}</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Platform fee · 8%</span>
                  <span className="sy-kv__value sy-mono sy-fg-muted">−{euro(PLATFORM_FEE)}</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Payment processing · 2.4% + €0.25</span>
                  <span className="sy-kv__value sy-mono sy-fg-muted">−{euro(PROCESSING_FEE)}</span>
                </div>
                <div className="sy-kv sy-mz__net">
                  <span className="sy-kv__key sy-label">Net payable</span>
                  <span className="sy-kv__value sy-mono sy-mz__net-value">{euro(NET)}</span>
                </div>
                <p className="sy-caption sy-fg-quiet sy-mz__fee-note">
                  Processing is charged by the acquirer, not by SYLORA, and varies with the
                  payment method your audience uses. Currency conversion, where it applies, is
                  shown per transaction in the statement.
                </p>
              </Surface>
            </ScreenSection>
          </div>
        </div>
      </div>
    </div>
  );
}
