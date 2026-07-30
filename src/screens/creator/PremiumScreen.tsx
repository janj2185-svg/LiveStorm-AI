/**
 * SYLORA Premium
 * ---------------------------------------------------------------------------
 * The only screen in this group aimed at a consumer rather than an operator,
 * and the only one allowed a hero. The other three are read daily by someone
 * who already pays us; this one is read once by someone deciding whether to.
 *
 * PRICING HONESTY
 * The annual toggle shows the annual price *and* its monthly equivalent, so
 * the comparison against the monthly plan is arithmetic the reader does not
 * have to do. The saving is stated as a percentage and as an amount.
 *
 * WHY THE COMPARISON TABLE SCROLLS RATHER THAN STACKS
 * A ten-row, three-column matrix could be collapsed into three per-plan lists
 * on a phone, but that destroys the only thing a comparison table is for:
 * reading one capability across all three plans on a single line. So the table
 * keeps its shape and scrolls horizontally, with the capability column pinned
 * so the row label never leaves the screen.
 */

import { useState } from 'react';

import { LogoMark } from '../../design-system/brand/Logo';
import { Badge, Button, Icon, Surface, Tabs } from '../../design-system/primitives';
import { ScreenSection } from '../components';

type Cycle = 'monthly' | 'annual';

interface Plan {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  tagline: string;
  perks: string[];
  cta: string;
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    tagline: 'Everything you need to watch, follow and take part.',
    perks: [
      'Unlimited watching at up to 1080p',
      'Follow, comment and join public spaces',
      'One story a day',
      '20 AI assistant messages a month',
      'Standard replay retention of 14 days',
    ],
    cta: 'Your current plan',
  },
  {
    id: 'premium',
    name: 'Premium',
    monthly: 8.99,
    annual: 89,
    tagline: 'No ads, 4K, and an assistant that remembers what you watch.',
    featured: true,
    perks: [
      'No ads anywhere, including mid-roll on replays',
      '4K60 playback with 12-hour offline downloads',
      'Unlimited AI assistant with your watch history as context',
      'Live chat priority and a Premium badge in every room',
      '90-day replay retention and unlimited stories',
      '10% back in credits on every gift you send',
    ],
    cta: 'Start 14-day trial',
  },
  {
    id: 'pro',
    name: 'Premium Pro',
    monthly: 19.99,
    annual: 199,
    tagline: 'For people who create as much as they watch.',
    perks: [
      'Everything in Premium',
      'Multi-camera and 4K broadcasting with 6-hour VOD',
      'Studio analytics with 24-month history and CSV export',
      'AI clip and caption generation, 200 renders a month',
      'Two seats for an editor or a moderator',
      'Priority support with a 4-hour first response',
    ],
    cta: 'Upgrade to Pro',
  },
];

interface ComparisonRow {
  capability: string;
  free: string | boolean;
  premium: string | boolean;
  pro: string | boolean;
}

const COMPARISON: ComparisonRow[] = [
  { capability: 'Ad-free watching', free: false, premium: true, pro: true },
  { capability: 'Maximum playback quality', free: '1080p', premium: '4K60', pro: '4K60' },
  { capability: 'Offline downloads', free: false, premium: '12 hours', pro: 'Unlimited' },
  { capability: 'Replay retention', free: '14 days', premium: '90 days', pro: '24 months' },
  { capability: 'AI assistant messages', free: '20 / month', premium: 'Unlimited', pro: 'Unlimited' },
  { capability: 'AI clip and caption rendering', free: false, premium: false, pro: '200 / month' },
  { capability: 'Broadcast quality', free: '720p', premium: '1080p60', pro: '4K60, multi-cam' },
  { capability: 'Analytics history', free: '28 days', premium: '12 months', pro: '24 months, CSV' },
  { capability: 'Team seats', free: false, premium: false, pro: '2 included' },
  { capability: 'Gift credit back', free: false, premium: '10%', pro: '15%' },
  { capability: 'Support response', free: 'Community', premium: '24 hours', pro: '4 hours' },
];

const FAQ = [
  {
    q: 'Does Premium remove ads for the creators I watch?',
    a: 'It removes them for you, and the creator is paid the same. SYLORA pays out a share of your subscription to every channel you watched that month, weighted by watch time, instead of the ad revenue you no longer generate.',
  },
  {
    q: 'What happens to my downloads if I cancel?',
    a: 'Offline files stop playing at the end of the billing period you have already paid for. Nothing is deleted from your account, and re-subscribing restores access to the same files without re-downloading them.',
  },
  {
    q: 'Is Premium Pro the same as being a partner?',
    a: 'No. Pro is a subscription that unlocks broadcasting and studio tooling. The Partner Programme is an earnings agreement with its own eligibility criteria, and it is free to join once you meet them.',
  },
  {
    q: 'Can I switch between monthly and annual mid-term?',
    a: 'Yes, at any time. Switching to annual credits the unused part of the current month against the annual price. Switching back to monthly takes effect when the annual term ends.',
  },
];

const MONEY = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Mark({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="sy-pr__mark is-yes">
        <Icon name="check" size={15} />
        <span className="sy-sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="sy-pr__mark">
        <Icon name="minus" size={15} />
        <span className="sy-sr-only">Not included</span>
      </span>
    );
  }
  return <span className="sy-mono sy-pr__mark-text">{value}</span>;
}

