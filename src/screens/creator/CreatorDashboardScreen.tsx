/**
 * Creator dashboard
 * ---------------------------------------------------------------------------
 * The creator's home base, ordered by what a creator can still change.
 *
 *   1. Hero metrics      the scoreboard — read in under two seconds
 *   2. Next broadcast    the only thing on this screen with a deadline
 *   3. Trend + uploads   the evidence behind the scoreboard
 *   4. AI insight        one finding, with its source, at the bottom
 *
 * The AI card sits last on purpose. On the consumer Home screen the assistant
 * leads, because there the user has no agenda. Here the creator arrives with
 * one, and an interpretation is only useful after the raw numbers have been
 * seen — otherwise it becomes the numbers.
 *
 * The date range drives the hero metrics only. The bar chart is explicitly
 * labelled "last 7 days" and stays fixed, because a daily bar chart stops
 * being readable past about a fortnight and silently reinterpreting it as
 * weekly buckets when the range changes would make two charts wear one label.
 */

import { useState } from 'react';

import { AiOrb } from '../../design-system/brand/Logo';
import {
  Badge,
  Button,
  Checkbox,
  Icon,
  Surface,
  Tabs,
  type IconName,
} from '../../design-system/primitives';
import { ANALYTICS_SERIES } from '../data';
import { BarChart, ScreenSection, Sparkline } from '../components';

type RangeId = '7d' | '30d' | '90d' | 'year';

const RANGES = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'year', label: 'Year' },
];

interface HeroMetric {
  label: string;
  value: string;
  delta: string;
  icon: IconName;
  spark: number[];
}

/**
 * Every range carries its own shape as well as its own totals. A sparkline
 * that never changes while the range selector does is a lie the eye catches
 * immediately, and it is the fastest way to make a dashboard feel fake.
 */
const HERO: Record<RangeId, HeroMetric[]> = {
  '7d': [
    { label: 'Watch time', value: '1,284 h', delta: '+18.2%', icon: 'clock', spark: [142, 168, 151, 197, 244, 226, 156] },
    { label: 'New followers', value: '2,418', delta: '+9.4%', icon: 'follow', spark: [284, 312, 297, 366, 421, 398, 340] },
    { label: 'Revenue', value: '€1,206.40', delta: '+22.8%', icon: 'coin', spark: [118, 142, 131, 186, 232, 214, 183] },
    { label: 'Avg. concurrent', value: '412', delta: '−3.1%', icon: 'live', spark: [438, 421, 409, 447, 462, 398, 384] },
  ],
  '30d': [
    { label: 'Watch time', value: '5,140 h', delta: '+11.6%', icon: 'clock', spark: [980, 1064, 1128, 1284, 1198, 1342, 1284] },
    { label: 'New followers', value: '9,882', delta: '+6.2%', icon: 'follow', spark: [1840, 2012, 2196, 2418, 2284, 2506, 2418] },
    { label: 'Revenue', value: '€5,150.75', delta: '+14.9%', icon: 'coin', spark: [842, 968, 1044, 1206, 1128, 1310, 1206] },
    { label: 'Avg. concurrent', value: '396', delta: '+1.8%', icon: 'live', spark: [372, 381, 402, 412, 388, 401, 396] },
  ],
  '90d': [
    { label: 'Watch time', value: '14,608 h', delta: '+27.4%', icon: 'clock', spark: [3820, 4102, 4488, 4726, 5012, 5140, 5140] },
    { label: 'New followers', value: '26,104', delta: '+19.1%', icon: 'follow', spark: [6980, 7412, 8104, 8862, 9204, 9882, 9882] },
    { label: 'Revenue', value: '€13,884.20', delta: '+31.7%', icon: 'coin', spark: [3120, 3486, 3902, 4318, 4722, 5150, 5150] },
    { label: 'Avg. concurrent', value: '361', delta: '+8.6%', icon: 'live', spark: [318, 327, 342, 356, 369, 396, 361] },
  ],
  year: [
    { label: 'Watch time', value: '48,912 h', delta: '+64.0%', icon: 'clock', spark: [2840, 3210, 3806, 4102, 4488, 4726, 5140] },
    { label: 'New followers', value: '84,660', delta: '+41.2%', icon: 'follow', spark: [4120, 5340, 6210, 7412, 8104, 8862, 9882] },
    { label: 'Revenue', value: '€41,928.60', delta: '+58.3%', icon: 'coin', spark: [1980, 2410, 2860, 3486, 3902, 4722, 5150] },
    { label: 'Avg. concurrent', value: '308', delta: '+22.4%', icon: 'live', spark: [214, 236, 261, 288, 312, 340, 361] },
  ],
};

