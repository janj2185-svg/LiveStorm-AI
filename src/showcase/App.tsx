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

export function App() {
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [screenId, setScreenId] = useState(SCREENS[0].id);
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [query, setQuery] = useState('');
  const [fit, setFit] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  const screen = useMemo(() => SCREENS.find((item) => item.id === screenId) ?? SCREENS[0], [screenId]);
  const spec = DEVICES[device];

  // The gallery itself is always dark; only the preview surface switches theme.
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // When a screen declares a canonical posture, follow it on selection.
  useEffect(() => {
    if (screen.preferredDevice) setDevice(screen.preferredDevice);
  }, [screen]);

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
              { id: 'dark', label: 'Dark', icon: 'moon' },
              { id: 'light', label: 'Light', icon: 'sun' },
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
            <DeviceFrame device={device} scale={scale}>
              {/*
                The preview owns its own theme scope. `data-theme` here — not on
                the document — is what lets the gallery stay dark while the
                product renders light, which is how a designer actually compares.
              */}
              <div className="sy-preview" data-theme={theme}>
                {screen.immersive ? (
                  <Screen />
                ) : (
                  <AppShell
                    nav={SHELL_NAV}
                    navSecondary={SHELL_NAV_SECONDARY}
                    active={screen.navId ?? 'home'}
                    contextPanel={ContextPanel ? <ContextPanel /> : undefined}
                    contextPanelTitle={screen.contextPanelTitle}
                    topBar={
                      <>
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
