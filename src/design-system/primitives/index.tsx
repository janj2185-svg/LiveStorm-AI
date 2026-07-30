/**
 * SYLORA primitives
 * ---------------------------------------------------------------------------
 * The complete set of interactive and structural components. Every screen in
 * the product is assembled from these — a screen never writes its own button,
 * input or card.
 *
 * SHARED CONTRACTS
 * - Size names (xs..xl) mean the same physical height everywhere.
 * - Tone names (accent, live, creator, success, warning, danger) map to the
 *   same colour families everywhere.
 * - Every control exposes a disabled and a loading state, because a control
 *   that cannot express "busy" forces every screen to invent its own.
 * - Nothing here sets a colour, radius or duration literal; all values are
 *   tokens, so re-theming never touches component code.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { Icon, type IconName } from '../icons/Icon';

export type Tone = 'accent' | 'live' | 'creator' | 'success' | 'warning' | 'danger' | 'neutral';
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ================================================================== */
/* Button                                                              */
/* ================================================================== */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'glass' | 'link';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  tone?: Tone;
  size?: Size;
  /** Leading icon. Rendered before the label, never as the only content. */
  icon?: IconName;
  /** Trailing icon. Use for disclosure and external-link affordances. */
  iconEnd?: IconName;
  /**
   * Replaces the label with a spinner while keeping the button's measured
   * width, so a row of buttons does not reflow when one is busy.
   */
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  tone = 'accent',
  size = 'md',
  icon,
  iconEnd,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = { xs: 14, sm: 16, md: 18, lg: 20, xl: 22 }[size];
  return (
    <button
      type="button"
      className={cx(
        'sy-btn',
        `sy-btn--${variant}`,
        `sy-btn--${size}`,
        `sy-tone-${tone}`,
        fullWidth && 'sy-btn--block',
        loading && 'is-loading',
        className,
      )}
      disabled={disabled || loading}
      // Announce busy state rather than only showing a spinner.
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={iconSize} className="sy-btn__spinner" />}
      <span className="sy-btn__content">
        {icon && <Icon name={icon} size={iconSize} />}
        {children != null && <span className="sy-btn__label">{children}</span>}
        {iconEnd && <Icon name={iconEnd} size={iconSize} />}
      </span>
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconEnd' | 'children'> {
  icon: IconName;
  /** Required: an icon-only control has no visible text to announce. */
  label: string;
}

export function IconButton({ icon, label, size = 'md', className, ...rest }: IconButtonProps) {
  const iconSize = { xs: 14, sm: 16, md: 18, lg: 20, xl: 22 }[size];
  return (
    <Button
      {...rest}
      size={size}
      aria-label={label}
      title={label}
      className={cx('sy-btn--icon', 'sy-touch-target', className)}
    >
      <Icon name={icon} size={iconSize} />
    </Button>
  );
}

