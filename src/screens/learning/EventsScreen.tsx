/**
 * Events
 * ---------------------------------------------------------------------------
 * Two people use this screen with opposite mental models. One is asking "what
 * is on soon" — a queue, best served as a list ordered by time. The other is
 * asking "what does my February look like" — a shape, only visible as a month
 * grid. Neither is a superset of the other, so both are built and the toggle
 * is a segmented control rather than a hidden preference.
 *
 * In the list, the date is a tile rather than a line of text. A repeated,
 * fixed-width block lets the eye scan down the column and find "the 16th"
 * without reading any of the titles beside it.
 *
 * Registration state is a filled check plus the word "Registered", never a
 * colour swap on the button — a green button and a purple button look
 * identical to a significant share of people.
 */

import { useState } from 'react';

import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Icon,
  IconButton,
  Surface,
  Tabs,
} from '../../design-system/primitives';
import { Media, ScreenSection } from '../components';
import { CREATORS, EVENTS } from '../data';

/**
 * February 2026 begins on a Sunday, which is why the first row of the grid
 * carries five days of January: a month view that starts on the 1st lies about
 * where the weekends fall.
 */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayCell {
  day: number;
  outside?: 'prev' | 'next';
  events?: { id: string; kind: string }[];
}

const CALENDAR: DayCell[][] = [
  [
    { day: 26, outside: 'prev' },
    { day: 27, outside: 'prev' },
    { day: 28, outside: 'prev' },
    { day: 29, outside: 'prev' },
    { day: 30, outside: 'prev' },
    { day: 31, outside: 'prev' },
    { day: 1 },
  ],
  [
    { day: 2 },
    { day: 3, events: [{ id: 'x1', kind: 'Meetup' }] },
    { day: 4 },
    { day: 5, events: [{ id: 'x2', kind: 'AMA' }] },
    { day: 6 },
    { day: 7 },
    { day: 8 },
  ],
  [
    { day: 9 },
    { day: 10 },
    { day: 11 },
    { day: 12, events: [{ id: 'e1', kind: 'Workshop' }, { id: 'x3', kind: 'Premiere' }] },
    { day: 13 },
    { day: 14, events: [{ id: 'e2', kind: 'AMA' }] },
    { day: 15 },
  ],
  [
    { day: 16, events: [{ id: 'e3', kind: 'Premiere' }] },
    { day: 17 },
    { day: 18 },
    { day: 19, events: [{ id: 'x4', kind: 'Workshop' }] },
    { day: 20 },
    { day: 21 },
    { day: 22 },
  ],
  [
    { day: 23 },
    { day: 24, events: [{ id: 'x5', kind: 'Meetup' }] },
    { day: 25 },
    { day: 26 },
    { day: 27 },
    { day: 28 },
    { day: 1, outside: 'next' },
  ],
  [
    { day: 2, outside: 'next' },
    { day: 3, outside: 'next', events: [{ id: 'e4', kind: 'Conference' }] },
    { day: 4, outside: 'next', events: [{ id: 'e4b', kind: 'Conference' }] },
    { day: 5, outside: 'next', events: [{ id: 'e4c', kind: 'Conference' }] },
    { day: 6, outside: 'next' },
    { day: 7, outside: 'next' },
    { day: 8, outside: 'next' },
  ],
];

/** Everything the shared EVENTS list does not carry: day/month split and state. */
const EVENT_META: Record<string, { day: string; month: string; registered: boolean; venue: string }> = {
  e1: { day: '12', month: 'Feb', registered: true, venue: 'Online · SYLORA Live' },
  e2: { day: '14', month: 'Feb', registered: false, venue: 'Online · Q&A stage' },
  e3: { day: '16', month: 'Feb', registered: true, venue: 'Online · premiere room' },
  e4: { day: '03', month: 'Mar', registered: false, venue: 'Lisbon · Pátio da Galé' },
};

const HOSTING = [
  { id: 'h1', title: 'Office hours: token migrations', date: 'Tue 10 Feb', time: '17:00 CET', going: '86' },
  { id: 'h2', title: 'Contrast audit clinic — bring your palette', date: 'Tue 24 Feb', time: '17:00 CET', going: '142' },
];

const AGENDA = [
  { time: '18:00', title: 'Why HSL fails and what OKLCH fixes', note: 'With the ramp generator open on screen' },
  { time: '18:35', title: 'Build a ramp from one hue, live', note: 'You follow along in your own repo' },
  { time: '19:20', title: 'Solving the solid step against WCAG', note: 'The part that usually breaks' },
  { time: '20:05', title: 'Open questions and palette review', note: 'Bring a palette, leave with an audit' },
];

