/**
 * Admin panel
 * ---------------------------------------------------------------------------
 * Platform operations, ordered by how fast the reader has to act.
 *
 *   1. Health tiles     is anything on fire right now
 *   2. Services         where it is burning, and how badly
 *   3. Open incident    who owns it and what can be done from here
 *   4. Users            the slow work: accounts, appeals, verification
 *   5. Flags + audit    what we changed, and who changed it
 *
 * Nothing on this screen is celebratory. There is no gradient, no glow and no
 * entrance animation: an operator reading a latency figure at 03:00 should not
 * have to wait for it to arrive, and an admin surface that looks pleased with
 * itself teaches people to skim it.
 *
 * Every state is a dot *and* a word. A red dot alone tells roughly 8% of men
 * nothing at all, and this is the one screen in the product where missing a
 * state has an operational cost rather than an aesthetic one.
 */

import { useState } from 'react';

import {
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
  Select,
  Stat,
  Surface,
  Switch,
  Avatar,
  type IconName,
  type Tone,
} from '../../design-system/primitives';
import { ScreenSection, Sparkline } from '../components';
import { CREATORS } from '../data';

/* ------------------------------------------------------------------ */
/* Platform health                                                     */
/* ------------------------------------------------------------------ */

type HealthState = 'nominal' | 'elevated' | 'breached';

const HEALTH_LABEL: Record<HealthState, string> = {
  nominal: 'Nominal',
  elevated: 'Elevated',
  breached: 'Breached',
};

/**
 * Only three of these six metrics are better when they go up. `Stat` colours a
 * signed delta green for "+" and red for "−", which is right for active users
 * and wrong for error rate, latency and the payout queue — a draining queue is
 * good news rendered in red. So the inverted three state their direction in
 * words and make no colour claim at all; the SLO state beside them is what
 * carries the judgement, and it is the only thing on the tile that should.
 */
const HEALTH: {
  label: string;
  value: string;
  delta: string;
  icon: IconName;
  state: HealthState;
}[] = [
  { label: 'Daily active', value: '1.24M', delta: '+4.2%', icon: 'community', state: 'nominal' },
  { label: 'Concurrent streams', value: '8,412', delta: '+11.8%', icon: 'live', state: 'nominal' },
  { label: 'Ingest throughput', value: '412 Gb/s', delta: '+6.4%', icon: 'pulse', state: 'nominal' },
  { label: 'Error rate', value: '0.14%', delta: 'up 0.05pp · 24h', icon: 'error', state: 'elevated' },
  { label: 'p99 latency', value: '284 ms', delta: 'up 38 ms · 24h', icon: 'clock', state: 'breached' },
  { label: 'Payout queue', value: '1,206', delta: 'down 18.2% · 24h', icon: 'wallet', state: 'nominal' },
];

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

type ServiceState = 'Operational' | 'Degraded' | 'Incident';

const SERVICE_META: Record<ServiceState, { icon: IconName; tone: Tone; dot: string }> = {
  Operational: { icon: 'success', tone: 'success', dot: 'is-ok' },
  Degraded: { icon: 'warning', tone: 'warning', dot: 'is-warn' },
  Incident: { icon: 'error', tone: 'danger', dot: 'is-down' },
};

const SERVICES: {
  name: string;
  state: ServiceState;
  uptime: string;
  detail: string;
  spark: number[];
}[] = [
  { name: 'Ingest', state: 'Operational', uptime: '99.98%', detail: 'RTMP + SRT, 6 regions', spark: [98, 99, 97, 99, 100, 99, 98, 99] },
  { name: 'Transcode', state: 'Degraded', uptime: '98.42%', detail: 'eu-central pool saturated', spark: [99, 98, 96, 88, 74, 69, 71, 68] },
  { name: 'Chat relay', state: 'Operational', uptime: '99.99%', detail: '2.1M sockets held', spark: [99, 100, 99, 99, 100, 100, 99, 100] },
  { name: 'Payments', state: 'Operational', uptime: '100.00%', detail: 'SEPA + card, no queue', spark: [100, 100, 99, 100, 100, 100, 100, 100] },
  { name: 'Search', state: 'Operational', uptime: '99.94%', detail: 'Index lag 4.2s', spark: [99, 98, 99, 97, 98, 99, 99, 98] },
  { name: 'AI inference', state: 'Operational', uptime: '99.87%', detail: 'Queue depth 42', spark: [97, 98, 99, 96, 98, 97, 99, 98] },
];

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