/* ================================================================== */
/* Spinner and progress                                                */
/* ================================================================== */

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx('sy-spinner', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export interface ProgressProps {
  /** 0-100. Omit for an indeterminate bar. */
  value?: number;
  tone?: Tone;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export function Progress({ value, tone = 'accent', size = 'md', label, className }: ProgressProps) {
  const indeterminate = value === undefined;
  return (
    <div
      className={cx('sy-progress', `sy-progress--${size}`, `sy-tone-${tone}`, indeterminate && 'is-indeterminate', className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className="sy-progress__fill" style={indeterminate ? undefined : { inlineSize: `${value}%` }} />
    </div>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  children?: ReactNode;
  label?: string;
}

/**
 * Circular progress.
 * Drawn with `stroke-dasharray` on a rotated circle so the arc starts at 12
 * o'clock. Used for goals, storage, mission completion and story rings.
 */
export function ProgressRing({
  value,
  size = 56,
  thickness = 4,
  tone = 'accent',
  children,
  label,
}: ProgressRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx('sy-ring', `sy-tone-${tone}`)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="sy-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <circle
          className="sy-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <span className="sy-ring__content">{children}</span>}
    </div>
  );
}

/* ================================================================== */
/* Surface and card                                                    */
/* ================================================================== */

export type Elevation = 'flat' | 'sunken' | 'surface' | 'raised' | 'overlay' | 'lifted';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  /** Glass is only correct over media or a scrolling backdrop. */
  glass?: false | 'veil' | 'panel' | 'dome';
  padding?: keyof typeof PADDING_MAP;
  radius?: 'md' | 'lg' | 'xl' | '2xl';
  interactive?: boolean;
  as?: 'div' | 'article' | 'section' | 'aside' | 'li';
}

const PADDING_MAP = { none: 0, sm: 3, md: 4, lg: 5, xl: 6 } as const;

export function Surface({
  elevation = 'surface',
  glass = false,
  padding = 'md',
  radius = 'lg',
  interactive = false,
  as = 'div',
  className,
  style,
  children,
  ...rest
}: SurfaceProps) {
  // Polymorphic element: the prop union is validated by `SurfaceProps['as']`,
  // so widening here is safe and avoids a generic that every call site pays for.
  const Tag = as as ElementType;
  return (
    <Tag
      className={cx(
        'sy-surface',
        `sy-surface--${elevation}`,
        `sy-surface--radius-${radius}`,
        glass && 'sy-glass',
        glass === 'veil' && 'sy-glass--veil',
        glass === 'dome' && 'sy-glass--dome',
        interactive && 'sy-surface--interactive',
        className,
      )}
      style={{ ['--sy-surface-padding' as string]: `var(--sy-space-${PADDING_MAP[padding]})`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ================================================================== */
/* Badge, chip, pill                                                   */
/* ================================================================== */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  icon?: IconName;
}

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'sm',
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx('sy-badge', `sy-badge--${variant}`, `sy-badge--${size}`, `sy-tone-${tone}`, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children}
    </span>
  );
}

/**
 * Live badge.
 * The pulsing dot is the product's most repeated signal, so it gets a
 * dedicated component: one implementation, one timing, one reduced-motion
 * fallback. The dot is `aria-hidden` and the word LIVE carries the meaning.
 */
export function LiveBadge({ label = 'LIVE', viewers }: { label?: string; viewers?: string }) {
  return (
    <span className="sy-live-badge">
      <span className="sy-live-badge__dot" aria-hidden="true" />
      {label}
      {viewers && <span className="sy-live-badge__count">{viewers}</span>}
    </span>
  );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: IconName;
  /** Renders a remove affordance and calls `onRemove`. */
  onRemove?: () => void;
  tone?: Tone;
}

export function Chip({
  selected = false,
  icon,
  onRemove,
  tone = 'accent',
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      className={cx('sy-chip', selected && 'is-selected', `sy-tone-${tone}`, className)}
      aria-pressed={selected}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      <span>{children}</span>
      {onRemove && (
        <span
          className="sy-chip__remove"
          role="button"
          tabIndex={-1}
          aria-label="Remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Icon name="close" size={12} />
        </span>
      )}
    </button>
  );
}

/* ================================================================== */
/* Avatar                                                              */
/* ================================================================== */

export interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  /** Draws the aurora story ring. */
  ring?: false | 'story' | 'live';
  presence?: 'online' | 'away' | 'offline';
  verified?: boolean;
  className?: string;
}

/**
 * Avatar.
 *
 * The fallback is not a generic silhouette: it is the person's initials over a
 * hue derived deterministically from their name. A directory of 400 people
 * therefore looks like 400 individuals rather than 400 identical grey circles,
 * with zero extra data.
 */
export function Avatar({ name, src, size = 40, ring = false, presence, verified, className }: AvatarProps) {
  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join(''),
    [name],
  );

  // Deterministic hue from the name. Same person, same colour, every session.
  const hue = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
    return hash;
  }, [name]);

  return (
    <span
      className={cx('sy-avatar', ring && `sy-avatar--ring-${ring}`, className)}
      style={{ width: size, height: size, ['--avatar-hue' as string]: hue }}
    >
      <span className="sy-avatar__inner">
        {src ? (
          <img src={src} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="sy-avatar__initials" style={{ fontSize: size * 0.36 }} aria-hidden="true">
            {initials}
          </span>
        )}
      </span>
      {presence && <span className={cx('sy-avatar__presence', `is-${presence}`)} aria-label={presence} />}
      {verified && (
        <span className="sy-avatar__verified" aria-label="Verified">
          <Icon name="verified" size={Math.max(12, size * 0.34)} />
        </span>
      )}
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
  size = 28,
}: {
  people: { name: string; src?: string }[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;
  return (
    <span className="sy-avatar-group" style={{ ['--overlap' as string]: `${size * 0.3}px` }}>
      {shown.map((person) => (
        <Avatar key={person.name} name={person.name} src={person.src} size={size} />
      ))}
      {overflow > 0 && (
        <span className="sy-avatar-group__overflow" style={{ width: size, height: size, fontSize: size * 0.34 }}>
          +{overflow}
        </span>
      )}
    </span>
  );
}

/* ================================================================== */
/* Form fields                                                         */
/* ================================================================== */

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/**
 * Field shell.
 *
 * Owns label association, hint and error wiring so no individual input can get
 * it wrong. Errors are announced politely and are always *text* — colour alone
 * never communicates an invalid field.
 */
export function Field({ label, hint, error, required, children, className }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('sy-field', error && 'is-invalid', className)}>
      {label && (
        <label className="sy-field__label sy-label" htmlFor={id}>
          {label}
          {required && (
            <span className="sy-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p className="sy-field__hint sy-caption" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="sy-field__error sy-caption" id={errorId} role="alert">
          <Icon name="error" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  trailing?: ReactNode;
  inputSize?: Size;
}

export function Input({ label, hint, error, icon, trailing, inputSize = 'md', className, required, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={cx('sy-input', `sy-input--${inputSize}`, invalid && 'is-invalid')}>
          {icon && <Icon name={icon} size={18} className="sy-input__icon" />}
          <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={required} {...rest} />
          {trailing && <span className="sy-input__trailing">{trailing}</span>}
        </div>
      )}
    </Field>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, className, required, rows = 4, ...rest }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={cx('sy-input', 'sy-input--textarea', invalid && 'is-invalid')}>
          <textarea id={id} rows={rows} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...rest} />
        </div>
      )}
    </Field>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, hint, error, options, className, required, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={cx('sy-input', 'sy-input--select', invalid && 'is-invalid')}>
          <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...rest}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="sy-input__trailing" />
        </div>
      )}
    </Field>
  );
}

