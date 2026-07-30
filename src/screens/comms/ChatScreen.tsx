/**
 * Chat
 * ---------------------------------------------------------------------------
 * A conversation is a single column of text that has to stay readable while
 * three other jobs — switching threads, checking who you are talking to, and
 * finding what was shared — compete for the same screen.
 *
 * THE THREE PANES ARE A PROGRESSIVE DISCLOSURE, NOT A LAYOUT
 * Compact shows only the thread, because a phone conversation is a place you
 * are *in*; the list is one back tap away. On a tablet the list returns as a
 * permanent index, because once switching threads is cheap it becomes the
 * frequent act. The details pane appears last, on a laptop-class column, since
 * shared files and mute settings are the least urgent things here and so the
 * first thing worth cutting.
 *
 * THE SCREEN OWNS ITS OWN HEIGHT
 * This is the one screen in the group that must not scroll as a page: the
 * composer has to stay reachable and the header has to stay pinned, so the
 * thread scrolls inside a fixed frame the way a real messenger does.
 *
 * BUBBLE SIDES
 * Mine are right-aligned and accent-tinted, theirs are left-aligned on surface.
 * Alignment does the work; the tint is a second, redundant signal so the thread
 * still parses in greyscale. Bubbles are capped at a readable measure rather
 * than the column width, because a full-width bubble stops looking like speech.
 */

import { Avatar, Badge, Button, Icon, IconButton, SearchInput } from '../../design-system/primitives';
import { CONVERSATIONS, THREAD } from '../data';
import { Media } from '../components';

const active = CONVERSATIONS[0];
const person = active.person;

/** Yesterday's tail, so the date divider has something to divide. */
const EARLIER = [
  {
    id: 'y1',
    from: 'me' as const,
    body: 'Did the neutral envelope change land in main or is it still on your branch?',
    time: '18:02',
  },
  {
    id: 'y2',
    from: 'them' as const,
    body: 'Still on the branch. I want to run the audit once more before I merge it — last time I trusted the diff it cost us a fortnight.',
    time: '18:09',
  },
];

