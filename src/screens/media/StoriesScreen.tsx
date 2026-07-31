/**
 * Stories
 * ---------------------------------------------------------------------------
 * Stories are watched, not read. The whole surface is one photograph and the
 * interface is four thin bands around it: progress at the top, identity under
 * it, an interactive layer floating in the middle third, and reply at the
 * bottom.
 *
 * WHY THE PROGRESS BAR IS SEGMENTED AND NOT CONTINUOUS
 * A single bar answers "how long is this story", which nobody asks. Segments
 * answer "how many more taps until I am out of this person's day", which is the
 * only question a viewer actually has. Seen segments stay filled so the count
 * of what is left is readable at a glance without counting.
 *
 * WHY TAP ZONES ARE REAL ELEMENTS
 * Previous/next are invisible, but they are buttons with labels — not a click
 * handler on the background. A keyboard user and a screen-reader user get the
 * same two controls a thumb gets, in the same order.
 *
 * THE STICKER LAYER
 * A poll proves the format carries interaction, not just pixels. It sits above
 * the safe centre band but well clear of the tap zones' visual centre, because
 * a sticker that swallows a "next" tap is the fastest way to make people stop
 * tapping stickers.
 *
 * DARK IN BOTH THEMES
 * A story is a full-bleed photograph with type laid directly on it. The type is
 * light in both themes, so the ground under it cannot flip — and a white bezel
 * around somebody's photograph is a gallery frame nobody asked for. The root
 * therefore re-scopes to the dark ramp permanently.
 */

import { Avatar, Button, Icon, IconButton } from '../../design-system/primitives';
import { CREATORS } from '../data';
import { Media } from '../components';

const author = CREATORS[4];

/** Seven cards in this person's day; we are two thirds through the fourth. */
const SEGMENTS = [100, 100, 100, 64, 0, 0, 0];

const REACTIONS = ['🔥', '👏', '😮', '🥲', '💫', '🏺'];

export function StoriesScreen() {
  return (
    <div className="sy-screen sy-stories-screen" data-theme="dark">
      <div className="sy-stories-screen__stage">
        <Media seed="yuki-kiln-open-04" ratio="auto" radius="none" className="sy-stories-screen__media">
          <span className="sy-sr-only">Kiln opening, fourth card: the cracked shino bowl</span>
        </Media>

        {/* Invisible, but real: previous and next are focusable controls. */}
        <button type="button" className="sy-stories-screen__zone is-prev" aria-label="Previous story" />
        <button type="button" className="sy-stories-screen__zone is-next" aria-label="Next story" />

        <header className="sy-stories-screen__top">
          <div className="sy-story-progress" role="group" aria-label="Story 4 of 7">
            {SEGMENTS.map((filled, index) => (
              <span
                key={`segment-${index}`}
                className="sy-story-progress__segment"
                style={{ ['--filled' as string]: `${filled}%` }}
              >
                <span className="sy-story-progress__fill" aria-hidden="true" />
              </span>
            ))}
          </div>

          <div className="sy-stories-screen__author">
            <Avatar name={author.name} size={34} ring="story" />
            <div className="sy-stories-screen__author-text">
              <span className="sy-label sy-truncate">{author.name}</span>
              <span className="sy-caption sy-stories-screen__meta">4h · Kiln Notes</span>
            </div>
            <IconButton icon="volumeOff" label="Unmute story audio" variant="glass" size="sm" />
            <IconButton icon="more" label="Story options" variant="glass" size="sm" />
            <IconButton icon="close" label="Close stories" variant="glass" size="sm" />
          </div>
        </header>

        {/* Interactive sticker. Rotated a hair so it reads as placed, not printed. */}
        <div className="sy-story-sticker">
          <p className="sy-story-sticker__question">Which glaze?</p>
          <div className="sy-story-sticker__options" role="group" aria-label="Which glaze?">
            <button type="button" className="sy-story-poll" style={{ ['--share' as string]: '68%' }}>
              <span className="sy-story-poll__bar" aria-hidden="true" />
              <span className="sy-story-poll__label">Ash over iron</span>
              <span className="sy-story-poll__value sy-mono">68%</span>
            </button>
            <button type="button" className="sy-story-poll is-chosen" style={{ ['--share' as string]: '32%' }}>
              <span className="sy-story-poll__bar" aria-hidden="true" />
              <span className="sy-story-poll__label">
                <Icon name="check" size={13} />
                Cracked shino
              </span>
              <span className="sy-story-poll__value sy-mono">32%</span>
            </button>
          </div>
          <p className="sy-story-sticker__foot sy-caption">2,418 votes · you picked cracked shino</p>
        </div>

        <footer className="sy-stories-screen__bottom">
          <div className="sy-stories-screen__reactions" role="group" aria-label="React to this story">
            {REACTIONS.map((emoji) => (
              <button key={emoji} type="button" className="sy-story-reaction">
                <span aria-hidden="true">{emoji}</span>
                <span className="sy-sr-only">React with {emoji}</span>
              </button>
            ))}
          </div>

          <div className="sy-stories-screen__composer">
            <div className="sy-input sy-input--sm sy-grow sy-stories-screen__input">
              <input placeholder="Send message" aria-label={`Reply to ${author.name}`} />
            </div>
            <IconButton icon="heart" label="Send a like" variant="glass" size="sm" />
            <IconButton icon="share" label="Share this story" variant="glass" size="sm" />
          </div>

          <Button variant="glass" size="sm" iconEnd="chevronUp" className="sy-stories-screen__swipe">
            See the finished piece
          </Button>
        </footer>
      </div>
    </div>
  );
}
