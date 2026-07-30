/**
 * Notifications
 * ---------------------------------------------------------------------------
 * A notification list is a queue of interruptions someone has already had, so
 * the only job left is triage: what is new, what needs a reply, what can be
 * ignored forever. Everything on this screen serves one of those three.
 *
 * Unread is never signalled by colour alone. Each unread row carries a filled
 * dot, a tinted background and a visually hidden "Unread" label — three
 * independent channels, because this is the single most common place a design
 * system quietly fails a colour-blind user.
 *
 * The leading tile is tinted by *type*, not by importance, and the tint reuses
 * the product's existing meanings: gifting is the creator tone everywhere in
 * SYLORA, realtime is the live tone, money is success. Learning the palette
 * once pays off on every screen.
 *
 * Rows are grouped by time rather than paginated. "Today" is the only group
 * most people read, and a group heading is a much cheaper stopping cue than a
 * date on every row.
 *
 * One row expands. The gift notification is the only type where the useful
 * next action is a reply, so it carries the gift tile and a thank-you field
 * inline instead of pushing to the stream. Every other type resolves with a
 * tap, and inlining those would be noise.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
  Surface,
  Tabs,
  type IconName,
  type Tone,
} from '../../design-system/primitives';
import { NOTIFICATIONS, type NotificationItem } from '../data';

/**
 * Older activity. `NOTIFICATIONS` only reaches back a day, and a screen that
 * cannot show what an empty-ish "Earlier" group looks like has not been
 * designed for the second week of use.
 */
const OLDER: NotificationItem[] = [
  { id: 'n8', kind: 'comment', actor: 'Yuki Tanaka', body: 'answered your question about glaze crazing in Kiln Notes', time: '2d', unread: false },
  { id: 'n9', kind: 'follow', actor: 'Mateo Fernández-Ruiz', body: 'and 214 others started following you', time: '3d', unread: false },
  { id: 'n10', kind: 'gift', actor: 'nadia_h', body: 'sent a Prism Wave during the office hours stream', time: '4d', unread: false },
  { id: 'n11', kind: 'system', actor: 'SYLORA', body: 'Your clip was used in the weekly Design Systems roundup', time: '2w', unread: false },
  { id: 'n12', kind: 'payout', actor: 'SYLORA', body: 'December payout of €3,904.15 cleared to SEPA ···· 4417', time: '3w', unread: false },
];

const KIND_STYLE: Record<NotificationItem['kind'], { icon: IconName; tone: Tone; label: string }> = {
  gift: { icon: 'gift', tone: 'creator', label: 'Gift' },
  live: { icon: 'live', tone: 'live', label: 'Live' },
  payout: { icon: 'coin', tone: 'success', label: 'Payout' },
  system: { icon: 'admin', tone: 'neutral', label: 'System' },
  follow: { icon: 'follow', tone: 'accent', label: 'Follow' },
  comment: { icon: 'comment', tone: 'accent', label: 'Reply' },
  mention: { icon: 'chat', tone: 'accent', label: 'Mention' },
};

const TAB_KINDS: Record<string, NotificationItem['kind'][] | null> = {
  all: null,
  mentions: ['mention', 'comment'],
  gifts: ['gift', 'payout'],
  system: ['system', 'live'],
};

const ALL_ITEMS = [...NOTIFICATIONS, ...OLDER];

/** Times in the demo data are relative strings, so grouping reads them. */
function groupOf(time: string): 'today' | 'week' | 'earlier' {
  if (time.endsWith('m') || time.endsWith('h')) return 'today';
  if (time === '1d' || time === '2d' || time === '3d' || time === '4d' || time === '5d' || time === '6d') {
    return 'week';
  }
  return 'earlier';
}

const GROUP_LABELS: { id: 'today' | 'week' | 'earlier'; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'earlier', label: 'Earlier' },
];

