/**
 * SYLORA design gallery
 * ---------------------------------------------------------------------------
 * The specification you can operate. Every screen in the product is rendered
 * here as real, running code inside true-resolution device chrome, in both
 * themes, at every posture.
 *
 * This is deliberately not a static mockup deck. A mockup can hide a layout
 * that breaks at 393px, a contrast pair that fails, or a focus order that
 * makes no sense. Rendering the actual implementation means the gallery and
 * the product cannot drift apart — they are the same code.
 */

import { useEffect, useMemo, useState } from 'react';

import { LogoLockup } from '../design-system/brand/Logo';
import { Badge, Icon, IconButton, SearchInput, Tabs } from '../design-system/primitives';
import { AppShell } from '../design-system/patterns/AppShell';
import { SCREENS, SCREEN_GROUPS, SHELL_NAV, SHELL_NAV_SECONDARY } from '../screens/registry';
import { DEVICES, DEVICE_ORDER, type DeviceId } from './devices';
import { DeviceFrame } from './DeviceFrame';

type ThemeName = 'dark' | 'light';

/**
 * Deep link format: `#/<screenId>?device=<id>&theme=<dark|light>&chrome=<0|1>`
 *
 * Every view in the gallery is addressable, so a specific screen at a specific
 * posture in a specific theme can be linked in a review, a bug report or a
 * capture script. `chrome=0` strips the gallery furniture and renders the
 * device alone, which is what the screenshot pipeline uses.
 */
function readLocation() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [id, search] = raw.split('?');
  const params = new URLSearchParams(search ?? '');
  return {
    screenId: id || null,
    device: (params.get('device') as DeviceId | null) ?? null,
    theme: (params.get('theme') as ThemeName | null) ?? null,
    bare: params.get('chrome') === '0',
  };
}