const KIND_TONE = {
  Workshop: 'accent',
  AMA: 'live',
  Premiere: 'creator',
  Meetup: 'success',
  Conference: 'warning',
} as const;

export function EventsScreen() {
  const [view, setView] = useState('list');
  const [selectedDay, setSelectedDay] = useState(12);

  const featured = EVENTS[0];
  const detail = EVENTS[0];
  const monthEventCount = CALENDAR.flat().reduce(
    (sum, cell) => (cell.outside ? sum : sum + (cell.events?.length ?? 0)),
    0,
  );

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-events">
        <header className="sy-events__head">
          <div className="sy-events__head-text">
            <span className="sy-overline sy-fg-accent">February 2026</span>
            <h1 className="sy-title-2">Events</h1>
          </div>
          <div className="sy-events__head-actions">
            <Tabs
              variant="segmented"
              active={view}
              onChange={setView}
              tabs={[
                { id: 'list', label: 'List', icon: 'list' },
                { id: 'calendar', label: 'Calendar', icon: 'calendar' },
              ]}
            />
            <Button variant="primary" icon="plus">
              Host an event
            </Button>
          </div>
        </header>

        <ScreenSection>
          <Surface className="sy-event-hero" padding="none" elevation="raised" radius="xl">
            <div className="sy-event-hero__media">
              <Media seed={`${featured.id}-hero`} ratio="16/9" radius="none" scrim>
                <span className="sy-event-hero__date">
                  <span className="sy-event-hero__day sy-mono">12</span>
                  <span className="sy-overline">Feb</span>
                </span>
              </Media>
            </div>
            <div className="sy-event-hero__body">
              <div className="sy-row sy-gap-2 sy-wrap">
                <Badge tone={KIND_TONE[featured.kind]} variant="soft" icon="events">
                  {featured.kind}
                </Badge>
                <Badge tone="neutral" variant="outline" icon="clock">
                  Starts in 2 days
                </Badge>
              </div>
              <h2 className="sy-title-3 sy-event-hero__title">{featured.title}</h2>
              <p className="sy-body-sm sy-fg-muted sy-measure">
                Three hours, one repository, and a working perceptual colour pipeline by the end.
                Recording goes out to everyone registered, whether or not you make it live.
              </p>
              <div className="sy-event-hero__facts">
                <span>
                  <Icon name="calendar" size={15} />
                  {featured.date}
                </span>
                <span>
                  <Icon name="clock" size={15} />
                  {featured.time} · 3h
                </span>
                <span>
                  <Icon name="globe" size={15} />
                  {EVENT_META.e1.venue}
                </span>
              </div>
              <div className="sy-event-hero__foot">
                <span className="sy-event-hero__host">
                  <Avatar name={featured.host} size={32} verified />
                  <span className="sy-body-sm sy-truncate">{featured.host}</span>
                </span>
                <span className="sy-event-hero__going">
                  <AvatarGroup
                    people={CREATORS.slice(1, 5).map((creator) => ({ name: creator.name }))}
                    max={3}
                    size={24}
                  />
                  <span className="sy-caption sy-fg-muted">{featured.attendees} going</span>
                </span>
                <span className="sy-grow" />
                <span className="sy-mono sy-event-hero__price">{featured.price}</span>
                <Button variant="primary" icon="check">
                  Registered
                </Button>
              </div>
            </div>
          </Surface>
        </ScreenSection>

        {view === 'calendar' ? (
          <ScreenSection title="February 2026" eyebrow={`${monthEventCount} events this month`}>
            <Surface elevation="surface" padding="md" radius="lg" className="sy-cal">
              <div className="sy-cal__bar">
                <IconButton icon="chevronLeft" label="Previous month" variant="ghost" size="sm" />
                <span className="sy-label sy-cal__month">February 2026</span>
                <IconButton icon="chevronRight" label="Next month" variant="ghost" size="sm" />
                <span className="sy-grow" />
                <Button variant="ghost" size="sm">
                  Today
                </Button>
              </div>
              <div className="sy-cal__grid" role="grid" aria-label="February 2026">
                <div className="sy-cal__weekdays" role="row">
                  {WEEKDAYS.map((day) => (
                    <span key={day} role="columnheader" className="sy-caption sy-fg-quiet">
                      {day}
                    </span>
                  ))}
                </div>
                {CALENDAR.map((week, index) => (
                  <div key={`week-${index}`} className="sy-cal__week" role="row">
                    {week.map((cell) => {
                      const isSelected = !cell.outside && cell.day === selectedDay;
                      return (
                        <button
                          key={`${cell.day}-${cell.outside ?? 'cur'}`}
                          type="button"
                          role="gridcell"
                          aria-selected={isSelected}
                          aria-label={`${cell.day} ${cell.outside === 'next' ? 'March' : cell.outside === 'prev' ? 'January' : 'February'}${
                            cell.events ? `, ${cell.events.length} events` : ', no events'
                          }`}
                          className={`sy-cal__day${cell.outside ? ' is-outside' : ''}${
                            isSelected ? ' is-selected' : ''
                          }`}
                          onClick={() => !cell.outside && setSelectedDay(cell.day)}
                        >
                          <span className="sy-mono sy-cal__num">{cell.day}</span>
                          {cell.events && (
                            <span className="sy-cal__dots" aria-hidden="true">
                              {cell.events.map((event) => (
                                <span key={event.id} className={`sy-cal__dot is-${event.kind.toLowerCase()}`} />
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="sy-cal__legend">
                {(Object.keys(KIND_TONE) as (keyof typeof KIND_TONE)[]).map((kind) => (
                  <span key={kind}>
                    <span className={`sy-cal__dot is-${kind.toLowerCase()}`} aria-hidden="true" />
                    <span className="sy-caption sy-fg-muted">{kind}</span>
                  </span>
                ))}
              </div>
              <div className="sy-cal__selected">
                <h3 className="sy-label">Thursday 12 February</h3>
                <ul>
                  <li>
                    <span className="sy-mono sy-caption">18:00</span>
                    <span className="sy-body-sm sy-grow sy-truncate">
                      Token Pipeline Workshop — build it with me
                    </span>
                    <Badge tone="accent" variant="soft">
                      Workshop
                    </Badge>
                  </li>
                  <li>
                    <span className="sy-mono sy-caption">21:30</span>
                    <span className="sy-body-sm sy-grow sy-truncate">
                      Jämtland ambient set — three hours, no edits
                    </span>
                    <Badge tone="creator" variant="soft">
                      Premiere
                    </Badge>
                  </li>
                </ul>
              </div>
            </Surface>
          </ScreenSection>
        ) : (
          <ScreenSection
            title="Upcoming"
            eyebrow="Next 30 days"
            action={
              <Button variant="ghost" size="sm" icon="filter">
                Filter
              </Button>
            }
          >
            <Surface elevation="surface" padding="none" radius="lg" className="sy-event-list">
              <ul>
                {EVENTS.map((event) => {
                  const meta = EVENT_META[event.id];
                  return (
                    <li key={event.id} className="sy-event-row">
                      <span className="sy-event-date" aria-hidden="true">
                        <span className="sy-mono sy-event-date__day">{meta.day}</span>
                        <span className="sy-overline sy-event-date__month">{meta.month}</span>
                      </span>
                      <div className="sy-event-row__text">
                        <h3 className="sy-label sy-clamp-2">{event.title}</h3>
                        <span className="sy-event-row__host">
                          <Avatar name={event.host} size={20} />
                          <span className="sy-caption sy-fg-muted sy-truncate">{event.host}</span>
                        </span>
                        <span className="sy-event-row__meta">
                          <Badge tone={KIND_TONE[event.kind]} variant="soft">
                            {event.kind}
                          </Badge>
                          <span className="sy-caption sy-fg-quiet">
                            <Icon name="clock" size={12} /> {event.time}
                          </span>
                          <span className="sy-caption sy-fg-quiet">
                            <Icon name="community" size={12} /> {event.attendees}
                          </span>
                        </span>
                      </div>
                      <div className="sy-event-row__action">
                        <span className="sy-mono sy-event-row__price">{event.price}</span>
                        {meta.registered ? (
                          <span className="sy-event-row__registered">
                            <Icon name="check" size={13} />
                            Registered
                          </span>
                        ) : (
                          <Button variant="outline" size="sm">
                            Register
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          </ScreenSection>
        )}

        <ScreenSection title="Your events" eyebrow="Hosting and attending">
          <div className="sy-cols sy-cols--2">
            <Surface elevation="surface" padding="lg" radius="lg">
              <div className="sy-between sy-row sy-your-events__head">
                <h3 className="sy-headline">You are hosting</h3>
                <Badge tone="creator" variant="soft" icon="studio">
                  {HOSTING.length}
                </Badge>
              </div>
              <ul className="sy-your-events">
                {HOSTING.map((event) => (
                  <li key={event.id}>
                    <span className="sy-tile-icon sy-tone-creator">
                      <Icon name="events" size={18} />
                    </span>
                    <span className="sy-your-events__text">
                      <span className="sy-label sy-clamp-2">{event.title}</span>
                      <span className="sy-caption sy-fg-quiet">
                        {event.date} · {event.time} · {event.going} going
                      </span>
                    </span>
                    <Button variant="ghost" size="sm" iconEnd="chevronRight">
                      Manage
                    </Button>
                  </li>
                ))}
              </ul>
            </Surface>

            <Surface elevation="surface" padding="lg" radius="lg">
              <div className="sy-between sy-row sy-your-events__head">
                <h3 className="sy-headline">You are attending</h3>
                <Badge tone="accent" variant="soft" icon="check">
                  2
                </Badge>
              </div>
              <ul className="sy-your-events">
                {EVENTS.filter((event) => EVENT_META[event.id].registered).map((event) => (
                  <li key={event.id}>
                    <span className="sy-tile-icon sy-tone-accent">
                      <Icon name="calendar" size={18} />
                    </span>
                    <span className="sy-your-events__text">
                      <span className="sy-label sy-clamp-2">{event.title}</span>
                      <span className="sy-caption sy-fg-quiet">
                        {event.date} · {event.time} · {EVENT_META[event.id].venue}
                      </span>
                    </span>
                    <IconButton icon="more" label={`Options for ${event.title}`} variant="ghost" size="sm" />
                  </li>
                ))}
              </ul>
            </Surface>
          </div>
        </ScreenSection>

        <ScreenSection title="Event detail" eyebrow={detail.date}>
          <Surface elevation="surface" padding="lg" radius="lg" className="sy-event-detail">
            <div className="sy-event-detail__grid">
              <div className="sy-stack sy-gap-5">
                <div>
                  <h3 className="sy-title-3">{detail.title}</h3>
                  <p className="sy-body-sm sy-fg-muted sy-measure sy-event-detail__desc">
                    We build the pipeline end to end: hue selection, ramp generation, gamut mapping,
                    and a contrast audit that runs in CI and fails the build when a pair drops below
                    4.5:1. You leave with a working generator in your own repository, not a slide
                    deck about one.
                  </p>
                </div>

                <div>
                  <h4 className="sy-label sy-event-detail__subhead">Agenda</h4>
                  <ol className="sy-agenda">
                    {AGENDA.map((item) => (
                      <li key={item.time}>
                        <span className="sy-mono sy-agenda__time">{item.time}</span>
                        <span className="sy-agenda__marker" aria-hidden="true" />
                        <span className="sy-agenda__text">
                          <span className="sy-label">{item.title}</span>
                          <span className="sy-caption sy-fg-quiet">{item.note}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="sy-label sy-event-detail__subhead">Who is going</h4>
                  <div className="sy-event-detail__going">
                    <AvatarGroup people={CREATORS.map((creator) => ({ name: creator.name }))} max={6} size={32} />
                    <span className="sy-caption sy-fg-muted">
                      {detail.attendees} registered, including 6 people you follow
                    </span>
                  </div>
                </div>
              </div>

              <div className="sy-stack sy-gap-4 sy-event-detail__aside">
                <div className="sy-event-detail__host">
                  <Avatar name={detail.host} size={48} verified ring="story" />
                  <div>
                    <p className="sy-label">{detail.host}</p>
                    <p className="sy-caption sy-fg-quiet">@amara.builds · 482K followers</p>
                  </div>
                </div>
                <p className="sy-body-sm sy-fg-muted">
                  Systems designer. Builds tools that make other builders faster, and has run this
                  workshop eleven times — each one differently, because the questions change.
                </p>
                <div className="sy-divider" />
                <div className="sy-kv">
                  <span className="sy-kv__key">Ticket</span>
                  <span className="sy-kv__value sy-mono">{detail.price}</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Recording</span>
                  <span className="sy-kv__value">Included, 30 days</span>
                </div>
                <div className="sy-kv">
                  <span className="sy-kv__key">Refunds</span>
                  <span className="sy-kv__value">Until 24h before</span>
                </div>
                <div className="sy-event-detail__actions">
                  <Button variant="outline" fullWidth icon="calendar">
                    Add to calendar
                  </Button>
                  <Button variant="ghost" fullWidth icon="share">
                    Share event
                  </Button>
                </div>
              </div>
            </div>
          </Surface>
        </ScreenSection>
      </div>
    </div>
  );
}