export function PremiumScreen() {
  const [cycle, setCycle] = useState<Cycle>('annual');

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-pr">
        <header className="sy-pr__hero">
          <LogoMark size={52} />
          <Badge tone="accent" variant="soft" icon="premium">
            SYLORA Premium
          </Badge>
          <h1 className="sy-display-3 sy-pr__headline">
            Watch without ads.
            <br />
            <span className="sy-gradient-text">Create without limits.</span>
          </h1>
          <p className="sy-body-lg sy-fg-muted sy-measure">
            One subscription across streaming, spaces, courses and the studio. Your creators are
            paid more when you subscribe than when you watch ads.
          </p>

          <div className="sy-pr__cycle">
            <Tabs
              tabs={[
                { id: 'monthly', label: 'Monthly' },
                { id: 'annual', label: 'Annual' },
              ]}
              active={cycle}
              onChange={(id) => setCycle(id as Cycle)}
              variant="segmented"
            />
            <Badge tone={cycle === 'annual' ? 'success' : 'neutral'} variant="soft" icon="tag">
              Save 17% annually
            </Badge>
          </div>
        </header>

        <ScreenSection>
          <div className="sy-pr__plans">
            {PLANS.map((plan) => {
              const price = cycle === 'annual' ? plan.annual : plan.monthly;
              const perMonth = cycle === 'annual' ? plan.annual / 12 : plan.monthly;
              return (
                <Surface
                  key={plan.id}
                  as="article"
                  padding="lg"
                  radius="xl"
                  elevation={plan.featured ? 'lifted' : 'surface'}
                  className={`sy-pr-plan${plan.featured ? ' is-featured' : ''}`}
                >
                  <div className="sy-pr-plan__head">
                    <h2 className="sy-headline">{plan.name}</h2>
                    {plan.featured && (
                      <Badge tone="accent" variant="solid" icon="sparkles">
                        Most popular
                      </Badge>
                    )}
                  </div>
                  <p className="sy-body-sm sy-fg-muted sy-pr-plan__tagline">{plan.tagline}</p>

                  <p className="sy-pr-plan__price">
                    <span className="sy-mono-lg">
                      {price === 0 ? '€0' : `€${MONEY.format(price)}`}
                    </span>
                    <span className="sy-caption sy-fg-muted">
                      {price === 0 ? 'forever' : cycle === 'annual' ? 'per year' : 'per month'}
                    </span>
                  </p>
                  <p className="sy-caption sy-fg-quiet sy-pr-plan__equivalent">
                    {price === 0
                      ? 'No card required'
                      : cycle === 'annual'
                        ? `€${MONEY.format(perMonth)} a month, billed once · saves €${MONEY.format(
                            plan.monthly * 12 - plan.annual,
                          )}`
                        : `€${MONEY.format(plan.monthly * 12)} a year at this rate`}
                  </p>

                  <ul className="sy-pr-plan__perks">
                    {plan.perks.map((perk) => (
                      <li key={perk}>
                        <Icon name="check" size={15} />
                        <span className="sy-body-sm">{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.featured ? 'primary' : 'outline'}
                    fullWidth
                    disabled={plan.id === 'free'}
                    className="sy-pr-plan__cta"
                  >
                    {plan.cta}
                  </Button>
                </Surface>
              );
            })}
          </div>
        </ScreenSection>

        <ScreenSection title="Compare every plan" eyebrow="Full capability matrix">
          <Surface padding="none" elevation="surface">
            <div className="sy-table-scroll">
              <table className="sy-data-table sy-pr__table">
                <caption className="sy-sr-only">Capabilities by plan</caption>
                <thead>
                  <tr>
                    <th scope="col" className="sy-data-table__wide">Capability</th>
                    <th scope="col" className="sy-pr__col">Free</th>
                    <th scope="col" className="sy-pr__col is-featured">Premium</th>
                    <th scope="col" className="sy-pr__col">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.capability}>
                      <th scope="row" className="sy-data-table__wide">
                        {row.capability}
                      </th>
                      <td className="sy-pr__col">
                        <Mark value={row.free} />
                      </td>
                      <td className="sy-pr__col is-featured">
                        <Mark value={row.premium} />
                      </td>
                      <td className="sy-pr__col">
                        <Mark value={row.pro} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Questions people actually ask">
          <div className="sy-pr__faq">
            {FAQ.map((item) => (
              <Surface key={item.q} padding="md" elevation="surface" as="article">
                <h3 className="sy-label sy-pr__faq-q">
                  <Icon name="help" size={16} />
                  {item.q}
                </h3>
                <p className="sy-body-sm sy-fg-muted">{item.a}</p>
              </Surface>
            ))}
          </div>
        </ScreenSection>

        <ScreenSection>
          <Surface padding="lg" elevation="surface" className="sy-pr__checkout">
            <div className="sy-pr__method">
              <span className="sy-tile-icon">
                <Icon name="creditCard" size={18} />
              </span>
              <div className="sy-grow">
                <p className="sy-label">Visa ···· 2298</p>
                <p className="sy-caption sy-fg-muted">
                  Expires 09/29 · billed in EUR · next charge 1 March
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Change
              </Button>
            </div>
            <p className="sy-caption sy-fg-muted sy-pr__reassure">
              <Icon name="lock" size={14} />
              Cancel any time from Settings. You keep Premium until the end of the period you have
              paid for, and nothing is deleted if you stop.
            </p>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}
