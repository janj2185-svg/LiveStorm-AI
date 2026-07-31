/**
 * Short videos
 * ---------------------------------------------------------------------------
 * One item fills the viewport and the next one peeks over the bottom edge. That
 * sliver is the entire onboarding for the format: nobody has to be told to
 * swipe once they can see there is something below.
 *
 * WHY THE ACTION RAIL IS RIGHT-ALIGNED AND SITS LOW
 * Held one-handed, a right thumb sweeps an arc whose comfortable zone is the
 * bottom-right of the display. Like, comment and share are the three most
 * repeated gestures in the product, so they are placed inside that arc and
 * stacked vertically — a vertical stack lets the thumb travel along the arc
 * instead of across it. The rail stops well above the bottom edge so the
 * caption and the progress bar keep their own space, and the audio disc sits at
 * the far end because it is browsed, not tapped in a hurry.
 *
 * WHY THE CAPTION IS CLAMPED
 * Two lines is the most text that can sit over a moving picture before it stops
 * being a caption and starts being a paragraph. "more" expands in place rather
 * than opening a sheet, because leaving the video to read about the video is
 * the wrong trade.
 *
 * DARK IN BOTH THEMES
 * The reel is edge-to-edge video with the whole interface floating on top of it,
 * and it is the surface people hold longest in one sitting. It stays dark in
 * both themes for the same reason the player does, by re-scoping the theme here
 * rather than by painting the stylesheet black.
 */

import { Avatar, Icon, IconButton } from '../../design-system/primitives';
import { SHORTS } from '../data';
import { Media } from '../components';

const current = SHORTS[0];
const next = SHORTS[1];

export function ShortsScreen() {
  return (
    <div className="sy-screen sy-shorts" data-theme="dark">
      <div className="sy-shorts__reel">
        {/* Active item. */}
        <article className="sy-shorts__item">
          <Media seed={`${current.id}-reel`} ratio="auto" radius="none" className="sy-shorts__media">
            <span className="sy-sr-only">{current.caption}</span>
          </Media>

          <header className="sy-shorts__top">
            <span className="sy-shorts__tab is-active">For you</span>
            <span className="sy-shorts__tab">Following</span>
            <span className="sy-grow" />
            <IconButton icon="search" label="Search shorts" variant="glass" size="sm" />
          </header>

          {/* Action rail. Thumb-arc placement is documented in the file header. */}
          <div className="sy-shorts__rail">
            <div className="sy-shorts__creator">
              <Avatar name={current.creator.name} size={46} />
              <button type="button" className="sy-shorts__follow" aria-label={`Follow ${current.creator.name}`}>
                <Icon name="plus" size={13} />
              </button>
            </div>

            <button type="button" className="sy-shorts__action is-liked" aria-label={`Like, ${current.likes} likes`}>
              <Icon name="heart" size={28} filled />
              <span className="sy-caption">{current.likes}</span>
            </button>
            <button type="button" className="sy-shorts__action" aria-label={`Comments, ${current.comments}`}>
              <Icon name="comment" size={27} />
              <span className="sy-caption">{current.comments}</span>
            </button>
            <button type="button" className="sy-shorts__action" aria-label="Share this short">
              <Icon name="share" size={26} />
              <span className="sy-caption">Share</span>
            </button>
            <button type="button" className="sy-shorts__action is-gift" aria-label="Send a gift">
              <Icon name="gift" size={26} />
              <span className="sy-caption">Gift</span>
            </button>
            <button type="button" className="sy-shorts__action" aria-label="More options">
              <Icon name="more" size={24} />
            </button>

            <button type="button" className="sy-shorts__disc" aria-label={`Audio: ${current.music}`}>
              <span className="sy-shorts__disc-art" aria-hidden="true" />
            </button>
          </div>

          <footer className="sy-shorts__meta">
            <p className="sy-shorts__handle">
              {current.creator.handle}
              <span className="sy-shorts__dot" aria-hidden="true" />
              <span className="sy-caption sy-fg-muted">2d</span>
            </p>
            <p className="sy-shorts__caption sy-clamp-2">
              {current.caption} Twelve firings, three kilns, one reduction schedule I still cannot fully
              explain — the ash pools where the wall thins and nowhere else.
            </p>
            <button type="button" className="sy-shorts__more">
              more
            </button>
            <div className="sy-shorts__ticker">
              <Icon name="volume" size={14} />
              <span className="sy-shorts__ticker-viewport">
                <span className="sy-shorts__ticker-text">
                  {current.music} · used in 4,182 shorts · {current.music} · used in 4,182 shorts ·
                </span>
              </span>
            </div>
          </footer>

          <div
            className="sy-shorts__progress"
            role="progressbar"
            aria-label="Playback"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={38}
          >
            <span className="sy-shorts__progress-fill" style={{ ['--played' as string]: '38%' }} />
          </div>
        </article>

        {/* The peek. Enough of the next item to prove the reel continues. */}
        <article className="sy-shorts__peek" aria-label={`Next: ${next.creator.name}`}>
          <Media seed={`${next.id}-reel`} ratio="auto" radius="none" className="sy-shorts__media" />
          <div className="sy-shorts__peek-meta">
            <Avatar name={next.creator.name} size={26} />
            <span className="sy-caption sy-truncate">{next.creator.handle}</span>
            <span className="sy-caption sy-fg-muted sy-truncate">{next.caption}</span>
          </div>
        </article>
      </div>
    </div>
  );
}
