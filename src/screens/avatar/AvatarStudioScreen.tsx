/**
 * Living Avatar studio
 * ---------------------------------------------------------------------------
 * The co-host is a woman who looks and moves like a person on camera: blinks,
 * breathes, glances, speaks. This screen is the presence surface for that life
 * — not a chat thread, not an orb. One composition: her face, one line she is
 * saying, and the reactions the live scheduler already knows how to emit.
 */

import { useMemo, useState } from 'react';

import {
  LivingAvatar,
  useAvatarDriver,
} from '../../design-system/avatar/LivingAvatar';
import type { AvatarReaction } from '@sylora/avatar-runtime';
import { Button } from '../../design-system/primitives';

const REACTIONS: Array<{ id: AvatarReaction; label: string; line?: string }> = [
  { id: 'idle', label: 'Present' },
  {
    id: 'listen',
    label: 'Listen',
    line: 'Чую тебе. Продовжуй — я з тобою.',
  },
  {
    id: 'think',
    label: 'Think',
    line: 'Секунду… зважую, що сказати далі.',
  },
  {
    id: 'talk',
    label: 'Speak',
    line: 'Привіт! Я Сілора — ваш живий AI co-host. Радію, що ви тут.',
  },
  {
    id: 'wave',
    label: 'Wave',
    line: 'Вітаю всіх у стрімі!',
  },
  {
    id: 'glance',
    label: 'Glance',
  },
  {
    id: 'gift_react',
    label: 'Gift',
    line: 'Дякую за подарунок — це тепло!',
  },
];

export function AvatarStudioScreen() {
  const { reaction, reactionNonce, utterance, state, setState, drive, setUtterance } =
    useAvatarDriver();
  const [draft, setDraft] = useState(
    'Привіт! Я Сілора — ваш живий AI co-host. Рухи, погляд і міміка синхронізовані з розмовою.',
  );

  const metrics = useMemo(() => {
    if (!state) return [];
    const p = state.pose;
    return [
      { label: 'Blink', value: p.blink.toFixed(2) },
      { label: 'Breath', value: p.breath.toFixed(2) },
      { label: 'Smile', value: p.smile.toFixed(2) },
      { label: 'Mouth', value: p.mouthOpen.toFixed(2) },
      { label: 'Gaze X', value: p.gazeX.toFixed(2) },
      { label: 'Head yaw', value: `${p.headYaw.toFixed(1)}°` },
    ];
  }, [state]);

  return (
    <div className="sy-screen sy-avatar-studio">
      <div className="sy-avatar-studio__inner sy-screen__inner">
        <section className="sy-avatar-studio__copy">
          <p className="sy-avatar-studio__brand">Sylora</p>
          <p className="sy-avatar-studio__lede">
            Живий жіночий аватар асистента: природне дихання, моргання, погляд,
            жести й міміка — як у людини в кадрі.
          </p>

          <div className="sy-avatar-studio__controls" style={{ marginTop: '1.5rem' }}>
            <div className="sy-avatar-studio__reactions" role="group" aria-label="Avatar reactions">
              {REACTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={reaction === item.id}
                  onClick={() => drive(item.id, item.line ?? draft)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="sy-caption" style={{ display: 'grid', gap: '0.4rem' }}>
              Репліка для артикуляції
              <textarea
                className="sy-avatar-studio__line"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                onClick={() => {
                  setUtterance(draft);
                  drive('talk', draft);
                }}
              >
                Speak line
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  drive('idle');
                  setUtterance(null);
                }}
              >
                Rest
              </Button>
            </div>

            <dl className="sy-avatar-studio__metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="sy-avatar-studio__metric">
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="sy-avatar-studio__presence">
          <LivingAvatar
            name="Sylora"
            size={520}
            reaction={reaction}
            reactionNonce={reactionNonce}
            utterance={utterance ?? draft}
            onState={setState}
          />
        </section>
      </div>
    </div>
  );
}

export function AvatarStudioContextPanel() {
  return (
    <div className="sy-stack" style={{ gap: '0.75rem' }}>
      <p className="sy-body">
        Physiology engine drives blink, breath, saccades, lip cadence and social
        gestures. Co-host reactions <code>talk</code>, <code>listen</code>,{' '}
        <code>wave</code>, <code>glance</code>, <code>gift_react</code> map 1:1.
      </p>
      <p className="sy-caption sy-fg-muted">
        Overlay URL for OBS: <code>/avatar-overlay.html</code>
      </p>
    </div>
  );
}
