/**
 * Video player
 * ---------------------------------------------------------------------------
 * A player is the one screen where the interface is a guest. The picture is the
 * product; every control is borrowed pixels that must be handed back.
 *
 * CHROME BUDGET
 * Top strip ≤ 12% of the frame, bottom strip ≤ 24%, and the centre transport
 * only occupies a horizontal band through the middle. Together they leave the
 * full central 64% — where faces, subtitles and burned-in graphics live —
 * permanently unobstructed, which is the same rule the live viewer follows so
 * the two surfaces feel like one player family.
 *
 * WHY THE TRANSPORT IS CENTRED AND THE SCRUBBER IS NOT
 * Play/pause and ±10s are aimed at, so they sit dead centre where a thumb or a
 * cursor lands without looking. Scrubbing is a tracked gesture, so it wants the
 * widest possible travel and sits on the bottom edge where the finger can rest
 * against the frame.
 *
 * WHY THREE COLOURS IN THE TRACK
 * Elapsed, buffered and unloaded are three different facts. Buffered is the one
 * that predicts whether a seek will stall, so it gets its own value rather than
 * being folded into the background.
 */

import { Badge, Button, Icon, IconButton } from '../../design-system/primitives';
import { CREATORS } from '../data';
import { Media } from '../components';

const creator = CREATORS[0];

/** 2:41:08 total, paused at 1:12:44, buffered to 1:33:20. */
const PLAYED = 45.1;
const BUFFERED = 57.9;

const CHAPTERS = [
  { at: 0, label: 'Cold open' },
  { at: 8.9, label: 'Why OKLCH' },
  { at: 25.5, label: 'Building the ramp generator' },
  { at: 45.1, label: 'Gamut mapping in practice' },
  { at: 73.5, label: 'Contrast proofs' },
  { at: 86.4, label: 'Questions' },
];

const QUALITIES = [
  { value: '2160p', detail: '4K · 28 Mbps' },
  { value: '1080p60', detail: 'Recommended · 8 Mbps' },
  { value: '720p', detail: 'Data saver · 3 Mbps' },
  { value: 'Auto', detail: 'Follows connection' },
];

