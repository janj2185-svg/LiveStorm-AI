/**
 * Avatar life — Liora
 * ---------------------------------------------------------------------------
 * The AI assistant's living body. Not a logo, not an orb: a woman whose breath,
 * blink, gaze and speech are simulated continuously so the co-host never reads
 * as a frozen still. Creators can audition reactions the Live Hub fires
 * (listen, talk, wave, nod, glance, gift_react) before going on air.
 */

import { useRef, useState } from 'react';

import { LivingAvatar, type LivingAvatarHandle } from '../../design-system/avatar';
import { Badge, Button, Chip, Surface } from '../../design-system/primitives';
import type { AvatarReaction } from '@sylora/avatar-runtime';

const REACTIONS: { id: AvatarReaction; label: string; note: string }[] = [
  { id: 'idle', label: 'Idle life', note: 'Breath, blink, micro-gaze' },
  { id: 'listen', label: 'Listen', note: 'Attentive lean-in' },
  { id: 'talk', label: 'Talk', note: 'Speaking face + lip sync' },
  { id: 'smile', label: 'Smile', note: 'Warm social smile' },
  { id: 'nod', label: 'Nod', note: 'Polite agreement' },
  { id: 'wave', label: 'Wave', note: 'Viewer greeting' },
  { id: 'glance', label: 'Glance', note: 'Soft look-aside' },
  { id: 'gift_react', label: 'Gift react', note: 'Delighted thank-you' },
  { id: 'think', label: 'Think', note: 'Quiet consideration' },
];

const LINES = [
  'Привіт. Я Ліора — ваш AI-асистент у SYLORA.',
  'Я слухаю чат, дякую за подарунки і тримаю темп ефіру.',
  'Hello — I am Liora. I breathe, blink, and speak like a co-host beside you.',
];

export function AvatarLifeScreen() {
  const avatarRef = useRef<LivingAvatarHandle | null>(null);
  const [reaction, setReaction] = useState<AvatarReaction>('idle');
  const [lineIndex, setLineIndex] = useState(0);
  const [emotion, setEmotion] = useState('warm');

  const fire = (next: AvatarReaction) => {
    setReaction(next);
    avatarRef.current?.react(next);
    if (next === 'talk') {
      const text = LINES[lineIndex % LINES.length];
      setLineIndex((i) => i + 1);
      avatarRef.current?.speak({ text });
    }
  };

  return (
    <div className="sy-screen sy-avatar-life">
      <div className="sy-avatar-life__inner sy-screen__inner">
        <header className="sy-avatar-life__head">
          <p className="sy-overline sy-fg-accent">AI co-host</p>
          <h1 className="sy-display-2">Liora</h1>
          <p className="sy-body sy-fg-muted sy-avatar-life__lede">
            A living female avatar for the assistant — continuous breath, blinks,
            saccades, gestures and lip-sync keyed to the same reactions the Live
            Hub already emits.
          </p>
          <div className="sy-avatar-life__tags">
            <Badge tone="accent" variant="soft">
              she/her
            </Badge>
            <Badge tone="neutral" variant="soft">
              photoreal plates
            </Badge>
            <Badge tone="success" variant="soft" icon="sparkles">
              {emotion}
            </Badge>
          </div>
        </header>

        <div className="sy-avatar-life__stage-wrap">
          <LivingAvatar
            size="hero"
            reaction={reaction === 'talk' ? 'talk' : reaction}
            showNameplate
            avatarRef={avatarRef}
            onPose={(pose) => setEmotion(pose.emotion)}
          />
        </div>

        <Surface className="sy-avatar-life__controls" elevation="raised" radius="xl" padding="lg">
          <h2 className="sy-title-3">Human reactions</h2>
          <p className="sy-caption sy-fg-muted">
            Mapped 1:1 to co-host `avatar_reaction` values from the dialogue scheduler.
          </p>
          <div className="sy-avatar-life__chips">
            {REACTIONS.map((item) => (
              <Chip
                key={item.id}
                selected={reaction === item.id}
                onClick={() => fire(item.id)}
              >
                {item.label}
              </Chip>
            ))}
          </div>
          <ul className="sy-avatar-life__notes">
            {REACTIONS.filter((r) => r.id === reaction).map((r) => (
              <li key={r.id} className="sy-caption sy-fg-muted">
                {r.note}
              </li>
            ))}
          </ul>
          <div className="sy-avatar-life__actions">
            <Button
              variant="primary"
              onClick={() => fire('talk')}
            >
              Speak a line
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                avatarRef.current?.interrupt();
                fire('idle');
              }}
            >
              Return to idle life
            </Button>
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function AvatarLifeContextPanel() {
  return (
    <div className="sy-stack sy-gap-6">
      <section className="sy-stack sy-gap-3">
        <h3 className="sy-label">What makes her feel alive</h3>
        <p className="sy-caption sy-fg-muted">
          Irregular blinks, thoracic breath, saccadic gaze, gesture curves, and
          viseme lip-sync from speech text (Ukrainian + English).
        </p>
      </section>
      <section className="sy-stack sy-gap-3">
        <h3 className="sy-label">Live Hub contract</h3>
        <p className="sy-caption sy-fg-muted">
          Reactions match `avatar_reaction` from the dialogue scheduler and
          `LocalAvatarLifeController` on the API.
        </p>
      </section>
    </div>
  );
}
