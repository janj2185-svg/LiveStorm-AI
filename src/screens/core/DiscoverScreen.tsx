/**
 * Discover
 * ---------------------------------------------------------------------------
 * The deliberate opposite of Feed. Feed is chronological and contains only
 * what you asked for; Discover is ranked, and every shelf on it exists because
 * a model decided it should. SYLORA keeps those two jobs on separate screens
 * so that "why am I seeing this?" always has a single, honest answer: on Feed,
 * because you follow them; on Discover, because of the reason printed on the
 * shelf.
 *
 * That is what the "Why this?" control on every shelf header is for. Ranking
 * that cannot be interrogated is indistinguishable from manipulation, and a
 * platform that pays creators has a stronger obligation here than one that
 * does not — a shelf placement is money. The explanation is short, specific to
 * the shelf, and names the signal that produced it.
 *
 * The layout is a storefront: one large editorial hero that commits to a
 * single recommendation, then horizontal shelves. Shelves beat a grid here
 * because they let a shelf be *skipped* in one glance, which is the main thing
 * someone browsing recommendations wants to do.
 */

import { useState, type ReactNode } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  Icon,
  LiveBadge,
  Surface,
} from '../../design-system/primitives';
import { CreatorCard, Media, ScreenSection, StreamCard } from '../components';
import { COMMUNITIES, COURSES, CREATORS, POSTS, STREAMS } from '../data';

const CATEGORIES = [
  'For you',
  'Live now',
  'Design & Engineering',
  'Science',
  'Music & Audio',
  'Education',
  'Photography',
  'Craft',
  'Food',
  'Gaming',
];

/** Long-form pieces, with the runtime stated up front — it is the deciding fact. */
const LONG_FORM = [
  {
    id: 'lf1',
    title: 'The whole token pipeline, unedited — from hue rotation to a failing CI check',
    creator: CREATORS[0],
    duration: '2:41:08',
    views: '184K views',
    note: 'No cuts, no music',
  },
  {
    id: 'lf2',
    title: 'Three hours of ambient recorded in one take, with the patch rebuilt on camera',
    creator: CREATORS[1],
    duration: '3:04:18',
    views: '96K views',
    note: 'Headphones recommended',
  },
  {
    id: 'lf3',
    title: 'Regression diagnostics, worked end to end on data that actually misbehaves',
    creator: CREATORS[2],
    duration: '1:52:44',
    views: '311K views',
    note: 'Dataset in the description',
  },
  {
    id: 'lf4',
    title: 'Kermadec dive 214 — the full descent, including the forty quiet minutes',
    creator: CREATORS[5],
    duration: '4:18:02',
    views: '722K views',
    note: 'Subtitles in 6 languages',
  },
];

const GUILD_ITEMS = [
  {
    id: 'gi1',
    title: 'Contrast auditing as a build step, not a design review',
    author: CREATORS[0],
    meta: 'Thread · 47 replies',
    icon: 'admin' as const,
  },
  {
    id: 'gi2',
    title: 'Who owns a token? A governance model that survived three teams',
    author: CREATORS[2],
    meta: 'Article · 12 min read',
    icon: 'courses' as const,
  },
  {
    id: 'gi3',
    title: 'Show and tell: replacing 41 hard-coded greys in one afternoon',
    author: CREATORS[6],
    meta: 'Clip · 9:12',
    icon: 'video' as const,
  },
  {
    id: 'gi4',
    title: 'Weekly office hours — bring a broken ramp',
    author: CREATORS[1],
    meta: 'Event · Thu 18:00 CET',
    icon: 'events' as const,
  },
];

