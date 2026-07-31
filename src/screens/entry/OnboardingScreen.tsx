/**
 * Onboarding — step 2 of 4
 * ---------------------------------------------------------------------------
 * Setup is four steps because four is the most a person will complete before
 * they start suspecting the product is stalling them. Only one step is shown
 * here; the indicator carries the rest, so the cost of continuing is always
 * legible and nobody is asked to trust an open-ended flow.
 *
 * The step is a taxonomy choice, and taxonomy choices are where products
 * quietly acquire the right to reorder someone's timeline. SYLORA does not take
 * that right: interests feed Discover and nothing else, and the screen says so
 * on the screen rather than in a settings page nobody opens. The commitment is
 * repeated in the aside, which shows exactly which creators the current
 * selection would surface — a promise you can check is worth more than one you
 * have to believe.
 *
 * Continue stays disabled below three picks and the reason is stated in text
 * beside the count, never implied by a greyed-out button alone.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  Icon,
  Surface,
  type IconName,
} from '../../design-system/primitives';
import { CREATORS } from '../data';

const STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'interests', label: 'Interests' },
  { id: 'creators', label: 'Creators' },
  { id: 'notifications', label: 'Notifications' },
];

const CURRENT_STEP = 1;
const MINIMUM = 3;

/**
 * Sixteen categories: the eight the catalogue already sorts creators into, plus
 * eight adjacent ones. Sixteen fits three rows on a phone without a "show more"
 * — and a "show more" on an onboarding step is where completion rates go to die.
 */
const INTERESTS: { id: string; label: string; icon: IconName }[] = [
  { id: 'design', label: 'Design & Engineering', icon: 'layers' },
  { id: 'music', label: 'Music & Audio', icon: 'volume' },
  { id: 'education', label: 'Education', icon: 'courses' },
  { id: 'photography', label: 'Photography', icon: 'camera' },
  { id: 'craft', label: 'Craft', icon: 'inventory' },
  { id: 'science', label: 'Science', icon: 'brain' },
  { id: 'gaming', label: 'Gaming', icon: 'mission' },
  { id: 'food', label: 'Food', icon: 'streak' },
  { id: 'live', label: 'Live production', icon: 'live' },
  { id: 'stats', label: 'Applied statistics', icon: 'analytics' },
  { id: 'film', label: 'Film & colour grading', icon: 'video' },
  { id: 'field', label: 'Field science', icon: 'globe' },
  { id: 'motion', label: 'Motion & 3D', icon: 'grid' },
  { id: 'writing', label: 'Writing & essays', icon: 'edit' },
  { id: 'movement', label: 'Fitness & movement', icon: 'pulse' },
  { id: 'business', label: 'Creator economy', icon: 'business' },
];

/** Which catalogue category each interest maps onto, for the Discover preview. */
const CATEGORY_FOR: Record<string, string> = {
  design: 'Design & Engineering',
  music: 'Music & Audio',
  education: 'Education',
  photography: 'Photography',
  craft: 'Craft',
  science: 'Science',
  gaming: 'Gaming',
  food: 'Food',
  live: 'Design & Engineering',
  stats: 'Education',
  field: 'Science',
};

