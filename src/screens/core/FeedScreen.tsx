/**
 * Feed
 * ---------------------------------------------------------------------------
 * Home asks "what should I do right now?". Feed asks the narrower question
 * "what have the people I chose to follow published, in the order they
 * published it?" — so nothing here is ranked, boosted or reordered. The sort
 * control is honest about that: it changes the ordering rule, it does not hand
 * the ordering over to a model.
 *
 * The one thing a strict timeline must handle better than a ranked one is
 * *heterogeneity*. A chronological feed cannot quietly drop the item types it
 * finds awkward, so the shared PostCard is deliberately not the only shape
 * here: a poll and a space digest are rendered inline to prove the column
 * absorbs items with completely different internal structure without the
 * rhythm breaking.
 *
 * The filter bar sticks because scanning a long timeline and changing which
 * timeline you are scanning are the same task. The "new posts" pill is
 * deliberately a pill and not an auto-insert: inserting content above the
 * scroll position moves what someone is reading, which is the rudest thing a
 * feed can do.
 */

import { useState } from 'react';

import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Chip,
  Icon,
  IconButton,
  Surface,
  Tabs,
  type IconName,
} from '../../design-system/primitives';
import { Media, PostCard, ScreenSection } from '../components';
import { COMMUNITIES, CREATORS, ME, POSTS } from '../data';

/** Post types the composer can open. Ordered by how often they are used. */
const COMPOSER_TYPES: { id: string; label: string; icon: IconName }[] = [
  { id: 'text', label: 'Text', icon: 'edit' },
  { id: 'photo', label: 'Photo', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'live', label: 'Live', icon: 'live' },
  { id: 'poll', label: 'Poll', icon: 'leaderboard' },
];

const POLL_OPTIONS = [
  { id: 'po1', label: 'Semantic only — bg.surface, fg.muted', share: 46, chosen: true },
  { id: 'po2', label: 'Ramp steps only — porcelain.3, aether.9', share: 12, chosen: false },
  { id: 'po3', label: 'Both, with semantic as the default', share: 38, chosen: false },
  { id: 'po4', label: 'Neither. Component-scoped tokens', share: 4, chosen: false },
];

const DIGEST_THREADS = [
  { id: 'dt1', title: 'Has anyone shipped OKLCH ramps to a design team that does not read hex?', replies: 47, author: 'Tobias Lindqvist' },
  { id: 'dt2', title: 'Governance: who is allowed to add a token, and who reviews it?', replies: 31, author: 'Priya Raghunathan' },
  { id: 'dt3', title: 'Show and tell — our contrast audit runs in CI and fails the build', replies: 24, author: 'Sam Whitfield' },
];

