/**
 * Shared screen components
 * ---------------------------------------------------------------------------
 * Composites that appear on more than one screen. Anything used by a single
 * screen lives with that screen instead.
 *
 * ON MEDIA WITHOUT PHOTOGRAPHY
 * A design system that renders grey rectangles where images belong is lying
 * about its own density and contrast. Instead, `Media` synthesises deterministic
 * cover art from the item's id: a two-stop aurora gradient at a seeded hue, a
 * conic light sweep, and a faint grain layer. Same id always produces the same
 * artwork, so screenshots are stable and the layouts are stress-tested with
 * real visual weight in every image slot.
 */

import type { ReactNode } from 'react';

import { Avatar, Badge, Icon, IconButton, LiveBadge, Surface, type IconName } from '../design-system/primitives';
import type { Creator, Post, Stream } from './data';

/** Stable 0-359 hue from any string. */
function seedHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 37 + seed.charCodeAt(i)) % 360;
  return hash;
}

export interface MediaProps {
  seed: string;
  ratio?: string;
  children?: ReactNode;
  className?: string;
  /** Darkens the art so overlaid text stays legible. */
  scrim?: boolean;
  radius?: 'md' | 'lg' | 'xl' | 'none';
}

export function Media({ seed, ratio = '16/9', children, className, scrim = false, radius = 'lg' }: MediaProps) {
  const hue = seedHue(seed);
  return (
    <div
      className={['sy-media', `sy-media--radius-${radius}`, scrim && 'sy-media--scrim', className]
        .filter(Boolean)
        .join(' ')}
      style={{ aspectRatio: ratio, ['--seed-hue' as string]: hue }}
    >
      <span className="sy-media__art" aria-hidden="true" />
      <span className="sy-media__sweep" aria-hidden="true" />
      <span className="sy-media__grain" aria-hidden="true" />
      {children && <div className="sy-media__content">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post card                                                           */
/* ------------------------------------------------------------------ */

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  return (
    <Surface as="article" className="sy-post" padding="none" elevation={compact ? 'flat' : 'surface'}>
      <header className="sy-post__head">
        <Avatar name={post.author.name} size={40} verified={post.author.verified} />
        <div className="sy-post__identity">
          <span className="sy-post__name">
            {post.author.name}
            <span className="sy-post__handle sy-caption sy-fg-muted">{post.author.handle}</span>
          </span>
          <span className="sy-caption sy-fg-quiet">
            {post.time}
            {post.space && (
              <>
                {' · '}
                <span className="sy-fg-accent">{post.space}</span>
              </>
            )}
          </span>
        </div>
        <IconButton icon="more" label="Post options" variant="ghost" size="sm" />
      </header>

      <p className="sy-post__body sy-body">{post.body}</p>

      {post.media && (
        <Media seed={post.id} ratio={post.media.ratio} radius="md" className="sy-post__media">
          {post.media.kind === 'video' && (
            <>
              <span className="sy-media__play">
                <Icon name="play" size={22} />
              </span>
              {post.media.duration && <span className="sy-media__duration sy-mono">{post.media.duration}</span>}
            </>
          )}
        </Media>
      )}

      <footer className="sy-post__actions">
        <PostAction icon="heart" label="Like" count={post.likes} />
        <PostAction icon="comment" label="Comment" count={post.comments} />
        <PostAction icon="repost" label="Repost" count={post.reposts} />
        <span className="sy-grow" />
        <PostAction icon="bookmark" label="Save" />
        <PostAction icon="share" label="Share" />
      </footer>
    </Surface>
  );
}

function PostAction({ icon, label, count }: { icon: IconName; label: string; count?: string }) {
  return (
    <button type="button" className="sy-post-action" aria-label={count ? `${label}, ${count}` : label}>
      <Icon name={icon} size={18} />
      {count && <span className="sy-caption">{count}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Stream card                                                         */
/* ------------------------------------------------------------------ */

export function StreamCard({ stream, size = 'md' }: { stream: Stream; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Surface
      as="article"
      className={`sy-stream-card sy-stream-card--${size}`}
      padding="none"
      elevation="flat"
      interactive
    >
      <Media seed={stream.id} ratio="16/9" scrim radius="lg">
        <div className="sy-stream-card__overlay-top">
          <LiveBadge viewers={stream.viewers} />
          <span className="sy-stream-card__duration sy-mono">{stream.duration}</span>
        </div>
      </Media>
      <div className="sy-stream-card__meta">
        <Avatar name={stream.creator.name} size={size === 'sm' ? 28 : 36} ring="live" />
        <div className="sy-stream-card__text">
          <h3 className="sy-stream-card__title sy-clamp-2">{stream.title}</h3>
          <p className="sy-caption sy-fg-muted sy-truncate">{stream.creator.name}</p>
          <p className="sy-caption sy-fg-quiet sy-truncate">{stream.category}</p>
        </div>
      </div>
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Creator card                                                        */
/* ------------------------------------------------------------------ */

export function CreatorCard({ creator, action }: { creator: Creator; action?: ReactNode }) {
  return (
    <Surface className="sy-creator-card" padding="none" elevation="surface" interactive>
      <Media seed={`${creator.id}-banner`} ratio="5/2" radius="none" className="sy-creator-card__banner" />
      <div className="sy-creator-card__body">
        <Avatar
          name={creator.name}
          size={56}
          verified={creator.verified}
          ring={creator.live ? 'live' : false}
          className="sy-creator-card__avatar"
        />
        <h3 className="sy-headline sy-truncate">{creator.name}</h3>
        <p className="sy-caption sy-fg-muted sy-truncate">{creator.handle}</p>
        <p className="sy-body-sm sy-fg-muted sy-clamp-2 sy-creator-card__bio">{creator.bio}</p>
        <div className="sy-creator-card__stats">
          <span className="sy-caption sy-fg-muted">
            <strong className="sy-fg-default">{creator.followers}</strong> followers
          </span>
          <Badge tone="neutral">{creator.category}</Badge>
        </div>
        {action}
      </div>
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Data visualisation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Bar chart.
 *
 * Built from CSS grid rather than a charting library: at this data density a
 * library costs more bytes than the whole design system. Values are announced
 * through a visually hidden table so the chart is not information that only
 * sighted users can access.
 */
export function BarChart({
  data,
  tone = 'accent',
  height = 160,
  unit = '',
}: {
  data: { label: string; value: number }[];
  tone?: 'accent' | 'live' | 'creator' | 'success';
  height?: number;
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className={`sy-barchart sy-tone-${tone}`}>
      <div className="sy-barchart__plot" style={{ height }} aria-hidden="true">
        {data.map((point) => (
          <div key={point.label} className="sy-barchart__col">
            <div className="sy-barchart__bar" style={{ height: `${(point.value / max) * 100}%` }}>
              <span className="sy-barchart__value sy-caption">
                {point.value}
                {unit}
              </span>
            </div>
            <span className="sy-barchart__label sy-caption sy-fg-quiet">{point.label}</span>
          </div>
        ))}
      </div>
      <table className="sy-sr-only">
        <caption>Chart data</caption>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>
                {point.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Sparkline.
 * A single SVG polyline plus a gradient fill. Deliberately axis-free: it shows
 * shape, and the precise number is always shown beside it as text.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  tone = 'accent',
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: 'accent' | 'success' | 'danger';
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className={`sy-sparkline sy-tone-${tone}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="var(--tone-solid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="var(--tone-solid)" opacity="0.12" />
    </svg>
  );
}

/**
 * Donut chart for share-of-total breakdowns.
 * Segments are drawn as stroked arcs on one circle, which keeps the whole
 * chart to a single element per segment and animates cleanly.
 */
export function Donut({
  segments,
  size = 140,
  thickness = 16,
  centre,
}: {
  segments: { label: string; value: number; tone: string }[];
  size?: number;
  thickness?: number;
  centre?: ReactNode;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="sy-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const element = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.tone}
              strokeWidth={thickness}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += length;
          return element;
        })}
      </svg>
      {centre && <div className="sy-donut__centre">{centre}</div>}
      {/* The same data as text, so the breakdown is not sighted-only. */}
      <table className="sy-sr-only">
        <caption>Breakdown</caption>
        <tbody>
          {segments.map((segment) => (
            <tr key={segment.label}>
              <th scope="row">{segment.label}</th>
              <td>{((segment.value / total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc shared pieces                                                  */
/* ------------------------------------------------------------------ */

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className,
  /** Allow the title to wrap. Off by default so dense lists stay one line. */
  wrapTitle = false,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  wrapTitle?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={['sy-list-row', wrapTitle && 'sy-list-row--wrap', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {leading && <span className="sy-list-row__leading">{leading}</span>}
      <span className="sy-list-row__text">
        <span className="sy-list-row__title">{title}</span>
        {subtitle && <span className="sy-caption sy-fg-muted sy-truncate">{subtitle}</span>}
      </span>
      {trailing && <span className="sy-list-row__trailing">{trailing}</span>}
    </Tag>
  );
}

export function ScreenSection({
  title,
  action,
  children,
  eyebrow,
  className,
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={['sy-screen-section', className].filter(Boolean).join(' ')}>
      {title && (
        <header className="sy-screen-section__head">
          <div>
            {eyebrow && <span className="sy-overline sy-fg-accent">{eyebrow}</span>}
            <h2 className="sy-title-3">{title}</h2>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