type AccountState = 'Active' | 'In review' | 'Restricted';

const ACCOUNT_META: Record<AccountState, { icon: IconName; tone: Tone }> = {
  Active: { icon: 'check', tone: 'success' },
  'In review': { icon: 'clock', tone: 'warning' },
  Restricted: { icon: 'lock', tone: 'danger' },
};

const USERS: { creator: (typeof CREATORS)[number]; type: string; state: AccountState; joined: string }[] = [
  { creator: CREATORS[0], type: 'Partner', state: 'Active', joined: '14 Mar 2023' },
  { creator: CREATORS[2], type: 'Partner', state: 'Active', joined: '02 Nov 2022' },
  { creator: CREATORS[5], type: 'Partner', state: 'Active', joined: '08 Jun 2023' },
  { creator: CREATORS[3], type: 'Creator', state: 'In review', joined: '21 Jan 2024' },
  { creator: CREATORS[4], type: 'Creator', state: 'Active', joined: '05 Sep 2024' },
  { creator: CREATORS[6], type: 'Creator', state: 'Restricted', joined: '30 Apr 2024' },
];

/* ------------------------------------------------------------------ */
/* Feature flags                                                       */
/* ------------------------------------------------------------------ */

const FLAGS: { key: string; description: string; rollout: number; env: string; on: boolean }[] = [
  { key: 'aurora_token_pipeline', description: 'OKLCH ramp generation at build time', rollout: 100, env: 'Production', on: true },
  { key: 'ai_clip_suggestions', description: 'Assistant proposes clip in/out points on VOD', rollout: 25, env: 'Production', on: true },
  { key: 'multi_host_spaces', description: 'Up to four co-hosts per audio space', rollout: 60, env: 'Staging', on: true },
  { key: 'payouts_instant_sepa', description: 'Same-day settlement for partners in the EEA', rollout: 5, env: 'Production', on: true },
  { key: 'search_vector_rerank', description: 'Second-stage embedding rerank on discovery', rollout: 0, env: 'Development', on: false },
];

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

const AUDIT = [
  { id: 'au1', at: '09:41:22', actor: 'r.calloway', action: 'Suspended account', target: '@fastcash_promo', note: 'Financial scam links · 11 reports' },
  { id: 'au2', at: '09:12:05', actor: 'system', action: 'Rotated signing key', target: 'payouts-eu-1', note: 'Scheduled 90-day rotation' },
  { id: 'au3', at: '08:58:47', actor: 'j.reyes', action: 'Changed flag rollout', target: 'ai_clip_suggestions', note: '10% → 25%' },
  { id: 'au4', at: '08:31:19', actor: 'm.okafor', action: 'Approved payout batch', target: 'batch-2026-02-11', note: '1,206 payouts · €482,914.20' },
  { id: 'au5', at: '07:54:02', actor: 'r.calloway', action: 'Reinstated account', target: '@lin.wei', note: 'Appeal upheld' },
  { id: 'au6', at: '07:02:38', actor: 'system', action: 'Scaled transcode pool', target: 'eu-central', note: '24 → 40 nodes' },
];

