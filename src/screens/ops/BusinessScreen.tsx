/**
 * Business dashboard
 * ---------------------------------------------------------------------------
 * The brand-side view of SYLORA: what was spent, what it bought, and which
 * creators produced it. Written for someone who has to defend the number in a
 * meeting, which drives three decisions:
 *
 *   - Cost per engagement is a hero metric, not a footnote. Impressions are
 *     the figure agencies quote and the figure clients discount; the unit cost
 *     is the one that survives the meeting.
 *   - Budget pacing shows planned *and* actual on the same axis. A single
 *     "spent so far" bar cannot answer "are we early or late", which is the
 *     only question anyone asks of a pacing chart.
 *   - The creator roster carries eCPM beside audience size, because the
 *     largest audience on the roster is also the cheapest per thousand and the
 *     smallest is the dearest. A panel that showed followers alone would
 *     recommend exactly the wrong creator.
 *
 * The account switcher sits in the header rather than the shell, because an
 * agency operating six brands changes it more often than it changes screen.
 */

import { useState } from 'react';

import {
  AvatarGroup,
  Avatar,
  Badge,
  Button,
  Chip,
  Icon,
  IconButton,
  Select,
  Stat,
  Surface,
  type IconName,
  type Tone,
} from '../../design-system/primitives';
import { ScreenSection } from '../components';

/* ------------------------------------------------------------------ */
/* Campaign performance                                                */
/* ------------------------------------------------------------------ */

const PERFORMANCE: { label: string; value: string; delta: string; icon: IconName }[] = [
  { label: 'Spend', value: '€148,240', delta: '+12.4%', icon: 'wallet' },
  { label: 'Impressions', value: '24.8M', delta: '+8.1%', icon: 'eye' },
  { label: 'Engagement rate', value: '6.4%', delta: '+0.9pp', icon: 'heart' },
  // Falling unit cost is the good outcome, so it says so in words rather than
  // borrowing the signed-delta colouring, which would render it as a loss.
  { label: 'Cost per engagement', value: '€0.093', delta: 'down 4.2%', icon: 'coin' },
];

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

type CampaignState = 'Live' | 'Paused' | 'Scheduled' | 'Ended';

const CAMPAIGN_META: Record<CampaignState, { tone: Tone; icon: IconName }> = {
  Live: { tone: 'live', icon: 'live' },
  Paused: { tone: 'warning', icon: 'pause' },
  Scheduled: { tone: 'neutral', icon: 'calendar' },
  Ended: { tone: 'neutral', icon: 'check' },
};

const CAMPAIGNS: {
  id: string;
  name: string;
  state: CampaignState;
  creators: { name: string }[];
  budget: number;
  spent: number;
  reach: string;
  ends: string;
}[] = [
  {
    id: 'cp1',
    name: 'FR-2 field recorder launch',
    state: 'Live',
    creators: [{ name: 'Tobias Lindqvist' }, { name: 'Amara Okonkwo' }, { name: 'Mateo Fernández-Ruiz' }],
    budget: 64000,
    spent: 41280,
    reach: '9.4M',
    ends: '28 Feb',
  },
  {
    id: 'cp2',
    name: 'Kermadec expedition sponsorship',
    state: 'Live',
    creators: [{ name: 'Dr. Ngozi Adeyemi' }],
    budget: 38000,
    spent: 31920,
    reach: '6.1M',
    ends: '16 Feb',
  },
  {
    id: 'cp3',
    name: 'Studio monitor winter push',
    state: 'Live',
    creators: [{ name: 'Amara Okonkwo' }, { name: 'Tobias Lindqvist' }, { name: 'Yuki Tanaka' }],
    budget: 26500,
    spent: 19610,
    reach: '4.2M',
    ends: '09 Mar',
  },
  {
    id: 'cp4',
    name: 'Thermal probe kitchen series',
    state: 'Paused',
    creators: [{ name: 'Léa Bouchard-Tremblay' }],
    budget: 18000,
    spent: 7020,
    reach: '2.8M',
    ends: '31 Mar',
  },
  {
    id: 'cp5',
    name: 'Creator Summit Lisbon — booth and stage',
    state: 'Scheduled',
    creators: [
      { name: 'Amara Okonkwo' },
      { name: 'Priya Raghunathan' },
      { name: 'Dr. Ngozi Adeyemi' },
      { name: 'Léa Bouchard-Tremblay' },
      { name: 'Mateo Fernández-Ruiz' },
    ],
    budget: 22000,
    spent: 0,
    reach: '—',
    ends: '05 Mar',
  },
];

