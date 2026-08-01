/**
 * Messages inbox
 * ---------------------------------------------------------------------------
 * An inbox is a triage surface. The only decision it supports is "which of
 * these do I open", so every row is optimised to be *skipped* quickly: the name
 * and the preview sit on the same left edge, the timestamp and the unread count
 * sit on the same right edge, and nothing else moves between rows.
 *
 * UNREAD IS THREE SIGNALS
 * A tinted row, a bolder name and a numeric pill. Any one of them alone fails
 * for somebody — the tint fails in bright sun, the count fails when it is one,
 * the weight fails at small sizes — so they always ship together.
 *
 * WHY REQUESTS ARE A SEPARATE TAB AND A NOTICE
 * Holding messages from people you do not follow is a policy, and a policy that
 * is only expressed as a tab label is a policy people discover by accident. The
 * notice card states it in words, once, at the top of the list.
 *
 * ARCHIVED
 * Selecting Archived renders the empty state rather than an empty list: an
 * inbox with nothing in it should say so and offer the way back, because a
 * blank column is indistinguishable from a failed load.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Icon,
  IconButton,
  SearchInput,
  Tabs,
} from '../../design-system/primitives';
import { PageHeader } from '../../design-system/patterns/AppShell';
import { CONVERSATIONS } from '../data';
import { LiveProbePanel } from '../lib/LiveProbePanel';

const PINNED = CONVERSATIONS.slice(0, 2);
const REST = CONVERSATIONS.slice(2);

const TABS = [
  { id: 'all', label: 'All', badge: 24 },
  { id: 'unread', label: 'Unread', badge: 3 },
  { id: 'requests', label: 'Requests', badge: 7 },
  { id: 'archived', label: 'Archived', badge: 0 },
];

export function MessagesScreen() {
  const [tab, setTab] = useState('all');

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-inbox">
        <PageHeader
          title="Messages"
          subtitle="Direct conversations, space invitations and anything a creator sends you privately."
          actions={
            <>
              <IconButton icon="sliders" label="Message settings" variant="secondary" size="sm" />
              <Button variant="primary" size="sm" icon="edit">
                New message
              </Button>
            </>
          }
        />

        <div className="sy-inbox__search">
          <SearchInput placeholder="Search people and messages" shortcut="/" />
        </div>

        <Tabs variant="segmented" tabs={TABS} active={tab} onChange={setTab} className="sy-inbox__tabs" />

        {tab === 'archived' ? (
          <div className="sy-inbox__empty">
            <EmptyState
              icon="inventory"
              title="Nothing archived"
              description="Archived conversations disappear from the inbox but keep their history. Archive one by swiping it left, or from the row menu."
              action={
                <Button variant="outline" size="sm" onClick={() => setTab('all')}>
                  Back to all messages
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Policy stated in words, not implied by a tab. */}
            <aside className="sy-inbox__notice" aria-label="About message requests">
              <span className="sy-inbox__notice-icon" aria-hidden="true">
                <Icon name="lock" size={18} />
              </span>
              <div className="sy-grow">
                <p className="sy-label">SYLORA holds messages from people you do not follow</p>
                <p className="sy-body-sm sy-fg-muted">
                  Seven people have written to you this week. They stay in Requests, cannot see whether you
                  read them, and never reach your notifications until you accept.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTab('requests')}>
                Review 7
              </Button>
            </aside>

            <section aria-labelledby="inbox-pinned" className="sy-inbox__group">
              <h2 id="inbox-pinned" className="sy-overline sy-fg-quiet sy-inbox__group-title">
                <Icon name="pin" size={12} />
                Pinned
              </h2>
              {PINNED.map((conversation) => (
                <InboxRow key={conversation.id} conversation={conversation} pinned />
              ))}
            </section>

            <section aria-labelledby="inbox-recent" className="sy-inbox__group">
              <h2 id="inbox-recent" className="sy-overline sy-fg-quiet sy-inbox__group-title">
                Recent
              </h2>
              {REST.map((conversation) => (
                <InboxRow key={conversation.id} conversation={conversation} />
              ))}
              <InboxRow
                conversation={{
                  id: 'cv6',
                  person: {
                    ...CONVERSATIONS[1].person,
                    name: 'Design Systems Guild',
                    handle: '@designsystems.guild',
                  },
                  preview:
                    'Ravi: the governance doc is up for comment until Friday — please read the section on deprecation windows',
                  time: 'Mon',
                  unread: 0,
                  online: false,
                }}
                group
              />
            </section>
          </>
        )}

        <LiveProbePanel kind="messages" />
      </div>
    </div>
  );
}

function InboxRow({
  conversation,
  pinned = false,
  group = false,
}: {
  conversation: (typeof CONVERSATIONS)[number];
  pinned?: boolean;
  group?: boolean;
}) {
  const unread = conversation.unread > 0;
  return (
    <div className={`sy-inbox-row${unread ? ' is-unread' : ''}`}>
      <button type="button" className="sy-inbox-row__main">
        <Avatar
          name={conversation.person.name}
          size={46}
          presence={group ? undefined : conversation.online ? 'online' : 'offline'}
        />
        <span className="sy-inbox-row__text">
          <span className="sy-inbox-row__top">
            <span className="sy-inbox-row__name">
              <span className="sy-truncate">{conversation.person.name}</span>
              {group && (
                <Badge tone="neutral" variant="outline">
                  Space
                </Badge>
              )}
            </span>
            <span className="sy-caption sy-fg-quiet sy-shrink-0">{conversation.time}</span>
          </span>
          <span className="sy-inbox-row__preview sy-truncate">{conversation.preview}</span>
        </span>
        {unread && (
          <span className="sy-inbox-row__count">
            {conversation.unread}
            <span className="sy-sr-only">unread messages</span>
          </span>
        )}
      </button>

      {/* Revealed on hover and on focus; on touch these are the swipe actions. */}
      <div className="sy-inbox-row__actions">
        <IconButton
          icon="pin"
          label={pinned ? `Unpin ${conversation.person.name}` : `Pin ${conversation.person.name}`}
          variant="ghost"
          size="sm"
        />
        <IconButton icon="notifications" label={`Mute ${conversation.person.name}`} variant="ghost" size="sm" />
        <IconButton icon="inventory" label={`Archive ${conversation.person.name}`} variant="ghost" size="sm" />
      </div>
    </div>
  );
}
