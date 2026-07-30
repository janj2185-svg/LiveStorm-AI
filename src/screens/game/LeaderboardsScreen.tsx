/**
 * Leaderboards
 * ---------------------------------------------------------------------------
 * A leaderboard has two audiences with almost nothing in common: the three
 * people at the top, and everyone else. The podium serves the first — it is
 * genuinely celebratory, physically staged, and deliberately expensive-looking
 * — and the ranked table below serves the second, where density and the
 * ability to find yourself matter far more than ceremony.
 *
 * That is why the current user's row is pinned to the bottom of the list
 * rather than merged into it. Scrolling to rank 412 to check whether you moved
 * is the single most common failure of this pattern, and the distance to the
 * next rank is the only number that makes a leaderboard actionable.
 *
 * Movement is an arrow *and* a signed number *and* the words "no change" for
 * the flat case. A green triangle alone is meaningless to a large minority of
 * people and invisible in a monochrome screenshot.
 */

import { useState } from 'react';

import { Avatar, Badge, Button, Chip, Icon, Select, Surface, Tabs } from '../../design-system/primitives';
import { ScreenSection } from '../components';
import { LEADERBOARD } from '../data';

const CATEGORIES = ['Watch time', 'Gifts sent', 'Gifts received', 'Community answers'];

const MEDALS = ['Gold', 'Silver', 'Bronze'];

/** Podium order: second, first, third — the tallest column sits in the middle. */
const PODIUM_ORDER = [1, 0, 2];

const YOU = {
  rank: 42,
  name: 'Jordan Reyes',
  handle: '@jordanreyes',
  score: '18,940',
  change: 6,
  toNext: '1,204',
  nextName: 'sana.p',
};

function Movement({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="sy-move is-flat">
        <Icon name="minus" size={13} />
        <span className="sy-mono">0</span>
        <span className="sy-sr-only">no change</span>
      </span>
    );
  }
  const up = change > 0;
  return (
    <span className={`sy-move ${up ? 'is-up' : 'is-down'}`}>
      <Icon name={up ? 'trendUp' : 'trendDown'} size={13} />
      <span className="sy-mono">
        {up ? '+' : '−'}
        {Math.abs(change)}
      </span>
      <span className="sy-sr-only">{up ? 'up' : 'down'} {Math.abs(change)} places</span>
    </span>
  );
}

export function LeaderboardsScreen() {
  const [scope, setScope] = useState('global');
  const [period, setPeriod] = useState('week');
  const [category, setCategory] = useState('Watch time');

  const podium = LEADERBOARD.slice(0, 3);
  const rest = LEADERBOARD.slice(3);

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-lb">
        <header className="sy-lb__head">
          <div className="sy-lb__head-text">
            <span className="sy-overline sy-fg-accent">Season 4 · week 6</span>
            <h1 className="sy-title-2">Leaderboards</h1>
            <p className="sy-body-sm sy-fg-muted">
              Ranked on {category.toLowerCase()}. Scores settle at 00:00 CET and are final after 24
              hours.
            </p>
          </div>
          <Tabs
            variant="segmented"
            active={scope}
            onChange={setScope}
            tabs={[
              { id: 'global', label: 'Global' },
              { id: 'following', label: 'Following' },
              { id: 'space', label: 'Space' },
            ]}
          />
        </header>

        <ScreenSection>
          <div className="sy-lb-controls">
            <div className="sy-scroller sy-lb-controls__cats" role="group" aria-label="Ranking category">
              {CATEGORIES.map((name) => (
                <Chip key={name} selected={category === name} onClick={() => setCategory(name)}>
                  {name}
                </Chip>
              ))}
            </div>
            <Select
              label="Period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' },
                { value: 'all', label: 'All time' },
              ]}
            />
          </div>
        </ScreenSection>

        {/*
          A real podium: three pedestals of different heights, first in the
          centre. The heights are proportional to nothing — they are ceremonial,
          which is the point. The numbers underneath carry the actual ranking.
        */}
        <ScreenSection>
          <Surface className="sy-podium" elevation="raised" padding="none" radius="xl">
            <span className="sy-podium__glow" aria-hidden="true" />
            <div className="sy-podium__stage">
              {PODIUM_ORDER.map((index) => {
                const entry = podium[index];
                return (
                  <div key={entry.handle} className={`sy-podium__col is-rank-${entry.rank}`}>
                    <div className="sy-podium__person">
                      <span className="sy-podium__avatar">
                        <Avatar name={entry.name} size={entry.rank === 1 ? 76 : 60} verified />
                        <span className="sy-podium__medal" aria-hidden="true">
                          {entry.rank}
                        </span>
                      </span>
                      <p className="sy-podium__name">{entry.name}</p>
                      <p className="sy-caption sy-fg-quiet sy-truncate">{entry.handle}</p>
                      <p className="sy-mono sy-podium__score">{entry.score}</p>
                      <Movement change={entry.change} />
                    </div>
                    <div className="sy-podium__block">
                      <span className="sy-podium__rank sy-mono">{entry.rank}</span>
                      <span className="sy-caption sy-podium__medal-name">{MEDALS[entry.rank - 1]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection
          title="Full ranking"
          eyebrow={`${LEADERBOARD.length} of 24,806 creators shown`}
          action={
            <Button variant="ghost" size="sm" icon="download">
              Export
            </Button>
          }
        >
          <Surface elevation="surface" padding="none" radius="lg" className="sy-lb-table">
            <div className="sy-lb-row sy-lb-row--head" aria-hidden="true">
              <span>#</span>
              <span>Creator</span>
              <span className="sy-lb-row__score">Score</span>
              <span className="sy-lb-row__move">Change</span>
            </div>
            <ul>
              {rest.map((entry) => (
                <li key={entry.handle} className="sy-lb-row">
                  <span className="sy-mono sy-lb-row__rank">{entry.rank}</span>
                  <span className="sy-lb-row__person">
                    <Avatar name={entry.name} size={34} />
                    <span className="sy-lb-row__text">
                      <span className="sy-label sy-truncate">{entry.name}</span>
                      <span className="sy-caption sy-fg-quiet sy-truncate">{entry.handle}</span>
                    </span>
                  </span>
                  <span className="sy-mono sy-lb-row__score">{entry.score}</span>
                  <span className="sy-lb-row__move">
                    <Movement change={entry.change} />
                  </span>
                </li>
              ))}
            </ul>

            {/* Pinned so "where am I" never costs a scroll. */}
            <div className="sy-lb-you">
              <span className="sy-mono sy-lb-row__rank">{YOU.rank}</span>
              <span className="sy-lb-row__person">
                <Avatar name={YOU.name} size={34} ring="story" verified />
                <span className="sy-lb-row__text">
                  <span className="sy-label sy-truncate">
                    {YOU.name}
                    <Badge tone="accent" variant="solid" className="sy-lb-you__tag">
                      You
                    </Badge>
                  </span>
                  <span className="sy-caption sy-fg-quiet sy-truncate">
                    {YOU.toNext} behind {YOU.nextName} at rank {YOU.rank - 1}
                  </span>
                </span>
              </span>
              <span className="sy-mono sy-lb-row__score">{YOU.score}</span>
              <span className="sy-lb-row__move">
                <Movement change={YOU.change} />
              </span>
            </div>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}
