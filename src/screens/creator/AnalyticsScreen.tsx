/**
 * Analytics
 * ---------------------------------------------------------------------------
 * The densest screen in the product, and the one most likely to be read on a
 * 676px column with a context panel stealing the rest. Three decisions follow
 * from that:
 *
 * 1. CHARTS ARE HAND-BUILT SVG, NOT A LIBRARY.
 *    Every chart here needs axis labels that stay 12px whatever the container
 *    does. So the plot is an SVG on a 0-100 viewBox with
 *    `preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"`,
 *    while axis labels, markers and the tooltip are HTML positioned by
 *    percentage on top of it. The geometry stretches, the type never does.
 *
 * 2. COMPARISON IS ALWAYS DRAWN, NEVER STATED.
 *    "+17.0%" is meaningless without its shape. The previous period is a muted
 *    dashed line on the same axis, so a rise driven by one spike is visibly
 *    different from a rise driven by a shifted baseline.
 *
 * 3. TABLES SCROLL, THEY DO NOT SHRINK.
 *    Below roughly 620px a six-column table has to either wrap cells or clip
 *    numbers, and a clipped number is worse than no number. `.sy-table-scroll`
 *    keeps every column at its designed width and moves the overflow into a
 *    horizontal scroll the user controls.
 */

import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Icon,
  Select,
  Surface,
  Tabs,
  type IconName,
} from '../../design-system/primitives';
import { Donut, ScreenSection } from '../components';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const DAYS = [
  '1 Feb', '2 Feb', '3 Feb', '4 Feb', '5 Feb', '6 Feb', '7 Feb',
  '8 Feb', '9 Feb', '10 Feb', '11 Feb', '12 Feb', '13 Feb', '14 Feb',
];

type MetricId = 'views' | 'watch' | 'followers' | 'revenue' | 'engagement';

interface MetricDef {
  id: MetricId;
  label: string;
  icon: IconName;
  /** Headline for the range, already aggregated the way this metric wants. */
  total: string;
  delta: string;
  /** Renders one day's value, and every axis tick. */
  format: (value: number) => string;
  current: number[];
  previous: number[];
}

const METRICS: MetricDef[] = [
  {
    id: 'views',
    label: 'Views',
    icon: 'eye',
    total: '1.93M',
    delta: '+17.0%',
    format: (value) => `${value}K`,
    current: [96, 104, 88, 132, 171, 158, 124, 112, 128, 141, 166, 188, 174, 149],
    previous: [88, 92, 84, 110, 141, 132, 109, 101, 114, 120, 138, 151, 144, 126],
  },
  {
    id: 'watch',
    label: 'Watch time',
    icon: 'clock',
    total: '2,684 h',
    delta: '+14.5%',
    format: (value) => `${value} h`,
    current: [142, 168, 151, 197, 244, 226, 156, 148, 171, 182, 214, 266, 238, 181],
    previous: [128, 144, 139, 166, 208, 196, 141, 132, 151, 164, 188, 221, 204, 162],
  },
  {
    id: 'followers',
    label: 'Followers',
    icon: 'follow',
    total: '5,122',
    delta: '+14.7%',
    format: (value) => `${value}`,
    current: [284, 312, 297, 366, 421, 398, 340, 318, 344, 362, 404, 468, 432, 376],
    previous: [268, 281, 274, 318, 362, 344, 301, 288, 304, 318, 346, 382, 361, 318],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: 'coin',
    total: '€2,676',
    delta: '+18.6%',
    format: (value) => `€${value}`,
    current: [118, 142, 131, 186, 232, 214, 183, 164, 178, 196, 221, 268, 242, 201],
    previous: [104, 122, 118, 158, 196, 181, 152, 141, 148, 166, 184, 214, 201, 172],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    icon: 'heart',
    total: '4.96%',
    delta: '+7.9%',
    format: (value) => `${value}%`,
    current: [4.2, 4.6, 4.1, 5.2, 5.8, 5.4, 4.4, 4.3, 4.8, 4.9, 5.3, 6.1, 5.6, 4.8],
    previous: [4.0, 4.3, 4.0, 4.8, 5.2, 5.0, 4.2, 4.1, 4.4, 4.5, 4.9, 5.4, 5.1, 4.5],
  },
];