export function App() {
  const initial = typeof window === 'undefined' ? null : readLocation();

  const [theme, setTheme] = useState<ThemeName>(initial?.theme ?? 'light');
  const [screenId, setScreenId] = useState(
    initial?.screenId && SCREENS.some((s) => s.id === initial.screenId)
      ? initial.screenId
      : SCREENS[0].id,
  );
  const [device, setDevice] = useState<DeviceId>(initial?.device ?? 'desktop');
  const [bare, setBare] = useState(initial?.bare ?? false);
  const [query, setQuery] = useState('');
  const [fit, setFit] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  const screen = useMemo(() => SCREENS.find((item) => item.id === screenId) ?? SCREENS[0], [screenId]);
  const spec = DEVICES[device];

  // The gallery chrome follows the product's default so the tool and the thing
  // it frames feel like one system. Only the preview switches independently.
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
  }, []);

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // When a screen declares a canonical posture, follow it on selection —
  // unless the URL asked for a specific device, which always wins.
  useEffect(() => {
    if (initial?.device) return;
    if (screen.preferredDevice) setDevice(screen.preferredDevice);
    // `initial` is read once at mount and never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /*
    React to fragment changes so browser back and forward move between views
    rather than doing nothing. It also lets tooling drive the gallery without
    reloading the document.
  */
  useEffect(() => {
    const onHashChange = () => {
      const next = readLocation();
      if (next.screenId && SCREENS.some((item) => item.id === next.screenId)) setScreenId(next.screenId);
      if (next.device && DEVICES[next.device]) setDevice(next.device);
      if (next.theme === 'dark' || next.theme === 'light') setTheme(next.theme);
      setBare(next.bare);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the address bar in sync so the current view is always linkable.
  useEffect(() => {
    const next = `#/${screenId}?device=${device}&theme=${theme}${bare ? '&chrome=0' : ''}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [screenId, device, theme, bare]);

  const filtered = useMemo(() => {
    if (!query.trim()) return SCREENS;
    const needle = query.toLowerCase();
    return SCREENS.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.group.toLowerCase().includes(needle) ||
        item.purpose.toLowerCase().includes(needle),
    );
  }, [query]);

  /**
   * Fit scale.
   * The frame is rendered at true resolution and then scaled; this computes the
   * largest scale that still fits the available stage, capped at 1 so small
   * screens are never blown up past their real size.
   */
  const stageWidth = Math.max(320, viewport.width - (navOpen ? 640 : 380));
  const stageHeight = Math.max(320, viewport.height - 168);
  const scale = fit
    ? Math.min(1, stageWidth / spec.width, stageHeight / spec.height)
    : 1;

  const Screen = screen.component;
  const ContextPanel = screen.contextPanel;

  const preview = (
    <div className="sy-preview" data-theme={theme}>
      {screen.immersive ? (
        // Immersive screens still need a `screen` container to query;
        // the shell's immersive frame is what provides it.
        <div className="sy-shell-frame sy-shell--immersive">
          <Screen />
        </div>
      ) : (
        <AppShell
          nav={SHELL_NAV}
          navSecondary={SHELL_NAV_SECONDARY}
          active={screen.navId ?? 'home'}
          contextPanel={ContextPanel ? <ContextPanel /> : undefined}
          contextPanelTitle={screen.contextPanelTitle}
          topBar={
            <>
              {/* Compact posture has no rail, so the top bar carries identity. */}
              <span className="sy-topbar__brand">
                <LogoLockup size={24} />
              </span>
              <div className="sy-topbar__search">
                <SearchInput placeholder="Search SYLORA" shortcut="⌘K" />
              </div>
              <span className="sy-grow" />
              <IconButton icon="sparkles" label="Assistant" variant="ghost" size="sm" />
              <IconButton icon="notifications" label="Notifications" variant="ghost" size="sm" />
            </>
          }
        >
          <Screen />
        </AppShell>
      )}
    </div>
  );

  // `chrome=0`: the device alone, at true resolution, for screenshot capture.
  if (bare) {
    return (
      <div className="sy-gallery__bare">
        <DeviceFrame device={device} scale={1}>
          {preview}
        </DeviceFrame>
      </div>
    );
  }

  return (
    <div className="sy-gallery">
      <header className="sy-gallery__bar">
        <div className="sy-gallery__brand">
          <IconButton
            icon="menu"
            label={navOpen ? 'Hide screen list' : 'Show screen list'}
            variant="ghost"
            size="sm"
            className="sy-gallery__menu-btn"
            onClick={() => setNavOpen((open) => !open)}
          />
          <LogoLockup size={26} suffix="Design System" />
        </div>

        <div className="sy-gallery__bar-centre">
          <div className="sy-gallery__devices" role="group" aria-label="Device">
            {DEVICE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={`sy-gallery__device${device === id ? ' is-active' : ''}`}
                onClick={() => setDevice(id)}
                title={DEVICES[id].reference}
              >
                <Icon
                  name={
                    id === 'tablet' ? 'tablet' : id === 'desktop' || id === 'web' ? 'desktop' : 'mobile'
                  }
                  size={15}
                />
                {DEVICES[id].name}
              </button>
            ))}
          </div>
        </div>

        <div className="sy-gallery__bar-end">
          <Tabs
            variant="segmented"
            tabs={[
              { id: 'light', label: 'Light', icon: 'sun' },
              { id: 'dark', label: 'Dark', icon: 'moon' },
            ]}
            active={theme}
            onChange={(id) => setTheme(id as ThemeName)}
          />
          <button
            type="button"
            className={`sy-gallery__zoom${fit ? ' is-active' : ''}`}
            onClick={() => setFit((value) => !value)}
          >
            {fit ? `Fit ${Math.round(scale * 100)}%` : '100%'}
          </button>
        </div>
      </header>

      <div className={`sy-gallery__body${navOpen ? ' is-nav-open' : ''}`}>
        <nav className="sy-gallery__nav" aria-label="Screens">
          <div className="sy-gallery__nav-search">
            <SearchInput placeholder="Filter screens" value={query} onChange={setQuery} />
          </div>
          <div className="sy-gallery__nav-list">
            {SCREEN_GROUPS.map((group) => {
              const items = filtered.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <section key={group}>
                  <h2 className="sy-overline sy-gallery__nav-group">{group}</h2>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      // Exposed for the screenshot harness and future end-to-end tests.
                      data-screen-id={item.id}
                      data-screen-immersive={item.immersive ? 'true' : 'false'}
                      className={`sy-gallery__nav-item${item.id === screenId ? ' is-active' : ''}`}
                      onClick={() => {
                        setScreenId(item.id);
                        if (viewport.width < 1100) setNavOpen(false);
                      }}
                    >
                      <span className="sy-truncate">{item.name}</span>
                      {item.immersive && <Icon name="fullscreen" size={12} />}
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        </nav>

        <main className="sy-gallery__stage">
          <div className="sy-gallery__stage-head">
            <div>
              <span className="sy-overline sy-fg-accent">{screen.group}</span>
              <h1 className="sy-title-3">{screen.name}</h1>
            </div>
            <div className="sy-gallery__stage-meta">
              <Badge tone="neutral">{spec.reference}</Badge>
              <Badge tone="accent" variant="soft">
                {spec.posture}
              </Badge>
            </div>
          </div>

          <p className="sy-body-sm sy-fg-muted sy-gallery__purpose">{screen.purpose}</p>

          <div className="sy-gallery__frame-wrap">
            {/*
              The preview owns its own theme scope. `data-theme` on the preview
              — not on the document — is what lets the gallery stay dark while
              the product renders light, which is how a designer actually
              compares the two.
            */}
            <DeviceFrame device={device} scale={scale}>
              {preview}
            </DeviceFrame>
          </div>

          <footer className="sy-gallery__notes">
            <Icon name="info" size={14} />
            <p className="sy-caption sy-fg-muted">{spec.notes}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
