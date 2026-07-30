/**
 * Welcome
 * ---------------------------------------------------------------------------
 * The only screen a person sees before they trust us with an email address, so
 * it optimises for one decision: *is this a serious place to build a career?*
 *
 * The argument is made in three moves, in this order:
 *   1. A claim  — one sentence naming the four surfaces SYLORA unifies.
 *   2. Proof    — four capabilities stated as measurable facts, not adjectives.
 *   3. Evidence — real creators and real aggregate numbers.
 *
 * The product preview is built from the same primitives the product ships, not
 * a screenshot: a live tile, a real stat and a real assistant proposal. A
 * marketing image can promise anything; a rendered product cannot, and that
 * asymmetry is the most honest thing on the page.
 *
 * Below 768px the preview stacks under the hero and the whole column centres,
 * because a phone visitor is reading, not comparing. Above it, the split gives
 * the eye somewhere to land after the CTA pair.
 *
 * The screen root doubles as the layout box: a percentage min-height only
 * resolves against a definite parent, and `.sy-screen` is the only ancestor
 * that has one.
 */

import { AiOrb, LogoMark } from '../../design-system/brand/Logo';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Icon,
  LiveBadge,
  Surface,
  type IconName,
} from '../../design-system/primitives';
import { CREATORS, STREAMS } from '../data';
import { Media, Sparkline } from '../components';

/**
 * Four capabilities, each stated as something measurable. "Powerful streaming"
 * is a claim anyone can make; "400ms glass-to-glass" is one only a real
 * platform can make, and it is what a professional creator actually reads.
 */
const VALUE_PROPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'live',
    title: 'Sub-second live',
    body: '1080p60 from the browser at 400ms glass-to-glass, with multi-cam and guest slots built in.',
  },
  {
    icon: 'sparkles',
    title: 'An assistant with sources',
    body: 'Every claim it makes cites the broadcast, encoder log or ledger entry it came from.',
  },
  {
    icon: 'coin',
    title: 'Three income streams, one payout',
    body: 'Gifts, memberships and the marketplace settle together and clear in three days.',
  },
  {
    icon: 'community',
    title: 'Rooms, not comment threads',
    body: 'Spaces with real moderation tooling and a timeline nobody quietly reorders.',
  },
];

export function WelcomeScreen() {
  const featured = STREAMS[2];

  return (
    <div className="sy-screen sy-welcome">
      {/* Ambient brand field: colour that reads as being behind the interface. */}
      <div className="sy-aurora" />

      <div className="sy-welcome__inner sy-screen__inner">
        <div className="sy-welcome__hero sy-enter">
          <div className="sy-welcome__brand">
            <LogoMark size={72} tone="gradient" title="SYLORA" />
            <Badge tone="accent" variant="soft" icon="sparkles">
              Creator OS · 2.0
            </Badge>
          </div>

          <h1 className="sy-display-2 sy-welcome__headline">
            Live, social, learning and income — <span className="sy-gradient-text">one system</span>.
          </h1>

          <p className="sy-body-lg sy-fg-muted sy-welcome__lede">
            Broadcast-grade streaming, a feed that stays chronological, an assistant grounded in
            your own analytics, and payouts that clear in three days. Everything a creator currently
            stitches together from six separate products.
          </p>

          <div className="sy-welcome__cta">
            <Button variant="primary" size="lg" iconEnd="arrowRight">
              Create your account
            </Button>
            <Button variant="secondary" size="lg">
              Sign in
            </Button>
          </div>

          {/* Muted, not quiet: this line answers "what will this cost me?",
              which is the question standing between a reader and the button
              directly above it — too load-bearing to be the faintest text on
              the screen. */}
          <p className="sy-caption sy-fg-muted sy-welcome__cta-note">
            Free below 1,000 followers. No card up front, no exclusivity clause, export any time.
          </p>

          <ul className="sy-welcome__props">
            {VALUE_PROPS.map((prop) => (
              <li key={prop.title} className="sy-welcome__prop">
                <span className="sy-tile-icon sy-welcome__prop-icon">
                  <Icon name={prop.icon} size={20} />
                </span>
                <div className="sy-welcome__prop-text">
                  <h2 className="sy-label">{prop.title}</h2>
                  <p className="sy-body-sm sy-fg-muted">{prop.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Social proof comes last: numbers persuade nobody who has not first
              understood what the product does. */}
          <div className="sy-welcome__proof">
            <AvatarGroup people={CREATORS.map((creator) => ({ name: creator.name }))} max={5} size={34} />
            <div className="sy-welcome__proof-text">
              <p className="sy-body-sm">
                <strong>482K creators</strong> · 1.2B minutes watched monthly ·{' '}
                <strong>€41.6M</strong> paid out last year
              </p>
              <p className="sy-caption sy-fg-quiet">
                Amara Okonkwo, Priya Raghunathan, Dr. Ngozi Adeyemi and 482,000 others publish here.
              </p>
            </div>
          </div>
        </div>

        {/*
          The preview is a stack rather than a single frame: three cards from
          three different surfaces of the product, so the "one system" claim in
          the headline is demonstrated instead of repeated.
        */}
        <div className="sy-welcome__preview">
          <Surface
            className="sy-welcome__card sy-welcome__card--stream"
            elevation="lifted"
            radius="xl"
            padding="none"
          >
            <Media seed={featured.id} ratio="16/9" scrim radius="xl">
              <div className="sy-welcome__stream-top">
                <LiveBadge viewers={featured.viewers} />
                <span className="sy-mono sy-welcome__stream-clock">{featured.duration}</span>
              </div>
              <div className="sy-welcome__stream-bottom">
                <Avatar name={featured.creator.name} size={30} ring="live" />
                <div className="sy-grow">
                  <p className="sy-label sy-truncate">{featured.creator.name}</p>
                  <p className="sy-caption sy-truncate">{featured.category}</p>
                </div>
              </div>
            </Media>
            <p className="sy-welcome__stream-title sy-clamp-2">{featured.title}</p>
          </Surface>

          <Surface className="sy-welcome__card sy-welcome__card--stat" elevation="overlay" radius="lg">
            <div className="sy-welcome__stat-head">
              <span className="sy-caption sy-fg-muted">Watch time this week</span>
              <Badge tone="success" variant="soft" icon="trendUp">
                +18.2%
              </Badge>
            </div>
            <p className="sy-mono-lg">41h 12m</p>
            <Sparkline data={[42, 58, 51, 77, 94, 86, 68]} width={148} height={34} tone="success" />
          </Surface>

          <Surface className="sy-welcome__card sy-welcome__card--ai" elevation="overlay" radius="lg">
            <div className="sy-welcome__ai-head">
              <AiOrb size={28} state="idle" />
              <span className="sy-overline sy-fg-accent">Assistant</span>
            </div>
            <p className="sy-body-sm">
              Retention drops 23% at minute 12, where you switch to screen share. Want a transition
              script?
            </p>
            <div className="sy-welcome__ai-actions">
              <Button variant="primary" size="xs" icon="check">
                Approve
              </Button>
              <Button variant="ghost" size="xs">
                Not now
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