/* ------------------------------------------------------------------ */
/* Roster                                                              */
/* ------------------------------------------------------------------ */

const ROSTER = [
  { name: 'Amara Okonkwo', handle: '@amara.builds', category: 'Design & Engineering', audience: '482K', engagement: '7.8%', ecpm: '€18.40' },
  { name: 'Priya Raghunathan', handle: '@priya.teaches', category: 'Education', audience: '1.24M', engagement: '5.1%', ecpm: '€12.90' },
  { name: 'Dr. Ngozi Adeyemi', handle: '@ngozi.science', category: 'Science', audience: '724K', engagement: '9.2%', ecpm: '€21.60' },
  { name: 'Tobias Lindqvist', handle: '@tobiaslind', category: 'Music & Audio', audience: '96.4K', engagement: '11.4%', ecpm: '€26.80' },
  { name: 'Mateo Fernández-Ruiz', handle: '@mateofr', category: 'Photography', audience: '213K', engagement: '6.3%', ecpm: '€14.20' },
];

/* ------------------------------------------------------------------ */
/* Pacing                                                              */
/* ------------------------------------------------------------------ */

/** Thousands of euros. Actual sums to 148.2, which is the spend hero figure. */
const PACING = [
  { week: 'W1', planned: 16, actual: 13.1 },
  { week: 'W2', planned: 16, actual: 14.6 },
  { week: 'W3', planned: 18, actual: 17.2 },
  { week: 'W4', planned: 18, actual: 21.6 },
  { week: 'W5', planned: 20, actual: 22.9 },
  { week: 'W6', planned: 20, actual: 24.1 },
  { week: 'W7', planned: 22, actual: 21.3 },
  { week: 'W8', planned: 18, actual: 13.4 },
];

/**
 * Planned versus actual, drawn as two bars per week rather than one bar and a
 * line. Overlaying a line on eight columns forces the eye to interpolate
 * between weeks that are not continuous — spend is bucketed, not sampled.
 * Over-plan weeks carry the warning tone *and* a taller bar, so the overspend
 * is legible without the colour.
 */