export function ChatScreen() {
  return (
    <div className="sy-screen sy-chat-screen">
      <div className="sy-chat">
        {/* Pane 1 — the index. */}
        <aside className="sy-chat__list" aria-label="Conversations">
          <div className="sy-chat__list-head">
            <SearchInput placeholder="Search messages" />
          </div>
          <div className="sy-chat__list-body">
            {CONVERSATIONS.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`sy-chat__list-item${conversation.id === active.id ? ' is-active' : ''}`}
                aria-current={conversation.id === active.id ? 'true' : undefined}
              >
                <Avatar
                  name={conversation.person.name}
                  size={40}
                  presence={conversation.online ? 'online' : 'offline'}
                />
                <span className="sy-chat__list-text">
                  <span className="sy-chat__list-top">
                    <span className="sy-label sy-truncate">{conversation.person.name}</span>
                    <span className="sy-caption sy-fg-quiet">{conversation.time}</span>
                  </span>
                  <span className="sy-caption sy-fg-muted sy-truncate">{conversation.preview}</span>
                </span>
                {conversation.unread > 0 && (
                  <span className="sy-chat__list-unread" aria-label={`${conversation.unread} unread`}>
                    {conversation.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Pane 2 — the conversation itself. */}
        <section className="sy-chat__thread" aria-label={`Conversation with ${person.name}`}>
          <header className="sy-chat__header">
            <IconButton
              icon="chevronLeft"
              label="Back to conversations"
              variant="ghost"
              size="sm"
              className="sy-chat__back"
            />
            <Avatar name={person.name} size={38} presence="online" verified={person.verified} />
            <div className="sy-chat__header-text">
              <h1 className="sy-label sy-truncate">{person.name}</h1>
              <p className="sy-caption sy-chat__presence">
                <span className="sy-chat__presence-dot" aria-hidden="true" />
                Online · replies in a few minutes
              </p>
            </div>
            <IconButton icon="mic" label="Start a voice call" variant="ghost" size="sm" />
            <IconButton icon="video" label="Start a video call" variant="ghost" size="sm" />
            <IconButton icon="more" label="Conversation options" variant="ghost" size="sm" />
          </header>

          <div className="sy-chat__stream">
            <div className="sy-chat__divider">
              <span className="sy-caption">Yesterday</span>
            </div>

            {EARLIER.map((message) => (
              <div key={message.id} className={`sy-bubble-row is-${message.from}`}>
                {message.from === 'them' && <Avatar name={person.name} size={28} className="sy-bubble-row__avatar" />}
                <div className="sy-bubble">
                  <p className="sy-body-sm">{message.body}</p>
                  <span className="sy-bubble__time sy-caption">{message.time}</span>
                </div>
              </div>
            ))}

            <div className="sy-chat__divider">
              <span className="sy-caption">Today</span>
            </div>

            {THREAD.map((message, index) => {
              const mine = message.from === 'me';
              const isLastOfMine = message.id === 't4';
              return (
                <div key={message.id} className={`sy-bubble-row is-${message.from}`}>
                  {!mine && <Avatar name={person.name} size={28} className="sy-bubble-row__avatar" />}
                  <div className="sy-bubble">
                    <p className="sy-body-sm">{message.body}</p>

                    {/* An attachment is a card inside the bubble, not a link. */}
                    {index === 0 && (
                      <a href="#attachment" className="sy-attach-card">
                        <span className="sy-attach-card__icon" aria-hidden="true">
                          <Icon name="inventory" size={18} />
                        </span>
                        <span className="sy-attach-card__text">
                          <span className="sy-label sy-truncate">ramp-generator-v4.ts</span>
                          <span className="sy-caption sy-fg-muted">TypeScript · 18.4 KB · 2 min ago</span>
                        </span>
                        <span className="sy-attach-card__action" aria-hidden="true">
                          <Icon name="download" size={16} />
                        </span>
                        <span className="sy-sr-only">Download ramp-generator-v4.ts</span>
                      </a>
                    )}

                    {/* A link preview earns its space only when the target is visual. */}
                    {message.id === 't5' && (
                      <a href="#preview" className="sy-link-card">
                        <Media seed="contrast-audit-report" ratio="16/9" radius="md" className="sy-link-card__art" />
                        <span className="sy-link-card__text">
                          <span className="sy-caption sy-fg-quiet">tokens.sylora.com</span>
                          <span className="sy-label sy-clamp-2">
                            Contrast audit — 82 of 82 pairs passing in both themes
                          </span>
                          <span className="sy-caption sy-fg-muted sy-clamp-2">
                            Generated at build time from the OKLCH ramps. Every pair is proved against its own
                            background, not against canvas.
                          </span>
                        </span>
                      </a>
                    )}

                    <span className="sy-bubble__time sy-caption">
                      {message.time}
                      {isLastOfMine && (
                        <span className="sy-bubble__receipt">
                          <Icon name="check" size={12} />
                          <Icon name="check" size={12} className="sy-bubble__receipt-second" />
                          Read
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator. Live region so it is announced, not just seen. */}
            <div className="sy-bubble-row is-them" role="status" aria-live="polite">
              <Avatar name={person.name} size={28} className="sy-bubble-row__avatar" />
              <div className="sy-bubble sy-typing">
                <span className="sy-typing__dot" />
                <span className="sy-typing__dot" />
                <span className="sy-typing__dot" />
                <span className="sy-sr-only">{person.name} is typing</span>
              </div>
            </div>
          </div>

          <footer className="sy-chat__composer">
            <IconButton icon="attach" label="Attach a file" variant="ghost" size="sm" />
            <div className="sy-chat__field">
              <label className="sy-sr-only" htmlFor="chat-message">
                Message {person.name}
              </label>
              <textarea
                id="chat-message"
                rows={1}
                placeholder="Message"
                defaultValue="Pushing the audit output now so you can diff it against"
              />
            </div>
            <IconButton icon="emoji" label="Insert emoji" variant="ghost" size="sm" />
            {/*
              Send is only primary while there is something to send. An always-
              prominent send button trains people to ignore it.
            */}
            <IconButton icon="send" label="Send message" variant="primary" size="sm" />
          </footer>
        </section>

        {/* Pane 3 — details. Expanded posture only, and never load-bearing. */}
        <aside className="sy-chat__details" aria-label="Conversation details">
          <div className="sy-chat__details-head">
            <Avatar name={person.name} size={64} verified={person.verified} ring="live" />
            <h2 className="sy-headline">{person.name}</h2>
            <p className="sy-caption sy-fg-muted">{person.handle}</p>
            <Badge tone="live" variant="soft" icon="live">
              Live now
            </Badge>
            <div className="sy-row sy-gap-2">
              <Button variant="outline" size="sm" icon="profile">
                Profile
              </Button>
              <Button variant="outline" size="sm" icon="notifications">
                Mute
              </Button>
            </div>
          </div>

          <section className="sy-chat__details-section">
            <h3 className="sy-label sy-context-title">Shared files</h3>
            <div className="sy-stack sy-gap-2">
              {[
                { name: 'ramp-generator-v4.ts', meta: '18.4 KB · today' },
                { name: 'contrast-audit-2026-02.csv', meta: '204 KB · yesterday' },
                { name: 'neutral-envelope-notes.md', meta: '6.1 KB · Tue' },
              ].map((file) => (
                <button key={file.name} type="button" className="sy-chat__file">
                  <Icon name="inventory" size={16} />
                  <span className="sy-grow">
                    <span className="sy-caption sy-truncate">{file.name}</span>
                    <span className="sy-caption sy-fg-quiet">{file.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="sy-chat__details-section">
            <h3 className="sy-label sy-context-title">Shared media</h3>
            <div className="sy-chat__media-grid">
              {['audit-chart', 'ramp-strip', 'gamut-plot', 'stream-still'].map((seed) => (
                <Media key={seed} seed={seed} ratio="1/1" radius="md" />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