/**
 * Ordered by share, and coloured by the categorical series ramp rather than by
 * one hue per source. Green and amber are spoken for by up/down and warning
 * elsewhere on this screen, so spending them on a traffic source would make the
 * reader stop to decide whether a colour is a label or a verdict.
 */
const TRAFFIC = [
  { label: 'Following feed', share: 36.4, tone: 'var(--series-1)' },
  { label: 'Search', share: 22.1, tone: 'var(--series-2)' },
  { label: 'Discover', share: 19.6, tone: 'var(--series-3)' },
  { label: 'External links', share: 13.2, tone: 'var(--series-4)' },
  { label: 'Spaces', share: 8.7, tone: 'var(--series-5)' },
];

const DEVICES = [
  { label: 'Mobile', share: 58.4, detail: 'iOS 34.1% · Android 24.3%' },
  { label: 'Desktop', share: 27.1, detail: 'Chromium 19.8% · Safari 5.4%' },
  { label: 'Tablet', share: 8.9, detail: 'Mostly landscape, mostly evenings' },
  { label: 'TV and console', share: 5.6, detail: 'Longest sessions on the platform' },
];

const GEOGRAPHY = [
  { country: 'Germany', share: 18.4, views: '355K' },
  { country: 'United States', share: 16.2, views: '313K' },
  { country: 'United Kingdom', share: 11.8, views: '228K' },
  { country: 'Netherlands', share: 9.4, views: '181K' },
  { country: 'Sweden', share: 7.1, views: '137K' },
  { country: 'Nigeria', share: 6.3, views: '122K' },
];

/** Percentage of the opening audience still watching, sampled every 2 minutes. */
const RETENTION = [100, 96, 93, 90, 88, 86, 84, 65, 62, 60, 58, 56, 54, 52, 50, 49];
const RETENTION_DROP_INDEX = 6;

interface ContentRow {
  id: string;
  title: string;
  views: number;
  watchHours: number;
  /** Seconds, so the column sorts on duration rather than on "2:16" as text. */
  avgDuration: number;
  ctr: number;
  revenue: number;
}

const TOP_CONTENT: ContentRow[] = [
  { id: 'tc1', title: 'Rebuilding the token pipeline live — OKLCH, gamut mapping and contrast proofs', views: 84220, watchHours: 3180, avgDuration: 136, ctr: 9.4, revenue: 412.8 },
  { id: 'tc2', title: 'Why your contrast audit passes and your interface still fails', views: 41908, watchHours: 1244, avgDuration: 107, ctr: 11.2, revenue: 198.4 },
  { id: 'tc3', title: 'Context panels: the 676px problem nobody designs for', views: 28644, watchHours: 968, avgDuration: 121, ctr: 7.8, revenue: 146.2 },
  { id: 'tc4', title: 'Office hours #14 — reviewing four community design systems', views: 12806, watchHours: 1402, avgDuration: 394, ctr: 4.1, revenue: 88.6 },
  { id: 'tc5', title: 'Shipping the encoder pre-warm fix', views: 9412, watchHours: 284, avgDuration: 108, ctr: 5.6, revenue: 41.05 },
  { id: 'tc6', title: 'Modular patch from scratch, with Tobias Lindqvist', views: 6188, watchHours: 512, avgDuration: 298, ctr: 3.2, revenue: 28.9 },
];

/* ------------------------------------------------------------------ */
/* Formatting and scale helpers                                        */
/* ------------------------------------------------------------------ */

const GROUPED = new Intl.NumberFormat('en-GB');
const MONEY = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Rounds an axis maximum up to a number a human would have chosen. Without
 * this the top gridline lands on 188 or 6.1 and the axis reads as noise.
 */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((candidate) => normalised <= candidate) ?? 10;
  return Number((step * magnitude).toPrecision(3));
}

