/**
 * Search
 * ---------------------------------------------------------------------------
 * SYLORA holds six kinds of object — creators, streams, posts, spaces,
 * products and courses — and someone typing "design tokens" rarely knows which
 * one they want. So the default tab is All, and All is a *blended* result set
 * where each type keeps its own shape. A creator rendered as a post row, or a
 * product rendered as a creator row, would be faster to build and much slower
 * to read: the shape is what tells you what kind of thing you found before you
 * read a single word.
 *
 * Counts sit on the tabs rather than being hidden behind them, because the
 * decision "should I narrow to Creators?" needs the number *before* the click.
 * Filters are chips in a scroller rather than a modal — narrowing a search is
 * an iterative act, and a dialog turns each iteration into three.
 *
 * The zero-result state is designed against the same query rather than as a
 * separate illustration. Real queries almost never return nothing overall;
 * they return nothing *in one facet*, which is the case worth designing.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  LiveBadge,
  SearchInput,
  Surface,
  Tabs,
} from '../../design-system/primitives';
import { Media, PostCard, ScreenSection, StreamCard } from '../components';
import { COMMUNITIES, CREATORS, POSTS, PRODUCTS, SEARCH_SUGGESTIONS, STREAMS } from '../data';

const RESULT_TABS = [
  { id: 'all', label: 'All', badge: '1,284' },
  { id: 'creators', label: 'Creators', badge: 38 },
  { id: 'streams', label: 'Streams', badge: 12 },
  { id: 'posts', label: 'Posts', badge: 940 },
  { id: 'spaces', label: 'Spaces', badge: 6 },
  { id: 'products', label: 'Products', badge: 9 },
];

const FILTERS = [
  { id: 'time', label: 'This week', icon: 'clock' as const, selected: true },
  { id: 'type', label: 'Any type', icon: 'filter' as const, selected: false },
  { id: 'verified', label: 'Verified only', icon: 'verified' as const, selected: true },
  { id: 'lang', label: 'English', icon: 'translate' as const, selected: false },
  { id: 'free', label: 'Free', icon: 'coin' as const, selected: false },
  { id: 'captions', label: 'Has captions', icon: 'captions' as const, selected: false },
];

const RECENT = ['oklch ramp generator', 'amara token pipeline', 'contrast audit CI'];

/** The three creators whose work actually matches the query. */
const MATCHED_CREATORS = [CREATORS[0], CREATORS[2], CREATORS[6]];