export function FeedScreen() {
  const [source, setSource] = useState('following');
  const [pillDismissed, setPillDismissed] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-fdscreen">
        {/*
          Filter and sort travel together because they answer one question:
          "which timeline am I looking at?" Sticking them costs 52px of the
          scroll area and saves a full-height scroll back on every change.
        */}
        <div className="sy-fdscreen__bar">
          <Tabs
            variant="pill"
            tabs={[
              { id: 'following', label: 'Following' },
              { id: 'spaces', label: 'Spaces' },
              { id: 'saved', label: 'Saved' },
            ]}
            active={source}
            onChange={setSource}
            className="sy-fdscreen__tabs"
          />
          <Button
            variant="secondary"
            size="sm"
            icon="sliders"
            iconEnd="chevronDown"
            className="sy-fdscreen__sort"
            aria-haspopup="listbox"
          >
            Newest
          </Button>
        </div>

        <div className="sy-fdscreen__layout">
          <div className="sy-fdscreen__main">
            {/*
              The composer is a row, not a text area. An always-open field on a
              timeline invites nothing and costs 120px; a row that expands into
              the five post types states what SYLORA can actually make.
            */}
            <Surface className="sy-composer" padding="none" elevation="surface">
              <button
                type="button"
                className="sy-composer__entry"
                aria-expanded={composerOpen}
                onClick={() => setComposerOpen((open) => !open)}
              >
                <Avatar name={ME.name} size={40} />
                <span className="sy-composer__prompt sy-body sy-fg-quiet">Share something</span>
                <span className="sy-composer__hint sy-caption sy-fg-quiet">Posting as {ME.handle}</span>
                <Icon name={composerOpen ? 'chevronUp' : 'chevronDown'} size={18} />
              </button>
              <div className="sy-composer__types" hidden={!composerOpen}>
                {COMPOSER_TYPES.map((type) => (
                  <Chip key={type.id} icon={type.icon}>
                    {type.label}
                  </Chip>
                ))}
              </div>
            </Surface>

            {/*
              New posts arrive but never insert themselves. The pill is vellum so
              it reads as a layer over the timeline rather than an item in it,
              and it carries a count so the choice to jump is informed.
            */}
            {!pillDismissed && (
              <div className="sy-fdscreen__newwrap">
                <div className="sy-newpill sy-vellum">
                  <AvatarGroup
                    people={[CREATORS[2], CREATORS[5], CREATORS[7]].map((c) => ({ name: c.name }))}
                    size={20}
                    max={3}
                  />
                  <button type="button" className="sy-newpill__label">
                    <Icon name="arrowUp" size={15} />
                    12 new posts
                  </button>
                  <IconButton
                    icon="close"
                    label="Dismiss new posts"
                    variant="ghost"
                    size="xs"
                    onClick={() => setPillDismissed(true)}
                  />
                </div>
              </div>
            )}

            <ScreenSection>
              <div className="sy-fdscreen__stream sy-enter">
                <PostCard post={POSTS[0]} />

                <PollPost />

                <PostCard post={POSTS[1]} />

                <SpaceDigest />

                <PostCard post={POSTS[2]} />
                <PostCard post={POSTS[3]} />
                <PostCard post={POSTS[4]} />

                <div className="sy-fdscreen__end">
                  <p className="sy-caption sy-fg-quiet">
                    You are caught up to 06:14 this morning. 3 older posts from muted spaces were hidden.
                  </p>
                  <Button variant="ghost" size="sm" icon="refresh">
                    Load older posts
                  </Button>
                </div>
              </div>
            </ScreenSection>
          </div>

          {/*
            In-screen sidebar.
            Feed supplies no context panel, so once the content column passes
            the system's widest threshold the surface is wide enough for two
            columns and the shell has nothing to fill the second one with. The
            screen has to supply it. Everything in here is duplicated elsewhere
            in the product — this column is the first thing that may be dropped.
          */}
          <aside className="sy-fdscreen__side" aria-label="Suggestions">
            <Surface className="sy-fdscreen__panel" padding="md" elevation="surface">
              <h2 className="sy-label sy-fdscreen__panel-title">Who to follow</h2>
              <div className="sy-stack sy-gap-3">
                {[CREATORS[3], CREATORS[4], CREATORS[6]].map((creator) => (
                  <div key={creator.id} className="sy-fdscreen__person">
                    <Avatar name={creator.name} size={38} verified={creator.verified} />
                    <div className="sy-grow">
                      <p className="sy-label sy-truncate">{creator.name}</p>
                      <p className="sy-caption sy-fg-quiet sy-truncate">
                        {creator.followers} · {creator.category}
                      </p>
                    </div>
                    <Button variant="outline" size="xs">
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="link" size="sm" iconEnd="chevronRight">
                See all suggestions
              </Button>
            </Surface>

            <Surface className="sy-fdscreen__panel" padding="md" elevation="surface">
              <h2 className="sy-label sy-fdscreen__panel-title">Active spaces</h2>
              <div className="sy-stack sy-gap-1">
                {COMMUNITIES.slice(0, 4).map((space) => (
                  <button key={space.id} type="button" className="sy-fdscreen__space">
                    <span className="sy-tile-icon sy-tone-accent">
                      <Icon name="community" size={18} />
                    </span>
                    <span className="sy-grow">
                      <span className="sy-label sy-truncate sy-fdscreen__space-name">{space.name}</span>
                      <span className="sy-caption sy-fg-quiet sy-truncate sy-fdscreen__space-meta">
                        <span className="sy-fdscreen__dot" aria-hidden="true" />
                        {space.online} online of {space.members}
                      </span>
                    </span>
                    <Icon name="chevronRight" size={16} />
                  </button>
                ))}
              </div>
            </Surface>

            <Surface className="sy-fdscreen__panel" padding="md" elevation="flat">
              <p className="sy-caption sy-fg-quiet">
                Following, Spaces and Saved are all strictly chronological. Ranked recommendations live
                on Discover and are always labelled.
              </p>
            </Surface>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Poll post.
 * A poll is a post whose body is an input. It keeps the PostCard header and
 * footer rhythm so the column reads as one list, but the result bars are
 * labelled with their own percentage and the chosen option carries a check —
 * the fill width alone would be unreadable in greyscale.
 */
function PollPost() {
  const author = CREATORS[0];
  return (
    <Surface as="article" className="sy-post sy-poll" padding="none" elevation="surface">
      <header className="sy-post__head">
        <Avatar name={author.name} size={40} verified={author.verified} />
        <div className="sy-post__identity">
          <span className="sy-post__name">
            {author.name}
            <span className="sy-post__handle sy-caption sy-fg-muted">{author.handle}</span>
          </span>
          <span className="sy-caption sy-fg-quiet">
            {'34m · '}
            <span className="sy-fg-accent">Design Systems Guild</span>
          </span>
        </div>
        <Badge tone="accent" variant="soft" icon="leaderboard">
          Poll
        </Badge>
      </header>

      <p className="sy-post__body sy-body">
        Settling an argument from the workshop: when a component needs a colour, what should it be
        allowed to reference?
      </p>

      <ul className="sy-poll__options">
        {POLL_OPTIONS.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={`sy-poll__option${option.chosen ? ' is-chosen' : ''}`}
              aria-pressed={option.chosen}
            >
              <span className="sy-poll__fill" style={{ inlineSize: `${option.share}%` }} aria-hidden="true" />
              <span className="sy-poll__label sy-body-sm">
                {option.chosen && <Icon name="check" size={15} />}
                {option.label}
              </span>
              <span className="sy-poll__share sy-mono">{option.share}%</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="sy-caption sy-fg-quiet">
        2,904 votes · 19 hours left · You voted for &ldquo;Semantic only&rdquo;
      </p>

      <footer className="sy-post__actions">
        <button type="button" className="sy-post-action" aria-label="Like, 612">
          <Icon name="heart" size={18} />
          <span className="sy-caption">612</span>
        </button>
        <button type="button" className="sy-post-action" aria-label="Comment, 238">
          <Icon name="comment" size={18} />
          <span className="sy-caption">238</span>
        </button>
        <span className="sy-grow" />
        <button type="button" className="sy-post-action" aria-label="Share">
          <Icon name="share" size={18} />
        </button>
      </footer>
    </Surface>
  );
}

/**
 * Space digest.
 * Communities generate far more activity than any timeline can carry item by
 * item, so once a day a space collapses into one card. It is visibly a
 * different object — tinted rail, thread list, no like button — because
 * pretending a summary is a post would teach people to distrust both.
 */
function SpaceDigest() {
  const space = COMMUNITIES[0];
  return (
    <Surface as="article" className="sy-digest" padding="none" elevation="surface">
      <Media seed="digest-dsg" ratio="6/1" radius="none" className="sy-digest__strip" />
      <div className="sy-digest__body">
        <header className="sy-digest__head">
          <span className="sy-tile-icon sy-tile-icon--lg sy-tone-accent">
            <Icon name="community" size={22} />
          </span>
          <div className="sy-grow">
            <span className="sy-overline sy-fg-accent">Daily digest</span>
            <h3 className="sy-headline">{space.name}</h3>
            <p className="sy-caption sy-fg-quiet">
              {space.members} members · {space.online} online · {space.topic}
            </p>
          </div>
          <IconButton icon="more" label="Digest options" variant="ghost" size="sm" />
        </header>

        <ol className="sy-digest__threads">
          {DIGEST_THREADS.map((thread, index) => (
            <li key={thread.id}>
              <button type="button" className="sy-digest__thread">
                <span className="sy-digest__rank sy-mono">{index + 1}</span>
                <span className="sy-grow">
                  <span className="sy-label sy-clamp-2 sy-digest__thread-title">{thread.title}</span>
                  <span className="sy-caption sy-fg-quiet">
                    {thread.author} · {thread.replies} replies
                  </span>
                </span>
                <Icon name="chevronRight" size={16} />
              </button>
            </li>
          ))}
        </ol>

        <div className="sy-digest__foot">
          <AvatarGroup
            people={[CREATORS[1], CREATORS[2], CREATORS[6], CREATORS[3], CREATORS[4]].map((c) => ({
              name: c.name,
            }))}
            max={4}
            size={24}
          />
          <span className="sy-caption sy-fg-quiet sy-grow">14 questions still unanswered</span>
          <Button variant="secondary" size="sm" iconEnd="arrowRight">
            Open space
          </Button>
        </div>
      </div>
    </Surface>
  );
}
