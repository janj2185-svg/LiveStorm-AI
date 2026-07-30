/**
 * Profile
 * ---------------------------------------------------------------------------
 * A creator's public page has to answer two questions in the first screenful:
 * "who is this?" and "what do I get if I pay?". Everything above the tabs is
 * in service of those two, in that order — identity, then the four numbers
 * that establish scale, then the actions, then the tiers.
 *
 * Subscribe is styled in the creator tone rather than the brand accent. Follow
 * is free and belongs to SYLORA; subscribing is a transaction with the person
 * whose page you are on, and the colour split is what keeps someone from
 * paying by muscle memory.
 *
 * The tier card is a teaser, not a checkout. Three tiers is the most a person
 * will actually compare, and each states perks in the creator's own terms —
 * "the raw project files", not "exclusive content" — because vague perks are
 * the main reason creator subscriptions get refunded.
 *
 * In the compact posture the banner shortens, the avatar drops a size and the
 * four actions become a two-up grid. Buttons laid out in a row on a 393px
 * screen would either wrap unpredictably or shrink below the 44px target;
 * committing to a grid makes the wrap deliberate.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  LiveBadge,
  Surface,
  Tabs,
} from '../../design-system/primitives';
import { ListRow, Media, PostCard, ScreenSection, StreamCard } from '../components';
import { CREATORS, POSTS, PRODUCTS, STREAMS, type Post } from '../data';

const AMARA = CREATORS[0];

/** Amara's own timeline. POSTS carries one of hers; the rest are her back catalogue. */
const OWN_POSTS: Post[] = [
  POSTS[0],
  {
    id: 'ap2',
    author: AMARA,
    time: '2d',
    body: 'The contrast audit now runs as a build step. 82 foreground/background pairs, both themes, and the build fails if a single one drops below 4.5:1. It caught two regressions in the first week — both mine.',
    likes: '2.1K',
    comments: '96',
    reposts: '288',
    space: 'Design Systems Guild',
  },
  {
    id: 'ap3',
    author: AMARA,
    time: '5d',
    body: 'Unpopular position: most design systems fail on governance, not on components. Nobody has ever churned because the button had the wrong radius. They churn because adding a token took four weeks and two approvals.',
    media: { kind: 'image', ratio: '16/9' },
    likes: '11.4K',
    comments: '1.3K',
    reposts: '4.2K',
  },
];

const PAST_BROADCASTS = [
  { id: 'pb1', title: 'Gamut mapping, from scratch, with a whiteboard and no slides', duration: '1:58:22', views: '84K', when: '3 days ago' },
  { id: 'pb2', title: 'Rebuilding the neutral ramp because it went dead-grey in light mode', duration: '2:12:40', views: '61K', when: 'Last week' },
  { id: 'pb3', title: 'Office hours — bring your broken token pipeline', duration: '3:41:09', views: '39K', when: '2 weeks ago' },
];

const VIDEOS = [
  { id: 'v1', title: 'Why OKLCH and not HSL, in four minutes', duration: '4:12', views: '412K' },
  { id: 'v2', title: 'Every mistake I made shipping our first token release', duration: '18:46', views: '188K' },
  { id: 'v3', title: 'Reading a contrast report without wanting to quit', duration: '11:03', views: '96K' },
  { id: 'v4', title: 'Naming things: a system that survived three rebrands', duration: '22:31', views: '144K' },
];

const TIERS = [
  {
    id: 't1',
    name: 'Signal',
    price: '€5',
    tone: 'neutral' as const,
    members: '1,840 members',
    perks: ['Subscriber badge in chat and comments', 'Weekly build notes before they go public'],
  },
  {
    id: 't2',
    name: 'Studio',
    price: '€12',
    tone: 'accent' as const,
    popular: true,
    members: '612 members',
    perks: [
      'The raw project files from every stream',
      'Monthly two-hour workshop, recorded and captioned',
      'Ask-me-anything thread with a guaranteed reply',
    ],
  },
  {
    id: 't3',
    name: 'Atelier',
    price: '€35',
    tone: 'creator' as const,
    members: '84 members',
    perks: [
      'A 30-minute portfolio or system review each quarter',
      'Your name in the credits of anything shipped that month',
      'Direct message access, answered within two working days',
    ],
  },
];

