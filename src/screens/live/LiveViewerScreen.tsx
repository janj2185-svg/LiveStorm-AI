/**
 * Live viewer
 * ---------------------------------------------------------------------------
 * The broadcast is the interface. Everything else is a layer over it, and every
 * layer has to earn the pixels it covers.
 *
 * CHROME BUDGET
 * On a phone, chat and controls together may never cover more than the bottom
 * 45% of the frame, and the top strip is capped at 12%. Those two numbers keep
 * a 16:9 stream fully visible in the middle band at all times.
 *
 * WHY GLASS HERE AND NOWHERE CASUAL
 * This is the canonical case for glassmorphism: the layer genuinely floats over
 * moving photographic content, and blurring it is what keeps a caption legible
 * when the scene behind it cuts from dark to bright. Fill opacity is set high
 * enough that text contrast holds even against a white frame.
 *
 * GIFTS
 * The gift rail is the product's highest-intent action, so on phones it sits in
 * the bottom-right corner — the single easiest point to reach with a right
 * thumb — and it is the only control that uses the creator hue.
 *
 * ONE SCREEN, TWO THEMES
 * The stage is a playback surface and stays dark in both themes: the broadcast
 * is the light source, and a white surround raises its black level and tires
 * anyone watching for an hour. The chat rail is not a playback surface — it is a
 * column of text people read for that same hour — so it stays light-native.
 * The stage says so by re-scoping the theme onto itself, which keeps every value
 * inside it a token from the dark ramp instead of a hard-coded black.
 */

import { Avatar, Badge, Button, Icon, IconButton, LiveBadge } from '../../design-system/primitives';
import { CREATORS, GIFTS, LIVE_CHAT, STREAMS } from '../data';
import { Media } from '../components';

const stream = STREAMS[0];

