/**
 * Living Avatar — Liora
 * ---------------------------------------------------------------------------
 * Dedicated surface to evaluate the photoreal assistant persona: idle life
 * signs, listening, speech, greetings and gift reactions. The same component
 * mounts in the AI Assistant thread chrome.
 */

import { useEffect, useState } from 'react';

import {
  LivingAvatar,
  type AvatarReaction,
  LIORA_PERSONA,
} from '../../design-system/avatar';
import { Badge, Button, Icon, Surface } from '../../design-system/primitives';

const REACTIONS: { id: AvatarReaction; label: string; hint: string }[] = [
  { id: 'idle', label: 'Idle', hint: 'Breathing, blinks, soft gaze' },
  { id: 'listen', label: 'Listen', hint: 'Attentive tilt, open face' },
  { id: 'thinking', label: 'Think', hint: 'Micro-frown, glance aside' },
  { id: 'talk', label: 'Talk', hint: 'Lip motion + speaking blend' },
  { id: 'smile', label: 'Smile', hint: 'Warm Duchenne smile' },
  { id: 'wave', label: 'Wave', hint: 'Greeting head gesture' },
  { id: 'gift_react', label: 'Gift', hint: 'Thanks nod for gifts' },
  { id: 'glance', label: 'Glance', hint: 'Noticing a chat event' },
];

export function LivingAvatarScreen() {
  const [reaction, setReaction] = useState<AvatarReaction>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [autoTalk, setAutoTalk] = useState(false);

  useEffect(() => {
    if (!autoTalk) {
      setAudioLevel(0);
      return;
    }
    setReaction('talk');
    let frame = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const syllable = Math.sin(t * 18) * 0.5 + 0.5;
      const jaw = Math.sin(t * 7.5 + 0.4) * 0.5 + 0.5;
      setAudioLevel(0.2 + syllable * 0.55 * jaw);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoTalk]);

  return (
    <div className="sy-screen sy-living-avatar-screen">
      <div className="sy-living-avatar-screen__inner sy-screen__inner">
        <header className="sy-living-avatar-screen__head">
          <div className="sy-grow">
            <p className="sy-eyebrow">AI presence</p>
            <h1 className="sy-title-2">{LIORA_PERSONA.name}</h1>
            <p className="sy-body sy-fg-muted sy-measure">
              {LIORA_PERSONA.tagline} Physiology keeps blinks, breath, gaze and
              micro-expression on a human clock — not a looped GIF.
            </p>
          </div>
          <Badge tone="accent" variant="soft" icon="sparkles">
            Living Avatar
          </Badge>
        </header>

        <div className="sy-living-avatar-screen__stage">
          <LivingAvatar
            reaction={reaction}
            audioLevel={autoTalk ? audioLevel : undefined}
            size="hero"
            showIdentity
          />
        </div>

        <Surface className="sy-living-avatar-screen__controls" elevation="raised" radius="xl" padding="md">
          <div className="sy-living-avatar-screen__controls-head">
            <h2 className="sy-label">Reactions</h2>
            <p className="sy-caption sy-fg-quiet">
              Same vocabulary as the co-host orchestrator: listen, talk, wave, gift_react, glance.
            </p>
          </div>
          <div className="sy-living-avatar-screen__reactions" role="group" aria-label="Avatar reactions">
            {REACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sy-living-avatar-screen__reaction${reaction === item.id ? ' is-active' : ''}`}
                aria-pressed={reaction === item.id}
                onClick={() => {
                  setAutoTalk(false);
                  setReaction(item.id);
                }}
              >
                <span className="sy-label">{item.label}</span>
                <span className="sy-caption sy-fg-quiet">{item.hint}</span>
              </button>
            ))}
          </div>
          <div className="sy-living-avatar-screen__actions">
            <Button
              variant={autoTalk ? 'primary' : 'secondary'}
              size="sm"
              icon={autoTalk ? 'stop' : 'volume'}
              onClick={() => setAutoTalk((value) => !value)}
            >
              {autoTalk ? 'Stop speech simulation' : 'Simulate speech lip-sync'}
            </Button>
            <p className="sy-caption sy-fg-quiet sy-living-avatar-screen__hint">
              <Icon name="brain" size={13} />
              Pass real TTS amplitude into <code>audioLevel</code> for production lip-sync.
            </p>
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function LivingAvatarContextPanel() {
  return (
    <div className="sy-stack sy-gap-5">
      <section className="sy-stack sy-gap-2">
        <h3 className="sy-label">Persona</h3>
        <p className="sy-body-sm sy-fg-muted">
          {LIORA_PERSONA.name} is the default SYLORA assistant presence — a woman framed in soft
          daylight, tuned to feel present rather than synthetic.
        </p>
      </section>
      <section className="sy-stack sy-gap-2">
        <h3 className="sy-label">Human signals</h3>
        <ul className="sy-living-avatar-screen__facts">
          <li>~{LIORA_PERSONA.physiology.blinksPerMinute} blinks / min with natural jitter</li>
          <li>~{LIORA_PERSONA.physiology.breathsPerMinute} breaths / min shoulder scale</li>
          <li>Saccadic gaze every 0.9–2.8s</li>
          <li>Expression cross-fade + gesture pulses for co-host events</li>
        </ul>
      </section>
      <section className="sy-stack sy-gap-2">
        <h3 className="sy-label">Integration</h3>
        <p className="sy-caption sy-fg-quiet">
          Map <code>AvatarController.react</code> payloads to the <code>reaction</code> prop. When
          TTS audio is available, feed normalised amplitude into <code>audioLevel</code>.
        </p>
      </section>
    </div>
  );
}