export function AdminScreen() {
  const [flags, setFlags] = useState<Record<string, boolean>>(
    () => Object.fromEntries(FLAGS.map((flag) => [flag.key, flag.on])),
  );
  const [query, setQuery] = useState('');
  const [accountType, setAccountType] = useState('all');

  const users = USERS.filter((user) => {
    const matchesType = accountType === 'all' || user.type.toLowerCase() === accountType;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      needle === '' ||
      user.creator.name.toLowerCase().includes(needle) ||
      user.creator.handle.toLowerCase().includes(needle);
    return matchesType && matchesQuery;
  });

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-ad">
        <header className="sy-ad__head">
          <div className="sy-ad__title">
            <span className="sy-overline sy-fg-accent">Platform operations</span>
            <h1 className="sy-title-2">Admin</h1>
            <p className="sy-body-sm sy-fg-muted">
              All regions · window 15 min · refreshed 09:47:12 UTC
            </p>
          </div>
          <div className="sy-ad__head-actions">
            <Button variant="outline" size="sm" icon="refresh">
              Refresh
            </Button>
            <Button variant="secondary" size="sm" icon="download">
              Export window
            </Button>
          </div>
        </header>

        {/* The status word is not decoration for the dot — it is the state. The
            dot is the fast read, the word is the correct one. */}
        <section className="sy-ad__health" aria-label="Platform health">
          {HEALTH.map((metric) => (
            <Surface key={metric.label} className="sy-ad-health" padding="sm" elevation="surface">
              <span className={`sy-ad-health__state is-${metric.state}`}>
                <span className="sy-ad-dot" aria-hidden="true" />
                {HEALTH_LABEL[metric.state]}
              </span>
              <Stat label={metric.label} value={metric.value} delta={metric.delta} icon={metric.icon} />
            </Surface>
          ))}
        </section>

        <div className="sy-ad__split">
          <ScreenSection title="Services">
            <Surface padding="none" elevation="surface">
              <ul className="sy-ad__services">
                {SERVICES.map((service) => {
                  const meta = SERVICE_META[service.state];
                  return (
                    <li key={service.name} className="sy-ad-service">
                      <span className={`sy-ad-dot ${meta.dot}`} aria-hidden="true" />
                      <span className="sy-ad-service__text">
                        <span className="sy-label sy-truncate">{service.name}</span>
                        <span className="sy-caption sy-fg-quiet sy-truncate">{service.detail}</span>
                      </span>
                      <span className="sy-ad-service__spark" aria-hidden="true">
                        <Sparkline
                          data={service.spark}
                          width={72}
                          height={22}
                          tone={service.state === 'Operational' ? 'success' : 'danger'}
                        />
                      </span>
                      <span className="sy-ad-service__uptime sy-mono sy-caption">{service.uptime}</span>
                      <Badge tone={meta.tone} variant="soft" icon={meta.icon}>
                        {service.state}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          </ScreenSection>

          {/* One open incident gets a whole card. Two would get a list, and the
              list is what stops anyone reading either of them. */}
          <ScreenSection title="Open incident">
            <Surface className="sy-ad-incident" padding="lg" elevation="raised">
              <div className="sy-ad-incident__head">
                <Badge tone="warning" variant="solid" icon="warning">
                  SEV-2
                </Badge>
                <span className="sy-mono sy-caption sy-fg-quiet">INC-2291</span>
              </div>
              <h3 className="sy-headline">Transcode latency above SLO in eu-central</h3>
              <p className="sy-body-sm sy-fg-muted">
                1080p60 ladder is queueing behind a backlog of 4K VOD jobs. Live output is
                unaffected; VOD publish is running 6–11 minutes late for roughly 4% of uploads.
              </p>
              <dl className="sy-ad-incident__facts">
                <div className="sy-kv">
                  <dt className="sy-kv__key">Started</dt>
                  <dd className="sy-kv__value sy-mono">08:12 UTC · 1h 35m ago</dd>
                </div>
                <div className="sy-kv">
                  <dt className="sy-kv__key">Owner</dt>
                  <dd className="sy-kv__value">Marta Okafor · Media platform</dd>
                </div>
                <div className="sy-kv">
                  <dt className="sy-kv__key">Affected</dt>
                  <dd className="sy-kv__value sy-mono">4,182 uploads</dd>
                </div>
                <div className="sy-kv">
                  <dt className="sy-kv__key">Mitigation</dt>
                  <dd className="sy-kv__value">Pool scaled 24 → 40 nodes at 07:02</dd>
                </div>
              </dl>
              <div className="sy-ad-incident__actions">
                <Button variant="primary" tone="warning" size="sm" icon="pulse">
                  Open runbook
                </Button>
                <Button variant="outline" size="sm" icon="chat">
                  Join bridge
                </Button>
                <Button variant="ghost" size="sm" icon="edit">
                  Post update
                </Button>
              </div>
            </Surface>
          </ScreenSection>
        </div>

        <ScreenSection
          title="Users"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              All 1.24M
            </Button>
          }
        >
          <Surface padding="none" elevation="surface">
            {/* Filters are labelled rather than placeholder-only: this table is
                read by people who did not build it, often under time pressure. */}
            <div className="sy-ad__filters">
              <Input
                label="Search users"
                icon="search"
                type="search"
                placeholder="Name or handle"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="sy-ad__filter-search"
              />
              <Select
                label="Account type"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'partner', label: 'Partner' },
                  { value: 'creator', label: 'Creator' },
                ]}
                className="sy-ad__filter-select"
              />
              <Select
                label="Status"
                defaultValue="all"
                options={[
                  { value: 'all', label: 'Any status' },
                  { value: 'active', label: 'Active' },
                  { value: 'review', label: 'In review' },
                  { value: 'restricted', label: 'Restricted' },
                ]}
                className="sy-ad__filter-select"
              />
            </div>
            <div className="sy-table-scroll">
              <table className="sy-data-table">
                <caption className="sy-sr-only">User accounts with type, status and join date</caption>
                <thead>
                  <tr>
                    <th scope="col" className="sy-data-table__wide">Account</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="sy-data-table__num">Followers</th>
                    <th scope="col" className="sy-data-table__num">Joined</th>
                    <th scope="col" className="sy-ad__row-actions">
                      <span className="sy-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const meta = ACCOUNT_META[user.state];
                    return (
                      <tr key={user.creator.id}>
                        <th scope="row" className="sy-data-table__wide">
                          <span className="sy-ad-user">
                            <Avatar name={user.creator.name} size={30} verified={user.creator.verified} />
                            <span className="sy-ad-user__text">
                              <span className="sy-data-table__title sy-truncate">{user.creator.name}</span>
                              <span className="sy-caption sy-fg-quiet sy-mono sy-truncate">
                                {user.creator.handle}
                              </span>
                            </span>
                          </span>
                        </th>
                        <td>{user.type}</td>
                        <td>
                          <Badge tone={meta.tone} variant="soft" icon={meta.icon}>
                            {user.state}
                          </Badge>
                        </td>
                        <td className="sy-data-table__num sy-mono">{user.creator.followers}</td>
                        <td className="sy-data-table__num sy-mono">{user.joined}</td>
                        <td className="sy-ad__row-actions">
                          <IconButton
                            icon="more"
                            label={`Actions for ${user.creator.handle}`}
                            variant="ghost"
                            size="sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        </ScreenSection>

        <div className="sy-ad__split sy-ad__split--even">
          <ScreenSection
            title="Feature flags"
            action={
              <Button variant="ghost" size="sm" icon="plus">
                New flag
              </Button>
            }
          >
            <Surface padding="none" elevation="surface">
              <ul className="sy-ad__flags">
                {FLAGS.map((flag) => (
                  <li key={flag.key} className="sy-ad-flag">
                    <Switch
                      label={flag.key}
                      description={flag.description}
                      checked={Boolean(flags[flag.key])}
                      onChange={(next) => setFlags((state) => ({ ...state, [flag.key]: next }))}
                    />
                    <div className="sy-ad-flag__rollout">
                      <Badge variant="outline" tone={flag.env === 'Production' ? 'accent' : 'neutral'}>
                        {flag.env}
                      </Badge>
                      <span className="sy-meter sy-ad-flag__meter" aria-hidden="true">
                        <span className="sy-meter__fill" style={{ inlineSize: `${flag.rollout}%` }} />
                      </span>
                      <span className="sy-caption sy-fg-muted sy-mono sy-ad-flag__pct">
                        {flag.rollout}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Surface>
          </ScreenSection>

          {/* The audit log is monospaced end to end. Times, actors and object
              ids are compared vertically far more often than they are read as
              prose, and proportional type breaks that comparison. */}
          <ScreenSection
            title="Audit log"
            action={
              <Button variant="ghost" size="sm" iconEnd="chevronRight">
                Full log
              </Button>
            }
          >
            <Surface padding="none" elevation="surface">
              <ol className="sy-ad__audit">
                {AUDIT.map((entry) => (
                  <li key={entry.id} className="sy-ad-audit">
                    <span className="sy-mono sy-caption sy-fg-quiet sy-ad-audit__at">{entry.at}</span>
                    <span className="sy-ad-audit__text">
                      <span className="sy-body-sm">
                        <span className="sy-mono sy-fg-default">{entry.actor}</span>
                        <span className="sy-fg-muted"> · {entry.action} · </span>
                        <span className="sy-mono sy-fg-default">{entry.target}</span>
                      </span>
                      <span className="sy-caption sy-fg-quiet sy-truncate">{entry.note}</span>
                    </span>
                    {entry.actor === 'system' && (
                      <span className="sy-ad-audit__badge">
                        <Icon name="admin" size={13} />
                        <span className="sy-sr-only">Automated action</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </Surface>
          </ScreenSection>
        </div>
      </div>
    </div>
  );
}