export function OnboardingScreen() {
  const [selected, setSelected] = useState<string[]>([
    'design',
    'education',
    'science',
    'live',
    'stats',
  ]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const met = selected.length >= MINIMUM;
  const categories = new Set(selected.map((id) => CATEGORY_FOR[id]).filter(Boolean));
  const matches = CREATORS.filter((creator) => categories.has(creator.category)).slice(0, 4);

  return (
    <div className="sy-screen sy-onboard-screen">
      {/* The same ambient field as Welcome and Authentication. Setup is still
          pre-product, so it belongs to the brightest surfaces in the product
          rather than to the shell it is about to hand you over to. */}
      <div className="sy-lumen" />

      {/* Progress stays pinned. A wizard that lets you lose sight of how far
          along you are is a wizard people abandon in the middle. */}
      <header className="sy-onboard__steps">
        <div className="sy-onboard__steps-inner sy-screen__inner">
          <div className="sy-onboard__steps-head">
            {/* Named as well as numbered: on a compact column the per-segment
                labels are suppressed, and "step 2 of 4" without a name is just
                a fraction. */}
            <span className="sy-overline sy-fg-accent">
              Step {CURRENT_STEP + 1} of {STEPS.length} · {STEPS[CURRENT_STEP].label}
            </span>
            <span className="sy-caption sy-fg-quiet">About 40 seconds left</span>
          </div>

          {/*
            A segmented bar rather than dots: four segments show how much is done
            *and* how much remains at a glance, which a dot row only implies.
            Position is reinforced by the completed tick and by aria-current, so
            the state survives greyscale.
          */}
          <ol className="sy-steps" aria-label="Setup progress">
            {STEPS.map((step, index) => {
              const done = index < CURRENT_STEP;
              const current = index === CURRENT_STEP;
              return (
                <li
                  key={step.id}
                  className={`sy-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="sy-step__track" />
                  <span className="sy-step__name sy-caption">
                    {done && <Icon name="check" size={12} />}
                    {step.label}
                  </span>
                  {/* Outside the label, which is hidden on narrow surfaces. */}
                  <span className="sy-sr-only">
                    {step.label}
                    {done ? ' — completed' : current ? ' — in progress' : ' — not started'}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <div className="sy-onboard__scroll">
        <div className="sy-onboard__body sy-screen__inner">
          <div className="sy-onboard__main">
            <div className="sy-onboard__intro">
              <h1 className="sy-title-1">What are you into?</h1>
              <p className="sy-body sy-fg-muted sy-measure">
                Pick at least three. This is the only thing Discover ranks on, and you can change it
                whenever you like — the effect is immediate, not next-day.
              </p>
            </div>

            <div className="sy-onboard__count" aria-live="polite">
              <Icon name={met ? 'success' : 'info'} size={16} />
              <span className="sy-body-sm">
                <strong>{selected.length} selected</strong>
                {met
                  ? ` — minimum of ${MINIMUM} met.`
                  : ` — choose at least ${MINIMUM} to continue.`}
              </span>
            </div>

            <div className="sy-onboard__chips" role="group" aria-label="Interests">
              {INTERESTS.map((interest) => (
                <Chip
                  key={interest.id}
                  icon={interest.icon}
                  selected={selected.includes(interest.id)}
                  onClick={() => toggle(interest.id)}
                >
                  {interest.label}
                </Chip>
              ))}
            </div>

            {/*
              The disclosure is a real product commitment, not reassurance copy:
              interests are an input to one ranked surface and to nothing else.
              It is collapsed because most people will not read it, and open one
              tap away because the people who do read it are the ones who matter.
            */}
            <details className="sy-why">
              <summary className="sy-why__summary">
                <Icon name="help" size={16} />
                <span className="sy-label">Why we ask</span>
                <Icon name="chevronDown" size={16} className="sy-why__chevron" />
              </summary>
              <div className="sy-why__body">
                <p className="sy-body-sm sy-fg-muted sy-measure">
                  Interests are used for exactly one thing: choosing what appears on{' '}
                  <strong className="sy-fg-default">Discover</strong>, the surface that is labelled
                  as recommended. They never reorder your feed. Your feed is strictly
                  chronological, it stays that way, and no signal collected here — not interests,
                  not watch time, not engagement — can change that ordering.
                </p>
                <p className="sy-body-sm sy-fg-muted sy-measure">
                  Nothing here is shared with advertisers or other creators, and clearing your
                  selection in Settings clears the derived model with it.
                </p>
              </div>
            </details>
          </div>

          <aside className="sy-onboard__aside" aria-label="What your selection changes">
            <Surface elevation="raised" radius="xl" padding="lg" className="sy-onboard__preview">
              <div className="sy-onboard__preview-head">
                <Badge tone="accent" variant="soft" icon="discover">
                  Discover preview
                </Badge>
                <span className="sy-caption sy-fg-quiet">Updates live</span>
              </div>
              <p className="sy-body-sm sy-fg-muted">
                With these picks, Discover would open on creators like these. Your feed is untouched.
              </p>

              <div className="sy-onboard__matches">
                {matches.map((creator) => (
                  <div key={creator.id} className="sy-onboard__match">
                    <Avatar name={creator.name} size={36} verified={creator.verified} ring={creator.live ? 'live' : false} />
                    <div className="sy-grow">
                      <p className="sy-label sy-truncate">{creator.name}</p>
                      <p className="sy-caption sy-fg-quiet sy-truncate">
                        {creator.category} · {creator.followers} followers
                      </p>
                    </div>
                    {creator.live && <Icon name="live" size={16} className="sy-fg-live" />}
                  </div>
                ))}
                {matches.length === 0 && (
                  <p className="sy-body-sm sy-fg-quiet">
                    Pick an interest to see who Discover would suggest.
                  </p>
                )}
              </div>

              <div className="sy-onboard__selected">
                <h2 className="sy-caption sy-fg-muted">Your picks</h2>
                <div className="sy-onboard__selected-chips">
                  {selected.map((id) => {
                    const interest = INTERESTS.find((item) => item.id === id);
                    if (!interest) return null;
                    return (
                      <Chip key={id} selected onRemove={() => toggle(id)}>
                        {interest.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            </Surface>
          </aside>
        </div>
      </div>

      {/*
        Back and Continue live outside the scrolling region: on a phone the chip
        grid is taller than the surface, and a Continue button you have to
        scroll to find reads as an obstacle rather than an invitation.
      */}
      <footer className="sy-onboard__footer">
        <div className="sy-onboard__footer-inner sy-screen__inner">
          <Button variant="ghost" size="lg" icon="arrowLeft">
            Back
          </Button>
          <span className="sy-caption sy-fg-quiet sy-onboard__footer-count">
            {selected.length} of {INTERESTS.length} interests
          </span>
          <Button variant="primary" size="lg" iconEnd="arrowRight" disabled={!met}>
            Continue
          </Button>
        </div>
      </footer>
    </div>
  );
}
