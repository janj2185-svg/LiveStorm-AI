/**
 * Achievements
 * ---------------------------------------------------------------------------
 * Achievement screens usually fail in the same way: locked items are greyed
 * out so hard that the only legible thing is what you already have, which is
 * exactly backwards. The unearned ones are the reason to come back, so here
 * they keep muted-strength text and a visible progress bar — dimmed by
 * saturation and elevation, never by dropping text contrast below 4.5:1.
 *
 * Medals are built in CSS rather than shipped as art. Four tiers, one shape,
 * and a fill that changes: metal ramps for bronze, silver and gold, and the
 * aurora gradient for Prism — the only place in gamification the brand
 * gradient appears, which is what makes it read as the top of the ladder.
 *
 * Progress is always "x of y" in words as well as a bar, because a bar at 83%
 * does not tell you whether one more publish finishes it or forty.
 */

import { useState } from 'react';

import {
  Badge,
  Button,
  Chip,
  Icon,
  Progress,
  ProgressRing,
  Surface,
} from '../../design-system/primitives';
import { ScreenSection } from '../components';
import { ACHIEVEMENTS, type Achievement } from '../data';

type Tier = Achievement['tier'];

const TIERS: (Tier | 'All')[] = ['All', 'Bronze', 'Silver', 'Gold', 'Prism'];

/** The raw counters behind each percentage, so progress can be stated exactly. */
const COUNTS: Record<string, { current: string; target: string; unit: string; unlockedOn?: string }> = {
  a1: { current: '1', target: '1', unit: 'broadcast', unlockedOn: 'Unlocked 14 Nov 2025' },
  a2: { current: '12', target: '12', unit: 'weeks', unlockedOn: 'Unlocked 19 Jan 2026' },
  a3: { current: '5', target: '6', unit: 'formats' },
  a4: { current: '12,400', target: '100,000', unit: 'followers' },
  a5: { current: '340', target: '500', unit: 'answers' },
  a6: { current: '1', target: '1', unit: 'video over 3h', unlockedOn: 'Unlocked 3 Feb 2026' },
};

const RARITY: Record<string, string> = {
  a1: 'Earned by 61.4% of creators',
  a2: 'Earned by 18.9% of creators',
  a3: 'Earned by 7.2% of creators',
  a4: 'Earned by 3.2% of creators',
  a5: 'Earned by 22.6% of creators',
  a6: 'Earned by 11.8% of creators',
};

const HOW_TO_EARN = [
  'Reach 100,000 followers on a single SYLORA profile',
  'Followers gained through paid promotion are excluded from the count',
  'The count is evaluated nightly and locks in permanently once reached',
];

function Medal({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`sy-medal sy-medal--${size} is-${tier.toLowerCase()}`} aria-hidden="true">
      <span className="sy-medal__face">
        <Icon name={tier === 'Prism' ? 'sparkles' : 'trophy'} size={size === 'lg' ? 26 : size === 'sm' ? 15 : 20} />
      </span>
      <span className="sy-medal__ribbon" />
    </span>
  );
}

