/**
 * Settings
 * ---------------------------------------------------------------------------
 * Ten categories is too many for a phone drill-down and too few to justify
 * search, so the layout changes shape rather than changing information.
 *
 * COMPACT DECISION
 * The list stays and the detail stacks *below* it, with the active row marked
 * and the panel labelled by that row. The alternative — pushing a full-screen
 * detail view — is the platform convention, but it needs a back stack the
 * design gallery does not have, and more importantly it hides the fact that
 * nine other categories exist. Stacking keeps the map and the territory on the
 * same screen; the cost is one extra scroll, which is cheaper than a person
 * never discovering Accessibility.
 *
 * Appearance is the section shown fully because it is the one where a control
 * has to *look like* what it does. The theme tiles are real interface rendered
 * at small scale with the target theme's own tokens re-scoped onto them — not
 * screenshots, so they can never drift from the product, and they stay correct
 * when the accent family changes.
 *
 * Ad personalisation defaults to off, and every switch states its consequence
 * in the description rather than in a help article.
 */

import { useState } from 'react';

import {
  Badge,
  Button,
  Icon,
  Select,
  Slider,
  Surface,
  Switch,
  type IconName,
} from '../../design-system/primitives';
import { ListRow, ScreenSection } from '../components';

interface SettingsSection {
  id: string;
  label: string;
  icon: IconName;
  summary: string;
  /** Rows shown for every section other than Appearance, which is bespoke. */
  rows: { title: string; subtitle: string; trailing: string }[];
}

const SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    label: 'Account',
    icon: 'profile',
    summary: 'Your identity on SYLORA, and how people find you.',
    rows: [
      { title: 'Display name', subtitle: 'Shown on your profile, posts and streams', trailing: 'Jordan Reyes' },
      { title: 'Handle', subtitle: 'Changing it breaks existing links for 30 days', trailing: '@jordanreyes' },
      { title: 'Email', subtitle: 'Verified 12 January', trailing: 'j.reyes@sylora.app' },
      { title: 'Language', subtitle: 'Interface and captions default', trailing: 'English (UK)' },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: 'lock',
    summary: 'Who can see what you publish, and who can reach you.',
    rows: [
      { title: 'Account visibility', subtitle: 'Anyone can see your posts and follow you', trailing: 'Public' },
      { title: 'Who can message you', subtitle: 'Everyone else needs a request', trailing: 'People you follow' },
      { title: 'Activity status', subtitle: 'Shows a green dot while you are online', trailing: 'Followers only' },
      { title: 'Blocked accounts', subtitle: 'They cannot see or contact you', trailing: '14 accounts' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    summary: 'What interrupts you, and on which device.',
    rows: [
      { title: 'Live alerts', subtitle: 'Push when a followed creator goes on air', trailing: '9 creators' },
      { title: 'Gifts and subscriptions', subtitle: 'Grouped into one alert every 5 minutes', trailing: 'Grouped' },
      { title: 'Mentions', subtitle: 'Push, email and in-app', trailing: 'All' },
      { title: 'Quiet hours', subtitle: 'Nothing except payouts and security', trailing: '23:00 – 08:00' },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'sun',
    summary: 'Theme, accent colour, text size and motion.',
    rows: [],
  },
  {
    id: 'playback',
    label: 'Playback',
    icon: 'play',
    summary: 'Video quality, autoplay and data use.',
    rows: [
      { title: 'Default quality on Wi-Fi', subtitle: 'Drops automatically if the buffer runs short', trailing: '1080p60' },
      { title: 'Default quality on mobile data', subtitle: 'Roughly 0.9 GB per hour', trailing: '720p' },
      { title: 'Autoplay next video', subtitle: 'Only in the video feed, never in a space', trailing: 'On' },
      { title: 'Captions', subtitle: 'Generated captions shown when none are authored', trailing: 'Always on' },
    ],
  },
  {
    id: 'creator',
    label: 'Creator',
    icon: 'studio',
    summary: 'Broadcast defaults, moderation and your subscription tiers.',
    rows: [
      { title: 'Stream key', subtitle: 'Rotated 3 days ago', trailing: 'Hidden' },
      { title: 'Chat moderation', subtitle: 'Slow mode, link filter and 4 moderators', trailing: 'Strict' },
      { title: 'Subscription tiers', subtitle: 'Signal, Studio and Atelier', trailing: '3 active' },
      { title: 'Clips', subtitle: 'Anyone can clip up to 60 seconds', trailing: 'Enabled' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'wallet',
    summary: 'Payouts, tax details and the cards you pay with.',
    rows: [
      { title: 'Payout account', subtitle: 'SEPA transfer, 2 working days', trailing: '···· 4417' },
      { title: 'Payout schedule', subtitle: 'Next on 5 February', trailing: 'Monthly' },
      { title: 'Tax residency', subtitle: 'Used for VAT on marketplace sales', trailing: 'Portugal' },
      { title: 'Saved cards', subtitle: 'Used for subscriptions and gifts', trailing: '2 cards' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'admin',
    summary: 'Sign-in, devices and recovery.',
    rows: [
      { title: 'Two-factor authentication', subtitle: 'Authenticator app, added 14 January', trailing: 'On' },
      { title: 'Passkeys', subtitle: 'MacBook Pro and iPhone 15 Pro', trailing: '2 keys' },
      { title: 'Active sessions', subtitle: 'Lisbon, Berlin and one unrecognised in Warsaw', trailing: '3 devices' },
      { title: 'Recovery codes', subtitle: 'Generated 14 January, 8 unused', trailing: '8 left' },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: 'eye',
    summary: 'Motion, contrast, captions and screen reader behaviour.',
    rows: [
      { title: 'Always show captions', subtitle: 'Applies to live chat read-aloud too', trailing: 'On' },
      { title: 'Caption size', subtitle: 'Independent of interface text size', trailing: 'Large' },
      { title: 'Announce live chat', subtitle: 'Screen reader reads new messages every 10s', trailing: 'Summarised' },
      { title: 'Flashing content', subtitle: 'Dims streams that exceed three flashes a second', trailing: 'Dimmed' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    icon: 'download',
    summary: 'What SYLORA keeps, and how to take it with you.',
    rows: [
      { title: 'Storage used', subtitle: 'Drafts, clips and uploaded assets', trailing: '18.4 GB' },
      { title: 'Watch history', subtitle: 'Used for Discover ranking', trailing: 'Kept 18 months' },
      { title: 'Search history', subtitle: 'Cleared on this device only', trailing: 'Kept 3 months' },
      { title: 'Delete account', subtitle: '30-day grace period, then irreversible', trailing: 'Available' },
    ],
  },
];

const ACCENTS = [
  { id: 'iris', label: 'Iris', note: 'Default' },
  { id: 'flux', label: 'Flux', note: 'Realtime' },
  { id: 'nova', label: 'Nova', note: 'Expressive' },
  { id: 'verdant', label: 'Verdant', note: 'Calm' },
  { id: 'solar', label: 'Solar', note: 'Warm' },
  { id: 'crimson', label: 'Crimson', note: 'High energy' },
];

const THEMES = [
  { id: 'dark', label: 'Dark', description: 'Built first. Lowest glare after sunset.' },
  { id: 'light', label: 'Light', description: 'Same tokens, remapped. Best in daylight.' },
  { id: 'system', label: 'System', description: 'Follows your device, switches at sunset.' },
];

const TEXT_SIZE_LABELS: Record<number, string> = {
  0: '85% — Compact',
  1: '92% — Small',
  2: '100% — Default',
  3: '112% — Large',
  4: '125% — Larger',
  5: '140% — Largest',
};

export function SettingsScreen() {
  const [active, setActive] = useState('appearance');
  const [theme, setTheme] = useState('dark');
  const [accent, setAccent] = useState('iris');
  const [textSize, setTextSize] = useState(2);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [increaseContrast, setIncreaseContrast] = useState(false);
  const [adPersonalisation, setAdPersonalisation] = useState(false);
  const [colourFilter, setColourFilter] = useState('none');

  const section = SECTIONS.find((item) => item.id === active) ?? SECTIONS[3];

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-settings">
        <header className="sy-settings__head">
          <div className="sy-grow">
            <h1 className="sy-title-1">Settings</h1>
            <p className="sy-body-sm sy-fg-muted sy-measure">
              Signed in as Jordan Reyes · @jordanreyes · Creator account since March 2021
            </p>
          </div>
          <Button variant="ghost" size="sm" icon="help">
            Help
          </Button>
        </header>

        <div className="sy-settings__layout">
          <nav className="sy-settings__nav" aria-label="Settings categories">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sy-settings__navitem${item.id === active ? ' is-active' : ''}`}
                aria-current={item.id === active ? 'true' : undefined}
                onClick={() => setActive(item.id)}
              >
                <span
                  className={`sy-tile-icon sy-settings__navicon${
                    item.id === active ? ' sy-tone-accent' : ''
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                </span>
                <span className="sy-grow">
                  <span className="sy-label sy-settings__navlabel">{item.label}</span>
                  <span className="sy-caption sy-fg-quiet sy-truncate sy-settings__navsummary">
                    {item.summary}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} />
              </button>
            ))}
          </nav>

          <div className="sy-settings__detail" aria-live="polite">
            {active === 'appearance' ? (
              <>
                <ScreenSection title="Theme" eyebrow="Appearance">
                  <p className="sy-body-sm sy-fg-muted sy-measure sy-settings__lead">
                    Every theme is generated from the same OKLCH source, so contrast is guaranteed in
                    all of them rather than checked afterwards.
                  </p>
                  <div className="sy-themes" role="radiogroup" aria-label="Theme">
                    {THEMES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={theme === item.id}
                        className={`sy-theme-tile${theme === item.id ? ' is-selected' : ''}`}
                        onClick={() => setTheme(item.id)}
                      >
                        {/*
                          The preview is live product chrome at 1/6 scale with
                          `data-theme` re-scoped onto it, so it renders in the
                          theme it advertises without a single stored image.
                        */}
                        <span className="sy-theme-tile__frame" aria-hidden="true">
                          {item.id === 'system' ? (
                            <>
                              <span className="sy-theme-tile__half" data-theme="dark">
                                <ThemePreview />
                              </span>
                              <span className="sy-theme-tile__half is-end" data-theme="light">
                                <ThemePreview />
                              </span>
                            </>
                          ) : (
                            <span className="sy-theme-tile__full" data-theme={item.id}>
                              <ThemePreview />
                            </span>
                          )}
                        </span>
                        <span className="sy-theme-tile__meta">
                          {/* Selection is a filled check plus a weight change on
                              the label, so it survives greyscale. */}
                          <span className="sy-theme-tile__check" aria-hidden="true">
                            {theme === item.id && <Icon name="check" size={14} />}
                          </span>
                          <span className="sy-grow">
                            <span className="sy-label sy-theme-tile__label">{item.label}</span>
                            <span className="sy-caption sy-fg-quiet">{item.description}</span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </ScreenSection>

                <ScreenSection title="Accent colour">
                  <p className="sy-body-sm sy-fg-muted sy-measure sy-settings__lead">
                    The accent drives focus rings, primary buttons and the assistant. Live, gifting and
                    status colours never change — they carry meaning, not taste.
                  </p>
                  <div className="sy-accents" role="radiogroup" aria-label="Accent colour">
                    {ACCENTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={accent === item.id}
                        className={`sy-accent-swatch${accent === item.id ? ' is-selected' : ''}`}
                        onClick={() => setAccent(item.id)}
                      >
                        <span className={`sy-accent-swatch__chip sy-accent-swatch__chip--${item.id}`}>
                          {accent === item.id && <Icon name="check" size={16} />}
                        </span>
                        <span className="sy-caption sy-accent-swatch__label">{item.label}</span>
                        <span className="sy-caption sy-fg-quiet">{item.note}</span>
                      </button>
                    ))}
                  </div>
                </ScreenSection>

                <ScreenSection title="Text and motion">
                  <Surface padding="lg" elevation="surface" radius="lg" className="sy-settings__group">
                    <div className="sy-settings__slider">
                      <div className="sy-row sy-between sy-gap-4">
                        <label className="sy-label" htmlFor="sy-text-size-readout">
                          Text size
                        </label>
                        <output id="sy-text-size-readout" className="sy-caption sy-fg-muted">
                          {TEXT_SIZE_LABELS[textSize]}
                        </output>
                      </div>
                      <div className="sy-settings__slider-row">
                        <span className="sy-settings__aa is-small" aria-hidden="true">
                          A
                        </span>
                        <Slider
                          label="Text size"
                          min={0}
                          max={5}
                          value={textSize}
                          onChange={setTextSize}
                        />
                        <span className="sy-settings__aa is-large" aria-hidden="true">
                          A
                        </span>
                      </div>
                      <p className="sy-caption sy-fg-quiet">
                        Applies to interface text only. Captions have their own size in Accessibility.
                      </p>
                    </div>

                    <hr className="sy-divider" />

                    <Switch
                      label="Reduce motion"
                      description="Removes parallax, the aurora drift and card entrance animation. Progress and loading states still animate."
                      checked={reduceMotion}
                      onChange={setReduceMotion}
                    />

                    <hr className="sy-divider" />

                    <Switch
                      label="Increase contrast"
                      description="Makes every glass surface opaque and raises border contrast to 3:1. Nothing moves position."
                      checked={increaseContrast}
                      onChange={setIncreaseContrast}
                    />

                    <hr className="sy-divider" />

                    <Select
                      label="Colour vision filter"
                      hint="Adjusts data visualisation hues. Text contrast is unaffected."
                      value={colourFilter}
                      onChange={(event) => setColourFilter(event.target.value)}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'deuteranopia', label: 'Deuteranopia — red/green' },
                        { value: 'protanopia', label: 'Protanopia — red/green' },
                        { value: 'tritanopia', label: 'Tritanopia — blue/yellow' },
                      ]}
                    />
                  </Surface>
                </ScreenSection>

                <ScreenSection title="Preview" eyebrow="What you have chosen">
                  <Surface className="sy-preview-card" padding="lg" elevation="raised" radius="xl">
                    <div className="sy-row sy-between sy-gap-3">
                      <h3 className="sy-headline">Live preview</h3>
                      <Badge tone="accent" variant="soft" icon="eye">
                        Not saved yet
                      </Badge>
                    </div>
                    <div className="sy-preview-card__sample">
                      <span className="sy-overline sy-fg-accent">Design Systems Guild</span>
                      <p className="sy-title-3">Rebuilding the ramps in OKLCH</p>
                      <p className="sy-body-sm sy-fg-muted">
                        Once lightness is perceptually uniform, contrast stops being something you audit
                        and starts being something you can guarantee.
                      </p>
                      <div className="sy-row sy-gap-2 sy-wrap">
                        <Button variant="primary" size="sm">
                          Primary
                        </Button>
                        <Button variant="secondary" size="sm">
                          Secondary
                        </Button>
                        <Button variant="ghost" size="sm">
                          Ghost
                        </Button>
                      </div>
                    </div>
                    <div className="sy-preview-card__kv">
                      <div className="sy-kv">
                        <span className="sy-kv__key">Theme</span>
                        <span className="sy-kv__value">
                          {THEMES.find((item) => item.id === theme)?.label}
                        </span>
                      </div>
                      <div className="sy-kv">
                        <span className="sy-kv__key">Accent</span>
                        <span className="sy-kv__value">
                          {ACCENTS.find((item) => item.id === accent)?.label}
                        </span>
                      </div>
                      <div className="sy-kv">
                        <span className="sy-kv__key">Text size</span>
                        <span className="sy-kv__value">{TEXT_SIZE_LABELS[textSize]}</span>
                      </div>
                      <div className="sy-kv">
                        <span className="sy-kv__key">Motion</span>
                        <span className="sy-kv__value">{reduceMotion ? 'Reduced' : 'Full'}</span>
                      </div>
                      <div className="sy-kv">
                        <span className="sy-kv__key">Contrast</span>
                        <span className="sy-kv__value">{increaseContrast ? 'Increased' : 'Standard'}</span>
                      </div>
                    </div>
                  </Surface>
                </ScreenSection>
              </>
            ) : (
              <ScreenSection title={section.label} eyebrow="Settings">
                <p className="sy-body-sm sy-fg-muted sy-measure sy-settings__lead">{section.summary}</p>
                <Surface padding="md" elevation="surface" radius="lg" className="sy-settings__group">
                  {section.rows.map((row, index) => (
                    <div key={row.title}>
                      {index > 0 && <hr className="sy-divider" />}
                      <ListRow
                        title={row.title}
                        subtitle={row.subtitle}
                        trailing={
                          <>
                            <span className="sy-caption sy-fg-muted">{row.trailing}</span>
                            <Icon name="chevronRight" size={16} />
                          </>
                        }
                        onClick={() => undefined}
                      />
                    </div>
                  ))}
                </Surface>
                <p className="sy-caption sy-fg-quiet">
                  Appearance is the section designed in full for this specification. Every other
                  category uses the same row grammar shown here.
                </p>
              </ScreenSection>
            )}

            {/* Data and privacy sits below whichever category is open. It is
                the one group people arrive at Settings looking for without
                knowing which category it lives in. */}
            <ScreenSection title="Data and privacy" eyebrow="Applies everywhere">
              <Surface padding="md" elevation="surface" radius="lg" className="sy-settings__group">
                <ListRow
                  leading={
                    <span className="sy-tile-icon sy-tone-accent">
                      <Icon name="download" size={18} />
                    </span>
                  }
                  title="Download your data"
                  subtitle="Posts, messages, watch history and payouts as JSON. Ready in about 48 hours."
                  trailing={
                    <Button variant="secondary" size="sm">
                      Request
                    </Button>
                  }
                />
                <hr className="sy-divider" />
                <ListRow
                  leading={
                    <span className="sy-tile-icon sy-tone-neutral">
                      <Icon name="link" size={18} />
                    </span>
                  }
                  title="Connected apps"
                  subtitle="OBS Studio, Figma and Stripe have access to parts of your account."
                  trailing={
                    <>
                      <Badge tone="neutral">3</Badge>
                      <Icon name="chevronRight" size={16} />
                    </>
                  }
                  onClick={() => undefined}
                />
                <hr className="sy-divider" />
                <div className="sy-settings__switchrow">
                  <Switch
                    label="Ad personalisation"
                    description="Off by default. When on, SYLORA uses what you watch to choose which promoted streams you see. It never uses messages or payment history."
                    checked={adPersonalisation}
                    onChange={setAdPersonalisation}
                  />
                </div>
                <hr className="sy-divider" />
                <ListRow
                  leading={
                    <span className="sy-tile-icon sy-tone-warning">
                      <Icon name="eye" size={18} />
                    </span>
                  }
                  title="Watch history in Discover ranking"
                  subtitle="Turning this off makes Discover fall back to what people you follow watch."
                  trailing={
                    <Button variant="ghost" size="sm">
                      Manage
                    </Button>
                  }
                />
              </Surface>
            </ScreenSection>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Miniature of the product chrome used inside a theme tile.
 * It is drawn from the same semantic tokens the real shell uses, so a token
 * change moves the preview automatically.
 */
function ThemePreview() {
  return (
    <span className="sy-theme-mini">
      <span className="sy-theme-mini__rail">
        <span className="sy-theme-mini__dot is-active" />
        <span className="sy-theme-mini__dot" />
        <span className="sy-theme-mini__dot" />
      </span>
      <span className="sy-theme-mini__body">
        <span className="sy-theme-mini__bar" />
        <span className="sy-theme-mini__card">
          <span className="sy-theme-mini__line is-wide" />
          <span className="sy-theme-mini__line" />
          <span className="sy-theme-mini__pill" />
        </span>
        <span className="sy-theme-mini__card">
          <span className="sy-theme-mini__line is-wide" />
          <span className="sy-theme-mini__line" />
        </span>
      </span>
    </span>
  );
}