export function DiscoverScreen() {
  const [category, setCategory] = useState('For you');
  const hero = STREAMS[2];

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-disc">
        {/*
          The hero commits to one recommendation rather than hedging with a
          carousel of five. A storefront that cannot pick a window display is
          not making a recommendation, it is showing an inventory.
        */}
        <section className="sy-disc__hero" aria-labelledby="sy-disc-hero-title">
          <Media seed={hero.id} ratio="16/9" scrim radius="xl" className="sy-disc__hero-media">
            {/*
              Everything inside the scrim is pinned to the dark palette. The
              scrim is dark in both themes, so the light theme's dark-on-light
              foregrounds would be unreadable over it; re-declaring the theme on
              the subtree keeps this tokenised instead of hard-coding white.
            */}
            <div className="sy-disc__hero-top" data-theme="dark">
              <LiveBadge viewers={hero.viewers} />
              <Badge tone="neutral" variant="solid">
                {hero.category}
              </Badge>
            </div>
            <div className="sy-disc__hero-body" data-theme="dark">
              <span className="sy-overline sy-disc__hero-eyebrow">Featured live</span>
              <h2 id="sy-disc-hero-title" className="sy-title-1 sy-disc__hero-title">
                {hero.title}
              </h2>
              <div className="sy-disc__hero-creator">
                <Avatar name={hero.creator.name} size={34} ring="live" verified={hero.creator.verified} />
                <div className="sy-grow">
                  <p className="sy-label sy-truncate">{hero.creator.name}</p>
                  <p className="sy-caption sy-disc__hero-sub">
                    {hero.creator.followers} followers · streaming for {hero.duration}
                  </p>
                </div>
              </div>
              <div className="sy-disc__hero-actions">
                <Button variant="primary" tone="live" icon="play">
                  Watch live
                </Button>
                <Button variant="glass" icon="notifications">
                  Remind me
                </Button>
                <Button variant="glass" icon="bookmark">
                  Save
                </Button>
              </div>
            </div>
          </Media>
          <p className="sy-caption sy-fg-quiet sy-disc__hero-why">
            <Icon name="info" size={13} />
            Featured because deep-sea streams are the fastest-growing category you watch, and this one
            started 12 minutes ago.
          </p>
        </section>

        <nav className="sy-disc__categories" aria-label="Categories">
          <div className="sy-scroller">
            {CATEGORIES.map((item) => (
              <Chip key={item} selected={item === category} onClick={() => setCategory(item)}>
                {item}
              </Chip>
            ))}
          </div>
        </nav>

        <Shelf
          title="Live now"
          eyebrow="Ranked by how much of a stream you usually finish"
          reason="These six streams are ordered by predicted watch-through, not viewer count. A 1,300-viewer gaming stream can outrank a 31,000-viewer one if you tend to stay for the whole build."
        >
          <div className="sy-scroller">
            {STREAMS.map((stream) => (
              <StreamCard key={stream.id} stream={stream} size="sm" />
            ))}
          </div>
        </Shelf>

        <Shelf
          title="Rising creators"
          eyebrow="Growing fast in categories you already follow"
          reason="Ranked on follower growth over the last 14 days, weighted by overlap with people you already follow. Nobody pays to appear here — this shelf carries no promoted slots."
        >
          <div className="sy-scroller">
            {[CREATORS[4], CREATORS[6], CREATORS[3], CREATORS[7], CREATORS[1]].map((creator) => (
              <div key={creator.id} className="sy-disc__creator">
                <CreatorCard
                  creator={creator}
                  action={
                    <Button variant="outline" size="sm" fullWidth icon="follow">
                      Follow
                    </Button>
                  }
                />
              </div>
            ))}
          </div>
        </Shelf>

        <Shelf
          title="Because you follow Amara"
          eyebrow="From the people she talks to most"
          reason="Built from Amara Okonkwo's collaborators and the accounts she replies to, filtered to those you do not already follow. Following her is the only signal used here."
        >
          <div className="sy-scroller">
            {[POSTS[1], POSTS[4], POSTS[3], POSTS[2]].map((post) => (
              <article key={post.id} className="sy-disc__card">
                <Media seed={`disc-${post.id}`} ratio="16/9" radius="lg" scrim>
                  <div className="sy-disc__card-badge">
                    <Badge tone="accent" variant="solid" icon="sparkles">
                      Suggested
                    </Badge>
                  </div>
                </Media>
                <div className="sy-disc__card-body">
                  <p className="sy-label sy-clamp-3 sy-disc__card-title">{post.body}</p>
                  <div className="sy-row sy-gap-2">
                    <Avatar name={post.author.name} size={22} verified={post.author.verified} />
                    <span className="sy-caption sy-fg-muted sy-truncate">{post.author.name}</span>
                  </div>
                  <p className="sy-caption sy-fg-quiet">
                    {post.likes} likes · {post.comments} comments
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Shelf>

        <Shelf
          title="Long-form worth your evening"
          eyebrow="Over an hour, and finished by most people who start it"
          reason="Only pieces longer than 60 minutes with an above-median completion rate. Runtime is shown before the title because it is the fact that decides whether you press play tonight."
        >
          <div className="sy-scroller">
            {LONG_FORM.map((item) => (
              <article key={item.id} className="sy-disc__long">
                <Media seed={item.id} ratio="16/9" radius="lg" scrim>
                  <span className="sy-media__play">
                    <Icon name="play" size={22} />
                  </span>
                  <span className="sy-media__duration sy-mono">{item.duration}</span>
                </Media>
                <div className="sy-disc__card-body">
                  <p className="sy-label sy-clamp-3 sy-disc__card-title">{item.title}</p>
                  <p className="sy-caption sy-fg-muted sy-truncate">{item.creator.name}</p>
                  <p className="sy-caption sy-fg-quiet sy-truncate">
                    {item.views} · {item.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Shelf>

        <Shelf
          title="New in Design Systems Guild"
          eyebrow={`${COMMUNITIES[0].members} members · ${COMMUNITIES[0].online} online`}
          reason="You joined this space, so its ranking is chronological within the last 24 hours and only the reply count reorders it. Membership is an explicit choice, and explicit choices are not re-ranked."
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              Open space
            </Button>
          }
        >
          <div className="sy-scroller">
            {GUILD_ITEMS.map((item) => (
              <Surface key={item.id} className="sy-disc__guild" padding="md" elevation="surface" interactive>
                <span className="sy-tile-icon sy-tone-accent">
                  <Icon name={item.icon} size={18} />
                </span>
                <p className="sy-label sy-clamp-3 sy-disc__card-title">{item.title}</p>
                <div className="sy-row sy-gap-2">
                  <Avatar name={item.author.name} size={20} />
                  <span className="sy-caption sy-fg-muted sy-truncate">{item.author.name}</span>
                </div>
                <p className="sy-caption sy-fg-quiet">{item.meta}</p>
              </Surface>
            ))}
          </div>
        </Shelf>

        <ScreenSection
          title="Learn it properly"
          eyebrow="Courses from creators on this page"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              Browse
            </Button>
          }
        >
          <div className="sy-grid" style={{ ['--min' as string]: '250px' }}>
            {COURSES.slice(0, 3).map((course) => (
              <Surface key={course.id} className="sy-disc__course" padding="none" elevation="surface" interactive>
                <Media seed={course.id} ratio="16/9" radius="none" />
                <div className="sy-disc__course-body">
                  <Badge tone="creator" variant="soft">
                    {course.level}
                  </Badge>
                  <h3 className="sy-headline sy-clamp-2">{course.title}</h3>
                  <p className="sy-caption sy-fg-muted sy-truncate">{course.instructor}</p>
                  <p className="sy-caption sy-fg-quiet">
                    {course.lessons} lessons · {course.hours} · {course.enrolled} enrolled
                  </p>
                </div>
              </Surface>
            ))}
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}

/**
 * A ranked shelf.
 *
 * The "Why this?" toggle is part of the header rather than buried in an
 * overflow menu, and it reveals text written for this shelf specifically. The
 * expanded panel is a disclosure, not a tooltip, because the explanation is
 * three lines long and tooltips are unusable on touch.
 */
function Shelf({
  title,
  eyebrow,
  reason,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  reason: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="sy-shelf">
      <header className="sy-shelf__head">
        <div className="sy-grow">
          <span className="sy-overline sy-fg-accent">{eyebrow}</span>
          <h2 className="sy-title-3">{title}</h2>
        </div>
        <div className="sy-shelf__actions">
          <Button
            variant="ghost"
            size="sm"
            icon="info"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            Why this?
          </Button>
          {action}
        </div>
      </header>
      {open && (
        <Surface className="sy-shelf__reason" padding="md" elevation="raised" radius="lg">
          <Icon name="brain" size={18} />
          <p className="sy-body-sm sy-fg-muted sy-measure">{reason}</p>
          <Button variant="ghost" size="xs" icon="sliders">
            Tune this shelf
          </Button>
        </Surface>
      )}
      {children}
    </section>
  );
}
