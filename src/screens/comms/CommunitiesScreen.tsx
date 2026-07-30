/**
 * Communities (Spaces)
 * ---------------------------------------------------------------------------
 * Two different questions share this screen: "where was I" and "where else
 * could I be". Your own spaces answer the first and sit in a horizontal rail —
 * short, familiar, scanned by muscle memory. Discovery answers the second and
 * gets the vertical grid, because comparing unfamiliar things needs them side
 * by side at equal weight.
 *
 * PRIVACY IS SAID THREE TIMES
 * A space's privacy changes what happens when you press the button, so it is
 * never left to colour: the badge pairs a lock, globe or key *icon* with the
 * word, the join control relabels itself ("Join" versus "Request"), and the
 * member counts drop the live-online figure for spaces you cannot see into.
 * Any one of those three carries the meaning on its own.
 *
 * WHY ONE SPACE IS EXPANDED
 * A card can say a space exists; only the channel list, the pinned post and the
 * faces currently in it can say what being a member feels like. One space is
 * shown open so that promise is on the page rather than behind a click.
 */

import { Avatar, AvatarGroup, Badge, Button, Icon, IconButton, type IconName } from '../../design-system/primitives';
import { PageHeader } from '../../design-system/patterns/AppShell';
import { COMMUNITIES, CREATORS, type Community } from '../data';
import { Media } from '../components';

const DISCOVER: Community[] = [
  ...COMMUNITIES,
  { id: 'sp6', name: 'Colour Science Reading Group', members: '5.4K', online: '212', topic: 'One paper a week, no homework', privacy: 'Public' },
  { id: 'sp7', name: 'Field Recordists', members: '3.8K', online: '64', topic: 'Wind, water and very patient microphones', privacy: 'Public' },
  { id: 'sp8', name: 'Late Night Build Club', members: '11.2K', online: '903', topic: 'Ship something before the coffee wears off', privacy: 'Private' },
];

const PRIVACY: Record<Community['privacy'], { icon: IconName; join: string; note: string }> = {
  Public: { icon: 'globe', join: 'Join', note: 'Anyone can read and post' },
  Private: { icon: 'lock', join: 'Request', note: 'Members approve every request' },
  'Invite only': { icon: 'key', join: 'Request invite', note: 'Closed — invitation required' },
};

const CHANNELS = [
  { name: 'announcements', kind: 'read-only', unread: 0 },
  { name: 'tokens-and-ramps', kind: 'busy', unread: 24 },
  { name: 'governance-rfc', kind: 'normal', unread: 6 },
  { name: 'show-and-tell', kind: 'normal', unread: 0 },
  { name: 'help-me-debug-this', kind: 'busy', unread: 41 },
];

const featured = COMMUNITIES[0];