export function LiveViewerScreen() {
  return (
    <div className="sy-screen sy-live-viewer">
      <div className="sy-live-viewer__stage" data-theme="dark">
        <Media seed={`${stream.id}-stage`} ratio="auto" radius="none" className="sy-live-viewer__video">
          <span className="sy-sr-only">Live broadcast video</span>
        </Media>

        {/* Top chrome: identity and connection state. */}
        <header className="sy-live-viewer__top">
          <div className="sy-live-viewer__identity sy-vellum">
            <Avatar name={stream.creator.name} size={34} ring="live" verified />
            <div className="sy-live-viewer__identity-text">
              <span className="sy-label sy-truncate">{stream.creator.name}</span>
              <span className="sy-caption sy-fg-muted sy-truncate">{stream.category}</span>
            </div>
            <Button variant="primary" tone="creator" size="xs">
              Follow
            </Button>
          </div>

          <div className="sy-live-viewer__status">
            <LiveBadge viewers={stream.viewers} />
            <span className="sy-live-viewer__pill sy-vellum sy-mono">{stream.duration}</span>
            <IconButton icon="close" label="Leave stream" variant="glass" size="sm" />
          </div>
        </header>

        <h1 className="sy-live-viewer__title sy-clamp-2">{stream.title}</h1>

        {/* Bottom chrome: playback, quality and the gift rail. */}
        <footer className="sy-live-viewer__bottom">
          <div className="sy-live-viewer__controls sy-vellum">
            <IconButton icon="pause" label="Pause" variant="ghost" size="sm" />
            <IconButton icon="volume" label="Mute" variant="ghost" size="sm" />
            <span className="sy-live-viewer__quality sy-caption">
              <span className="sy-live-viewer__dot" aria-hidden="true" />
              1080p60 · 42ms
            </span>
            <span className="sy-grow" />
            <IconButton icon="captions" label="Captions" variant="ghost" size="sm" />
            <IconButton icon="fullscreen" label="Fullscreen" variant="ghost" size="sm" />
          </div>

          <div className="sy-gift-rail">
            {GIFTS.slice(0, 4).map((gift) => (
              <button key={gift.id} type="button" className={`sy-gift-chip is-${gift.tier}`}>
                <span className="sy-gift-chip__icon" aria-hidden="true">
                  {gift.icon}
                </span>
                <span className="sy-gift-chip__price sy-caption">{gift.price}</span>
                <span className="sy-sr-only">
                  Send {gift.name} for {gift.price} credits
                </span>
              </button>
            ))}
            <Button variant="primary" tone="creator" size="sm" icon="gift" className="sy-gift-rail__more">
              Gift
            </Button>
          </div>
        </footer>

        {/*
          A gift that has just landed. Celebration animations play over the
          video but never over the creator's face region (the centre band), and
          they auto-dismiss — a viewer should never have to close one.
        */}
        <div className="sy-gift-toast" role="status">
          <span className="sy-gift-toast__icon" aria-hidden="true">
            ✵
          </span>
          <div>
            <p className="sy-label">marcus_ade sent Aurora Burst</p>
            <p className="sy-caption sy-fg-muted">500 credits · thanks for the ramp generator</p>
          </div>
        </div>
      </div>

      {/* Chat. A side rail on desktop, a bottom sheet on phones. */}
      <aside className="sy-live-chat" aria-label="Live chat">
        <header className="sy-live-chat__head">
          <h2 className="sy-label">Live chat</h2>
          <div className="sy-row sy-gap-1">
            <Badge tone="live" variant="soft">
              {stream.viewers} watching
            </Badge>
            <IconButton icon="sliders" label="Chat settings" variant="ghost" size="xs" />
          </div>
        </header>

        <div className="sy-live-chat__stream">
          {LIVE_CHAT.map((message) => (
            <div key={message.id} className={`sy-chat-line is-${message.tone ?? 'normal'}`}>
              {message.tone === 'gift' ? (
                <div className="sy-chat-gift">
                  <span className="sy-chat-gift__icon" aria-hidden="true">
                    ✦
                  </span>
                  <span className="sy-caption">
                    <strong>{message.author}</strong> sent{' '}
                    <strong className="sy-fg-creator">{message.gift?.name}</strong>
                    <span className="sy-fg-quiet"> · {message.gift?.value}</span>
                  </span>
                </div>
              ) : message.tone === 'system' ? (
                <p className="sy-caption sy-chat-system">
                  <Icon name="sparkles" size={12} />
                  {message.body}
                </p>
              ) : (
                <p className="sy-body-sm">
                  <span
                    className={`sy-chat-line__author${
                      message.tone === 'moderator' ? ' is-moderator' : message.tone === 'subscriber' ? ' is-subscriber' : ''
                    }`}
                  >
                    {message.tone === 'moderator' && <Icon name="moderation" size={11} />}
                    {message.tone === 'subscriber' && <Icon name="premium" size={11} />}
                    {message.author}
                  </span>
                  <span className="sy-chat-line__body">{message.body}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        <footer className="sy-live-chat__composer">
          <div className="sy-input sy-input--sm sy-grow">
            <input placeholder="Say something" aria-label="Send a chat message" />
            <Icon name="emoji" size={16} className="sy-input__trailing" />
          </div>
          <IconButton icon="gift" label="Send a gift" variant="primary" tone="creator" size="sm" />
        </footer>
      </aside>
    </div>
  );
}

/** Companion creator list shown beside the player on very wide screens. */
export function LiveViewerSidebar() {
  return (
    <div className="sy-stack sy-gap-4">
      <h3 className="sy-label sy-context-title">Also live</h3>
      {CREATORS.filter((creator) => creator.live).map((creator) => (
        <button key={creator.id} type="button" className="sy-suggest-row">
          <Avatar name={creator.name} size={36} ring="live" />
          <div className="sy-grow">
            <p className="sy-caption sy-truncate">
              <strong>{creator.name}</strong>
            </p>
            <p className="sy-caption sy-fg-quiet sy-truncate">{creator.category}</p>
          </div>
          <Icon name="chevronRight" size={14} />
        </button>
      ))}
    </div>
  );
}
