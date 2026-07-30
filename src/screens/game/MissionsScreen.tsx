/**
 * Missions
 * ---------------------------------------------------------------------------
 * The season track is the hero because it is the only thing on this screen
 * that shows *distance* — how far you have come and what the next node costs.
 * Individual missions are the mechanism; the track is the reason anyone runs
 * them. It is laid out as a physical rail with nodes on it, and exactly one
 * node is claimable at a time: a screen with six glowing buttons has no call
 * to action at all.
 *
 * Missions are ordered by how close they are to completion rather than by
 * reward size. Finishing something is a stronger pull than earning more, and
 * sorting by reward would bury a mission sitting at 18 of 25.
 *
 * Every state — claimed, claimable, locked — carries an icon and a word.
 * The claimable node adds a glow, which is decoration on top of a label that
 * already says "Claim".
 */

import { useState } from 'react';

import { Badge, Button, Icon, Progress, Surface, Tabs } from '../../design-system/primitives';
import { ScreenSection } from '../components';
import { MISSIONS, type Mission } from '../data';

const DAILY: Mission[] = [
  { id: 'd1', title: 'Watch 30 minutes of live', reward: '80 credits', progress: 30, target: 30, expires: '5 hours' },
  { id: 'd2', title: 'Send a gift to someone you have never gifted', reward: '120 credits', progress: 0, target: 1, expires: '5 hours' },
  { id: 'd3', title: 'Comment on three posts', reward: '60 credits', progress: 2, target: 3, expires: '5 hours' },
  { id: 'd4', title: 'Open the daily brief', reward: '25 credits', progress: 1, target: 1, expires: '5 hours' },
];

const SEASONAL: Mission[] = [
  { id: 'sn1', title: 'Complete 40 weekly missions this season', reward: '6,000 credits', progress: 27, target: 40, expires: '38 days' },
  { id: 'sn2', title: 'Stream 60 hours across the season', reward: 'Aurora frame', progress: 41, target: 60, expires: '38 days' },
  { id: 'sn3', title: 'Publish in every format at least once', reward: 'Full Spectrum badge', progress: 5, target: 6, expires: '38 days' },
  { id: 'sn4', title: 'Reach 25 community answers marked helpful', reward: '2,400 credits', progress: 25, target: 25, expires: '38 days' },
];

type NodeState = 'claimed' | 'claimable' | 'locked';

const TRACK: { tier: number; reward: string; kind: 'credits' | 'item'; icon: 'coin' | 'gift' | 'premium' | 'inventory'; state: NodeState }[] = [
  { tier: 1, reward: '500 credits', kind: 'credits', icon: 'coin', state: 'claimed' },
  { tier: 2, reward: 'Tide Entrance', kind: 'item', icon: 'gift', state: 'claimed' },
  { tier: 3, reward: '1,200 credits', kind: 'credits', icon: 'coin', state: 'claimed' },
  { tier: 4, reward: 'Kiln Frame', kind: 'item', icon: 'inventory', state: 'claimed' },
  { tier: 5, reward: '2,000 credits', kind: 'credits', icon: 'coin', state: 'claimable' },
  { tier: 6, reward: 'Prism badge', kind: 'item', icon: 'premium', state: 'locked' },
  { tier: 7, reward: '4,500 credits', kind: 'credits', icon: 'coin', state: 'locked' },
  { tier: 8, reward: 'Supernova ×1', kind: 'item', icon: 'gift', state: 'locked' },
];

const WEEK = [
  { day: 'M', label: 'Monday', done: true },
  { day: 'T', label: 'Tuesday', done: true },
  { day: 'W', label: 'Wednesday', done: true },
  { day: 'T', label: 'Thursday', done: true },
  { day: 'F', label: 'Friday', done: true },
  { day: 'S', label: 'Saturday', done: false },
  { day: 'S', label: 'Sunday', done: false },
];

const STATE_LABEL: Record<NodeState, string> = {
  claimed: 'Claimed',
  claimable: 'Ready to claim',
  locked: 'Locked',
};
const STATE_ICON: Record<NodeState, 'check' | 'gift' | 'lock'> = {
  claimed: 'check',
  claimable: 'gift',
  locked: 'lock',
};

function MissionCard({ mission }: { mission: Mission }) {
  const complete = mission.progress >= mission.target;
  const percent = Math.min(100, (mission.progress / mission.target) * 100);
  return (
    <Surface
      as="article"
      elevation="surface"
      padding="md"
      radius="lg"
      className={`sy-mission${complete ? ' is-complete' : ''}`}
    >
      <div className="sy-mission__head">
        <span className="sy-tile-icon sy-tone-accent">
          <Icon name={complete ? 'success' : 'mission'} size={19} />
        </span>
        <h3 className="sy-label sy-grow sy-mission__title">{mission.title}</h3>
      </div>

      <div className="sy-mission__progress">
        <Progress
          value={percent}
          size="sm"
          tone={complete ? 'success' : 'accent'}
          label={`${mission.title} progress`}
        />
        <span className="sy-mono sy-mission__count">
          {mission.progress.toLocaleString('en-GB')} / {mission.target.toLocaleString('en-GB')}
        </span>
      </div>

      <div className="sy-mission__foot">
        <span className="sy-mission__reward">
          <Icon name={mission.reward.includes('credits') ? 'coin' : 'premium'} size={15} />
          <span className="sy-label">{mission.reward}</span>
        </span>
        <span className="sy-caption sy-fg-quiet sy-mission__time">
          <Icon name="clock" size={12} />
          {mission.expires} left
        </span>
        {complete ? (
          <Button variant="primary" size="sm" icon="gift">
            Claim
          </Button>
        ) : (
          <Badge tone="neutral" variant="outline">
            In progress
          </Badge>
        )}
      </div>
    </Surface>
  );
}

