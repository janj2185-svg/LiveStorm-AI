/**
 * Home
 * ---------------------------------------------------------------------------
 * The question this screen answers is "what should I do right now?", and the
 * answer is ordered by *perishability*: things that expire soonest sit highest.
 *
 *   1. Live now      gone in minutes
 *   2. Stories       gone in 24 hours
 *   3. Feed          durable
 *
 * That ordering is the whole information architecture. It is also why the AI
 * brief sits above the feed but below live: a summary is useful all day, a
 * broadcast is not.
 *
 * The feed is strictly chronological within source. SYLORA does not silently
 * reorder a person's timeline; ranked recommendations are a separate,
 * explicitly labelled surface (Discover).
 */

import { AiOrb } from '../../design-system/brand/Logo';
import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  LiveBadge,
  ProgressRing,
  SearchInput,
  Surface,
} from '../../design-system/primitives';
import { CREATORS, MISSIONS, POSTS, STORIES, STREAMS, TRENDING } from '../data';
import { Media, PostCard, ScreenSection } from '../components';

export function HomeScreen() {
  return (
    <div className="sy-screen">
      <div className="sy-home">
        <div className="sy-home__main sy-screen__inner">
          {/* Search is duplicated here rather than only in the top bar: on a
              phone the top bar is out of thumb reach. */}
          <div className="sy-home__search">
            <SearchInput placeholder="Search creators, streams, spaces" shortcut="/" />
            <IconButton icon="notifications" label="Notifications" variant="ghost" />
          </div>

          <ScreenSection>
            <div className="sy-stories" aria-label="Stories">
              {STORIES.map((story) => (
                <button key={story.id} type="button" className="sy-story">
                  <span className={`sy-story__ring${story.seen ? ' is-seen' : ''}`}>
                    {story.own ? (
                      <span className="sy-story__own">
                        <Avatar name="Jordan Reyes" size={56} />
                        <span className="sy-story__add">
                          <Icon name="plus" size={12} />
                        </span>
                      </span>
                    ) : (
                      <Avatar name={story.name} size={56} />
                    )}
                  </span>
                  <span className="sy-caption sy-truncate sy-story__name">{story.name}</span>
                </button>
              ))}
            </div>
          </ScreenSection>

          <ScreenSection
            title="Live now"
            eyebrow="From people you follow"
            action={
              <Button variant="ghost" size="sm" iconEnd="chevronRight">
                All
              </Button>
            }
          >
            <div className="sy-scroller">
              {STREAMS.slice(0, 4).map((stream) => (
                <article key={stream.id} className="sy-live-tile">
                  <Media seed={stream.id} ratio="16/9" scrim radius="lg">
                    <div className="sy-live-tile__top">
                      <LiveBadge viewers={stream.viewers} />
                    </div>
                    <div className="sy-live-tile__bottom">
                      <Avatar name={stream.creator.name} size={26} />
                      <span className="sy-caption sy-truncate">{stream.creator.name}</span>
                    </div>
                  </Media>
                  <p className="sy-live-tile__title sy-clamp-2">{stream.title}</p>
                </article>
              ))}
            </div>
          </ScreenSection>

          {/*
            The assistant's daily brief. It is a *card*, not a chat window:
            on the home screen the assistant reports, it does not converse.
            Every claim carries a source, and every suggestion is an offer the
            user accepts rather than an action already taken.
          */}
          <ScreenSection>
            <Surface className="sy-brief" elevation="raised" radius="xl" padding="lg">
              <div className="sy-brief__head">
                <AiOrb size={38} state="idle" />
                <div className="sy-grow">
                  <span className="sy-overline sy-fg-accent">Daily brief</span>
                  <h2 className="sy-headline">Three things need you today</h2>
                </div>
                <Badge tone="accent" variant="soft" icon="sparkles">
                  Assistant
                </Badge>
              </div>
              <ul className="sy-brief__list">
                <li>
                  <Icon name="trendUp" size={16} />
                  <span className="sy-body-sm">
                    Watch time is up <strong>18%</strong> week over week, driven almost entirely by the
                    Thursday broadcast.
                  </span>
                </li>
                <li>
                  <Icon name="clock" size={16} />
                  <span className="sy-body-sm">
                    <strong>14 questions</strong> in Design Systems Guild are still unanswered after 48 hours.
                  </span>
                </li>
                <li>
                  <Icon name="coin" size={16} />
                  <span className="sy-body-sm">
                    Your January payout of <strong>€4,182.60</strong> is processing and should clear Thursday.
                  </span>
                </li>
              </ul>
              <div className="sy-brief__actions">
                <Button variant="primary" size="sm" icon="aiAssistant">
                  Open assistant
                </Button>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
              </div>
            </Surface>
          </ScreenSection>

          <ScreenSection title="Your feed" eyebrow="Newest first">
            <div className="sy-feed sy-enter">
              {POSTS.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </ScreenSection>
        </div>
      </div>
    </div>
  );
}

/**
 * Context panel content for Home.
 * Exported separately because the shell owns the panel; it only appears in the
 * expanded posture, and its content must be genuinely secondary — nothing here
 * is unreachable elsewhere.
 */
export function HomeContextPanel() {
  return (
    <div className="sy-stack sy-gap-6">
      <section>
        <h3 className="sy-label sy-context-title">Today&apos;s missions</h3>
        <div className="sy-stack sy-gap-3">
          {MISSIONS.slice(0, 3).map((mission) => (
            <div key={mission.id} className="sy-mission-mini">
              <ProgressRing
                value={(mission.progress / mission.target) * 100}
                size={38}
                thickness={3}
                label={mission.title}
              >
                <span className="sy-caption">{mission.progress}</span>
              </ProgressRing>
              <div className="sy-grow">
                <p className="sy-caption sy-clamp-2">{mission.title}</p>
                <p className="sy-caption sy-fg-accent">{mission.reward}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="sy-label sy-context-title">Trending topics</h3>
        <div className="sy-stack sy-gap-1">
          {TRENDING.map((topic) => (
            <button key={topic.tag} type="button" className="sy-trend-row">
              <span className="sy-trend-row__tag">{topic.tag}</span>
              <span className="sy-caption sy-fg-quiet">{topic.posts}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="sy-label sy-context-title">Suggested for you</h3>
        <div className="sy-stack sy-gap-3">
          {CREATORS.slice(3, 6).map((creator) => (
            <div key={creator.id} className="sy-suggest-row">
              <Avatar name={creator.name} size={36} verified={creator.verified} />
              <div className="sy-grow">
                <p className="sy-caption sy-truncate">
                  <strong>{creator.name}</strong>
                </p>
                <p className="sy-caption sy-fg-quiet sy-truncate">{creator.followers} followers</p>
              </div>
              <Button variant="outline" size="xs">
                Follow
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