export function AchievementsScreen() {
  const [tier, setTier] = useState<Tier | 'All'>('All');

  const unlocked = ACHIEVEMENTS.filter((item) => item.unlocked);
  const completion = Math.round(
    ACHIEVEMENTS.reduce((sum, item) => sum + item.progress, 0) / ACHIEVEMENTS.length,
  );
  const visible = tier === 'All' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((item) => item.tier === tier);
  const detail = ACHIEVEMENTS[3];

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-ach">
        <Surface className="sy-ach-summary" elevation="raised" padding="lg" radius="xl">
          <ProgressRing value={completion} size={92} thickness={7} label="Overall completion">
            <span className="sy-ach-summary__ring sy-mono">{completion}%</span>
          </ProgressRing>
          <div className="sy-ach-summary__text">
            <span className="sy-overline sy-fg-accent">Your collection</span>
            <h1 className="sy-title-2">
              <span className="sy-ach-summary__count">{unlocked.length}</span> of{' '}
              <span className="sy-ach-summary__count">{ACHIEVEMENTS.length}</span> unlocked
            </h1>
            <p className="sy-body-sm sy-fg-muted sy-measure">
              The ring counts partial progress too, so it runs ahead of the unlock count. Two more
              Gold unlocks move you to Prism tier, which adds a profile frame and doubles seasonal
              credit rewards.
            </p>
          </div>
          <div className="sy-ach-summary__tier">
            <Medal tier="Gold" size="lg" />
            <div>
              <p className="sy-caption sy-fg-quiet">Current tier</p>
              <p className="sy-headline">Gold</p>
              <p className="sy-caption sy-fg-muted">2 unlocks to Prism</p>
            </div>
          </div>
        </Surface>

        <ScreenSection title="Recently unlocked" eyebrow="Last 30 days">
          <div className="sy-scroller">
            {unlocked.map((item) => (
              <Surface key={item.id} className="sy-ach-recent" elevation="surface" padding="md" radius="lg">
                <Medal tier={item.tier} />
                <div className="sy-ach-recent__text">
                  <p className="sy-label sy-truncate">{item.name}</p>
                  <p className="sy-caption sy-fg-quiet">{COUNTS[item.id].unlockedOn}</p>
                </div>
                <Badge tone="success" variant="soft" icon="check">
                  {item.tier}
                </Badge>
              </Surface>
            ))}
          </div>
        </ScreenSection>

        <ScreenSection title="All achievements" eyebrow={`${visible.length} shown`}>
          <div className="sy-scroller sy-ach-filters" role="group" aria-label="Filter by tier">
            {TIERS.map((name) => (
              <Chip key={name} selected={tier === name} onClick={() => setTier(name)}>
                {name}
              </Chip>
            ))}
          </div>

          <div className="sy-grid sy-enter" style={{ ['--min' as string]: '244px' }}>
            {visible.map((item) => {
              const counts = COUNTS[item.id];
              return (
                <Surface
                  key={item.id}
                  as="article"
                  elevation="surface"
                  padding="md"
                  radius="lg"
                  className={`sy-ach-card is-${item.tier.toLowerCase()}${item.unlocked ? ' is-unlocked' : ' is-locked'}`}
                >
                  <div className="sy-ach-card__head">
                    <Medal tier={item.tier} />
                    <div className="sy-grow">
                      <h3 className="sy-label sy-ach-card__name">{item.name}</h3>
                      <span className="sy-caption sy-fg-quiet">{item.tier}</span>
                    </div>
                    {item.unlocked ? (
                      <span className="sy-ach-card__state">
                        <Icon name="check" size={13} />
                        Unlocked
                      </span>
                    ) : (
                      <span className="sy-ach-card__state is-locked">
                        <Icon name="lock" size={13} />
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="sy-body-sm sy-fg-muted sy-ach-card__desc">{item.description}</p>
                  {item.unlocked ? (
                    <p className="sy-caption sy-fg-success sy-ach-card__date">{counts.unlockedOn}</p>
                  ) : (
                    <div className="sy-ach-card__progress">
                      <Progress
                        value={item.progress}
                        size="sm"
                        tone={item.tier === 'Prism' ? 'creator' : 'accent'}
                        label={`${item.name} progress`}
                      />
                      <span className="sy-caption sy-fg-muted">
                        <span className="sy-mono">{counts.current}</span> of{' '}
                        <span className="sy-mono">{counts.target}</span> {counts.unit}
                      </span>
                    </div>
                  )}
                </Surface>
              );
            })}
          </div>
        </ScreenSection>

        <ScreenSection title={detail.name} eyebrow="Achievement detail">
          <Surface elevation="surface" padding="lg" radius="lg" className="sy-ach-detail">
            <div className="sy-ach-detail__hero">
              <Medal tier={detail.tier} size="lg" />
              <div className="sy-grow">
                <h3 className="sy-title-3">{detail.name}</h3>
                <p className="sy-body-sm sy-fg-muted">{detail.description}</p>
                <div className="sy-ach-detail__meta">
                  <Badge tone="creator" variant="soft" icon="premium">
                    {detail.tier} tier
                  </Badge>
                  <Badge tone="neutral" variant="outline" icon="community">
                    {RARITY[detail.id]}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="sy-ach-detail__grid">
              <div>
                <h4 className="sy-label sy-ach-detail__subhead">How to earn it</h4>
                <ul className="sy-ach-detail__steps">
                  {HOW_TO_EARN.map((step) => (
                    <li key={step}>
                      <span className="sy-ach-detail__bullet" aria-hidden="true" />
                      <span className="sy-body-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="sy-label sy-ach-detail__subhead">Your progress</h4>
                <div className="sy-ach-detail__progress">
                  <div className="sy-row sy-between">
                    <span className="sy-mono sy-ach-detail__count">{COUNTS[detail.id].current}</span>
                    <span className="sy-caption sy-fg-quiet">
                      of {COUNTS[detail.id].target} {COUNTS[detail.id].unit}
                    </span>
                  </div>
                  <Progress value={detail.progress} tone="creator" label="Constellation progress" />
                  <p className="sy-caption sy-fg-muted">
                    At your current rate — roughly 2,100 new followers a month — this unlocks in late
                    2029. Two live collaborations a month would halve that.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="sy-label sy-ach-detail__subhead">Reward</h4>
                <ul className="sy-ach-detail__rewards">
                  <li>
                    <span className="sy-tile-icon sy-tone-creator">
                      <Icon name="premium" size={18} />
                    </span>
                    <span>
                      <span className="sy-label">Constellation profile frame</span>
                      <span className="sy-caption sy-fg-quiet">Permanent, animated on hover</span>
                    </span>
                  </li>
                  <li>
                    <span className="sy-tile-icon sy-tone-accent">
                      <Icon name="coin" size={18} />
                    </span>
                    <span>
                      <span className="sy-label">25,000 credits</span>
                      <span className="sy-caption sy-fg-quiet">Paid on unlock</span>
                    </span>
                  </li>
                  <li>
                    <span className="sy-tile-icon sy-tone-success">
                      <Icon name="verified" size={18} />
                    </span>
                    <span>
                      <span className="sy-label">Partner programme invitation</span>
                      <span className="sy-caption sy-fg-quiet">Reduced platform fee, 6%</span>
                    </span>
                  </li>
                </ul>
                <Button variant="outline" fullWidth icon="share" className="sy-ach-detail__share">
                  Share progress
                </Button>
              </div>
            </div>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}