export function CommunitiesScreen() {
  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-spaces">
        <PageHeader
          title="Spaces"
          subtitle="Communities you belong to, and the ones worth belonging to. Every space states its privacy before you press anything."
          actions={
            <>
              <IconButton icon="search" label="Search spaces" variant="secondary" size="sm" />
              <Button variant="primary" size="sm" icon="plus">
                Create a space
              </Button>
            </>
          }
        />

        <section aria-labelledby="spaces-yours">
          <div className="sy-spaces__head">
            <h2 id="spaces-yours" className="sy-title-3">
              Your spaces
            </h2>
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              Manage
            </Button>
          </div>

          <div className="sy-scroller">
            {COMMUNITIES.map((space) => (
              <article key={space.id} className="sy-space-tile">
                <Media seed={`${space.id}-banner`} ratio="16/9" radius="lg" scrim className="sy-space-tile__art">
                  <span className="sy-space-tile__privacy">
                    <Icon name={PRIVACY[space.privacy].icon} size={12} />
                    {space.privacy}
                  </span>
                </Media>
                <h3 className="sy-label sy-clamp-2">{space.name}</h3>
                <p className="sy-caption sy-fg-quiet sy-truncate">{space.topic}</p>
                <p className="sy-space-tile__counts sy-caption">
                  <span className="sy-fg-muted">{space.members} members</span>
                  {space.privacy !== 'Invite only' && (
                    <span className="sy-online">
                      <span className="sy-online__dot" aria-hidden="true" />
                      {space.online} online
                    </span>
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* One space opened up: channels, the pinned post, and who is in there. */}
        <section aria-labelledby="spaces-detail" className="sy-space-detail">
          <div className="sy-space-detail__main">
            <div className="sy-space-detail__identity">
              <Media seed={`${featured.id}-banner`} ratio="1/1" radius="lg" className="sy-space-detail__crest" />
              <div className="sy-grow">
                <h2 id="spaces-detail" className="sy-title-3">
                  {featured.name}
                </h2>
                <p className="sy-body-sm sy-fg-muted">{featured.topic}</p>
                <div className="sy-space-detail__meta">
                  <Badge tone="success" variant="soft" icon={PRIVACY[featured.privacy].icon}>
                    {featured.privacy}
                  </Badge>
                  <span className="sy-caption sy-fg-muted">{featured.members} members</span>
                  <span className="sy-online sy-caption">
                    <span className="sy-online__dot" aria-hidden="true" />
                    {featured.online} online
                  </span>
                </div>
              </div>
              <Button variant="secondary" size="sm" icon="notifications">
                Following
              </Button>
            </div>

            <article className="sy-pinned">
              <span className="sy-pinned__flag sy-caption">
                <Icon name="pin" size={12} />
                Pinned announcement
              </span>
              <p className="sy-label">Deprecation windows: comment before Friday</p>
              <p className="sy-body-sm sy-fg-muted">
                The governance draft sets a two-release window for any token rename, with a codemod shipped
                alongside. If your team cannot absorb that pace, say so in the thread — the number is not final
                until it has survived somebody objecting to it.
              </p>
              <div className="sy-pinned__foot">
                <Avatar name="Amara Okonkwo" size={22} />
                <span className="sy-caption sy-fg-muted">Amara Okonkwo · 2 days ago · 84 replies</span>
              </div>
            </article>

            <div className="sy-space-detail__active">
              <AvatarGroup people={CREATORS.slice(0, 6).map((creator) => ({ name: creator.name }))} max={5} size={28} />
              <span className="sy-caption sy-fg-muted">
                Priya, Tobias, Yuki and 1,201 others are in this space right now
              </span>
            </div>
          </div>

          <nav className="sy-space-detail__channels" aria-label={`Channels in ${featured.name}`}>
            <h3 className="sy-overline sy-fg-quiet">Channels</h3>
            {CHANNELS.map((channel) => (
              <button
                key={channel.name}
                type="button"
                className={`sy-channel${channel.unread > 0 ? ' is-unread' : ''}`}
              >
                <span className="sy-channel__hash" aria-hidden="true">
                  #
                </span>
                <span className="sy-channel__name sy-truncate">{channel.name}</span>
                {channel.kind === 'read-only' && (
                  <Icon name="lock" size={13} className="sy-channel__lock" />
                )}
                {channel.unread > 0 && (
                  <span className="sy-channel__badge">
                    {channel.unread}
                    <span className="sy-sr-only">unread messages</span>
                  </span>
                )}
              </button>
            ))}
            <Button variant="ghost" size="sm" icon="plus" fullWidth>
              Browse all 14 channels
            </Button>
          </nav>
        </section>

        <section aria-labelledby="spaces-discover" className="sy-spaces__discover">
          <div className="sy-spaces__head">
            <h2 id="spaces-discover" className="sy-title-3">
              Discover spaces
            </h2>
            <span className="sy-caption sy-fg-muted">Ranked by activity in the last 7 days</span>
          </div>

          <div className="sy-grid" style={{ ['--min' as string]: '280px' }}>
            {DISCOVER.map((space) => {
              const rules = PRIVACY[space.privacy];
              return (
                <article key={space.id} className="sy-space-card">
                  <Media seed={`${space.id}-cover`} ratio="5/2" radius="none" className="sy-space-card__banner" />
                  <div className="sy-space-card__body">
                    <div className="sy-space-card__title">
                      <h3 className="sy-headline sy-clamp-2">{space.name}</h3>
                      <Badge
                        tone={space.privacy === 'Public' ? 'neutral' : 'warning'}
                        variant="outline"
                        icon={rules.icon}
                      >
                        {space.privacy}
                      </Badge>
                    </div>
                    <p className="sy-body-sm sy-fg-muted sy-clamp-2">{space.topic}</p>
                    <p className="sy-caption sy-fg-quiet">{rules.note}</p>
                    <div className="sy-space-card__foot">
                      <span className="sy-caption sy-fg-muted">{space.members} members</span>
                      {space.privacy !== 'Invite only' && (
                        <span className="sy-online sy-caption">
                          <span className="sy-online__dot" aria-hidden="true" />
                          {space.online}
                        </span>
                      )}
                      <span className="sy-grow" />
                      <Button variant={space.privacy === 'Public' ? 'primary' : 'outline'} size="sm">
                        {rules.join}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