export function SearchInput({
  placeholder = 'Search',
  value,
  onChange,
  shortcut,
  className,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Rendered as a keyboard hint, e.g. "/" or "⌘K". */
  shortcut?: string;
  className?: string;
}) {
  return (
    <div className={cx('sy-input', 'sy-input--search', className)}>
      <Icon name="search" size={18} className="sy-input__icon" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label={placeholder}
      />
      {shortcut && <kbd className="sy-kbd">{shortcut}</kbd>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="sy-switch-row">
      <div className="sy-switch-row__text">
        <label className="sy-label" htmlFor={id}>
          {label}
        </label>
        {description && <p className="sy-caption sy-fg-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cx('sy-switch', checked && 'is-on')}
        onClick={() => onChange?.(!checked)}
      >
        <span className="sy-switch__thumb" />
      </button>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="sy-check-row">
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        className={cx('sy-checkbox', checked && 'is-on')}
        onClick={() => onChange?.(!checked)}
      >
        {checked && <Icon name="check" size={13} />}
      </button>
      <label className="sy-body-sm" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

export function Slider({
  value,
  min = 0,
  max = 100,
  onChange,
  label,
  tone = 'accent',
}: {
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  label: string;
  tone?: Tone;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cx('sy-slider', `sy-tone-${tone}`)} style={{ ['--percent' as string]: `${percent}%` }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => onChange?.(Number(event.target.value))}
      />
    </div>
  );
}

/* ================================================================== */
/* Tabs and segmented control                                          */
/* ================================================================== */

export interface TabsProps {
  tabs: { id: string; label: string; icon?: IconName; badge?: string | number }[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'segmented' | 'pill';
  className?: string;
}

/**
 * Tabs.
 *
 * Implements the WAI-ARIA tabs pattern including roving arrow-key navigation.
 * The underline variant animates its indicator between tabs rather than
 * cross-fading, so the eye can follow which tab the selection moved to.
 */
export function Tabs({ tabs, active, onChange, variant = 'underline', className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKey = useCallback(
    (event: React.KeyboardEvent) => {
      const index = tabs.findIndex((tab) => tab.id === active);
      if (index < 0) return;
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      onChange(tabs[next].id);
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    },
    [active, onChange, tabs],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cx('sy-tabs', `sy-tabs--${variant}`, className)}
      onKeyDown={handleKey}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cx('sy-tabs__tab', selected && 'is-active')}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} size={16} filled={selected} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && <span className="sy-tabs__badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* Feedback and status                                                 */
/* ================================================================== */

export function Skeleton({
  width,
  height = 16,
  radius = 'md',
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: 'sm' | 'md' | 'lg' | 'pill' | 'full';
  className?: string;
}) {
  return (
    <span
      className={cx('sy-skeleton', `sy-skeleton--${radius}`, className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  icon = 'sparkles',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sy-empty">
      <span className="sy-empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="sy-title-3">{title}</h3>
      {description && <p className="sy-body-sm sy-fg-muted sy-measure">{description}</p>}
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  delta,
  icon,
  tone = 'accent',
}: {
  label: string;
  value: string;
  /** Signed change, e.g. "+12.4%". Sign drives the colour and the arrow. */
  delta?: string;
  icon?: IconName;
  tone?: Tone;
}) {
  const positive = delta?.startsWith('+');
  const negative = delta?.startsWith('-');
  return (
    <div className={cx('sy-stat', `sy-tone-${tone}`)}>
      <div className="sy-stat__head">
        {icon && (
          <span className="sy-stat__icon">
            <Icon name={icon} size={15} />
          </span>
        )}
        <span className="sy-caption sy-fg-muted">{label}</span>
      </div>
      <div className="sy-stat__value sy-mono-lg">{value}</div>
      {delta && (
        <div className={cx('sy-stat__delta', positive && 'is-up', negative && 'is-down')}>
          {(positive || negative) && <Icon name={positive ? 'trendUp' : 'trendDown'} size={13} />}
          {delta}
        </div>
      )}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="sy-tooltip-wrap">
      {children}
      <span className="sy-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}

export function Toast({
  tone = 'neutral',
  icon,
  title,
  description,
  onDismiss,
}: {
  tone?: Tone;
  icon?: IconName;
  title: string;
  description?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className={cx('sy-toast', `sy-tone-${tone}`)} role="status">
      {icon && (
        <span className="sy-toast__icon">
          <Icon name={icon} size={18} />
        </span>
      )}
      <div className="sy-toast__body">
        <p className="sy-label">{title}</p>
        {description && <p className="sy-caption sy-fg-muted">{description}</p>}
      </div>
      {onDismiss && <IconButton icon="close" label="Dismiss" variant="ghost" size="xs" onClick={onDismiss} />}
    </div>
  );
}

/* ================================================================== */
/* Section header                                                      */
/* ================================================================== */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  size = 'md',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleClass = { sm: 'sy-headline', md: 'sy-title-3', lg: 'sy-title-2' }[size];
  return (
    <header className="sy-section-header">
      <div className="sy-section-header__text">
        {eyebrow && <span className="sy-overline sy-fg-accent">{eyebrow}</span>}
        <h2 className={titleClass}>{title}</h2>
        {description && <p className="sy-body-sm sy-fg-muted sy-measure">{description}</p>}
      </div>
      {action && <div className="sy-section-header__action">{action}</div>}
    </header>
  );
}

/* ================================================================== */
/* Theme                                                               */
/* ================================================================== */

export type ThemeName = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({
  theme,
  setTheme,
  children,
}: ThemeContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Media-query hook used for the responsive shell.
 * Subscribes rather than polling, and reads once on mount so the first paint
 * is already correct.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export { Icon };
export type { IconName, CSSProperties };