export function NotificationsScreen() {
  const [tab, setTab] = useState('all');
  const [read, setRead] = useState<string[]>([]);
  const [muted, setMuted] = useState<NotificationItem['kind'][]>([]);
  const [expanded, setExpanded] = useState('n1');
  const [thanks, setThanks] = useState('Thank you Marcus — that one lit the whole chat up.');

  const isUnread = (item: NotificationItem) => item.unread && !read.includes(item.id);

  const unreadCount = (kinds: NotificationItem['kind'][] | null) =>
    ALL_ITEMS.filter((item) => isUnread(item) && (!kinds || kinds.includes(item.kind))).length;

  const visible = ALL_ITEMS.filter((item) => {
    const kinds = TAB_KINDS[tab];
    return !kinds || kinds.includes(item.kind);
  });

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-notif">
        <header className="sy-notif__head">
          <div className="sy-grow">
            <h1 className="sy-title-1">Notifications</h1>
            <p className="sy-body-sm sy-fg-muted">
              {unreadCount(null) === 0
                ? 'Nothing unread. The last 12 items are kept for 30 days.'
                : `${unreadCount(null)} unread of ${ALL_ITEMS.length} in the last three weeks.`}
            </p>
          </div>
          <div className="sy-notif__head-actions">
            <Button
              variant="secondary"
              size="sm"
              icon="check"
              disabled={unreadCount(null) === 0}
              onClick={() => setRead(ALL_ITEMS.map((item) => item.id))}
            >
              Mark all read
            </Button>
            <IconButton icon="settings" label="Notification settings" variant="ghost" size="sm" />
          </div>
        </header>

        <div className="sy-notif__tabs">
          <Tabs
            variant="segmented"
            tabs={[
              { id: 'all', label: 'All', badge: unreadCount(null) },
              { id: 'mentions', label: 'Mentions', badge: unreadCount(TAB_KINDS.mentions) },
              { id: 'gifts', label: 'Gifts', badge: unreadCount(TAB_KINDS.gifts) },
              { id: 'system', label: 'System', badge: unreadCount(TAB_KINDS.system) },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {muted.length > 0 && (
          <Surface className="sy-notif__muted" padding="sm" elevation="flat" radius="md">
            <Icon name="volumeOff" size={16} />
            <span className="sy-caption sy-fg-muted sy-grow">
              Muted for now: {muted.map((kind) => KIND_STYLE[kind].label).join(', ')}
            </span>
            <Button variant="ghost" size="xs" onClick={() => setMuted([])}>
              Undo
            </Button>
          </Surface>
        )}

        {GROUP_LABELS.map((group) => {
          const items = visible.filter((item) => groupOf(item.time) === group.id);
          if (items.length === 0) return null;
          return (
            <section key={group.id} className="sy-notif__group">
              <h2 className="sy-overline sy-fg-quiet sy-notif__grouphead">{group.label}</h2>
              <ul className="sy-notif__list">
                {items.map((item) => {
                  const style = KIND_STYLE[item.kind];
                  const unread = isUnread(item);
                  const open = item.id === expanded && item.kind === 'gift';
                  return (
                    <li key={item.id}>
                      <div className={`sy-notif__row${unread ? ' is-unread' : ''}`}>
                        <span className={`sy-tile-icon sy-tile-icon--lg sy-tone-${style.tone}`}>
                          <Icon name={style.icon} size={20} />
                        </span>

                        <div className="sy-notif__text">
                          <p className="sy-body-sm">
                            <strong className="sy-notif__actor">{item.actor}</strong> {item.body}
                          </p>
                          <p className="sy-caption sy-fg-quiet sy-notif__meta">
                            <Badge tone={style.tone} variant="soft">
                              {style.label}
                            </Badge>
                            <span>{item.time} ago</span>
                            {unread && (
                              <>
                                <span className="sy-notif__dot" aria-hidden="true" />
                                <span className="sy-notif__unread-label">Unread</span>
                              </>
                            )}
                          </p>

                          {item.kind === 'gift' && (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={open ? 'chevronUp' : 'chevronDown'}
                              aria-expanded={open}
                              onClick={() => setExpanded(open ? '' : item.id)}
                            >
                              {open ? 'Hide' : 'Say thanks'}
                            </Button>
                          )}
                        </div>

                        <span className="sy-notif__avatar">
                          <Avatar name={item.actor} size={36} />
                        </span>

                        {/* Row actions stay in the flow so they are tabbable at
                            every posture; only their opacity is tied to hover. */}
                        <span className="sy-notif__actions">
                          <IconButton
                            icon="check"
                            label={`Mark ${item.actor}'s notification as read`}
                            variant="ghost"
                            size="xs"
                            disabled={!unread}
                            onClick={() => setRead((list) => [...list, item.id])}
                          />
                          <IconButton
                            icon="volumeOff"
                            label={`Mute ${style.label.toLowerCase()} notifications`}
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              setMuted((list) => (list.includes(item.kind) ? list : [...list, item.kind]))
                            }
                          />
                        </span>
                      </div>

                      {open && (
                        <Surface className="sy-notif__expand" padding="md" elevation="raised" radius="lg">
                          <div className="sy-notif__gift">
                            <span className="sy-notif__gift-tile" aria-hidden="true">
                              ✵
                            </span>
                            <div className="sy-grow">
                              <p className="sy-label">Aurora Burst</p>
                              <p className="sy-caption sy-fg-muted">
                                500 credits · €4.99 · epic tier · your 3rd from {item.actor}
                              </p>
                              <p className="sy-caption sy-fg-quiet">
                                Sent 4 minutes ago at 02:41:16 into &ldquo;Rebuilding the token pipeline
                                live&rdquo;
                              </p>
                            </div>
                            <Badge tone="creator" variant="soft" icon="coin">
                              +€3.49 net
                            </Badge>
                          </div>

                          <div className="sy-notif__reply">
                            <Input
                              label="Say thanks"
                              hint="Posts as a reply in the stream chat and pins for 30 seconds."
                              value={thanks}
                              onChange={(event) => setThanks(event.target.value)}
                            />
                            <div className="sy-notif__reply-actions">
                              <Button variant="primary" tone="creator" size="sm" icon="send">
                                Send thanks
                              </Button>
                              <Button variant="ghost" size="sm" icon="gift">
                                Send one back
                              </Button>
                            </div>
                          </div>
                        </Surface>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <footer className="sy-notif__foot">
          <p className="sy-caption sy-fg-quiet">
            Notifications older than 30 days are removed. Payout and security notices are kept in
            Settings for seven years.
          </p>
          <Button variant="ghost" size="sm" icon="settings">
            Choose what interrupts you
          </Button>
        </footer>
      </div>
    </div>
  );
}