function linePath(values: number[], max: number): string {
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(3)},${y.toFixed(3)}`;
    })
    .join(' ');
}

function areaPath(values: number[], max: number): string {
  return `${linePath(values, max)} L100,100 L0,100 Z`;
}

/* ------------------------------------------------------------------ */
/* Primary chart                                                       */
/* ------------------------------------------------------------------ */

/** The day the tooltip is pinned to — the peak, which is what gets asked about. */
const TOOLTIP_INDEX = 11;

function TrendChart({ metric }: { metric: MetricDef }) {
  const max = niceCeil(Math.max(...metric.current, ...metric.previous));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * max);
  const labelIndices = [0, 4, 9, DAYS.length - 1];

  const tipX = (TOOLTIP_INDEX / (DAYS.length - 1)) * 100;
  const tipY = 100 - (metric.current[TOOLTIP_INDEX] / max) * 100;
  const change =
    ((metric.current[TOOLTIP_INDEX] - metric.previous[TOOLTIP_INDEX]) /
      metric.previous[TOOLTIP_INDEX]) *
    100;

  return (
    <figure className="sy-chart">
      <div className="sy-chart__frame">
        <div className="sy-chart__yaxis" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="sy-chart__ytick sy-mono"
              style={{ insetBlockStart: `${100 - (tick / max) * 100}%` }}
            >
              {metric.format(Number(tick.toFixed(tick < 10 ? 1 : 0)))}
            </span>
          ))}
        </div>

        <div className="sy-chart__plot">
          <svg
            className="sy-chart__svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                className="sy-chart__grid"
                x1="0"
                x2="100"
                y1={100 - (tick / max) * 100}
                y2={100 - (tick / max) * 100}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path className="sy-chart__area" d={areaPath(metric.current, max)} />
            <path
              className="sy-chart__line sy-chart__line--previous"
              d={linePath(metric.previous, max)}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="sy-chart__line sy-chart__line--current"
              d={linePath(metric.current, max)}
              vectorEffect="non-scaling-stroke"
            />
            <line
              className="sy-chart__guide"
              x1={tipX}
              x2={tipX}
              y1="0"
              y2="100"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <span
            className="sy-chart__marker"
            style={{ insetInlineStart: `${tipX}%`, insetBlockStart: `${tipY}%` }}
            aria-hidden="true"
          />

          {/*
            Rendered statically rather than on hover so the tooltip design is
            reviewable, and so the peak is annotated for a reader who never
            hovers — touch users, print, and anyone reading a screenshot.

            It is pinned to the top of the guide line rather than floated at the
            data point: a tooltip that tracks the y position of a peak is, by
            definition, at the top of the plot and half of it ends up outside.
          */}
          <div
            className={`sy-chart__tip${tipX > 60 ? ' is-flip' : ''}`}
            style={{ insetInlineStart: `${tipX}%` }}
          >
            <span className="sy-caption sy-fg-quiet">{DAYS[TOOLTIP_INDEX]}</span>
            <span className="sy-chart__tip-value sy-mono">
              {metric.format(metric.current[TOOLTIP_INDEX])}
            </span>
            <span className="sy-chart__tip-row sy-caption">
              <span className="sy-chart__swatch sy-chart__swatch--previous" aria-hidden="true" />
              Previous {metric.format(metric.previous[TOOLTIP_INDEX])}
            </span>
            <span className={`sy-chart__tip-delta sy-mono${change >= 0 ? ' is-up' : ' is-down'}`}>
              {change >= 0 ? '+' : '−'}
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="sy-chart__xaxis" aria-hidden="true">
        {labelIndices.map((index) => (
          <span
            key={index}
            className={`sy-chart__xtick sy-caption${
              index === 0 ? ' is-first' : index === DAYS.length - 1 ? ' is-last' : ''
            }`}
            style={{ insetInlineStart: `${(index / (DAYS.length - 1)) * 100}%` }}
          >
            {DAYS[index]}
          </span>
        ))}
      </div>

      <table className="sy-sr-only">
        <caption>{metric.label} by day, this period against the previous period</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">This period</th>
            <th scope="col">Previous period</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, index) => (
            <tr key={day}>
              <th scope="row">{day}</th>
              <td>{metric.format(metric.current[index])}</td>
              <td>{metric.format(metric.previous[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Retention chart                                                     */
/* ------------------------------------------------------------------ */

function RetentionChart() {
  const dropX = (RETENTION_DROP_INDEX / (RETENTION.length - 1)) * 100;
  const dropY = 100 - RETENTION[RETENTION_DROP_INDEX];
  const lost = Math.round(
    ((RETENTION[RETENTION_DROP_INDEX] - RETENTION[RETENTION_DROP_INDEX + 1]) /
      RETENTION[RETENTION_DROP_INDEX]) *
      100,
  );

  return (
    <figure className="sy-chart sy-chart--retention">
      <div className="sy-chart__frame">
        <div className="sy-chart__yaxis" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((tick) => (
            <span
              key={tick}
              className="sy-chart__ytick sy-mono"
              style={{ insetBlockStart: `${100 - tick}%` }}
            >
              {tick}%
            </span>
          ))}
        </div>
        <div className="sy-chart__plot">
          <svg
            className="sy-chart__svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {[0, 25, 50, 75, 100].map((tick) => (
              <line
                key={tick}
                className="sy-chart__grid"
                x1="0"
                x2="100"
                y1={100 - tick}
                y2={100 - tick}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path className="sy-chart__area" d={areaPath(RETENTION, 100)} />
            <path
              className="sy-chart__line sy-chart__line--current"
              d={linePath(RETENTION, 100)}
              vectorEffect="non-scaling-stroke"
            />
            <line
              className="sy-chart__guide sy-chart__guide--alert"
              x1={dropX}
              x2={dropX}
              y1="0"
              y2="100"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            className="sy-chart__marker sy-chart__marker--alert"
            style={{ insetInlineStart: `${dropX}%`, insetBlockStart: `${dropY}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="sy-chart__xaxis" aria-hidden="true">
        {[0, 5, 10, 15].map((index) => (
          <span
            key={index}
            className={`sy-chart__xtick sy-caption${
              index === 0 ? ' is-first' : index === 15 ? ' is-last' : ''
            }`}
            style={{ insetInlineStart: `${(index / (RETENTION.length - 1)) * 100}%` }}
          >
            {index * 2} min
          </span>
        ))}
      </div>

      {/*
        The callout is a sibling of the plot, not a child of it. Overlaying it
        on the curve works at 1024px and drowns the chart at 393px, so it is a
        block annotation under the chart in the compact posture and only floats
        into the empty bottom-right corner once there is room for both.
      */}
      <div className="sy-chart__callout">
        <span className="sy-chart__callout-head">
          <Icon name="trendDown" size={14} />
          <span className="sy-label">Minute 12 · screen-share cut</span>
        </span>
        <p className="sy-caption sy-fg-muted">
          {lost}% of the remaining audience leaves within the next two minutes. The same cliff
          appears in all four of the last broadcasts.
        </p>
      </div>

      <table className="sy-sr-only">
        <caption>Audience retention by elapsed minute</caption>
        <tbody>
          {RETENTION.map((value, index) => (
            <tr key={index}>
              <th scope="row">{index * 2} min</th>
              <td>{value}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

type SortKey = 'views' | 'watchHours' | 'avgDuration' | 'ctr' | 'revenue';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'watchHours', label: 'Watch time' },
  { key: 'avgDuration', label: 'Avg. view' },
  { key: 'ctr', label: 'CTR' },
  { key: 'revenue', label: 'Revenue' },
];

export function AnalyticsScreen() {
  const [metricId, setMetricId] = useState<MetricId>('watch');
  const [range, setRange] = useState('14d');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'views',
    dir: 'desc',
  });

  const metric = METRICS.find((entry) => entry.id === metricId) ?? METRICS[0];

  const rows = useMemo(() => {
    const sorted = [...TOP_CONTENT].sort((a, b) => a[sort.key] - b[sort.key]);
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [sort]);

  const toggleSort = (key: SortKey) =>
    setSort((state) =>
      state.key === key
        ? { key, dir: state.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' },
    );

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-an">
        <header className="sy-an__head">
          <div className="sy-an__title">
            <span className="sy-overline sy-fg-accent">Channel</span>
            <h1 className="sy-title-2">Analytics</h1>
            <p className="sy-body-sm sy-fg-muted sy-mono">1 Feb – 14 Feb · vs 18 Jan – 31 Jan</p>
          </div>
          <div className="sy-an__controls">
            {/*
              The tile row below is the primary metric switcher. This select is
              the same state under a second control, and it only appears in the
              compact posture, where the tiles have to scroll horizontally and
              the current selection can end up off-screen.
            */}
            <Select
              label="Metric"
              className="sy-an__metric-select"
              value={metricId}
              onChange={(event) => setMetricId(event.target.value as MetricId)}
              options={METRICS.map((entry) => ({ value: entry.id, label: entry.label }))}
            />
            <div className="sy-an__range">
              <Tabs
                tabs={[
                  { id: '14d', label: '14d' },
                  { id: '28d', label: '28d' },
                  { id: '90d', label: '90d' },
                ]}
                active={range}
                onChange={setRange}
                variant="segmented"
              />
            </div>
            <Button variant="outline" icon="download">
              Export
            </Button>
          </div>
        </header>

        <div className="sy-an__tiles" role="group" aria-label="Choose a metric">
          {METRICS.map((entry) => {
            const selected = entry.id === metricId;
            return (
              <button
                key={entry.id}
                type="button"
                className={`sy-an-tile${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => setMetricId(entry.id)}
              >
                <span className="sy-an-tile__head">
                  <Icon name={entry.icon} size={14} />
                  <span className="sy-caption sy-truncate">{entry.label}</span>
                </span>
                <span className="sy-an-tile__value sy-mono">{entry.total}</span>
                <span className={`sy-an-tile__delta sy-mono${entry.delta.startsWith('+') ? ' is-up' : ' is-down'}`}>
                  {entry.delta}
                </span>
              </button>
            );
          })}
        </div>

        <ScreenSection>
          <Surface padding="lg" elevation="surface">
            <div className="sy-an__chart-head">
              <div>
                <h2 className="sy-headline">{metric.label}</h2>
                <p className="sy-caption sy-fg-muted">
                  <span className="sy-mono">{metric.total}</span> this period
                </p>
              </div>
              <div className="sy-an__legend">
                <span className="sy-caption sy-fg-muted">
                  <span className="sy-chart__swatch sy-chart__swatch--current" aria-hidden="true" />
                  1 – 14 Feb
                </span>
                <span className="sy-caption sy-fg-muted">
                  <span className="sy-chart__swatch sy-chart__swatch--previous" aria-hidden="true" />
                  18 – 31 Jan
                </span>
              </div>
            </div>
            <TrendChart metric={metric} />
          </Surface>
        </ScreenSection>

        <ScreenSection title="Where the views came from" eyebrow="Breakdown">
          <div className="sy-an__breakdown">
            <Surface padding="lg" elevation="surface">
              <h3 className="sy-label sy-an__panel-title">Traffic sources</h3>
              <div className="sy-an__donut">
                <Donut
                  segments={TRAFFIC.map((source) => ({
                    label: source.label,
                    value: source.share,
                    tone: source.tone,
                  }))}
                  size={124}
                  thickness={14}
                  centre={
                    <span className="sy-stack sy-center">
                      <span className="sy-mono sy-an__donut-value">1.93M</span>
                      <span className="sy-caption sy-fg-quiet">views</span>
                    </span>
                  }
                />
                <ul className="sy-an__legend-list">
                  {TRAFFIC.map((source) => (
                    <li key={source.label}>
                      <span
                        className="sy-an__dot"
                        style={{ background: source.tone }}
                        aria-hidden="true"
                      />
                      <span className="sy-caption sy-grow sy-truncate">{source.label}</span>
                      <span className="sy-caption sy-mono">{source.share.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Surface>

            <Surface padding="lg" elevation="surface">
              <h3 className="sy-label sy-an__panel-title">Devices</h3>
              <ul className="sy-an__bars">
                {DEVICES.map((device) => (
                  <li key={device.label}>
                    <div className="sy-row sy-between sy-gap-3">
                      <span className="sy-body-sm sy-truncate">{device.label}</span>
                      <span className="sy-mono sy-body-sm">{device.share.toFixed(1)}%</span>
                    </div>
                    <span className="sy-meter" aria-hidden="true">
                      <span className="sy-meter__fill" style={{ inlineSize: `${device.share}%` }} />
                    </span>
                    <span className="sy-caption sy-fg-quiet sy-truncate">{device.detail}</span>
                  </li>
                ))}
              </ul>
            </Surface>

            <Surface padding="lg" elevation="surface">
              <h3 className="sy-label sy-an__panel-title">Geography</h3>
              <ol className="sy-an__geo">
                {GEOGRAPHY.map((place, index) => (
                  <li key={place.country}>
                    <span className="sy-an__rank sy-mono">{index + 1}</span>
                    <span className="sy-an__geo-text">
                      <span className="sy-body-sm sy-truncate">{place.country}</span>
                      <span className="sy-meter" aria-hidden="true">
                        <span
                          className="sy-meter__fill"
                          style={{ inlineSize: `${(place.share / GEOGRAPHY[0].share) * 100}%` }}
                        />
                      </span>
                    </span>
                    <span className="sy-an__geo-num">
                      <span className="sy-mono sy-body-sm">{place.share.toFixed(1)}%</span>
                      <span className="sy-caption sy-fg-quiet sy-mono">{place.views}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="sy-caption sy-fg-quiet sy-an__geo-note">
                The remaining 30.8% is spread across 94 countries, none above 2%.
              </p>
            </Surface>
          </div>
        </ScreenSection>

        <ScreenSection
          title="Audience retention"
          eyebrow="Averaged over the last 4 broadcasts"
          action={<Badge tone="warning" variant="soft" icon="warning">Needs attention</Badge>}
        >
          <Surface padding="lg" elevation="surface">
            <RetentionChart />
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="Top content"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              All content
            </Button>
          }
        >
          <Surface padding="none" elevation="surface">
            <div className="sy-table-scroll">
              <table className="sy-data-table sy-data-table--sortable">
                <caption className="sy-sr-only">
                  Top content by {COLUMNS.find((column) => column.key === sort.key)?.label},
                  {sort.dir === 'desc' ? ' highest first' : ' lowest first'}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sy-data-table__wide">Title</th>
                    {COLUMNS.map((column) => {
                      const active = sort.key === column.key;
                      return (
                        <th
                          key={column.key}
                          scope="col"
                          className="sy-data-table__num"
                          aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
                        >
                          <button
                            type="button"
                            className={`sy-data-table__sort${active ? ' is-active' : ''}`}
                            onClick={() => toggleSort(column.key)}
                          >
                            {column.label}
                            <Icon
                              name={active && sort.dir === 'asc' ? 'chevronUp' : 'chevronDown'}
                              size={12}
                            />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="sy-data-table__wide">
                        <span className="sy-data-table__title sy-clamp-2">{row.title}</span>
                      </th>
                      <td className="sy-data-table__num sy-mono">{GROUPED.format(row.views)}</td>
                      <td className="sy-data-table__num sy-mono">{GROUPED.format(row.watchHours)} h</td>
                      <td className="sy-data-table__num sy-mono">{formatDuration(row.avgDuration)}</td>
                      <td className="sy-data-table__num sy-mono">{row.ctr.toFixed(1)}%</td>
                      <td className="sy-data-table__num sy-mono">€{MONEY.format(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
          <p className="sy-caption sy-fg-quiet">
            Average view duration is measured against the full runtime, so a two-hour broadcast
            and a four-minute clip are not directly comparable.
          </p>
        </ScreenSection>
      </div>
    </div>
  );
}