export function SearchScreen() {
  const [query, setQuery] = useState('design tokens');
  const [tab, setTab] = useState('all');
  const [dismissedRecent, setDismissedRecent] = useState<string[]>([]);

  const recent = RECENT.filter((item) => !dismissedRecent.includes(item));

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-search">
        {/*
          The field stays at the top of the scroll area rather than sticking:
          on a results page the query is already visible in the result set, and
          a sticky field on a phone eats a quarter of the list.
        */}
        <div className="sy-search__field">
          <SearchInput
            placeholder="Search creators, streams, posts, spaces and products"
            value={query}
            onChange={setQuery}
            shortcut="⌘K"
          />
          <IconButton icon="close" label="Clear search" variant="ghost" onClick={() => setQuery('')} />
        </div>

        <div className="sy-search__kbd sy-caption sy-fg-quiet">
          <span>
            <kbd className="sy-kbd">↑</kbd>
            <kbd className="sy-kbd">↓</kbd> to move
          </span>
          <span>
            <kbd className="sy-kbd">↵</kbd> to open
          </span>
          <span>
            <kbd className="sy-kbd">⌘</kbd>
            <kbd className="sy-kbd">↵</kbd> to open in a new tab
          </span>
          <span>
            <kbd className="sy-kbd">⌘K</kbd> from anywhere
          </span>
        </div>

        <div className="sy-search__chiprow" role="group" aria-label="Filter results">
          {FILTERS.map((filter) => (
            <Chip key={filter.id} icon={filter.icon} selected={filter.selected}>
              {filter.label}
            </Chip>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="sy-search__recent">
            <span className="sy-caption sy-fg-quiet sy-shrink-0">Recent</span>
            <div className="sy-search__chiprow">
              {recent.map((item) => (
                <Chip
                  key={item}
                  icon="clock"
                  tone="neutral"
                  onRemove={() => setDismissedRecent((list) => [...list, item])}
                  onClick={() => setQuery(item)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="sy-search__tabs">
          <Tabs variant="underline" tabs={RESULT_TABS} active={tab} onChange={setTab} />
        </div>

        <p className="sy-search__summary sy-caption sy-fg-quiet">
          1,284 results for <strong className="sy-fg-default">{query || 'everything'}</strong> · this week ·
          verified creators only · sorted by relevance
        </p>

        {tab === 'all' && <AllResults />}
        {tab === 'creators' && (
          <ScreenSection title="Creators" eyebrow="38 matches">
            <div className="sy-search__list">
              {[...MATCHED_CREATORS, CREATORS[1], CREATORS[7]].map((creator) => (
                <CreatorResult key={creator.id} creatorId={creator.id} />
              ))}
            </div>
          </ScreenSection>
        )}
        {tab === 'streams' && (
          <ScreenSection title="Streams" eyebrow="12 matches">
            <div className="sy-grid" style={{ ['--min' as string]: '260px' }}>
              {STREAMS.slice(0, 4).map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          </ScreenSection>
        )}
        {tab === 'posts' && (
          <ScreenSection title="Posts" eyebrow="940 matches">
            <div className="sy-search__posts">
              {[POSTS[0], POSTS[1], POSTS[4]].map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </ScreenSection>
        )}
        {tab === 'spaces' && (
          <ScreenSection title="Spaces" eyebrow="6 matches">
            <div className="sy-search__list">
              {COMMUNITIES.slice(0, 4).map((space) => (
                <SpaceResult key={space.id} spaceId={space.id} />
              ))}
            </div>
          </ScreenSection>
        )}
        {tab === 'products' && (
          <ScreenSection title="Products" eyebrow="9 matches">
            <div className="sy-search__list">
              {PRODUCTS.slice(0, 4).map((product) => (
                <ProductResult key={product.id} productId={product.id} />
              ))}
            </div>
          </ScreenSection>
        )}

        <ScreenSection title="Searches that go deeper" eyebrow="Related">
          <div className="sy-search__chiprow">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <Chip key={suggestion} icon="search" onClick={() => setQuery(suggestion)}>
                {suggestion}
              </Chip>
            ))}
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}

/**
 * The blended default. Order is by confidence, not by type: the top result is
 * the single object the ranker is most sure about, and everything after it is
 * grouped so the eye can skip a whole type at once.
 */
function AllResults() {
  return (
    <>
      <ScreenSection>
        <div className="sy-search__top">
          <div className="sy-search__top-label">
            <Icon name="sparkles" size={14} />
            <span className="sy-overline">Top result</span>
          </div>
          <Surface className="sy-search__hero sy-refract" padding="lg" elevation="raised" radius="xl">
            <Avatar name={CREATORS[0].name} size={64} verified ring="live" />
            <div className="sy-grow">
              <div className="sy-search__hero-name">
                <h3 className="sy-title-3">{CREATORS[0].name}</h3>
                <LiveBadge viewers="14.2K" />
              </div>
              <p className="sy-caption sy-fg-muted">
                {CREATORS[0].handle} · {CREATORS[0].followers} followers · {CREATORS[0].category}
              </p>
              <p className="sy-body-sm sy-fg-muted sy-search__hero-bio">{CREATORS[0].bio}</p>
              <p className="sy-caption sy-fg-quiet">
                Matched on 41 posts, 6 streams and the space she moderates.
              </p>
            </div>
            <div className="sy-search__hero-actions">
              <Button variant="primary" size="sm" icon="follow">
                Follow
              </Button>
              <Button variant="secondary" size="sm" icon="live">
                Watch
              </Button>
            </div>
          </Surface>
        </div>
      </ScreenSection>

      <ScreenSection
        title="Creators"
        eyebrow="38 matches"
        action={
          <Button variant="ghost" size="sm" iconEnd="chevronRight">
            All creators
          </Button>
        }
      >
        <div className="sy-search__list">
          {MATCHED_CREATORS.slice(1).map((creator) => (
            <CreatorResult key={creator.id} creatorId={creator.id} />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection title="Live right now" eyebrow="12 matches">
        <div className="sy-grid" style={{ ['--min' as string]: '240px' }}>
          {STREAMS.slice(0, 2).map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection
        title="Posts"
        eyebrow="940 matches"
        action={
          <Button variant="ghost" size="sm" iconEnd="chevronRight">
            All posts
          </Button>
        }
      >
        <div className="sy-search__posts">
          <PostCard post={POSTS[0]} />
          <PostCard post={POSTS[1]} />
        </div>
      </ScreenSection>

      <ScreenSection title="Spaces" eyebrow="6 matches">
        <div className="sy-search__list">
          <SpaceResult spaceId="sp1" />
        </div>
      </ScreenSection>

      <ScreenSection title="Products" eyebrow="9 matches">
        <div className="sy-search__list">
          <ProductResult productId="pr2" />
        </div>
      </ScreenSection>

      {/*
        The honest empty state. The query has 1,284 results overall and none in
        Events once "this week" is applied, so the recovery offered is the
        filter that caused it — not a generic "try another search".
      */}
      <ScreenSection title="Events" eyebrow="0 matches this week">
        <Surface className="sy-search__empty" padding="md" elevation="flat" radius="lg">
          <EmptyState
            icon="events"
            title="No events match design tokens this week"
            description="The next one is the Token Pipeline Workshop on Thu 12 Feb, which falls outside the current time filter."
            action={
              <div className="sy-row sy-gap-2 sy-wrap sy-center">
                <Button variant="secondary" size="sm" icon="calendar">
                  Search all dates
                </Button>
                <Button variant="ghost" size="sm" icon="notifications">
                  Alert me for new events
                </Button>
              </div>
            }
          />
        </Surface>
      </ScreenSection>
    </>
  );
}

function CreatorResult({ creatorId }: { creatorId: string }) {
  const creator = CREATORS.find((item) => item.id === creatorId) ?? CREATORS[0];
  return (
    <Surface className="sy-result sy-result--creator" padding="md" elevation="surface" interactive>
      <Avatar
        name={creator.name}
        size={48}
        verified={creator.verified}
        ring={creator.live ? 'live' : false}
      />
      <div className="sy-grow">
        <p className="sy-label sy-truncate">{creator.name}</p>
        <p className="sy-caption sy-fg-muted sy-truncate">
          {creator.handle} · {creator.followers} followers
        </p>
        <p className="sy-caption sy-fg-quiet sy-clamp-2 sy-result__bio">{creator.bio}</p>
      </div>
      <div className="sy-result__end">
        {creator.live && <LiveBadge />}
        <Button variant="outline" size="sm">
          Follow
        </Button>
      </div>
    </Surface>
  );
}

function SpaceResult({ spaceId }: { spaceId: string }) {
  const space = COMMUNITIES.find((item) => item.id === spaceId) ?? COMMUNITIES[0];
  return (
    <Surface className="sy-result sy-result--space" padding="md" elevation="surface" interactive>
      <Media seed={space.id} ratio="1/1" radius="md" className="sy-result__thumb" />
      <div className="sy-grow">
        <p className="sy-label sy-truncate">{space.name}</p>
        <p className="sy-caption sy-fg-muted sy-clamp-2">{space.topic}</p>
        <p className="sy-caption sy-fg-quiet">
          {space.members} members · {space.online} online
        </p>
      </div>
      <div className="sy-result__end">
        <Badge tone={space.privacy === 'Public' ? 'success' : 'neutral'} icon={space.privacy === 'Public' ? 'globe' : 'lock'}>
          {space.privacy}
        </Badge>
        <Button variant="outline" size="sm">
          Join
        </Button>
      </div>
    </Surface>
  );
}

function ProductResult({ productId }: { productId: string }) {
  const product = PRODUCTS.find((item) => item.id === productId) ?? PRODUCTS[0];
  return (
    <Surface className="sy-result sy-result--product" padding="md" elevation="surface" interactive>
      <Media seed={product.id} ratio="1/1" radius="md" className="sy-result__thumb" />
      <div className="sy-grow">
        <p className="sy-label sy-clamp-2">{product.title}</p>
        <p className="sy-caption sy-fg-muted sy-truncate">
          {product.kind} · {product.creator}
        </p>
        <p className="sy-caption sy-fg-quiet sy-result__rating">
          <Icon name="achievement" size={12} />
          {product.rating.toFixed(1)} · {product.sales} sold
        </p>
      </div>
      <div className="sy-result__end">
        <span className="sy-mono-lg sy-result__price">{product.price}</span>
        <Button variant="secondary" size="sm">
          View
        </Button>
      </div>
    </Surface>
  );
}
