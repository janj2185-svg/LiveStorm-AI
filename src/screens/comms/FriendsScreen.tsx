/**
 * Friends and follows
 * ---------------------------------------------------------------------------
 * A relationships screen has two jobs that pull in opposite directions:
 * *decide* on the handful of people waiting on you, and *browse* the hundreds
 * you already know. Deciding wins the top of the screen because it is finite —
 * two requests take ten seconds, and once they are gone the page becomes a
 * directory.
 *
 * WHY REQUESTS ARE CARDS AND THE REST ARE A GRID
 * A card carries enough context to make a judgement without opening a profile:
 * who they are, why they might be reaching out, and who you both know. A grid
 * cell carries only enough to recognise someone. Different decision, different
 * density.
 *
 * THE FOLLOWING BUTTON
 * "Following" is a state, "Unfollow" is a destructive action, and one button
 * has to be both. It shows the state at rest and the action on hover or focus,
 * with the label changing rather than only the colour — one card is pinned in
 * that state so the transition is designed rather than discovered.
 */

import { useState } from 'react';

import { Avatar, Badge, Button, Icon, IconButton, Tabs } from '../../design-system/primitives';
import { PageHeader } from '../../design-system/patterns/AppShell';
import { CREATORS } from '../data';

const TABS = [
  { id: 'following', label: 'Following', badge: 348 },
  { id: 'followers', label: 'Followers', badge: '12.4K' },
  { id: 'mutuals', label: 'Mutuals', badge: 96 },
  { id: 'requests', label: 'Requests', badge: 2 },
  { id: 'blocked', label: 'Blocked', badge: 4 },
];

const REQUESTS = [
  {
    id: 'rq1',
    name: 'Ravi Chandrasekaran',
    handle: '@ravi.systems',
    reason: 'Wants to follow you · works on the governance doc in Design Systems Guild',
    mutuals: 'Amara Okonkwo, Priya Raghunathan and 11 others follow them',
    when: '2h',
  },
  {
    id: 'rq2',
    name: 'Halldóra Sigurðardóttir',
    handle: '@halldora.hf',
    reason: 'Wants to follow you · replied to your post on perceptual colour',
    mutuals: 'Tobias Lindqvist follows them',
    when: 'Yesterday',
  },
];

const PEOPLE = CREATORS.map((creator, index) => ({
  ...creator,
  mutual:
    index === 0
      ? '96 mutual followers · you have both been in Design Systems Guild since 2023'
      : index % 3 === 0
        ? `${18 + index * 7} mutual followers`
        : `${4 + index} mutual followers · follows you back`,
  following: index % 3 !== 1,
}));

const FIND_TILES = [
  {
    icon: 'messages' as const,
    title: 'Import contacts',
    body: 'Match people you already know by email or phone. Nothing is uploaded until you confirm the match list.',
    action: 'Connect',
  },
  {
    icon: 'link' as const,
    title: 'Invite link',
    body: 'sylora.com/i/jordanreyes — expires in 7 days, works 25 times, revocable at any point.',
    action: 'Copy link',
  },
  {
    icon: 'grid' as const,
    title: 'QR code',
    body: 'Show your code in person. Scanning it opens your profile with the follow action already focused.',
    action: 'Show code',
  },
];

export function FriendsScreen() {
  const [tab, setTab] = useState('following');

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-friends">
        <PageHeader
          title="People"
          subtitle="Everyone you follow, everyone who follows you, and the two people waiting on an answer."
          actions={
            <Button variant="secondary" size="sm" icon="follow">
              Find people
            </Button>
          }
          tabs={<Tabs variant="underline" tabs={TABS} active={tab} onChange={setTab} />}
        />

        <section aria-labelledby="friends-requests" className="sy-friends__requests">
          <div className="sy-friends__requests-head">
            <h2 id="friends-requests" className="sy-title-3">
              Follow requests
            </h2>
            <Button variant="ghost" size="sm">
              Decline all
            </Button>
          </div>

          {REQUESTS.map((request) => (
            <article key={request.id} className="sy-request-card">
              <Avatar name={request.name} size={52} />
              <div className="sy-request-card__text">
                <p className="sy-headline sy-truncate">{request.name}</p>
                <p className="sy-caption sy-fg-muted">{request.handle}</p>
                <p className="sy-body-sm sy-fg-muted sy-request-card__reason">{request.reason}</p>
                <p className="sy-caption sy-fg-quiet sy-clamp-2">
                  <Icon name="friends" size={12} />
                  {request.mutuals}
                </p>
              </div>
              <div className="sy-request-card__actions">
                <span className="sy-caption sy-fg-quiet">{request.when}</span>
                <Button variant="primary" size="sm">
                  Accept
                </Button>
                <Button variant="outline" size="sm">
                  Decline
                </Button>
              </div>
            </article>
          ))}
        </section>

        <section aria-labelledby="friends-directory" className="sy-friends__directory">
          <div className="sy-friends__requests-head">
            <h2 id="friends-directory" className="sy-title-3">
              Following
            </h2>
            <span className="sy-caption sy-fg-muted">348 people · sorted by recent activity</span>
          </div>

          <div className="sy-grid" style={{ ['--min' as string]: '256px' }}>
            {PEOPLE.map((personItem, index) => (
              <article key={personItem.id} className="sy-person-card">
                <div className="sy-person-card__head">
                  <Avatar
                    name={personItem.name}
                    size={52}
                    verified={personItem.verified}
                    ring={personItem.live ? 'live' : false}
                  />
                  <IconButton icon="moreVertical" label={`Options for ${personItem.name}`} variant="ghost" size="xs" />
                </div>
                <h3 className="sy-label sy-truncate">{personItem.name}</h3>
                <p className="sy-caption sy-fg-quiet sy-truncate">{personItem.handle}</p>
                <p className="sy-caption sy-fg-muted sy-clamp-2 sy-person-card__mutual">{personItem.mutual}</p>
                <div className="sy-person-card__foot">
                  <Badge tone={personItem.live ? 'live' : 'neutral'} variant="soft">
                    {personItem.live ? 'Live now' : personItem.category}
                  </Badge>
                  {personItem.following ? (
                    /*
                      Card index 0 is pinned into the hover state so the
                      "Following → Unfollow" swap is visible in a static review.
                    */
                    <button
                      type="button"
                      className={`sy-follow-toggle${index === 0 ? ' is-hovered' : ''}`}
                      aria-label={`Unfollow ${personItem.name}`}
                    >
                      <span className="sy-follow-toggle__rest">
                        <Icon name="check" size={14} />
                        Following
                      </span>
                      <span className="sy-follow-toggle__hover">
                        <Icon name="close" size={14} />
                        Unfollow
                      </span>
                    </button>
                  ) : (
                    <Button variant="primary" size="sm">
                      Follow
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="friends-find" className="sy-friends__find">
          <h2 id="friends-find" className="sy-title-3">
            Find people
          </h2>
          <div className="sy-grid" style={{ ['--min' as string]: '240px' }}>
            {FIND_TILES.map((tile) => (
              <article key={tile.title} className="sy-find-tile">
                <span className="sy-tile-icon sy-tile-icon--lg">
                  <Icon name={tile.icon} size={20} />
                </span>
                <h3 className="sy-headline">{tile.title}</h3>
                <p className="sy-body-sm sy-fg-muted sy-grow">{tile.body}</p>
                <Button variant="outline" size="sm" fullWidth>
                  {tile.action}
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