function PacingChart() {
  const max = Math.max(...PACING.flatMap((week) => [week.planned, week.actual]));
  return (
    <div className="sy-bz-pace">
      <div className="sy-bz-pace__plot" aria-hidden="true">
        {PACING.map((week) => (
          <div key={week.week} className="sy-bz-pace__col">
            <div className="sy-bz-pace__bars">
              <span
                className="sy-bz-pace__bar is-planned"
                style={{ blockSize: `${(week.planned / max) * 100}%` }}
              />
              <span
                className={`sy-bz-pace__bar is-actual${week.actual > week.planned ? ' is-over' : ''}`}
                style={{ blockSize: `${(week.actual / max) * 100}%` }}
              />
            </div>
            <span className="sy-bz-pace__label sy-caption sy-fg-quiet">{week.week}</span>
          </div>
        ))}
      </div>
      <table className="sy-sr-only">
        <caption>Planned and actual spend by week, in thousands of euros</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Planned</th>
            <th scope="col">Actual</th>
          </tr>
        </thead>
        <tbody>
          {PACING.map((week) => (
            <tr key={week.week}>
              <th scope="row">{week.week}</th>
              <td>€{week.planned.toFixed(1)}k</td>
              <td>€{week.actual.toFixed(1)}k</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

const TEAM: { name: string; email: string; role: string; tone: Tone; icon: IconName; seen: string }[] = [
  { name: 'Ines Wallenberg', email: 'ines@northmark.io', role: 'Owner', tone: 'accent', icon: 'key', seen: 'Now' },
  { name: 'Kofi Mensah', email: 'kofi@northmark.io', role: 'Campaign manager', tone: 'neutral', icon: 'business', seen: '2h ago' },
  { name: 'Renata Silveira', email: 'renata@northmark.io', role: 'Analyst · read-only', tone: 'neutral', icon: 'eye', seen: 'Yesterday' },
  { name: 'Tom Bagley', email: 'tom@bagley-partners.co.uk', role: 'Billing · external', tone: 'warning', icon: 'creditCard', seen: '6 Feb' },
];

const euros = (value: number) => `€${value.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

export function BusinessScreen() {
  const [range, setRange] = useState('quarter');

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-bz">
        <header className="sy-bz__head">
          <div className="sy-bz__title">
            <Chip icon="business" selected className="sy-bz__account">
              Northmark Audio
              <Icon name="chevronDown" size={14} />
            </Chip>
            <h1 className="sy-title-2">Campaigns</h1>
            <p className="sy-body-sm sy-fg-muted">
              5 active · 12 creators under contract · quarter to date
            </p>
          </div>
          <div className="sy-bz__head-actions">
            <Select
              label="Reporting period"
              value={range}
              onChange={(event) => setRange(event.target.value)}
              options={[
                { value: 'month', label: 'This month' },
                { value: 'quarter', label: 'This quarter' },
                { value: 'year', label: 'Year to date' },
              ]}
              className="sy-bz__range"
            />
            <Button variant="primary" size="sm" icon="plus">
              New campaign
            </Button>
          </div>
        </header>

        <section className="sy-bz__stats" aria-label="Campaign performance, quarter to date">
          {PERFORMANCE.map((metric) => (
            <Surface key={metric.label} padding="sm" elevation="surface">
              <Stat label={metric.label} value={metric.value} delta={metric.delta} icon={metric.icon} />
            </Surface>
          ))}
        </section>

        <ScreenSection
          title="Active campaigns"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              All 23
            </Button>
          }
        >
          <Surface padding="none" elevation="surface">
            <div className="sy-table-scroll">
              <table className="sy-data-table sy-bz__table">
                <caption className="sy-sr-only">
                  Active campaigns with status, creators, budget, spend, reach and end date
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sy-data-table__wide">Campaign</th>
                    <th scope="col">Status</th>
                    <th scope="col">Creators</th>
                    <th scope="col" className="sy-bz__budget-col">Budget</th>
                    <th scope="col" className="sy-data-table__num">Reach</th>
                    <th scope="col" className="sy-data-table__num">Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMPAIGNS.map((campaign) => {
                    const meta = CAMPAIGN_META[campaign.state];
                    const pct = Math.round((campaign.spent / campaign.budget) * 100);
                    return (
                      <tr key={campaign.id}>
                        <th scope="row" className="sy-data-table__wide">
                          <span className="sy-data-table__title sy-clamp-2">{campaign.name}</span>
                        </th>
                        <td>
                          <Badge tone={meta.tone} variant="soft" icon={meta.icon}>
                            {campaign.state}
                          </Badge>
                        </td>
                        <td>
                          <AvatarGroup people={campaign.creators} max={3} size={26} />
                          <span className="sy-sr-only">
                            {campaign.creators.map((creator) => creator.name).join(', ')}
                          </span>
                        </td>
                        {/* Budget and spend share one cell: the percentage is
                            meaningless without the ceiling it is a percentage of. */}
                        <td className="sy-bz__budget-col">
                          <span className="sy-bz-budget">
                            <span className="sy-bz-budget__figures">
                              <span className="sy-mono sy-fg-default">{euros(campaign.spent)}</span>
                              <span className="sy-caption sy-fg-quiet sy-mono">
                                {pct}% of {euros(campaign.budget)}
                              </span>
                            </span>
                            <span className="sy-meter" aria-hidden="true">
                              <span className="sy-meter__fill" style={{ inlineSize: `${pct}%` }} />
                            </span>
                          </span>
                        </td>
                        <td className="sy-data-table__num sy-mono">{campaign.reach}</td>
                        <td className="sy-data-table__num sy-mono">{campaign.ends}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        </ScreenSection>

        <div className="sy-bz__split">
          <ScreenSection title="Budget pacing" eyebrow="Planned vs actual · € thousands">
            <Surface padding="lg" elevation="surface">
              <div className="sy-bz__pace-head">
                <div className="sy-bz__pace-figures">
                  <span className="sy-mono-lg sy-fg-default">€148,240</span>
                  <span className="sy-caption sy-fg-muted">spent of €148,000 planned</span>
                </div>
                <div className="sy-bz__legend">
                  <span className="sy-caption sy-fg-muted">
                    <span className="sy-bz__swatch is-planned" aria-hidden="true" />
                    Planned
                  </span>
                  <span className="sy-caption sy-fg-muted">
                    <span className="sy-bz__swatch is-actual" aria-hidden="true" />
                    Actual
                  </span>
                  <span className="sy-caption sy-fg-muted">
                    <span className="sy-bz__swatch is-over" aria-hidden="true" />
                    Over plan
                  </span>
                </div>
              </div>
              <PacingChart />
              <p className="sy-caption sy-fg-muted sy-bz__pace-note">
                <Icon name="info" size={13} />
                0.2% over plan overall, and the three weeks that ran ahead — 4 to 6, the
                FR-2 launch window — account for €10,600 of it. Week 8 is four days in.
              </p>
            </Surface>
          </ScreenSection>

          <ScreenSection title="Billing">
            <Surface padding="lg" elevation="surface" className="sy-bz__billing">
              <div className="sy-bz__invoice">
                <span className="sy-overline sy-fg-muted">Current invoice</span>
                <span className="sy-mono-lg sy-fg-default">€148,240.00</span>
                <span className="sy-caption sy-fg-muted sy-mono">INV-2026-0147</span>
              </div>
              <div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Period</span>
                  <span className="sy-kv__value sy-mono">1 Jan – 11 Feb</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Due</span>
                  <span className="sy-kv__value sy-mono">28 Feb 2026</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">VAT (19%)</span>
                  <span className="sy-kv__value sy-mono">€28,165.60</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Status</span>
                  <span className="sy-kv__value">
                    <Badge tone="warning" variant="soft" icon="clock">
                      Awaiting payment
                    </Badge>
                  </span>
                </div>
              </div>
              <div className="sy-bz__method">
                <span className="sy-tile-icon">
                  <Icon name="creditCard" size={18} />
                </span>
                <div className="sy-grow">
                  <p className="sy-label">Visa ···· 2214</p>
                  <p className="sy-caption sy-fg-muted">Northmark Audio GmbH · expires 09/28</p>
                </div>
                <Button variant="ghost" size="sm">
                  Change
                </Button>
              </div>
              <div className="sy-bz__billing-actions">
                <Button variant="secondary" size="sm" icon="download">
                  Download PDF
                </Button>
                <Button variant="ghost" size="sm" iconEnd="chevronRight">
                  All invoices
                </Button>
              </div>
            </Surface>
          </ScreenSection>
        </div>

        {/* The roster runs full width rather than sharing a row with the team
            list. Sharing gave it roughly 640px — exactly the table's minimum —
            and eCPM, the one figure that justifies the panel over a follower
            count, ended up past the edge of a horizontal scroll. */}
        <ScreenSection
          title="Creator roster"
          eyebrow="5 under contract"
          action={
            <Button variant="ghost" size="sm" icon="follow">
              Invite creator
            </Button>
          }
        >
          <Surface padding="none" elevation="surface">
            <div className="sy-table-scroll">
              <table className="sy-data-table">
                <caption className="sy-sr-only">
                  Partnered creators with category, audience size, engagement rate and eCPM
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sy-data-table__wide">Creator</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="sy-data-table__num">Audience</th>
                    <th scope="col" className="sy-data-table__num">Engagement</th>
                    <th scope="col" className="sy-data-table__num">eCPM</th>
                  </tr>
                </thead>
                <tbody>
                  {ROSTER.map((creator) => (
                    <tr key={creator.handle}>
                      <th scope="row" className="sy-data-table__wide">
                        <span className="sy-bz-creator">
                          <Avatar name={creator.name} size={30} />
                          <span className="sy-bz-creator__text">
                            <span className="sy-data-table__title sy-truncate">{creator.name}</span>
                            <span className="sy-caption sy-fg-quiet sy-mono sy-truncate">
                              {creator.handle}
                            </span>
                          </span>
                        </span>
                      </th>
                      <td className="sy-truncate">{creator.category}</td>
                      <td className="sy-data-table__num sy-mono">{creator.audience}</td>
                      <td className="sy-data-table__num sy-mono">{creator.engagement}</td>
                      <td className="sy-data-table__num sy-mono">{creator.ecpm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="Team & permissions"
          action={
            <Button variant="secondary" size="sm" icon="plus">
              Invite
            </Button>
          }
        >
          <Surface padding="none" elevation="surface">
            <ul className="sy-bz__team">
              {TEAM.map((member) => (
                <li key={member.email} className="sy-bz-member">
                  <Avatar name={member.name} size={34} />
                  <span className="sy-bz-member__text">
                    <span className="sy-label sy-truncate">{member.name}</span>
                    <span className="sy-caption sy-fg-quiet sy-truncate">{member.email}</span>
                  </span>
                  <span className="sy-bz-member__meta">
                    <Badge tone={member.tone} variant="outline" icon={member.icon}>
                      {member.role}
                    </Badge>
                    <span className="sy-caption sy-fg-quiet sy-mono">{member.seen}</span>
                  </span>
                  <IconButton
                    icon="more"
                    label={`Manage access for ${member.name}`}
                    variant="ghost"
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}