export function MissionsScreen() {
  const [tab, setTab] = useState('weekly');

  const missions = tab === 'daily' ? DAILY : tab === 'seasonal' ? SEASONAL : MISSIONS;
  const sorted = [...missions].sort(
    (a, b) => b.progress / b.target - a.progress / a.target,
  );
  const claimed = TRACK.filter((node) => node.state === 'claimed').length;

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-ms">
        <header className="sy-ms__head">
          <div className="sy-ms__head-text">
            <span className="sy-overline sy-fg-accent">Season 4 · Deep Field</span>
            <h1 className="sy-title-2">Missions</h1>
            <p className="sy-body-sm sy-fg-muted">
              38 days left in the season. Unclaimed rewards expire with it.
            </p>
          </div>
          <div className="sy-ms__earned">
            <span className="sy-caption sy-fg-quiet">Credits earned this season</span>
            <span className="sy-mono-lg sy-ms__earned-figure">14,280</span>
            <span className="sy-caption sy-fg-success">
              <Icon name="trendUp" size={12} /> +2,400 this week
            </span>
          </div>
        </header>

        {/*
          The pass track. Nodes sit on a rail whose filled portion is the same
          width as the progress: the rail is the progress bar, so there is one
          truth on screen rather than a bar and a track that can disagree.
        */}
        <ScreenSection
          title="Season pass"
          eyebrow={`${claimed} of ${TRACK.length} rewards claimed`}
          action={
            <Button variant="outline" size="sm" icon="premium">
              Upgrade pass
            </Button>
          }
        >
          <Surface className="sy-track" elevation="raised" padding="lg" radius="xl">
            <div className="sy-track__scroll">
              <div className="sy-track__rail" aria-hidden="true">
                <span className="sy-track__fill" style={{ inlineSize: '57%' }} />
              </div>
              <ol className="sy-track__nodes">
                {TRACK.map((node) => (
                  <li key={node.tier} className={`sy-node is-${node.state}`}>
                    <span className="sy-node__tier sy-caption">Tier {node.tier}</span>
                    <span className="sy-node__disc">
                      <Icon name={node.icon} size={20} />
                      {node.state === 'claimed' && (
                        <span className="sy-node__tick" aria-hidden="true">
                          <Icon name="check" size={11} />
                        </span>
                      )}
                    </span>
                    <span className="sy-node__reward sy-label">{node.reward}</span>
                    <span className="sy-node__state">
                      <Icon name={STATE_ICON[node.state]} size={12} />
                      {STATE_LABEL[node.state]}
                    </span>
                    {node.state === 'claimable' && (
                      <Button variant="primary" size="sm" className="sy-node__claim">
                        Claim
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </div>
            <div className="sy-track__foot">
              <div className="sy-grow">
                <Progress value={57} label="Season pass progress" />
                <p className="sy-caption sy-fg-muted sy-track__meta">
                  <span className="sy-mono">11,400</span> of <span className="sy-mono">20,000</span>{' '}
                  season points · next tier at 12,500
                </p>
              </div>
              <Badge tone="warning" variant="soft" icon="clock">
                38 days left
              </Badge>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Daily streak" eyebrow="Five days in a row">
          <Surface elevation="surface" padding="lg" radius="lg" className="sy-streak">
            <div className="sy-streak__count">
              <span className="sy-streak__flame">
                <Icon name="streak" size={26} />
              </span>
              <div>
                <p className="sy-mono sy-streak__figure">5</p>
                <p className="sy-caption sy-fg-quiet">day streak</p>
              </div>
            </div>
            <ol className="sy-streak__week">
              {WEEK.map((day, index) => (
                <li key={day.label} className={day.done ? 'is-done' : 'is-todo'}>
                  <span className="sy-streak__dot">
                    {day.done ? <Icon name="check" size={14} /> : <span className="sy-mono">{index + 1}</span>}
                  </span>
                  <span className="sy-caption sy-streak__day">{day.day}</span>
                  <span className="sy-sr-only">
                    {day.label}: {day.done ? 'complete' : 'not yet complete'}
                  </span>
                </li>
              ))}
            </ol>
            <p className="sy-body-sm sy-fg-muted sy-streak__note">
              Two more days completes the week and pays a <strong>1,000 credit</strong> bonus. A
              missed day resets the streak but never the season points you already earned.
            </p>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Active missions" eyebrow="Closest to completion first">
          <Tabs
            variant="pill"
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'daily', label: 'Daily', badge: DAILY.length },
              { id: 'weekly', label: 'Weekly', badge: MISSIONS.length },
              { id: 'seasonal', label: 'Seasonal', badge: SEASONAL.length },
            ]}
          />
          <div className="sy-grid sy-enter sy-mission-grid">
            {sorted.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}
