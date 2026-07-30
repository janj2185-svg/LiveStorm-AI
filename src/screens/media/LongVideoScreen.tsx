/**
 * Long video watch page
 * ---------------------------------------------------------------------------
 * The player is not the whole screen here, and that is the point: a long video
 * is a thing you commit forty minutes to, so the page has to answer "is this
 * worth it" before it answers "play". Title, creator and chapters therefore sit
 * above the fold with the picture, and the chapter list doubles as the table of
 * contents that makes a two-hour recording navigable.
 *
 * ORDER OF THE ACTION ROW
 * Subscribe is separated from the reaction group because it is a relationship
 * decision, not a reaction to this video. The reactions are grouped into pills
 * so the row reads as three objects rather than seven, which is what stops it
 * from becoming a toolbar.
 *
 * UP NEXT
 * The related list only appears at 1024px and above. Below that it would push
 * comments below three screenfuls of thumbnails, and comments are the reason
 * people scroll a watch page at all.
 *
 * LIKE AND DISLIKE
 * Rendered as directional arrows rather than thumbs. The icon set has no thumb,
 * and a heart cannot be negated, so the pair is drawn as one arrow and its
 * mirror — the relationship between the two is the meaning.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  Select,
  Tabs,
} from '../../design-system/primitives';
import { CREATORS, STREAMS } from '../data';
import { Media, ScreenSection } from '../components';

const creator = CREATORS[0];

const CHAPTERS = [
  { time: '0:00', label: 'Cold open — what broke in the old ramp', length: '8:52' },
  { time: '8:52', label: 'Why OKLCH and not HSL', length: '32:13' },
  { time: '41:05', label: 'Building the ramp generator', length: '31:39' },
  { time: '1:12:44', label: 'Gamut mapping in practice', length: '45:46', active: true },
  { time: '1:58:30', label: 'Contrast proofs and the audit script', length: '42:38' },
];

const COMMENTS = [
  {
    id: 'cm1',
    author: 'Priya Raghunathan',
    handle: '@priya.teaches',
    time: '2 days ago',
    body: 'The bit at 1:04:12 where you show the same ramp before and after gamut mapping should be required viewing. I have been explaining this badly to students for two years.',
    likes: '1.4K',
    pinned: true,
    reply: {
      id: 'cm1r',
      author: creator.name,
      handle: creator.handle,
      time: '2 days ago',
      body: 'Ha — the honest version is that I only understood it myself the third time I broke it. The clip is free to reuse, take it.',
      likes: '842',
      creator: true,
    },
  },
  {
    id: 'cm2',
    author: 'Tobias Lindqvist',
    handle: '@tobiaslind',
    time: '1 day ago',
    body: 'Watched the whole thing while patching. The build-time generator idea maps almost perfectly onto how I handle sample libraries, which I did not expect going in.',
    likes: '318',
  },
  {
    id: 'cm3',
    author: 'lin.wei',
    handle: '@linwei.dev',
    time: '22 hours ago',
    body: 'Question for anyone who tried this: does the contrast audit catch the case where a solid step passes against canvas but fails against a raised surface? Ours does not and it has bitten us twice.',
    likes: '96',
  },
  {
    id: 'cm4',
    author: 'Léa Bouchard-Tremblay',
    handle: '@leabt',
    time: '14 hours ago',
    body: 'Not my field at all and I still finished it. The pacing in the middle hour is genuinely excellent — you never leave a diagram up longer than it earns.',
    likes: '204',
  },
];

const UP_NEXT = STREAMS.slice(1, 6);

export function LongVideoScreen() {
  const [tab, setTab] = useState('chapters');

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-watch">
        <div className="sy-watch__main">
          <Media seed="token-pipeline-vod" ratio="16/9" radius="lg" scrim className="sy-watch__player">
            <button type="button" className="sy-media__play" aria-label="Play video">
              <Icon name="play" size={24} />
            </button>
            <span className="sy-media__duration sy-mono">2:41:08</span>
            <span className="sy-watch__resume">
              <Icon name="clock" size={13} />
              Resume at 1:12:44
            </span>
          </Media>

          <h1 className="sy-title-2 sy-watch__title">
            Rebuilding the token pipeline — OKLCH, gamut mapping and contrast proofs
          </h1>

          <div className="sy-watch__meta">
            <span className="sy-body-sm sy-fg-muted">184,220 views</span>
            <span className="sy-watch__sep" aria-hidden="true" />
            <span className="sy-body-sm sy-fg-muted">Streamed 2 February</span>
            <Badge tone="accent" variant="soft">
              Design &amp; Engineering
            </Badge>
            <Badge tone="neutral" variant="outline">
              Full broadcast
            </Badge>
            <Badge tone="live" variant="soft" icon="captions">
              Captions
            </Badge>
          </div>

          <div className="sy-watch__bar">
            <div className="sy-watch__creator">
              <Avatar name={creator.name} size={44} verified ring="live" />
              <div className="sy-watch__creator-text">
                <span className="sy-label sy-truncate">{creator.name}</span>
                <span className="sy-caption sy-fg-muted">{creator.followers} subscribers</span>
              </div>
              <Button variant="primary" size="sm">
                Subscribe
              </Button>
              <IconButton icon="notifications" label="Notification preferences" variant="outline" size="sm" />
            </div>

            <div className="sy-watch__actions">
              <div className="sy-pill-group">
                <button type="button" className="sy-pill-group__btn is-on" aria-pressed="true">
                  <Icon name="arrowUp" size={17} />
                  <span className="sy-caption">14K</span>
                </button>
                <span className="sy-pill-group__rule" aria-hidden="true" />
                <button type="button" className="sy-pill-group__btn" aria-label="Dislike" aria-pressed="false">
                  <Icon name="arrowUp" size={17} className="is-flipped" />
                </button>
              </div>
              <button type="button" className="sy-pill-btn">
                <Icon name="share" size={17} />
                <span className="sy-caption">Share</span>
              </button>
              <button type="button" className="sy-pill-btn">
                <Icon name="bookmark" size={17} />
                <span className="sy-caption">Save</span>
              </button>
              <button type="button" className="sy-pill-btn is-creator">
                <Icon name="gift" size={17} />
                <span className="sy-caption">Gift</span>
              </button>
              <IconButton icon="more" label="More actions" variant="secondary" size="sm" />
            </div>
          </div>

          {/*
            Description and chapters share one card behind a tab pair. They
            answer the same question — "what is in this" — and splitting them
            into two stacked cards doubled the distance to the comments.
          */}
          <section className="sy-watch__card" aria-label="About this video">
            <Tabs
              variant="segmented"
              tabs={[
                { id: 'chapters', label: 'Chapters', badge: CHAPTERS.length },
                { id: 'about', label: 'Description' },
                { id: 'links', label: 'Resources', badge: 4 },
              ]}
              active={tab}
              onChange={setTab}
            />

            <p className="sy-body-sm sy-watch__desc">
              Three hours of rebuilding SYLORA&apos;s colour pipeline from scratch, on stream, including the
              part where the gamut mapper produced a cyan that does not exist and I spent twenty minutes
              arguing with a spectrophotometer.
              <span className="sy-watch__desc-more"> Everything shown is in the repo — generator script,
              audit output and the 82-pair contrast proof are linked below.</span>
              <button type="button" className="sy-watch__desc-toggle">
                Show more
              </button>
            </p>

            <ol className="sy-chapters">
              {CHAPTERS.map((chapter, index) => (
                <li key={chapter.time}>
                  <button type="button" className={`sy-chapter${chapter.active ? ' is-active' : ''}`}>
                    <span className="sy-chapter__time sy-mono">{chapter.time}</span>
                    <Media seed={`chapter-${index}`} ratio="16/9" radius="md" className="sy-chapter__thumb" />
                    <span className="sy-chapter__text">
                      <span className="sy-label sy-clamp-2">{chapter.label}</span>
                      <span className="sy-caption sy-fg-quiet">{chapter.length}</span>
                    </span>
                    {chapter.active && (
                      <Badge tone="accent" variant="soft" icon="play">
                        Here
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <ScreenSection
            title="1,284 comments"
            action={
              <Select
                label="Sort comments"
                className="sy-watch__sort"
                options={[
                  { value: 'top', label: 'Top comments' },
                  { value: 'new', label: 'Newest first' },
                  { value: 'creator', label: 'Creator replies' },
                ]}
                defaultValue="top"
              />
            }
          >
            <div className="sy-comment-composer">
              <Avatar name="Jordan Reyes" size={38} />
              <div className="sy-comment-composer__field">
                <label className="sy-sr-only" htmlFor="watch-comment">
                  Add a comment
                </label>
                <textarea
                  id="watch-comment"
                  rows={1}
                  placeholder="Add a comment…"
                  className="sy-comment-composer__input"
                />
                <div className="sy-comment-composer__row">
                  <IconButton icon="emoji" label="Insert emoji" variant="ghost" size="sm" />
                  <IconButton icon="clock" label="Insert current timecode" variant="ghost" size="sm" />
                  <span className="sy-grow" />
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm">
                    Comment
                  </Button>
                </div>
              </div>
            </div>

            <ul className="sy-comments">
              {COMMENTS.map((comment) => (
                <li key={comment.id} className="sy-comment">
                  <CommentBody comment={comment} />
                  {comment.reply && (
                    <ul className="sy-comment__replies">
                      <li className="sy-comment">
                        <CommentBody comment={comment.reply} />
                      </li>
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </ScreenSection>
        </div>

        <aside className="sy-watch__side" aria-label="Up next">
          <h2 className="sy-label sy-watch__side-title">Up next</h2>
          <div className="sy-watch__autoplay">
            <span className="sy-caption sy-fg-muted">Autoplay is on</span>
            <Badge tone="success" variant="soft" icon="check">
              On
            </Badge>
          </div>
          {UP_NEXT.map((item) => (
            <a key={item.id} href="#up-next" className="sy-up-next">
              <Media seed={`${item.id}-next`} ratio="16/9" radius="md" className="sy-up-next__thumb">
                <span className="sy-media__duration sy-mono">{item.duration}</span>
              </Media>
              <span className="sy-up-next__text">
                <span className="sy-label sy-clamp-2">{item.title}</span>
                <span className="sy-caption sy-fg-muted sy-truncate">{item.creator.name}</span>
                <span className="sy-caption sy-fg-quiet">{item.viewers} views</span>
              </span>
            </a>
          ))}
        </aside>
      </div>
    </div>
  );
}

function CommentBody({
  comment,
}: {
  comment: {
    author: string;
    handle: string;
    time: string;
    body: string;
    likes: string;
    pinned?: boolean;
    creator?: boolean;
  };
}) {
  return (
    <div className="sy-comment__row">
      <Avatar name={comment.author} size={36} />
      <div className="sy-comment__content">
        {comment.pinned && (
          <span className="sy-comment__pinned sy-caption">
            <Icon name="pin" size={12} />
            Pinned by {creator.name}
          </span>
        )}
        <p className="sy-comment__head">
          <span className={`sy-comment__author${comment.creator ? ' is-creator' : ''}`}>{comment.author}</span>
          <span className="sy-caption sy-fg-quiet">{comment.handle}</span>
          <span className="sy-caption sy-fg-quiet">{comment.time}</span>
        </p>
        <p className="sy-body-sm sy-comment__body">{comment.body}</p>
        <div className="sy-comment__actions">
          <button type="button" className="sy-comment__action" aria-label={`Like this comment, ${comment.likes}`}>
            <Icon name="heart" size={15} />
            <span className="sy-caption">{comment.likes}</span>
          </button>
          <button type="button" className="sy-comment__action" aria-label="Dislike this comment">
            <Icon name="arrowUp" size={15} className="is-flipped" />
          </button>
          <button type="button" className="sy-comment__action">
            <span className="sy-caption">Reply</span>
          </button>
        </div>
      </div>
      <IconButton icon="moreVertical" label="Comment options" variant="ghost" size="xs" />
    </div>
  );
}