export function PlayerScreen() {
  return (
    <div className="sy-screen sy-player">
      <div className="sy-player__stage">
        <Media seed="token-pipeline-vod" ratio="auto" radius="none" className="sy-player__video">
          <span className="sy-sr-only">
            Rebuilding the token pipeline, chapter four: gamut mapping in practice
          </span>
        </Media>

        {/* Top chrome: who and what, plus the two output destinations. */}
        <header className="sy-player__top">
          <div className="sy-player__topbar sy-glass">
            <IconButton icon="chevronLeft" label="Back to library" variant="ghost" size="sm" />
            <div className="sy-player__heading">
              <h1 className="sy-player__title sy-truncate">
                Rebuilding the token pipeline — OKLCH, gamut mapping and contrast proofs
              </h1>
              <p className="sy-caption sy-player__byline sy-truncate">
                {creator.name} · Chapter 4 of 6 · Gamut mapping in practice
              </p>
            </div>
            <div className="sy-player__top-actions">
              <IconButton icon="screenShare" label="Cast to a device" variant="ghost" size="sm" />
              <IconButton icon="video" label="Picture in picture" variant="ghost" size="sm" />
              <IconButton icon="more" label="More player options" variant="ghost" size="sm" />
            </div>
          </div>
        </header>

        {/* Centre transport. Skip buttons flank play so the hand never re-aims. */}
        <div className="sy-player__transport">
          <button type="button" className="sy-player__skip" aria-label="Skip back 10 seconds">
            <Icon name="refresh" size={34} className="sy-player__skip-ring is-back" />
            <span className="sy-player__skip-value sy-mono">10</span>
          </button>
          <button type="button" className="sy-player__play" aria-label="Pause">
            <Icon name="pause" size={30} />
          </button>
          <button type="button" className="sy-player__skip" aria-label="Skip forward 10 seconds">
            <Icon name="refresh" size={34} className="sy-player__skip-ring" />
            <span className="sy-player__skip-value sy-mono">10</span>
          </button>
        </div>

        {/* Bottom chrome: seek first, then transport, so the eye reads time → action. */}
        <footer className="sy-player__bottom">
          <div className="sy-player__panel sy-glass">
            <div
              className="sy-scrub"
              role="slider"
              tabIndex={0}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={9668}
              aria-valuenow={4364}
              aria-valuetext="1 hour 12 minutes 44 seconds of 2 hours 41 minutes 8 seconds"
              style={{ ['--played' as string]: `${PLAYED}%`, ['--buffered' as string]: `${BUFFERED}%` }}
            >
              <span className="sy-scrub__track" aria-hidden="true" />
              <span className="sy-scrub__buffered" aria-hidden="true" />
              <span className="sy-scrub__played" aria-hidden="true" />
              {CHAPTERS.map((chapter) => (
                <span
                  key={chapter.label}
                  className="sy-scrub__tick"
                  style={{ ['--at' as string]: `${chapter.at}%` }}
                  aria-hidden="true"
                />
              ))}
              <span className="sy-scrub__head" aria-hidden="true">
                <span className="sy-scrub__tip sy-mono">1:12:44</span>
              </span>
            </div>
            <div className="sy-player__times">
              <span className="sy-mono">1:12:44</span>
              <span className="sy-caption sy-player__chapter sy-truncate">
                Chapter 4 · Gamut mapping in practice
              </span>
              <span className="sy-mono">−1:28:24</span>
            </div>

            <div className="sy-player__controls">
              <IconButton icon="pause" label="Pause" variant="ghost" size="sm" />
              <div className="sy-player__volume">
                <IconButton icon="volume" label="Mute" variant="ghost" size="sm" />
                <span
                  className="sy-player__volume-track"
                  role="slider"
                  tabIndex={0}
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={72}
                  style={{ ['--level' as string]: '72%' }}
                >
                  <span className="sy-player__volume-fill" aria-hidden="true" />
                </span>
              </div>
              <span className="sy-grow" />
              <span className="sy-player__badges">
                <Badge tone="neutral" variant="outline">
                  1.25×
                </Badge>
                <Badge tone="accent" variant="soft" icon="captions">
                  EN
                </Badge>
              </span>
              <IconButton icon="captions" label="Captions on" variant="ghost" size="sm" />
              <IconButton
                icon="settings"
                label="Playback settings"
                variant="ghost"
                size="sm"
                aria-expanded="true"
              />
              <IconButton icon="fullscreen" label="Enter fullscreen" variant="ghost" size="sm" />
            </div>
          </div>
        </footer>

        {/*
          The settings menu is shown open because a menu that only exists on
          hover is a menu nobody designed. It anchors to the gear rather than
          centring, so the control that opened it stays visible underneath.
        */}
        <div className="sy-player__menu sy-glass sy-glass--dome" role="menu" aria-label="Playback settings">
          <section className="sy-player__menu-group">
            <h2 className="sy-overline sy-fg-quiet">Quality</h2>
            {QUALITIES.map((quality) => {
              const active = quality.value === '1080p60';
              return (
                <button
                  key={quality.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={`sy-player__menu-item${active ? ' is-active' : ''}`}
                >
                  <span className="sy-player__menu-check" aria-hidden="true">
                    {active && <Icon name="check" size={14} />}
                  </span>
                  <span className="sy-grow">
                    <span className="sy-label">{quality.value}</span>
                    <span className="sy-caption sy-fg-quiet">{quality.detail}</span>
                  </span>
                </button>
              );
            })}
          </section>

          <div className="sy-divider" />

          <section className="sy-player__menu-group">
            <h2 className="sy-overline sy-fg-quiet">Speed</h2>
            <div className="sy-player__speed" role="radiogroup" aria-label="Playback speed">
              {['0.75', '1', '1.25', '1.5', '2'].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  role="radio"
                  aria-checked={speed === '1.25'}
                  className={`sy-player__speed-chip${speed === '1.25' ? ' is-active' : ''}`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </section>

          <div className="sy-divider" />

          <section className="sy-player__menu-group">
            <h2 className="sy-overline sy-fg-quiet">Captions</h2>
            <button type="button" role="menuitemradio" aria-checked className="sy-player__menu-item is-active">
              <span className="sy-player__menu-check" aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
              <span className="sy-grow">
                <span className="sy-label">English</span>
                <span className="sy-caption sy-fg-quiet">Auto-generated, corrected by {creator.name}</span>
              </span>
            </button>
            <button type="button" role="menuitemradio" aria-checked={false} className="sy-player__menu-item">
              <span className="sy-player__menu-check" aria-hidden="true" />
              <span className="sy-grow">
                <span className="sy-label">Svenska</span>
                <span className="sy-caption sy-fg-quiet">Machine translated</span>
              </span>
            </button>
            <Button variant="ghost" size="xs" icon="sliders" className="sy-player__menu-foot">
              Caption appearance
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
