/**
 * Live studio
 * ---------------------------------------------------------------------------
 * The broadcaster's control room. Unlike every other screen in SYLORA this one
 * is not trying to be calm: a person using it is live to fourteen thousand
 * people and needs every number on the glass at once. Density is the feature.
 *
 * THE THREE COLUMNS ARE THREE TIME HORIZONS
 *   left    what is *about* to happen — scenes and sources you stage next
 *   centre  what is happening *now* — programme, preview, transitions, output
 *   right   what just happened — chat and the activity that reacts to it
 * Reading left to right is reading forward in time, which is why the transition
 * controls sit between preview and programme rather than in a menu: they are
 * literally the moment one becomes the other.
 *
 * PROGRAMME VERSUS PREVIEW
 * Programme carries a red rim and the LIVE badge; preview carries a neutral
 * rim and the word "Preview". Confusing the two is the single most expensive
 * mistake available on this screen, so the distinction is stated with a border,
 * a badge and a caption rather than by position alone.
 *
 * HEALTH IS ALWAYS A DOT AND A NUMBER
 * A green dot tells you nothing when the question is "is 4.1% dropped frames
 * bad". Every meter therefore prints its value in mono, its unit, and a word
 * for the state — the dot is only the thing that catches the eye.
 *
 * COMPACT
 * Below a laptop-class column the room collapses to one column with the monitor
 * pinned first and a tab pair swapping Scenes / Chat / Audio underneath. That
 * is a deliberate demotion, not a responsive accident: on a phone a broadcaster
 * is monitoring a stream they started elsewhere, so seeing the output and
 * killing it are the only two things that must stay one tap away. Every region
 * stays mounted so focus order and landmarks never change with width.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  LiveBadge,
  Slider,
  Tabs,
} from '../../design-system/primitives';
import { LIVE_CHAT, STREAMS } from '../data';
import { Media } from '../components';
import { LiveProbePanel } from '../lib/LiveProbePanel';

const stream = STREAMS[0];

const SCENES = [
  { id: 'sc1', name: 'Starting soon', hotkey: 'F1', sources: 3 },
  { id: 'sc2', name: 'Main cam', hotkey: 'F2', sources: 5, live: true },
  { id: 'sc3', name: 'Screen share', hotkey: 'F3', sources: 6, preview: true },
  { id: 'sc4', name: 'Interview', hotkey: 'F4', sources: 7 },
  { id: 'sc5', name: 'Ending', hotkey: 'F5', sources: 2 },
];

const SOURCES = [
  { id: 'so1', name: 'Camera — Sony FX3', icon: 'camera' as const, detail: '1080p60 · HDMI 1', visible: true, locked: false },
  { id: 'so2', name: 'Display 1', icon: 'screenShare' as const, detail: '2560×1440 · captured at 60fps', visible: true, locked: true },
  { id: 'so3', name: 'Microphone — SM7B', icon: 'mic' as const, detail: 'Gate −38 dB · comp 3:1', visible: true, locked: false },
  { id: 'so4', name: 'Overlay — Token Pipeline', icon: 'layers' as const, detail: 'Browser source · 1920×1080', visible: true, locked: false },
  { id: 'so5', name: 'Music bed', icon: 'volume' as const, detail: 'Jämtland — licensed', visible: false, locked: false },
];

const HEALTH = [
  { label: 'Bitrate', value: '6,842', unit: 'kbps', state: 'good', word: 'Stable' },
  { label: 'Dropped', value: '0.04', unit: '%', state: 'good', word: 'Nominal' },
  { label: 'CPU', value: '71', unit: '%', state: 'warn', word: 'High' },
  { label: 'Latency', value: '1.82', unit: 's', state: 'good', word: 'Low' },
];

const ACTIVITY = [
  { id: 'ac1', kind: 'gift' as const, actor: 'marcus_ade', body: 'sent Aurora Burst', value: '500', time: '12s' },
  { id: 'ac2', kind: 'sub' as const, actor: 'Priya Raghunathan', body: 'subscribed at Tier 2', value: '6 months', time: '48s' },
  { id: 'ac3', kind: 'follow' as const, actor: 'lin.wei', body: 'followed', value: '', time: '1m' },
  { id: 'ac4', kind: 'gift' as const, actor: 'nadia_h', body: 'sent Prism Wave', value: '1,200', time: '2m' },
  { id: 'ac5', kind: 'sub' as const, actor: 'kwame.b', body: 'gifted 5 subscriptions', value: 'Tier 1', time: '4m' },
  { id: 'ac6', kind: 'follow' as const, actor: 'ellis.j', body: 'followed', value: '', time: '5m' },
];

const ACTIVITY_ICON = { gift: 'gift', sub: 'premium', follow: 'follow' } as const;

export function LiveStudioScreen() {
  const [panel, setPanel] = useState('scenes');
  const [transition, setTransition] = useState('aurora');
  const [levels, setLevels] = useState({ mic: 78, desktop: 44, guest: 62 });

  return (
    <div className="sy-screen sy-studio-screen">
      <div className="sy-studio" data-panel={panel}>
        {/* Compact-only region switch. Hidden the moment all three columns fit. */}
        <div className="sy-studio__switch">
          <Tabs
            variant="segmented"
            tabs={[
              { id: 'scenes', label: 'Scenes', icon: 'layers' },
              { id: 'chat', label: 'Chat', icon: 'chat', badge: 12 },
              { id: 'audio', label: 'Audio', icon: 'sliders' },
            ]}
            active={panel}
            onChange={setPanel}
          />
        </div>

        {/* ---- Left: what happens next ---- */}
        <aside className="sy-studio__scenes" aria-label="Scenes and sources">
          <section className="sy-studio__block">
            <header className="sy-studio__block-head">
              <h2 className="sy-overline sy-fg-quiet">Scenes</h2>
              <IconButton icon="plus" label="Add a scene" variant="ghost" size="xs" />
            </header>
            <ul className="sy-scene-list">
              {SCENES.map((scene) => (
                <li key={scene.id}>
                  <button
                    type="button"
                    className={`sy-scene${scene.live ? ' is-live' : ''}${scene.preview ? ' is-preview' : ''}`}
                    aria-current={scene.live ? 'true' : undefined}
                  >
                    <Media seed={`${scene.id}-scene`} ratio="16/9" radius="md" className="sy-scene__thumb" />
                    <span className="sy-scene__text">
                      <span className="sy-label sy-truncate">{scene.name}</span>
                      <span className="sy-caption sy-fg-quiet">{scene.sources} sources</span>
                    </span>
                    {scene.live && (
                      <span className="sy-scene__flag is-live">
                        <span className="sy-scene__flag-dot" aria-hidden="true" />
                        LIVE
                      </span>
                    )}
                    {scene.preview && <span className="sy-scene__flag is-preview">PVW</span>}
                    <span className="sy-scene__key sy-mono">{scene.hotkey}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="sy-studio__block">
            <header className="sy-studio__block-head">
              <h2 className="sy-overline sy-fg-quiet">Sources — Main cam</h2>
              <IconButton icon="plus" label="Add a source" variant="ghost" size="xs" />
            </header>
            <ul className="sy-source-list">
              {SOURCES.map((source) => (
                <li key={source.id} className={`sy-source${source.visible ? '' : ' is-hidden'}`}>
                  <span className="sy-source__icon" aria-hidden="true">
                    <Icon name={source.icon} size={15} />
                  </span>
                  <span className="sy-source__text">
                    <span className="sy-label sy-truncate">{source.name}</span>
                    <span className="sy-caption sy-fg-quiet sy-truncate">{source.detail}</span>
                  </span>
                  <IconButton
                    icon={source.visible ? 'eye' : 'close'}
                    label={source.visible ? `Hide ${source.name}` : `Show ${source.name}`}
                    variant="ghost"
                    size="xs"
                    aria-pressed={source.visible}
                  />
                  <IconButton
                    icon={source.locked ? 'lock' : 'key'}
                    label={source.locked ? `Unlock ${source.name}` : `Lock ${source.name}`}
                    variant="ghost"
                    size="xs"
                    aria-pressed={source.locked}
                    className={source.locked ? 'is-locked' : undefined}
                  />
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* ---- Centre: what is happening now ---- */}
        <main className="sy-studio__stage" aria-label="Programme output">
          <div className="sy-studio__monitors">
            <figure className="sy-monitor is-programme">
              {/*
                Only the bezel and what is inside it are dark. The picture is
                the light source; the caption underneath belongs to the tool and
                stays in the room's theme.
              */}
              <div className="sy-monitor__screen" data-theme="dark">
                <Media seed="studio-programme" ratio="16/9" radius="md" className="sy-monitor__feed">
                  <span className="sy-monitor__badge">
                    <LiveBadge viewers={stream.viewers} />
                  </span>
                  <span className="sy-monitor__clock sy-mono">{stream.duration}</span>
                  <span className="sy-monitor__safe" aria-hidden="true" />
                </Media>
              </div>
              <figcaption className="sy-monitor__caption">
                <span className="sy-label">Programme</span>
                <span className="sy-caption sy-fg-quiet sy-truncate">Main cam · 1920×1080 · 60 fps</span>
              </figcaption>
            </figure>

            <div className="sy-studio__aside">
              <figure className="sy-monitor is-preview">
                <div className="sy-monitor__screen" data-theme="dark">
                  <Media seed="studio-preview" ratio="16/9" radius="md" className="sy-monitor__feed">
                    <span className="sy-monitor__tag">Preview</span>
                  </Media>
                </div>
                <figcaption className="sy-monitor__caption">
                  <span className="sy-label">Preview</span>
                  <span className="sy-caption sy-fg-quiet sy-truncate">Screen share · staged, not on air</span>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* Transitions sit directly under both monitors — they are the verb
              that turns the right-hand picture into the left-hand one. */}
          <div className="sy-transition">
            <span className="sy-overline sy-fg-quiet sy-transition__title">Transition</span>
            <div className="sy-transition__row" role="radiogroup" aria-label="Transition style">
              {[
                { id: 'cut', label: 'Cut' },
                { id: 'fade', label: 'Fade' },
                { id: 'aurora', label: 'Aurora' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={transition === option.id}
                  className={`sy-transition__chip${transition === option.id ? ' is-active' : ''}`}
                  onClick={() => setTransition(option.id)}
                >
                  {transition === option.id && <Icon name="check" size={13} />}
                  {option.label}
                </button>
              ))}
            </div>
            <div className="sy-transition__duration">
              <label className="sy-caption sy-fg-muted" htmlFor="studio-transition-duration">
                Duration
              </label>
              <div className="sy-input sy-input--sm">
                <input
                  id="studio-transition-duration"
                  type="text"
                  inputMode="numeric"
                  defaultValue="320"
                  className="sy-mono"
                />
                <span className="sy-input__trailing sy-caption">ms</span>
              </div>
            </div>
            <Button variant="primary" size="sm" icon="repost" className="sy-transition__take">
              Take to programme
            </Button>
          </div>

          {/* Health. Dot, number, unit and a word — never one of the four alone. */}
          <div className="sy-health" role="group" aria-label="Stream health">
            {HEALTH.map((metric) => (
              <div key={metric.label} className={`sy-health__cell is-${metric.state}`}>
                <span className="sy-health__dot" aria-hidden="true" />
                <span className="sy-health__text">
                  <span className="sy-caption sy-fg-quiet">{metric.label}</span>
                  <span className="sy-health__value sy-mono">
                    {metric.value}
                    <span className="sy-health__unit">{metric.unit}</span>
                  </span>
                </span>
                <Badge tone={metric.state === 'warn' ? 'warning' : 'success'} variant="soft">
                  {metric.word}
                </Badge>
              </div>
            ))}
            <div className="sy-health__cell is-good sy-health__cell--wide">
              <span className="sy-health__dot" aria-hidden="true" />
              <span className="sy-health__text">
                <span className="sy-caption sy-fg-quiet">Ingest</span>
                <span className="sy-health__value sy-mono">
                  fra-03<span className="sy-health__unit">· RTMP</span>
                </span>
              </span>
              <Badge tone="success" variant="soft">
                Connected
              </Badge>
            </div>
          </div>

          <div className="sy-studio__toolbar">
            {/*
              Ending a broadcast is destructive and irreversible for the people
              watching, so it is the only danger-toned control in the room and
              it is separated from the device toggles by the uptime readout.
            */}
            <Button variant="primary" tone="danger" size="lg" icon="stop">
              End broadcast
            </Button>
            <span className="sy-studio__uptime">
              <span className="sy-caption sy-fg-quiet">On air</span>
              <span className="sy-mono">{stream.duration}</span>
            </span>
            <span className="sy-grow" />
            <div className="sy-studio__devices" role="group" aria-label="Capture devices">
              <IconButton icon="mic" label="Mute microphone" variant="secondary" size="md" aria-pressed="false" />
              <IconButton icon="camera" label="Stop camera" variant="secondary" size="md" aria-pressed="false" />
              <IconButton
                icon="screenShare"
                label="Stop sharing screen"
                variant="secondary"
                size="md"
                aria-pressed="true"
                className="is-on"
              />
              <button type="button" className="sy-studio__record" aria-pressed="true">
                <span className="sy-studio__record-dot" aria-hidden="true" />
                <span className="sy-mono">REC 41:08</span>
              </button>
              <IconButton icon="settings" label="Broadcast settings" variant="secondary" size="md" />
            </div>
          </div>

          {/* ---- Audio mixer ---- */}
          <section className="sy-mixer" aria-label="Audio mixer">
            <header className="sy-studio__block-head">
              <h2 className="sy-overline sy-fg-quiet">Audio mixer</h2>
              <span className="sy-caption sy-fg-quiet sy-mono">−6.0 dB master</span>
            </header>

            <div className="sy-mixer__channels">
              {[
                { id: 'mic' as const, name: 'Microphone', detail: 'SM7B · gate on', peak: 82, db: '−7.4 dB' },
                { id: 'desktop' as const, name: 'Music bed', detail: 'Jämtland · licensed', peak: 38, db: '−21.2 dB' },
                { id: 'guest' as const, name: 'Guest — Priya', detail: 'SYLORA link · 42 ms', peak: 64, db: '−12.8 dB' },
              ].map((channel) => (
                <div key={channel.id} className="sy-mixer__channel">
                  <div className="sy-mixer__label">
                    <span className="sy-label sy-truncate">{channel.name}</span>
                    <span className="sy-caption sy-fg-quiet sy-truncate">{channel.detail}</span>
                  </div>

                  {/* Level meter. Segmented in CSS so the hot zone is a shape,
                      not just a hue, and readable in a monochrome screenshot. */}
                  <div
                    className="sy-meter"
                    role="meter"
                    aria-label={`${channel.name} level`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={channel.peak}
                    aria-valuetext={channel.db}
                    style={{ ['--level' as string]: `${channel.peak}%` }}
                  >
                    <span className="sy-meter__fill" aria-hidden="true" />
                    <span className="sy-meter__peak" aria-hidden="true" />
                  </div>

                  <div className="sy-mixer__controls">
                    <Slider
                      label={`${channel.name} fader`}
                      value={levels[channel.id]}
                      onChange={(value) => setLevels((current) => ({ ...current, [channel.id]: value }))}
                    />
                    <span className="sy-mixer__db sy-mono">{channel.db}</span>
                    <IconButton icon="volumeOff" label={`Mute ${channel.name}`} variant="ghost" size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ---- Right: what just happened ---- */}
        <aside className="sy-studio__side" aria-label="Chat and activity">
          <section className="sy-studio__chat">
            <header className="sy-studio__block-head">
              <h2 className="sy-overline sy-fg-quiet">Live chat</h2>
              <div className="sy-row sy-gap-1">
                <Badge tone="live" variant="soft">
                  {stream.viewers}
                </Badge>
                <IconButton icon="moderation" label="Moderation tools" variant="ghost" size="xs" />
              </div>
            </header>

            <div className="sy-studio__chat-stream">
              {LIVE_CHAT.map((message) => (
                <div key={message.id} className={`sy-chat-line is-${message.tone ?? 'normal'}`}>
                  {message.tone === 'gift' ? (
                    <div className="sy-chat-gift">
                      <span className="sy-chat-gift__icon" aria-hidden="true">
                        ✦
                      </span>
                      <span className="sy-caption">
                        <strong>{message.author}</strong> sent{' '}
                        <strong className="sy-fg-creator">{message.gift?.name}</strong>
                        <span className="sy-fg-quiet"> · {message.gift?.value}</span>
                      </span>
                    </div>
                  ) : message.tone === 'system' ? (
                    <p className="sy-caption sy-chat-system">
                      <Icon name="sparkles" size={12} />
                      {message.body}
                    </p>
                  ) : (
                    <p className="sy-body-sm sy-studio__chat-line">
                      <span
                        className={`sy-chat-line__author${
                          message.tone === 'moderator'
                            ? ' is-moderator'
                            : message.tone === 'subscriber'
                              ? ' is-subscriber'
                              : ''
                        }`}
                      >
                        {message.tone === 'moderator' && <Icon name="moderation" size={11} />}
                        {message.tone === 'subscriber' && <Icon name="premium" size={11} />}
                        {message.author}
                      </span>
                      <span className="sy-chat-line__body">{message.body}</span>
                      {/* Moderation is inline: a message a broadcaster wants gone
                          is gone in one press, without leaving the stream. */}
                      <span className="sy-studio__chat-tools">
                        <IconButton icon="pin" label={`Pin message from ${message.author}`} variant="ghost" size="xs" />
                        <IconButton icon="trash" label={`Delete message from ${message.author}`} variant="ghost" size="xs" />
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <footer className="sy-studio__chat-composer">
              <div className="sy-input sy-input--sm sy-grow">
                <input placeholder="Reply as Amara" aria-label="Reply in live chat" />
              </div>
              <IconButton icon="send" label="Send reply" variant="primary" size="sm" />
            </footer>
          </section>

          <section className="sy-studio__activity">
            <header className="sy-studio__block-head">
              <h2 className="sy-overline sy-fg-quiet">Activity</h2>
              <span className="sy-caption sy-fg-quiet sy-mono">€1,284 today</span>
            </header>
            <ul className="sy-activity-list">
              {ACTIVITY.map((item) => (
                <li key={item.id} className={`sy-activity is-${item.kind}`}>
                  <span className="sy-activity__icon" aria-hidden="true">
                    <Icon name={ACTIVITY_ICON[item.kind]} size={14} />
                  </span>
                  <span className="sy-activity__text">
                    <span className="sy-caption">
                      <strong>{item.actor}</strong> {item.body}
                    </span>
                    {item.value && <span className="sy-caption sy-fg-quiet sy-mono">{item.value}</span>}
                  </span>
                  <span className="sy-caption sy-fg-quiet">{item.time}</span>
                </li>
              ))}
            </ul>
            {/* Assistant-authored, so it is introduced by the spectral rule
                rather than by the plain hairline every other footer uses. */}
            <hr className="sy-refract-rule sy-studio__thanks-rule" />
            <div className="sy-studio__thanks">
              <Avatar name="marcus_ade" size={26} />
              <span className="sy-caption sy-fg-muted sy-grow">Thank the last gifter on stream?</span>
              <Button variant="outline" size="xs" icon="sparkles">
                Say thanks
              </Button>
            </div>
          </section>
        </aside>
      </div>

      <div className="sy-screen__inner" style={{ paddingTop: 0 }}>
        <LiveProbePanel kind="live" />
      </div>
    </div>
  );
}
