/**
 * SYLORA application shell
 * ---------------------------------------------------------------------------
 * THE POSTURE MODEL
 * SYLORA runs on phones held in one hand, tablets on a desk, and desktops with
 * a mouse. Rather than three codebases the shell has three *postures*, chosen
 * by the width of the shell's own container:
 *
 *   compact   < 768   top bar + content + bottom tab bar
 *   medium    < 1280  collapsed icon rail + content
 *   expanded  >= 1280 expanded rail + content + context panel
 *
 * WHY CONTAINER QUERIES AND NOT MEDIA QUERIES
 * The shell responds to the size of the box it is given, not the size of the
 * browser window. That makes the same component correct inside a phone frame in
 * the design gallery, inside a tablet split-view, and full-screen on a desktop
 * — with one implementation and no device sniffing.
 *
 * WHY NAVIGATION MOVES TO THE BOTTOM ON PHONES
 * The top third of a 6.7-inch phone is unreachable without shifting grip.
 * Primary destinations belong under the thumb; the top bar keeps only
 * identity, context and low-frequency actions.
 */

import type { ReactNode } from 'react';

import { Icon, type IconName } from '../icons/Icon';
import { LogoLockup, LogoMark } from '../brand/Logo';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: number | string;
  /** Marks a destination that is currently broadcasting. */
  live?: boolean;
}

export interface AppShellProps {
  nav: NavItem[];
  /** Secondary destinations. Rendered below a divider, never in the tab bar. */
  navSecondary?: NavItem[];
  active: string;
  onNavigate?: (id: string) => void;
  /** Up to 4 items reach the phone tab bar; the rest move behind "More". */
  tabBarItems?: string[];
  topBar?: ReactNode;
  contextPanel?: ReactNode;
  contextPanelTitle?: string;
  footer?: ReactNode;
  children: ReactNode;
  /** Immersive screens (player, live, stories) suppress all chrome. */
  immersive?: boolean;
}

export function AppShell({
  nav,
  navSecondary = [],
  active,
  onNavigate,
  tabBarItems,
  topBar,
  contextPanel,
  contextPanelTitle,
  footer,
  children,
  immersive = false,
}: AppShellProps) {
  const allNav = [...nav, ...navSecondary];
  const tabItems = (tabBarItems ?? nav.slice(0, 4).map((item) => item.id))
    .map((id) => allNav.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item));

  if (immersive) {
    return <div className="sy-shell-frame sy-shell--immersive">{children}</div>;
  }

  /*
    The frame exists solely to own the `shell` container. An element can never
    match a container query it declares itself, so the element whose grid
    changes with posture has to be a *child* of the container, not the
    container. This is the one structural wrapper in the whole system.
  */
  return (
    <div className="sy-shell-frame">
      <div className="sy-shell">
      <a className="sy-skip-link" href="#sy-main">
        Skip to content
      </a>

      {/* Navigation rail — hidden in compact posture, where the tab bar takes over. */}
      <nav className="sy-rail" aria-label="Primary">
        <div className="sy-rail__brand">
          <LogoLockup size={30} />
          <LogoMark size={30} className="sy-rail__brand-mark" />
        </div>

        <ul className="sy-rail__list">
          {nav.map((item) => (
            <RailItem key={item.id} item={item} active={item.id === active} onNavigate={onNavigate} />
          ))}
        </ul>

        {navSecondary.length > 0 && (
          <>
            <hr className="sy-divider sy-rail__divider" />
            <ul className="sy-rail__list">
              {navSecondary.map((item) => (
                <RailItem key={item.id} item={item} active={item.id === active} onNavigate={onNavigate} />
              ))}
            </ul>
          </>
        )}

        {footer && <div className="sy-rail__footer">{footer}</div>}
      </nav>

      <div className="sy-shell__body">
        {topBar && <header className="sy-topbar sy-vellum sy-vellum--veil">{topBar}</header>}

        <main className="sy-main" id="sy-main" tabIndex={-1}>
          {children}
        </main>
      </div>

      {contextPanel && (
        <aside className="sy-context" aria-label={contextPanelTitle ?? 'Contextual information'}>
          {contextPanelTitle && (
            <header className="sy-context__header">
              <h2 className="sy-label">{contextPanelTitle}</h2>
            </header>
          )}
          <div className="sy-context__body">{contextPanel}</div>
        </aside>
      )}

      {/* Bottom tab bar — compact posture only. */}
      <nav className="sy-tabbar sy-vellum sy-vellum--veil" aria-label="Primary">
        {tabItems.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              className={`sy-tabbar__item${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate?.(item.id)}
            >
              <span className="sy-tabbar__icon">
                <Icon name={item.icon} size={22} filled={isActive} />
                {item.badge !== undefined && <span className="sy-tabbar__badge">{item.badge}</span>}
                {item.live && <span className="sy-tabbar__live" aria-hidden="true" />}
              </span>
              <span className="sy-tabbar__label">{item.label}</span>
            </button>
          );
        })}
        </nav>
      </div>
    </div>
  );
}

function RailItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`sy-rail__item${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => onNavigate?.(item.id)}
      >
        <span className="sy-rail__icon">
          <Icon name={item.icon} size={20} filled={active} />
          {item.live && <span className="sy-rail__live" aria-hidden="true" />}
        </span>
        <span className="sy-rail__label">{item.label}</span>
        {item.badge !== undefined && <span className="sy-rail__badge">{item.badge}</span>}
      </button>
    </li>
  );
}

/**
 * Page header used inside `sy-main`.
 * Separate from the shell's top bar: the top bar is chrome that persists,
 * this scrolls away with the content it titles.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  tabs,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <header className="sy-page-header">
      <div className="sy-page-header__row">
        <div className="sy-page-header__text">
          {eyebrow && <span className="sy-overline sy-fg-accent">{eyebrow}</span>}
          <h1 className="sy-title-1">{title}</h1>
          {subtitle && <p className="sy-body-sm sy-fg-muted sy-measure">{subtitle}</p>}
        </div>
        {actions && <div className="sy-page-header__actions">{actions}</div>}
      </div>
      {tabs && <div className="sy-page-header__tabs">{tabs}</div>}
    </header>
  );
}