export function ProfileScreen() {
  const [tab, setTab] = useState('posts');

  return (
    <div className="sy-screen">
      <div className="sy-profile">
        <div className="sy-profile__banner">
          <Media seed="amara-banner" ratio="3/1" radius="none" />
        </div>

        <div className="sy-screen__inner">
          <header className="sy-profile__head">
            <div className="sy-profile__identity">
              {/* Size is a prop rather than CSS because the primitive writes
                  width and height inline; the compact override has to fight
                  that inline style, which is the one place this screen uses
                  !important. */}
              <Avatar
                name={AMARA.name}
                size={112}
                ring="live"
                verified={AMARA.verified}
                className="sy-profile__avatar"
              />
              <div className="sy-profile__namebox">
                <div className="sy-profile__nameline">
                  <h1 className="sy-title-2">{AMARA.name}</h1>
                  {AMARA.live && <LiveBadge viewers="14.2K" />}
                </div>
                <p className="sy-body-sm sy-fg-muted">
                  {AMARA.handle} · she/her · Lisbon, Portugal
                </p>
                <p className="sy-body sy-fg-muted sy-measure sy-profile__bio">{AMARA.bio}</p>
                <div className="sy-profile__tags">
                  <Badge tone="accent" icon="layers">
                    {AMARA.category}
                  </Badge>
                  <Badge tone="neutral" icon="sparkles">
                    Design systems
                  </Badge>
                  <Badge tone="neutral" icon="courses">
                    Teaching
                  </Badge>
                  <Badge tone="success" icon="verified">
                    SYLORA Partner
                  </Badge>
                </div>
              </div>
            </div>

            {/* Four stats, wrapping rather than scrolling: a number you have to
                scroll to find is a number nobody reads. */}
            <dl className="sy-profile__stats">
              <div className="sy-profile__stat">
                <dt className="sy-caption sy-fg-quiet">Followers</dt>
                <dd className="sy-mono-lg">{AMARA.followers}</dd>
              </div>
              <div className="sy-profile__stat">
                <dt className="sy-caption sy-fg-quiet">Following</dt>
                <dd className="sy-mono-lg">318</dd>
              </div>
              <div className="sy-profile__stat">
                <dt className="sy-caption sy-fg-quiet">Watch hours</dt>
                <dd className="sy-mono-lg">2.41M</dd>
              </div>
              <div className="sy-profile__stat">
                <dt className="sy-caption sy-fg-quiet">Member since</dt>
                <dd className="sy-mono-lg">Mar 2019</dd>
              </div>
            </dl>

            <div className="sy-profile__actions">
              <Button variant="primary" icon="follow" className="sy-profile__action-follow">
                Follow
              </Button>
              <Button
                variant="primary"
                tone="creator"
                icon="premium"
                className="sy-profile__action-subscribe"
              >
                Subscribe
              </Button>
              <Button variant="secondary" icon="messages" className="sy-profile__action-message">
                Message
              </Button>
              <IconButton
                icon="more"
                label="More options for Amara Okonkwo"
                variant="secondary"
                className="sy-profile__action-more"
              />
            </div>
          </header>

          <ScreenSection>
            <Surface className="sy-tiers" padding="none" elevation="flat">
              <header className="sy-tiers__head">
                <div className="sy-grow">
                  <span className="sy-overline sy-fg-creator">Membership</span>
                  <h2 className="sy-title-3">Three ways to back this work</h2>
                  <p className="sy-body-sm sy-fg-muted sy-measure">
                    Cancel any time. Amara keeps 92% of every subscription after processing.
                  </p>
                </div>
                <Button variant="ghost" size="sm" iconEnd="chevronRight">
                  Compare
                </Button>
              </header>
              <div className="sy-tiers__grid">
                {TIERS.map((tier) => (
                  <Surface
                    key={tier.id}
                    className={`sy-tier${tier.popular ? ' is-popular' : ''} sy-tone-${tier.tone}`}
                    padding="md"
                    elevation={tier.popular ? 'raised' : 'surface'}
                    radius="lg"
                  >
                    <div className="sy-tier__head">
                      <h3 className="sy-headline">{tier.name}</h3>
                      {tier.popular && (
                        <Badge tone="accent" variant="solid" icon="achievement">
                          Most chosen
                        </Badge>
                      )}
                    </div>
                    <p className="sy-tier__price">
                      <span className="sy-mono-lg">{tier.price}</span>
                      <span className="sy-caption sy-fg-quiet"> / month</span>
                    </p>
                    <p className="sy-caption sy-fg-quiet">{tier.members}</p>
                    <ul className="sy-tier__perks">
                      {tier.perks.map((perk) => (
                        <li key={perk}>
                          <Icon name="check" size={15} />
                          <span className="sy-body-sm">{perk}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={tier.popular ? 'primary' : 'outline'}
                      tone={tier.popular ? 'creator' : 'neutral'}
                      size="sm"
                      fullWidth
                    >
                      Join {tier.name}
                    </Button>
                  </Surface>
                ))}
              </div>
            </Surface>
          </ScreenSection>

          <div className="sy-profile__tabs">
            <Tabs
              variant="underline"
              tabs={[
                { id: 'posts', label: 'Posts', badge: 412 },
                { id: 'streams', label: 'Streams', badge: 96 },
                { id: 'videos', label: 'Videos', badge: 148 },
                { id: 'shop', label: 'Shop', badge: 6 },
                { id: 'about', label: 'About' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div className="sy-profile__panel">
            {tab === 'posts' && (
              <div className="sy-profile__posts sy-enter">
                {OWN_POSTS.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {tab === 'streams' && (
              <div className="sy-stack sy-gap-6">
                <ScreenSection title="On air now">
                  <StreamCard stream={STREAMS[0]} />
                </ScreenSection>
                <ScreenSection title="Past broadcasts">
                  <div className="sy-stack sy-gap-2">
                    {PAST_BROADCASTS.map((broadcast) => (
                      <Surface
                        key={broadcast.id}
                        className="sy-profile__broadcast"
                        padding="none"
                        elevation="flat"
                      >
                        <ListRow
                          leading={
                            <Media seed={broadcast.id} ratio="16/9" radius="md" className="sy-profile__thumb" />
                          }
                          title={broadcast.title}
                          subtitle={`${broadcast.when} · ${broadcast.views} views · ${broadcast.duration}`}
                          trailing={<Icon name="chevronRight" size={16} />}
                          onClick={() => undefined}
                        />
                      </Surface>
                    ))}
                  </div>
                </ScreenSection>
              </div>
            )}

            {tab === 'videos' && (
              <div className="sy-grid" style={{ ['--min' as string]: '230px' }}>
                {VIDEOS.map((video) => (
                  <article key={video.id} className="sy-profile__video">
                    <Media seed={video.id} ratio="16/9" radius="lg" scrim>
                      <span className="sy-media__play">
                        <Icon name="play" size={22} />
                      </span>
                      <span className="sy-media__duration sy-mono">{video.duration}</span>
                    </Media>
                    <p className="sy-label sy-clamp-2">{video.title}</p>
                    <p className="sy-caption sy-fg-quiet">{video.views} views</p>
                  </article>
                ))}
              </div>
            )}

            {tab === 'shop' && (
              <div className="sy-stack sy-gap-6">
                <ScreenSection title="Made by Amara">
                  <Surface className="sy-shop__feature" padding="none" elevation="raised" radius="xl">
                    <Media seed="pr2" ratio="16/9" radius="none" className="sy-shop__feature-media" />
                    <div className="sy-shop__feature-body">
                      <Badge tone="creator">{PRODUCTS[1].kind}</Badge>
                      <h3 className="sy-title-3">{PRODUCTS[1].title}</h3>
                      <p className="sy-body-sm sy-fg-muted sy-measure">
                        Every overlay, scene and alert used on this channel, with the token file so the
                        colours match whatever you rebrand to.
                      </p>
                      <p className="sy-caption sy-fg-quiet">
                        {PRODUCTS[1].rating.toFixed(1)} rating · {PRODUCTS[1].sales} sold · Free updates for
                        a year
                      </p>
                      <div className="sy-row sy-gap-3 sy-wrap">
                        <span className="sy-mono-lg">{PRODUCTS[1].price}</span>
                        <Button variant="primary" tone="creator" icon="marketplace">
                          Add to cart
                        </Button>
                        <Button variant="ghost">Preview</Button>
                      </div>
                    </div>
                  </Surface>
                </ScreenSection>

                <ScreenSection
                  title="Curated by Amara"
                  eyebrow="Things she actually uses"
                  action={
                    <Button variant="ghost" size="sm" iconEnd="chevronRight">
                      All 6
                    </Button>
                  }
                >
                  <div className="sy-grid" style={{ ['--min' as string]: '230px' }}>
                    {PRODUCTS.filter((product) => product.id !== 'pr2').map((product) => (
                      <Surface
                        key={product.id}
                        className="sy-shop__card"
                        padding="none"
                        elevation="surface"
                        interactive
                      >
                        <Media seed={product.id} ratio="4/3" radius="none" />
                        <div className="sy-shop__card-body">
                          <Badge tone="neutral">{product.kind}</Badge>
                          <p className="sy-label sy-clamp-2">{product.title}</p>
                          <p className="sy-caption sy-fg-quiet sy-truncate">{product.creator}</p>
                          <div className="sy-row sy-between">
                            <span className="sy-mono">{product.price}</span>
                            <span className="sy-caption sy-fg-quiet">
                              {product.rating.toFixed(1)} · {product.sales}
                            </span>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </ScreenSection>
              </div>
            )}

            {tab === 'about' && (
              <div className="sy-profile__about">
                <Surface padding="lg" elevation="surface" radius="lg">
                  <h3 className="sy-headline sy-profile__about-title">The long version</h3>
                  <p className="sy-body sy-fg-muted sy-measure">
                    Nine years building interface systems, four of them at a company whose design team
                    grew from six people to ninety in eighteen months. Everything I know about tokens I
                    learned by getting it wrong at that scale, in public, with a release train that did
                    not stop.
                  </p>
                  <p className="sy-body sy-fg-muted sy-measure">
                    I stream the actual work — the pipeline, the failures, the arguments about naming —
                    most weeknights from 18:00 CET. Nothing is pre-recorded and nothing is edited.
                  </p>
                </Surface>

                <div className="sy-cols sy-cols--2">
                  <Surface padding="lg" elevation="surface" radius="lg">
                    <h3 className="sy-headline sy-profile__about-title">Schedule</h3>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Mon, Tue, Thu</span>
                      <span className="sy-kv__value">18:00 CET · Build stream</span>
                    </div>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Wednesday</span>
                      <span className="sy-kv__value">No stream</span>
                    </div>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Saturday</span>
                      <span className="sy-kv__value">15:00 CET · Office hours</span>
                    </div>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Average length</span>
                      <span className="sy-kv__value">2h 40m</span>
                    </div>
                  </Surface>

                  <Surface padding="lg" elevation="surface" radius="lg">
                    <h3 className="sy-headline sy-profile__about-title">Elsewhere</h3>
                    <div className="sy-stack sy-gap-1">
                      <ListRow
                        leading={
                          <span className="sy-tile-icon sy-tone-accent">
                            <Icon name="link" size={18} />
                          </span>
                        }
                        title="amara.builds"
                        subtitle="Write-ups, the ramp generator, and the token spec"
                        trailing={<Icon name="external" size={16} />}
                        onClick={() => undefined}
                      />
                      <ListRow
                        leading={
                          <span className="sy-tile-icon sy-tone-creator">
                            <Icon name="community" size={18} />
                          </span>
                        }
                        title="Design Systems Guild"
                        subtitle="Moderator · 24.8K members"
                        trailing={<Icon name="chevronRight" size={16} />}
                        onClick={() => undefined}
                      />
                      <ListRow
                        leading={
                          <span className="sy-tile-icon sy-tone-success">
                            <Icon name="courses" size={18} />
                          </span>
                        }
                        title="Design Systems from First Principles"
                        subtitle="34 lessons · 8.4K enrolled"
                        trailing={<Icon name="chevronRight" size={16} />}
                        onClick={() => undefined}
                      />
                    </div>
                  </Surface>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