/** Watch-time minutes per view are the two numbers a creator actually acts on. */
const UPLOADS = [
  { id: 'u1', title: 'Rebuilding the token pipeline live — OKLCH, gamut mapping and contrast proofs', published: '2 Feb', views: '84,220', watch: '3,180 h', revenue: '€412.80' },
  { id: 'u2', title: 'Why your contrast audit passes and your interface still fails', published: '29 Jan', views: '41,908', watch: '1,244 h', revenue: '€198.40' },
  { id: 'u3', title: 'Context panels: the 676px problem nobody designs for', published: '24 Jan', views: '28,644', watch: '968 h', revenue: '€146.20' },
  { id: 'u4', title: 'Office hours #14 — reviewing four community design systems', published: '19 Jan', views: '12,806', watch: '1,402 h', revenue: '€88.60' },
  { id: 'u5', title: 'Shipping the encoder pre-warm fix', published: '15 Jan', views: '9,412', watch: '284 h', revenue: '€41.05' },
];

export function CreatorDashboardScreen() {
  const [range, setRange] = useState<RangeId>('7d');
  const metrics = HERO[range];

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-cd">
        <header className="sy-cd__head">
          <div className="sy-cd__greeting">
            <span className="sy-overline sy-fg-accent">Studio</span>
            <h1 className="sy-title-2">Good afternoon, Jordan</h1>
            <p className="sy-body-sm sy-fg-muted">
              Two uploads and one scheduled broadcast this week.
            </p>
          </div>
          <div className="sy-cd__range">
            <Tabs
              tabs={RANGES}
              active={range}
              onChange={(id) => setRange(id as RangeId)}
              variant="segmented"
            />
          </div>
        </header>

        <section className="sy-cd__stats" aria-label={`Headline metrics, last ${range === 'year' ? 'year' : range}`}>
          {metrics.map((metric) => (
            <Surface key={metric.label} className="sy-metric" padding="sm" elevation="surface">
              <div className="sy-metric__head">
                <span className="sy-tile-icon sy-metric__icon">
                  <Icon name={metric.icon} size={15} />
                </span>
                <span className="sy-caption sy-fg-muted sy-truncate">{metric.label}</span>
              </div>
              <p className="sy-metric__value sy-mono-lg">{metric.value}</p>
              <p className={`sy-metric__delta${metric.delta.startsWith('+') ? ' is-up' : ' is-down'}`}>
                <Icon name={metric.delta.startsWith('+') ? 'trendUp' : 'trendDown'} size={13} />
                <span className="sy-mono">{metric.delta}</span>
              </p>
              <div className="sy-metric__spark">
                <Sparkline
                  data={metric.spark}
                  width={120}
                  height={30}
                  tone={metric.delta.startsWith('+') ? 'accent' : 'danger'}
                />
              </div>
            </Surface>
          ))}
        </section>

        {/* The only deadline on the screen, so it gets the accent border and
            sits above the analysis rather than beside it. */}
        <ScreenSection>
          <Surface className="sy-cd__next" padding="lg" elevation="raised" radius="xl">
            <div className="sy-cd__next-text">
              <div className="sy-row sy-gap-2 sy-wrap">
                <Badge tone="live" variant="soft" icon="calendar">
                  Scheduled
                </Badge>
                <span className="sy-caption sy-fg-muted sy-mono">Thu 12 Feb · 18:00 CET</span>
              </div>
              <h2 className="sy-headline">Design review: the SYLORA context panel, live</h2>
              <p className="sy-body-sm sy-fg-muted">
                Design Systems Guild · 1,240 people have set a reminder
              </p>
            </div>
            <div className="sy-cd__next-count">
              <span className="sy-overline sy-fg-muted">Starts in</span>
              <span className="sy-mono-lg sy-cd__countdown">02:41:18</span>
            </div>
            <div className="sy-cd__next-actions">
              <Button variant="primary" tone="live" icon="live">
                Go live
              </Button>
              <Button variant="outline" icon="edit">
                Edit
              </Button>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="Watch time"
          eyebrow="Last 7 days · hours"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              Analytics
            </Button>
          }
        >
          <Surface padding="lg" elevation="surface">
            <BarChart data={ANALYTICS_SERIES} tone="accent" height={168} unit="h" />
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="Recent uploads"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              All 48
            </Button>
          }
        >
          <Surface padding="none" elevation="surface">
            <div className="sy-table-scroll">
              <table className="sy-data-table">
                <caption className="sy-sr-only">
                  Recent uploads with views, watch time and revenue
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sy-data-table__wide">Title</th>
                    <th scope="col">Published</th>
                    <th scope="col" className="sy-data-table__num">Views</th>
                    <th scope="col" className="sy-data-table__num">Watch time</th>
                    <th scope="col" className="sy-data-table__num">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {UPLOADS.map((upload) => (
                    <tr key={upload.id}>
                      <th scope="row" className="sy-data-table__wide">
                        <span className="sy-data-table__title sy-clamp-2">{upload.title}</span>
                      </th>
                      <td className="sy-fg-muted">{upload.published}</td>
                      <td className="sy-data-table__num sy-mono">{upload.views}</td>
                      <td className="sy-data-table__num sy-mono">{upload.watch}</td>
                      <td className="sy-data-table__num sy-mono">{upload.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        </ScreenSection>

        {/*
          One finding, not three. A dashboard insight that lists everything the
          model noticed is a second dashboard; the value is in the model having
          already discarded the other nine. The source line is not decoration —
          it is what lets the creator disagree with the conclusion.
        */}
        <ScreenSection>
          <Surface className="sy-cd__insight" padding="lg" elevation="raised" radius="xl">
            <div className="sy-cd__insight-head">
              <AiOrb size={34} state="idle" />
              <div className="sy-grow">
                <span className="sy-overline sy-fg-accent">Insight</span>
                <h2 className="sy-headline">Retention drops at the screen-share switch</h2>
              </div>
              <Badge tone="accent" variant="soft" icon="sparkles">
                Assistant
              </Badge>
            </div>
            <p className="sy-body-sm sy-fg-muted sy-measure">
              Across your last four broadcasts, <strong className="sy-fg-default">23%</strong> of
              concurrent viewers leave within 40 seconds of minute 12 — the point where you cut
              from the intro segment to screen share. The share starts at 1080p and takes roughly
              nine seconds to sharpen, and there is no verbal signpost before the cut.
            </p>
            <p className="sy-caption sy-fg-quiet sy-cd__source">
              <Icon name="info" size={13} />
              Stream analytics · last 4 broadcasts, and encoder logs · 12 Jan – 2 Feb
            </p>
            <div className="sy-cd__insight-actions">
              <Button variant="primary" size="sm" icon="wand">
                Draft a transition script
              </Button>
              <Button variant="ghost" size="sm">
                Set encoder to pre-warm
              </Button>
            </div>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Context panel                                                       */
/* ------------------------------------------------------------------ */

const COMMENTS = [
  { id: 'q1', author: 'devon_k', body: 'Does the gamut mapping run at build time or at runtime?', age: '2h' },
  { id: 'q2', author: 'sana.p', body: 'Would you ship the neutral envelope change to an existing product mid-quarter?', age: '5h' },
  { id: 'q3', author: 'lin.wei', body: 'The contrast audit output — is that script something you would open source?', age: '1d' },
];

/**
 * Everything here is a task, and every task is reachable elsewhere. The panel
 * is a shortcut for the expanded posture, never the only route.
 */
export function CreatorDashboardContextPanel() {
  const [done, setDone] = useState<Record<string, boolean>>({ script: true });

  const checklist = [
    { id: 'script', label: 'Write the run of show for Thursday' },
    { id: 'thumb', label: 'Replace the thumbnail on the token pipeline VOD' },
    { id: 'reply', label: 'Answer the three pinned questions' },
    { id: 'tax', label: 'Upload the remaining tax document' },
  ];

  return (
    <div className="sy-stack sy-gap-6">
      <section>
        <h3 className="sy-label sy-context-title">Today</h3>
        <div className="sy-stack sy-gap-3 sy-cd-check">
          {checklist.map((item) => (
            <Checkbox
              key={item.id}
              checked={Boolean(done[item.id])}
              onChange={(next) => setDone((state) => ({ ...state, [item.id]: next }))}
              label={item.label}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="sy-label sy-context-title">Waiting on you</h3>
        <div className="sy-stack sy-gap-3">
          {COMMENTS.map((comment) => (
            <article key={comment.id} className="sy-cd-comment">
              <div className="sy-row sy-between sy-gap-2">
                <span className="sy-caption sy-fg-default">
                  <strong>{comment.author}</strong>
                </span>
                <span className="sy-caption sy-fg-quiet sy-mono">{comment.age}</span>
              </div>
              <p className="sy-caption sy-fg-muted sy-clamp-3">{comment.body}</p>
            </article>
          ))}
        </div>
        <Button variant="ghost" size="sm" iconEnd="chevronRight" className="sy-cd-comment__all">
          14 unanswered
        </Button>
      </section>

      <section>
        <h3 className="sy-label sy-context-title">Payout</h3>
        <Surface padding="sm" elevation="raised">
          <div className="sy-row sy-gap-2 sy-cd-payout__state">
            <Icon name="clock" size={15} />
            <span className="sy-label">Processing</span>
          </div>
          <div className="sy-kv">
            <span className="sy-kv__key">January</span>
            <span className="sy-kv__value sy-mono">€4,182.60</span>
          </div>
          <div className="sy-kv">
            <span className="sy-kv__key">Expected</span>
            <span className="sy-kv__value sy-mono">Thu 12 Feb</span>
          </div>
          <div className="sy-kv">
            <span className="sy-kv__key">To</span>
            <span className="sy-kv__value sy-mono">SEPA ···· 4417</span>
          </div>
        </Surface>
      </section>
    </div>
  );
}
