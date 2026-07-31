# Component specification

Every SYLORA screen is assembled from the components below. A screen never
writes its own button, input or card, and never sets a colour, radius or
duration literal — all values come from tokens, so re-theming never touches
component code.

Source of truth for this document:

| Area | File |
|---|---|
| Component implementations | `src/design-system/primitives/index.tsx` |
| Component styling | `src/design-system/styles/components.css` |
| Shared composites | `src/screens/components.tsx`, `src/design-system/styles/screens.css` |
| Icons | `src/design-system/icons/Icon.tsx` |
| Sizing, radius, z-index | `src/design-system/tokens/space.ts` |
| Motion | `src/design-system/tokens/motion.ts` |
| Depth, vellum, refraction, focus ring | `src/design-system/tokens/elevation.ts` |
| Base reset, focus, utilities | `src/design-system/styles/base.css` |

---

## 1. Tone indirection

A component never names a colour family. It reads six custom properties, and
the `.sy-tone-*` classes supply them. That is why one `Button` implementation
covers seven tones, and why adding an eighth tone would require no component
change at all — only a new `.sy-tone-*` rule.

| Custom property | What it is for |
|---|---|
| `--tone-solid` | The saturated fill. Primary buttons, progress fills, chart bars, slider tracks. |
| `--tone-solid-hover` | The hovered fill. One step brighter in dark mode, one step deeper in light. |
| `--tone-on-solid` | Text and icon colour placed *on* `--tone-solid`. Never guess this pair. |
| `--tone-fg` | The tone as readable foreground on a normal surface. |
| `--tone-bg` | The tone as a soft background wash behind `--tone-fg`. |
| `--tone-border` | The tone as a border, used by outline variants. |

The seven tones and exactly what they resolve to:

| Tone class | `--tone-solid` | `--tone-solid-hover` | `--tone-on-solid` | `--tone-fg` | `--tone-bg` | `--tone-border` |
|---|---|---|---|---|---|---|
| `.sy-tone-accent` | `--sy-accent-solid` | `--sy-accent-solid-hover` | `--sy-on-accent` | `--sy-accent-fg` | `--sy-accent-bg` | `--sy-accent-border` |
| `.sy-tone-live` | `--sy-live-solid` | `--sy-pulse-10` | `--sy-on-live` | `--sy-live-fg` | `--sy-live-bg` | `--sy-live-border` |
| `.sy-tone-creator` | `--sy-creator-solid` | `--sy-bloom-10` | `--sy-on-creator` | `--sy-creator-fg` | `--sy-creator-bg` | `--sy-creator-border` |
| `.sy-tone-success` | `--sy-success-solid` | `--sy-verdigris-10` | `--sy-on-success` | `--sy-success-fg` | `--sy-success-bg` | `--sy-success-border` |
| `.sy-tone-warning` | `--sy-warning-solid` | `--sy-solar-10` | `--sy-on-warning` | `--sy-warning-fg` | `--sy-warning-bg` | `--sy-warning-border` |
| `.sy-tone-danger` | `--sy-danger-solid` | `--sy-rose-10` | `--sy-on-danger` | `--sy-danger-fg` | `--sy-danger-bg` | `--sy-danger-border` |
| `.sy-tone-neutral` | `--sy-porcelain-9` | `--sy-porcelain-10` | `--sy-bg-canvas` | `--sy-fg-default` | `--sy-bg-raised` | `--sy-border-default` |

`--sy-on-accent` is emitted alongside `--sy-on-brand` specifically because
`.sy-tone-accent` reads it. Without it, every primary button in the product fell
back to inherited page ink on a saturated fill, at 2.98:1.

Semantic meaning of each tone, and the underlying Lumen family:

| Tone | Family | Hue | Means |
|---|---|---|---|
| `accent` | `aether` | 196 | Brand, AI, generated content, focus rings |
| `live` | `pulse` | 272 | Realtime: broadcasting, presence, connection health, sync |
| `creator` | `bloom` | 328 | Human expression: creators, gifting, reactions |
| `success` | `verdigris` | 152 | Positive outcome, upward metrics, earnings, verification |
| `warning` | `solar` | 78 | Attention without alarm, achievements, premium, scarcity |
| `danger` | `rose` | 22 | Destructive actions, errors, moderation removal |
| `neutral` | `porcelain` | hue-shifting | No judgement. Structure, counts, categories |

`--tone-bg` resolves to step **2** of the family in light and step 3 in dark: on
a bright ground step 3 is already enough colour to read as a filled block.

Two consequences worth internalising:

1. `tone` only reaches variants that consume tone properties. `Button`'s
   `secondary` and `ghost` variants are deliberately tone-independent — they
   read `--sy-bg-raised`, `--sy-fg-muted` and friends directly — so passing
   `tone="danger"` to a `ghost` button changes nothing.
2. Any component that sets `.sy-tone-*` on itself also supplies those
   properties to its descendants. A `Stat` with `tone="success"` tints its icon
   tile without any child knowing what "success" means.

---

## 2. Contracts that apply to every component

### 2.1 Size names

Size names mean the same physical height everywhere. These numbers come from
`CONTROL` in `src/design-system/tokens/space.ts` and are mirrored exactly by
`.sy-btn--*` in `components.css`.

| Size | Height | Padding-inline | Gap | Icon | Radius |
|---|---|---|---|---|---|
| `xs` | 24px | 8px (`--sy-space-2`) | 4px (`--sy-space-1`) | 14px | 6px (`--sy-radius-sm`) |
| `sm` | 32px | 12px (`--sy-space-3`) | 6px (`--sy-space-1_5`) | 16px | 10px (`--sy-radius-md`) |
| `md` | 40px | 16px (`--sy-space-4`) | 8px (`--sy-space-2`) | 18px | 10px (`--sy-radius-md`) |
| `lg` | 48px | 20px (`--sy-space-5`) | 10px (`--sy-space-2_5`) | 20px | 14px (`--sy-radius-lg`) |
| `xl` | 56px | 24px (`--sy-space-6`) | 12px (`--sy-space-3`) | 22px | 14px (`--sy-radius-lg`) |

`MIN_TOUCH_TARGET` is 44px. The visual height and the touch height are separate
numbers on purpose: a 32px chip should look like a 32px chip and still be
tappable. The 44px target is added with the `.sy-touch-target` pseudo-element,
never by inflating the visual box.

### 2.2 Press physics

Interactive elements scale to `0.97` on `:active` over 80ms
(`--sy-transition-press` = `80ms cubic-bezier(0.4, 0, 0.2, 1)`). It is small
enough to feel like the surface yielding rather than the object shrinking.
Exceptions, all deliberate: `Chip` uses `0.96`, `.sy-tabbar__item` uses `0.92`,
`.sy-post-action` uses `0.92`, and the slider thumb scales *up* to `1.15`.

### 2.3 Hover and state transitions

`--sy-transition-hover` = `140ms cubic-bezier(0.4, 0, 0.2, 1)` for colour,
border, shadow and translate changes. Under `prefers-reduced-motion: reduce`
every duration token collapses to `1ms` and every transition recipe becomes
`120ms linear`.

### 2.4 Focus

Focus is never removed, only redrawn. `base.css` applies one global rule:

```css
:focus-visible {
  outline: 2px solid var(--sy-accent-solid);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--sy-bg-canvas);
  border-radius: var(--sy-radius-sm);
}
```

The inner brand ring plus the outer canvas ring is what lets one indicator
survive on any background, including a brand-coloured button. Under
`forced-colors: active` it falls back to `3px solid Highlight`. No component
overrides this; if a component appears to have no focus ring, that is a bug in
that component, not a licence to draw a new one.

### 2.5 Disabled and loading

Every control exposes a disabled state, and every control that can be busy
exposes a loading state, because a control that cannot express "busy" forces
every screen to invent its own. Disabled buttons render at `opacity: 0.42` with
`cursor: not-allowed`. Loading buttons keep their measured width so a row of
buttons does not reflow when one is busy.

### 2.6 Colour is never the only signal

State always carries a second channel: an icon, a fill change, a weight change,
a border, or text. Selected navigation swaps stroke for fill. Field errors are
always text with an icon. Connection health is a dot *and* a number.

### 2.7 Light-first behaviours

SYLORA is light-first, and the two themes do not share physics. Five rules run
through every component below; each is implemented once, in `components.css`,
under a `[data-theme='dark']` override rather than the other way round.

| Rule | Light (`:root`) | Dark |
|---|---|---|
| Elevated surfaces have no border | `.sy-surface` border is `transparent`; the shadow carries the edge | `--sy-border-subtle` hairline, because a shadow on near-black cannot define an edge |
| Shadows are cool, never black | `--shadow-color-NN` is `oklch(34% 0.042 266 / a)` | `oklch(3% 0.012 268 / a)` |
| Elevation means more light | Raised surfaces move *toward white*: `bg-canvas` is `porcelain.2` and a card is `porcelain.1` | Raised surfaces climb the ramp: canvas is `porcelain.1`, a card `porcelain.2` |
| Emphasis is a shadow, not a glow | Primary buttons rise and their shadow deepens, tinted with their own fill | Primary buttons keep a halo at `--sy-refract-bloom-spread` |
| Inputs invert | Fields are recessed wells: `--sy-bg-canvas` fill plus `--sy-elevation-sunken` | `--sy-bg-raised` fill, no inset shadow |

The inversion in the last row is the one that changes how a screen is read.
Everything raised is a control; everything recessed is a place to type. A form
is scannable at a glance because of it, and that only works if no screen
overrides it.

The signature treatment for *importance* is refraction, not glow: `.sy-refract`
draws a spectral hairline whose hue travels cyan to indigo to magenta. No
component in this document applies it — it is rationed to brand surfaces,
AI-authored content and the single most important action in a view, and screens
apply it deliberately. See `FOUNDATIONS.md`.

---

## 3. Icon system

`Icon` is the only way an icon enters a screen.
See `src/design-system/icons/Icon.tsx`.

### 3.1 Construction grid

| Property | Value |
|---|---|
| Canvas | 24 x 24 |
| Live area | 20 x 20 (2px keyline on every side) |
| Stroke | 1.6px at 24px, scaled linearly with rendered size |
| Terminals | `stroke-linecap: round`, `stroke-linejoin: round` |
| Corner radius | 2px on squares, 3px on containers |
| Key angles | 0, 30, 45, 60, 90 only |

### 3.2 Why stroke and not fill

Stroked icons hold their weight next to 15px Instrument Sans body text. Filled icons at
the same size read roughly 40% heavier and pull the eye away from content. Fill
is reserved for *selected* navigation, where the weight change **is** the state
change — which is why the rail and tab bar swap stroke for fill rather than only
changing colour. Colour alone would fail for colour-blind users.

`filled` adds `.sy-icon--filled`, which fills `path`, `circle` and `rect` with
`color-mix(in oklab, currentColor 20%, transparent)` — a translucent fill under
the existing stroke, not a different glyph.

### 3.3 Why 1.6, and optical scaling

At 1.5 the icons look frail beside Instrument Sans at the light theme's body
weight of 410; at 2 they compete with headings. 1.6 sits on the same optical
weight as body text, which is what makes an icon-and-label pair read as one
object. The same 1.6 holds in dark theme, where body copy drops to 380: the
stroke is a rendered length, and a hairline does not bloom the way a letterform
does.

Stroke width is derived from the rendered size:
`strokeWidth = 1.6 * 24 / size`. The viewBox is always `0 0 24 24`, so this
keeps the *rendered* stroke at 1.6 device-independent pixels at every size. A
constant `strokeWidth` across sizes is the single most common flaw in icon
systems, and this is the line that avoids it.

| Rendered size | `strokeWidth` attribute | Rendered stroke |
|---|---|---|
| 12px | 3.2 | 1.6px |
| 16px | 2.4 | 1.6px |
| 20px (default) | 1.92 | 1.6px |
| 24px | 1.6 | 1.6px |
| 32px | 1.2 | 1.6px |

### 3.4 Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `IconName` | — | Required. Key of `ICON_PATHS`. |
| `size` | `number` | `20` | Rendered width and height in px. |
| `title` | `string` | — | Accessible name. Omit for decorative icons beside a text label. |
| `filled` | `boolean` | `false` | Selected-navigation state: adds a translucent fill under the stroke. |
| …rest | `SVGProps<SVGSVGElement>` | — | Spread onto the `<svg>`. |

With `title`, the icon renders `role="img"` and `aria-label={title}`. Without
it, the icon renders `role="presentation"` and `aria-hidden="true"` — announcing
both the icon and its adjacent label would make a screen reader say everything
twice.

`.sy-icon` restores `display: inline-block` and `vertical-align: middle`,
because the base reset blockifies every `svg` and an icon placed mid-sentence
would otherwise break the line.

### 3.5 Complete icon name list

Grouped exactly as the registry groups them, so gaps are visible when a new
screen is designed.

| Group | Names |
|---|---|
| Primary navigation | `home`, `feed`, `search`, `discover`, `live`, `studio`, `chat`, `messages`, `notifications`, `profile`, `settings` |
| Community and social | `community`, `friends`, `follow`, `heart`, `comment`, `share`, `bookmark`, `repost`, `flag` |
| Media | `play`, `pause`, `stop`, `skipForward`, `skipBack`, `volume`, `volumeOff`, `mic`, `micOff`, `camera`, `cameraOff`, `screenShare`, `video`, `image`, `fullscreen`, `captions` |
| Creation | `plus`, `minus`, `edit`, `trash`, `upload`, `download`, `attach`, `send`, `emoji`, `sliders`, `filter`, `grid`, `list`, `layers` |
| AI | `sparkles`, `aiAssistant`, `wand`, `brain`, `translate` |
| Commerce and money | `wallet`, `marketplace`, `gift`, `coin`, `creditCard`, `premium`, `inventory`, `tag` |
| Learning and events | `courses`, `events`, `certificate` |
| Gamification | `trophy`, `achievement`, `mission`, `leaderboard`, `streak` |
| Analytics | `analytics`, `trendUp`, `trendDown`, `pulse`, `pieChart`, `eye`, `clock` |
| Admin and moderation | `admin`, `moderation`, `business`, `verified`, `lock`, `key` |
| Utility | `check`, `close`, `chevronRight`, `chevronLeft`, `chevronDown`, `chevronUp`, `arrowRight`, `arrowLeft`, `arrowUp`, `more`, `moreVertical`, `info`, `warning`, `error`, `success`, `help`, `refresh`, `external`, `link`, `globe`, `moon`, `sun`, `logout`, `menu`, `pin`, `calendar`, `mobile`, `desktop`, `tablet` |

`ICON_NAMES` exports the same list at runtime. Three glyphs (`more`,
`moreVertical`, `mission`) contain deliberately filled dots with
`stroke="none"`; everything else is pure stroke.

**Do**

- Use `title` only when the icon is the sole carrier of meaning.
- Pick from the list. A missing icon is a request to add a path to the
  registry, not a reason to inline an SVG in a screen.
- Let `size` come from the control's size row in the table in section 2.1.

**Don't**

- Don't use `filled` for anything other than a selected navigation destination.
- Don't scale an icon with CSS `transform` — that scales the stroke with it and
  breaks the optical weight rule.
- Don't put an icon-only control on screen without `IconButton`'s `label`.

---

## 4. Actions

### 4.1 Button

**What it is for.** Every action a user can take that is not navigation between
primary destinations. One `Button` implementation covers seven tones and six
variants.

**When not to use it.** Do not use `Button` for an icon-only control — use
`IconButton`, which forces an accessible name. Do not use `variant="link"` for
in-paragraph navigation that should be an anchor; the component always renders a
`<button>`. Do not use a second `variant="primary"` in the same view: one per
view, because two primaries means no primary.

**Anatomy.**

```
button.sy-btn.sy-btn--{variant}.sy-btn--{size}.sy-tone-{tone}
├── span.sy-btn__spinner        (only while loading, absolutely centred)
└── span.sy-btn__content        (opacity 0 while loading)
    ├── Icon                    (icon prop)
    ├── span.sy-btn__label      (children)
    └── Icon                    (iconEnd prop)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'outline' \| 'glass' \| 'link'` | `'secondary'` | Visual weight. |
| `tone` | `Tone` | `'accent'` | Colour family. Ignored by `secondary` and `ghost`. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Height, padding, gap, icon size and radius. |
| `icon` | `IconName` | — | Leading icon. Never the only content. |
| `iconEnd` | `IconName` | — | Trailing icon. For disclosure and external-link affordances. |
| `loading` | `boolean` | `false` | Replaces the label with a spinner, keeping the measured width. Also disables the button and sets `aria-busy`. |
| `fullWidth` | `boolean` | `false` | Adds `.sy-btn--block` (`inline-size: 100%`). |
| `children` | `ReactNode` | — | The label. |
| `disabled` | `boolean` | `false` | Standard HTML disabled. |
| …rest | `ButtonHTMLAttributes<HTMLButtonElement>` | — | Spread last, so `type` can be overridden; defaults to `type="button"`. |

**Sizing.**

| Size | Height | Padding-inline | Gap | Icon | Radius | Font size |
|---|---|---|---|---|---|---|
| `xs` | 24px | 8px | 4px | 14px | 6px | 13.5px (`--sy-type-label-size`) |
| `sm` | 32px | 12px | 6px | 16px | 10px | 13.5px |
| `md` | 40px | 16px | 8px | 18px | 10px | 13.5px |
| `lg` | 48px | 20px | 10px | 20px | 14px | 13.5px |
| `xl` | 56px | 24px | 12px | 22px | 14px | 15px (`--sy-type-body-size`) |

`variant="link"` overrides height to `auto` and padding to `0` at every size.
`.sy-btn--icon` (applied by `IconButton`) sets `padding-inline: 0` and
`inline-size: var(--btn-height)`, making the control square.

**Variants and the exact tokens they resolve to.**

| Variant | Background | Foreground | Border | Hover |
|---|---|---|---|---|
| `primary` | `--tone-solid` | `--tone-on-solid` | transparent | background `--tone-solid-hover`, and in light theme it *rises*: `translate: 0 -1px` with the shadow deepening and spreading |
| `secondary` | `--sy-bg-surface` (light) / `--sy-bg-raised` (dark) | `--sy-fg-default` | `--sy-border-default` | light: border `--sy-border-strong`, shadow `--sy-elevation-raised`; dark: background `--sy-bg-hover` |
| `outline` | transparent | `--tone-fg` | `--tone-border` | background `--tone-bg` |
| `ghost` | transparent | `--sy-fg-muted` | transparent | background `--sy-bg-hover`, foreground `--sy-fg-default` |
| `glass` | `--sy-vellum-panel-fill` + `blur(26px) saturate(1.7)` behind an `@supports` guard | `--sy-fg-default` | `--sy-vellum-panel-rim` | border `--sy-border-strong` |
| `link` | transparent | `--tone-fg` | none | underline decoration goes from `color-mix(in oklab, currentColor 35%, transparent)` to `currentColor`; `text-underline-offset: 3px` |

**Primary is a shadow in light and a halo in dark.** A glow is invisible on
white, so on a bright ground the primary button behaves the way a physical
object does — it sits above the page and its shadow deepens as it lifts. The
shadow is mixed from the button's own fill rather than from the neutral shadow
colour, because that is what light does when it bounces off a saturated surface
onto the paper beneath it:

| Theme | Rest | Hover |
|---|---|---|
| Light (`:root`) | `0 1px 2px -1px` at 40% of `--tone-solid`, plus `0 4px 12px -4px` at 32% | `translate: 0 -1px`; `0 2px 4px -2px` at 44%, plus `0 10px 22px -6px` at 40% |
| Dark | `box-shadow: none` | no translate; `0 0 var(--sy-refract-bloom-spread)` (24px) at 42% of `--tone-solid` |

`:active` returns `translate` to `0` in both themes, so the press cancels the
lift and the button reads as pushed back into the page.

**Secondary sits above the page, it is not cut into it.** In light theme the
fill is `--sy-bg-surface` — the near-white card colour, *brighter* than the
canvas — with a hairline edge and the same soft contact shadow a card gets. A
flat grey fill on porcelain would read as a disabled key. Dark theme keeps the
old behaviour: `--sy-bg-raised` fill, no shadow, background change on hover.

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | As above per variant. | — |
| Hover | Per-variant row above. `:not(:disabled)` guarded. | `--sy-transition-hover` (140ms, standard) |
| Focus-visible | Global double ring: 2px `--sy-accent-solid` outline, 2px offset, 4px `--sy-bg-canvas` outer ring. | instant |
| Active / pressed | `scale: 0.97`, `:not(:disabled)` guarded. | `--sy-transition-press` (80ms, standard) |
| Selected | Not a `Button` state. Use `Chip` (`aria-pressed`) or `Tabs` (`aria-selected`). | — |
| Disabled | `opacity: 0.42`, `cursor: not-allowed`, no hover, no press. | — |
| Loading | `disabled`, `aria-busy="true"`, `.sy-btn__content` at `opacity: 0`, `Spinner` centred at the size row's icon size. | spinner 640ms linear |
| Error | Not a `Button` state. Errors belong to `Field`, `Toast` or the screen. | — |

**Accessibility contract.**

- Renders `type="button"` by default, so it never submits a form accidentally.
- `loading` sets `aria-busy` in addition to showing a spinner; the spinner
  itself is `role="status"` with the accessible name "Loading".
- `disabled` removes it from the tab order — if the reason it is disabled is not
  visible on screen, say it in adjacent text.
- The visible label is the accessible name. Never rely on `title`.
- Any button below 44px tall (`xs`, `sm`) needs `.sy-touch-target` on touch
  surfaces; `IconButton` adds this automatically, plain `Button` does not.

**Do**

- Use exactly one `primary` button per view, on the action you want taken.
- Pair `icon` with a label; use `iconEnd` for "goes somewhere" affordances.
- Use `loading` rather than swapping the label for the word "Saving…".

**Don't**

- Don't use `tone` to decorate. `tone="danger"` means the action destroys
  something.
- Don't use `variant="glass"` over a flat background — the prop still applies
  the vellum recipe, and vellum with nothing behind it costs GPU time and
  contrast for no visual gain.
- Don't hand-roll a full-width button with CSS; use `fullWidth`.

### 4.2 IconButton

**What it is for.** A square, icon-only control where the meaning is
unambiguous from the glyph and space is scarce: overflow menus, close, media
transport, top-bar utilities.

**When not to use it.** If the action is important, unfamiliar, or the primary
action of a view, use a `Button` with a visible label. An icon plus a tooltip is
not a substitute for a label on a critical action, because tooltips do not exist
on touch.

**Anatomy.** A `Button` with `.sy-btn--icon` and `.sy-touch-target`, containing
a single `Icon` at the size row's icon size. No label span.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `IconName` | — | Required. |
| `label` | `string` | — | Required. Becomes both `aria-label` and `title`. |
| `variant` | `ButtonVariant` | `'secondary'` | Inherited from `Button`. |
| `tone` | `Tone` | `'accent'` | Inherited from `Button`. |
| `size` | `Size` | `'md'` | Also sets the square edge length. |
| `loading` | `boolean` | `false` | Inherited from `Button`. |
| …rest | `ButtonProps` minus `icon`, `iconEnd`, `children` | — | |

**Sizing.** Square: the width equals the `Button` height for the size. 24 / 32 /
40 / 48 / 56px, with 14 / 16 / 18 / 20 / 22px icons.

**States.** Identical to `Button`.

**Accessibility contract.**

- `label` is required by the type system — an icon-only control has no visible
  text to announce.
- `.sy-touch-target` guarantees a 44 x 44 hit area via an `::after`
  pseudo-element without changing the visual box, so `xs` and `sm` icon buttons
  remain tappable.
- `title` duplicates `label` for pointer users; it is a convenience, not the
  accessible name.

**Do**

- Write `label` as the action, not the glyph: "Post options", not "Three dots".
- Use `variant="ghost"` for utility density (top bars, card headers).

**Don't**

- Don't use `IconButton` for a destination — navigation lives in the rail and
  tab bar.
- Don't place two icon buttons with the same glyph and different meanings in one
  view.

---

## 5. Progress and status

### 5.1 Spinner

**What it is for.** Indeterminate busy state inside a control, most often
rendered automatically by `Button`'s `loading` prop.

**When not to use it.** Do not use a spinner where the shape of the incoming
content is known — use `Skeleton`, which tells the user what is arriving. Do not
use it where progress is measurable — use `Progress` or `ProgressRing`.

**Anatomy.** A single `span.sy-spinner`: a circle with a 2px border at
`color-mix(in oklab, currentColor 22%, transparent)` and a solid
`currentColor` top border.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `18` | Width and height in px, applied inline. |
| `className` | `string` | — | |

**States.** One: spinning. `sy-spin` runs 640ms linear, infinite. Under
`prefers-reduced-motion: reduce` the duration becomes 1600ms rather than
stopping, so the "busy" signal survives.

**Accessibility contract.** `role="status"` with `aria-label="Loading"`. It
inherits `currentColor`, so it is legible on any variant without configuration.

**Do / Don't**

- Do let `Button` own the spinner when the busy thing is a button.
- Do size it from the control's icon size when placing it manually.
- Don't stack multiple spinners in one region; one busy signal per region.
- Don't leave a spinner running with no timeout story — long waits need
  `Progress` or an explanatory message.

### 5.2 Progress

**What it is for.** A linear bar for measurable progress (upload, encode, goal
completion) or, with `value` omitted, an indeterminate activity bar for a whole
region.

**When not to use it.** Do not use it for a rating, a share-of-total, or a
comparison between two quantities — those are `Donut`, `BarChart`, or plain
text. Do not use the indeterminate form inside a button.

**Anatomy.**

```
div.sy-progress.sy-progress--{size}.sy-tone-{tone}[.is-indeterminate]
└── span.sy-progress__fill
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | — | 0–100. Omit for an indeterminate bar. |
| `tone` | `Tone` | `'accent'` | Drives the fill via `--tone-solid`. |
| `size` | `'sm' \| 'md'` | `'md'` | Track thickness. |
| `label` | `string` | — | Accessible name (`aria-label`). |
| `className` | `string` | — | |

**Sizing.**

| Size | Track height | Radius | Track colour | Fill colour |
|---|---|---|---|---|
| `sm` | 4px | `--sy-radius-pill` | `--sy-bg-active` | `--tone-solid` |
| `md` | 6px | `--sy-radius-pill` | `--sy-bg-active` | `--tone-solid` |

**States.**

| State | Rendering |
|---|---|
| Determinate | `inline-size: {value}%`, transitioned with `--sy-transition-enter` (200ms, enter easing) so a value change reads as motion, not a jump. |
| Indeterminate | Fill fixed at 40% width, `sy-progress-slide` translating `-100%` → `250%` over 1.4s with `--sy-ease-standard`, infinite. `aria-valuenow` is omitted. |
| Disabled / error | Not modelled. Express failure with a `Toast` or field error, not a red bar. |

**Accessibility contract.** `role="progressbar"`, `aria-valuemin={0}`,
`aria-valuemax={100}`, `aria-valuenow` rounded from `value` and omitted while
indeterminate, `aria-label={label}`. Always pass `label` — a bar with no name is
an unlabelled widget.

**Do / Don't**

- Do show the numeric value in adjacent text as well as the bar.
- Do use `tone="success"` for goals achieved and `tone="live"` for realtime
  throughput.
- Don't animate a determinate bar backwards; reduce the number instead.
- Don't use `size="sm"` for the primary progress of a screen; 4px is a garnish.

### 5.3 ProgressRing

**What it is for.** Circular progress where the surrounding area is needed for a
value: goals, storage, mission completion, story rings.

**When not to use it.** Do not use a ring for more than one series — that is a
`Donut`. Do not use it below roughly 32px, where the arc stops being readable.

**Anatomy.**

```
div.sy-ring.sy-tone-{tone}
├── svg (aria-hidden)
│   ├── circle.sy-ring__track
│   └── circle.sy-ring__fill      (rotated -90°, stroke-dasharray arc)
└── span.sy-ring__content         (children, absolutely centred)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | — | Required. Clamped to 0–100. |
| `size` | `number` | `56` | Outer diameter in px. |
| `thickness` | `number` | `4` | Stroke width in px. |
| `tone` | `Tone` | `'accent'` | Arc colour via `--tone-solid`. |
| `children` | `ReactNode` | — | Centre content, usually the value as text. |
| `label` | `string` | — | Accessible name. |

**Geometry.** `radius = (size - thickness) / 2`;
`circumference = 2πr`; `strokeDashoffset = circumference * (1 - value / 100)`.
The fill circle is rotated `-90°` about its centre so the arc starts at 12
o'clock, and uses `stroke-linecap: round`.

**States.**

| State | Rendering |
|---|---|
| Rest | Track `--sy-bg-active`, fill `--tone-solid`. |
| Value change | `stroke-dashoffset` transitions over `--sy-transition-enter` (200ms). |
| 0% / 100% | Rendered by clamping; no special case. A round cap means 0% still shows a dot of colour. |

**Accessibility contract.** `role="progressbar"` with `aria-valuenow`,
`aria-valuemin`, `aria-valuemax` and `aria-label` on the wrapper; the `svg` is
`aria-hidden`. Centre `children` are visual; they are not the accessible name.

**Do / Don't**

- Do put the percentage or a fraction in `children` so the value is readable
  without measuring an arc.
- Do keep `thickness` between 4 and 8 for sizes under 100px.
- Don't use a ring to show a countdown without also showing the remaining time
  as text.
- Don't tone a ring `danger` for "nearly full" unless full is genuinely a
  failure.

---

## 6. Containers

### 6.1 Surface

**What it is for.** Every panel, card, sheet and well in the product. `Surface`
owns background, border, radius, padding, elevation and the optional vellum
treatment, so no screen has to assemble those four things consistently by hand.

**When not to use it.** Do not wrap plain text sections in a `Surface` just to
group them — `ScreenSection` groups without drawing a box. Do not use
`interactive` unless the whole surface is genuinely one click target with a real
control inside it; `interactive` styles the hover but does not make a `div`
focusable or operable by keyboard.

**Anatomy.** A single polymorphic element carrying
`.sy-surface`, `.sy-surface--{elevation}`, `.sy-surface--radius-{radius}`,
optionally `.sy-vellum` (+ modifier) and `.sy-surface--interactive`, with
`--sy-surface-padding` set inline.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `elevation` | `'flat' \| 'sunken' \| 'surface' \| 'raised' \| 'overlay' \| 'lifted'` | `'surface'` | Depth level. |
| `glass` | `false \| 'veil' \| 'panel' \| 'dome'` | `false` | Vellum recipe. The prop kept its old name; the classes and tokens it applies are all `vellum`. Only correct over media or a scrolling backdrop. |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Maps to a space token. |
| `radius` | `'md' \| 'lg' \| 'xl' \| '2xl'` | `'lg'` | Corner radius. |
| `interactive` | `boolean` | `false` | Adds hover lift and pointer cursor. |
| `as` | `'div' \| 'article' \| 'section' \| 'aside' \| 'li'` | `'div'` | Rendered element. |
| …rest | `HTMLAttributes<HTMLDivElement>` | — | |

**Padding and radius maps.**

| `padding` | Token | px | | `radius` | Token | px |
|---|---|---|---|---|---|---|
| `none` | `--sy-space-0` | 0 | | `md` | `--sy-radius-md` | 10 |
| `sm` | `--sy-space-3` | 12 | | `lg` | `--sy-radius-lg` | 14 |
| `md` | `--sy-space-4` | 16 | | `xl` | `--sy-radius-xl` | 20 |
| `lg` | `--sy-space-5` | 20 | | `2xl` | `--sy-radius-2xl` | 28 |
| `xl` | `--sy-space-6` | 24 | | | | |

Radii are *continuous*: a nested child's radius should be the parent radius
minus the parent padding. `concentricRadius(outer, padding)` in `space.ts`
computes it — never guess. A 20px-radius card with 12px padding holds an
8px-radius child.

**Elevation levels.**

| `elevation` | Background | Shadow token | Typical use |
|---|---|---|---|
| `flat` | transparent | none | Page canvas and cards that only need layout, not depth. |
| `sunken` | `--sy-bg-sunken` | `--sy-elevation-sunken` | Input wells, track grooves, inset media, segmented-control tracks. |
| `surface` | `--sy-bg-surface` (the base `.sy-surface` fill) | `--sy-elevation-surface` | Cards, list rows, panels resting on the page. |
| `raised` | `--sy-bg-raised` | `--sy-elevation-raised` | Hovered cards, dropdowns, popovers, floating controls. |
| `overlay` | `--sy-bg-raised` | `--sy-elevation-overlay` | Dialogs, sheets, command palette. |
| `lifted` | `--sy-bg-surface` | `--sy-elevation-lifted` | Dragged objects, the single focused element in a spotlight state. |

**An elevated surface has no border in light theme.** `.sy-surface` declares
`border: 1px solid transparent`, and only `[data-theme='dark'] .sy-surface`
paints it `--sy-border-subtle`. Shadow carries the edge on a bright ground,
exactly as it does for a real object on paper; border-plus-shadow is the single
most reliable way to make a light interface look like a form from 2012. Dark
theme keeps the hairline, because a shadow on near-black cannot define an edge
on its own. `flat` is transparent in both.

`--sy-bg-raised` and `--sy-bg-surface` both resolve to `porcelain.1` in light,
so `raised` and `overlay` separate from `surface` by shadow alone. In dark they
are two different steps (`porcelain.3` and `porcelain.2`) and the fill does the
work. This is the per-theme structural mapping in `build-tokens.ts`, not a
component decision.

The fills are declared inside `:where()`, which strips their specificity to
zero. Depth and *material* are two separate decisions, and a surface must be
able to be raised **and** refracting at the same time — without the zero-
specificity wrapper, `.sy-surface--raised` and `.sy-refract` are both one class
deep, the later stylesheet wins, and the spectral edge silently never paints.
Shadows keep their normal specificity, because they compose rather than
conflict.

**Vellum mapping.** The prop is still called `glass`; everything it applies is
named `vellum`.

| `glass` value | Classes applied | Blur / saturate | Brightness (light / dark) | Fill / rim tokens |
|---|---|---|---|---|
| `'veil'` | `.sy-vellum .sy-vellum--veil` | 14px / 1.5 | 1.06 / 0.96 | `--sy-vellum-veil-fill`, `--sy-vellum-veil-rim` |
| `'panel'` | `.sy-vellum` only | 26px / 1.7 | 1.08 / 0.94 | `--sy-vellum-panel-fill`, `--sy-vellum-panel-rim` |
| `'dome'` | `.sy-vellum .sy-vellum--dome` | 44px / 1.9 | 1.10 / 0.92 | `--sy-vellum-dome-fill`, `--sy-vellum-dome-rim` |

`.sy-vellum` *is* the panel recipe; there is no `.sy-vellum--panel` class. The
brightness above 1 in light theme is the whole point of the material: ordinary
frosted glass darkens what is behind it, which on a bright product reads as a
grey smear, while lifting brightness under the blur reproduces fine translucent
paper held over an image. A fourth recipe, `scrim` (10px blur, no brightness
change), exists in `elevation.ts` for the backdrop behind a modal and is not
reachable from this prop.

Without `backdrop-filter` support the surface falls back to opaque
`--sy-bg-surface` with a `--sy-border-subtle` edge rather than becoming
unreadable, and under `prefers-contrast: more` all vellum becomes opaque with a
`--sy-border-interactive` border.

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | Per elevation row. | — |
| Hover (`interactive`) | `translate: 0 -2px` and shadow `--sy-elevation-raised`; in dark theme the border also goes to `--sy-border-strong`. The lift is 2px — enough to read as a response, small enough that a grid of cards does not feel like it is boiling as the pointer crosses it. | `--sy-transition-hover` |
| Active (`interactive`) | `translate: 0 0` — the card settles back under the press. | `--sy-transition-hover` |
| Focus-visible | Only if the element itself is focusable. A `Surface` is not focusable by default. | — |
| Disabled / loading / error | Not modelled. Compose with `Skeleton`, `EmptyState` or a disabled control inside. | — |

**Accessibility contract.**

- Choose `as` to match the meaning: `article` for a self-contained item,
  `section` for a titled region (give it an accessible name), `li` inside a
  list, `aside` for complementary content.
- `interactive` is presentation only. The click target must be a real `button`
  or `a` inside the surface, or the surface must be given a role, a `tabIndex`
  and keyboard handlers by the screen.
- Elevation is never the only signal of importance — a modal also needs a
  scrim, a heading and focus management.

**Do**

- Do use `padding="none"` when the child component supplies its own padding
  (`PostCard` and `StreamCard` both do).
- Do keep radius concentric with padding when nesting surfaces.
- Do reserve `overlay` and `lifted` for genuinely floating layers.

**Don't**

- Don't apply `glass` to an ordinary card on a flat background: vellum with
  nothing behind it is blur with nothing to blur, at real GPU cost, and reduced
  text contrast for no reason. It belongs over *moving or photographic* content
  — stream chrome, media controls, navigation above a scrolling feed.
- Don't nest more than two elevations deep; beyond that the steps stop being
  perceptible.
- Don't use `interactive` on a surface containing several independent actions —
  the whole-card hover then lies about what is clickable.

---

## 7. Labels and selection

### 7.1 Badge

**What it is for.** A small, non-interactive status or category label: a plan
tier, a content category, a count, a state such as "Draft" or "Verified".

**When not to use it.** If it can be clicked or toggled, it is a `Chip`. If it
announces a live broadcast, it is a `LiveBadge`. If it is a number attached to a
navigation destination, the rail and tab bar have their own badge elements.

**Anatomy.** A single `span.sy-badge.sy-badge--{variant}.sy-badge--{size}
.sy-tone-{tone}` containing an optional `Icon` and the children.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `Tone` | `'neutral'` | Note the default differs from most components. |
| `variant` | `'soft' \| 'solid' \| 'outline'` | `'soft'` | Fill treatment. |
| `size` | `'sm' \| 'md'` | `'sm'` | Height and padding. |
| `icon` | `IconName` | — | Leading icon: 12px at `sm`, 14px at `md`. |
| …rest | `HTMLAttributes<HTMLSpanElement>` | — | |

**Sizing.**

| Size | Height | Padding-inline | Icon | Radius | Type |
|---|---|---|---|---|---|
| `sm` | 20px | 8px (`--sy-space-2`) | 12px | 6px (`--sy-radius-sm`) | 12px `--sy-type-caption-size`, weight 550, tracking 0.01em |
| `md` | 26px | 10px (`--sy-space-2_5`) | 14px | 6px | same |

**Variants.**

| Variant | Background | Foreground | Border |
|---|---|---|---|
| `soft` | `--tone-bg` | `--tone-fg` | transparent |
| `solid` | `--tone-solid` | `--tone-on-solid` | transparent |
| `outline` | transparent | `--tone-fg` | `--tone-border` |

**States.** A badge has exactly one state. There is no hover, press, focus,
selected, disabled, loading or error rendering, because it is not interactive.

**Accessibility contract.** The text inside the badge is the meaning; the colour
is reinforcement. A badge that conveys state that exists nowhere else in the row
must read as a complete phrase ("Draft", not "D"). The optional `icon` is
decorative and rendered `aria-hidden`.

**Do**

- Do use `neutral` for categories and `success`/`warning`/`danger` for states.
- Do keep badge text to one or two words.

**Don't**

- Don't attach `onClick` to a badge; swap it for a `Chip` or `Button`.
- Don't use `solid` for more than one badge in a row — solid fills compete with
  primary buttons.

### 7.2 LiveBadge

**What it is for.** The single, canonical "this is broadcasting now" signal. The
pulsing dot is the product's most repeated signal, so it gets a dedicated
component: one implementation, one timing, one reduced-motion fallback.

**When not to use it.** Do not use it for "recently live", "scheduled" or
"replay" — those are `Badge` with an appropriate tone. Do not use it as a
decorative accent on a card that is not live.

**Anatomy.**

```
span.sy-live-badge
├── span.sy-live-badge__dot     (aria-hidden)
├── "LIVE"                       (the label text carries the meaning)
└── span.sy-live-badge__count   (optional viewers, divided by a hairline)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'LIVE'` | The word that carries the meaning. |
| `viewers` | `string` | — | Pre-formatted viewer count, e.g. `"12.4K"`. |

**Sizing and tokens.**

| Property | Value |
|---|---|
| Height | 22px |
| Padding-inline | 8px (`--sy-space-2`) |
| Radius | `--sy-radius-sm` (6px) |
| Background | `--sy-rose-9` |
| Foreground | `--sy-on-danger` |
| Type | 11px (`--sy-type-overline-size`), weight 700, tracking 0.08em |
| Dot | 6px circle, `currentColor` |
| Count divider | 1px inline-start border at `color-mix(in oklab, currentColor 30%, transparent)`, tabular figures |

**States.**

| State | Rendering |
|---|---|
| Rest | Dot animates `sy-live-pulse` — opacity 1 → 0.45 and scale 1 → 0.82 at the midpoint — over 1.8s with `--sy-ease-standard`, infinite. 1.8s is matched to a resting heart rate for calm urgency. |
| Reduced motion | `animation: none`. The dot stays fully visible; the word LIVE is unaffected. |

**Accessibility contract.** The dot is `aria-hidden`; the word carries the
meaning, so the signal survives with animation disabled, in greyscale, and for
screen-reader users. The viewer count is rendered with tabular figures so it
does not jump width as it ticks.

**Do / Don't**

- Do place it in the top-left of stream media, where the eye lands first.
- Do pass `viewers` rather than rendering a second count beside it.
- Don't recolour it per tone; it is deliberately a single fixed treatment. It
  is `rose` — the danger family — rather than the `pulse` family that
  `tone="live"` resolves to, because `pulse` marks realtime *state* (presence,
  sync, connection health) while a red record light is a fifty-year-old
  convention viewers read without decoding.
- Don't animate anything else nearby — one pulsing element per card.

### 7.3 Chip

**What it is for.** A compact, *interactive* toggle: filter selections, tag
pickers, category switches, removable tokens in an input.

**When not to use it.** Do not use a chip as a static label (`Badge`), as the
primary action of a view (`Button`), or as a set of mutually exclusive view
switches where only one may be active (`Tabs` with `variant="pill"` or
`segmented`).

**Anatomy.**

Without `onRemove`, a chip is one button:

```
button.sy-chip[.is-selected].sy-tone-{tone}   aria-pressed
├── Icon                     (optional, 14px)
└── span                     (children)
```

With `onRemove`, it is **two independent buttons inside a shared pill**. A
removable chip is two controls, so it is two buttons rather than a button nested
in a button: nesting is invalid HTML and forces the inner control out of the tab
order, which leaves keyboard users with no way to remove anything.

```
span.sy-chip.sy-chip--removable[.is-selected].sy-tone-{tone}
├── button.sy-chip__main     aria-pressed; receives ...rest
│   ├── Icon                 (optional, 14px)
│   └── span                 (children)
└── button.sy-chip__remove   aria-label; close icon 12px; stops propagation
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `selected` | `boolean` | `false` | Drives `.is-selected` and `aria-pressed`. |
| `icon` | `IconName` | — | Leading icon, always 14px. |
| `onRemove` | `() => void` | — | Renders the remove affordance and is called on its click. |
| `removeLabel` | `string` | `` `Remove ${children}` `` when children is a string, else `'Remove'` | Accessible name for the remove control, so a screen reader announces "Remove Photography" rather than a bare "Remove" repeated once per chip. |
| `tone` | `Tone` | `'accent'` | Selected-state colours. |
| …rest | `ButtonHTMLAttributes<HTMLButtonElement>` | — | |

**Sizing.**

| Property | Value |
|---|---|
| Height | 32px |
| Padding-inline | 12px (`--sy-space-3`); 4px (`--sy-space-1`) when removable, so the remove control sits inside the pill |
| Gap | 6px (`--sy-space-1_5`); 4px when removable |
| Radius | `--sy-radius-pill` |
| Type | 13.5px (`--sy-type-label-size`), weight 500 |
| Icon | 14px; remove glyph 12px inside a 20px circle filled with `color-mix(in oklab, currentColor 14%, transparent)`, rising to 26% on hover |
| `.sy-chip__main` | Full-height, `padding-inline: var(--sy-space-2)`, `border-radius: var(--sy-radius-pill)`, `font: inherit` |

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | Background `--sy-bg-raised`, border `--sy-border-default`, foreground `--sy-fg-muted`. | — |
| Hover | Border `--sy-border-strong`, foreground `--sy-fg-default`. | `--sy-transition-hover` |
| Focus-visible | Global double ring. | instant |
| Active | `scale: 0.96`. | `--sy-transition-press` (80ms) |
| Selected | Background `--tone-bg`, border `--tone-solid`, foreground `--tone-fg`, plus `aria-pressed="true"`. | `--sy-transition-hover` |
| Disabled | Native `disabled` (inherited from `button`); no dedicated styling beyond the browser default — pass `disabled` sparingly. |
| Loading / error | Not modelled. |

**Accessibility contract.**

- `aria-pressed` communicates selection; the border and fill change is the
  visual redundancy, so selection is not colour-only. When the chip is
  removable, `aria-pressed` lives on `.sy-chip__main`, not on the wrapper.
- The remove affordance is a real sibling `button` in the tab order, so keyboard
  users can remove a chip without the screen adding a Backspace handler. Its
  click handler calls `stopPropagation` before `onRemove`, so removing does not
  also toggle selection.
- `removeLabel` should name the thing being removed. It defaults to
  `` `Remove ${children}` `` when `children` is a string, so a screen reader
  announces "Remove Photography" rather than a bare "Remove" repeated once per
  chip.
- `...rest` is spread onto `.sy-chip__main` in the removable form and onto the
  chip button itself otherwise, so `onClick` lands on the toggle either way.

**Do**

- Do use `aria-pressed` semantics as intended: chips are toggles, not links.
- Do keep chip labels to a single short phrase so a row of them scans.

**Don't**

- Don't rely on the remove affordance as the only way to deselect — removing a
  token and unselecting a filter are different intents.
- Don't mix selected and unselected chips of different tones in the same row —
  the tone should encode the group, not the item.

---

## 8. Identity

### 8.1 Avatar

**What it is for.** Representing a person or account anywhere they appear.

**When not to use it.** Do not use `Avatar` for a brand, product or community
tile — those use `Media` or `.sy-tile-icon`. Do not use it as a decorative
circle.

**Anatomy.**

```
span.sy-avatar[.sy-avatar--ring-story|--ring-live]     (--avatar-size, --avatar-hue)
├── span.sy-avatar__inner
│   └── img  |  span.sy-avatar__initials
├── span.sy-avatar__presence.is-{online|away|offline}  (optional)
└── span.sy-avatar__verified                            (optional)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Required. Drives initials and the fallback hue. |
| `src` | `string` | — | Image URL. Rendered with `alt=""`, `loading="lazy"`, `decoding="async"`. |
| `size` | `number` | `40` | Diameter in px, applied as `--avatar-size`. |
| `ring` | `false \| 'story' \| 'live'` | `false` | Draws a ring outside the avatar. `'story'` uses the `prism` gradient; `'live'` is solid `rose`. |
| `presence` | `'online' \| 'away' \| 'offline'` | — | Presence dot. |
| `verified` | `boolean` | — | Verified check badge. |
| `className` | `string` | — | |
| `style` | `CSSProperties` | — | Merged after the size and hue properties. |

**The fallback is not a generic silhouette.** It is the person's initials — the
first letter of up to the first two words, uppercased — over a hue derived
deterministically from their name (`hash = (hash * 31 + charCode) % 360`). A
directory of 400 people therefore looks like 400 individuals rather than 400
identical grey circles, with zero extra data, and the same person gets the same
colour in every session. The fill is
`linear-gradient(140deg, oklch(52% 0.105 H), oklch(43% 0.12 H+48))` with white
text at `fontSize = size * 0.36`, set in the display face
(`--sy-font-display`, Instrument Serif) at weight 600.

Both the lightness and the chroma are pinned lower than they look like they
need to be, and for two different reasons. Lightness is low enough that the
white initials clear 4.5:1 at *every* hue — a fill tuned by eye passes on violet
and fails on yellow, because WCAG luminance weights green at 0.7152 and blue at
0.0722. Chroma is restrained because a column of fully saturated discs on
porcelain out-shouts the names beside them.

**Sizing.** Size is applied through `--avatar-size` rather than a fixed width,
so a screen stylesheet can make an avatar responsive without out-specifying an
inline style. Sizes used across the product: 28 (`AvatarGroup` default), 34–36
(stream cards, live chrome), 40 (`PostCard`, default), 56 (`CreatorCard`).

| Sub-element | Geometry |
|---|---|
| Ring | `::before` at `inset: -3px`, `padding: 2px`, masked so only the ring paints. `story` uses `--sy-gradient-prism`; `live` uses `--sy-rose-9`. Drawn outside the avatar so it never crops it. |
| Presence dot | 28% of the avatar, minimum 8 x 8px, 2px `--sy-bg-surface` border. `online` `--sy-verdigris-9`, `away` `--sy-solar-9`, `offline` `--sy-porcelain-8`. |
| Verified | Bottom-inline-end, `verified` icon at `max(12, size * 0.34)`, `--sy-aether-9` on a `--sy-bg-surface` disc. |

**States.** No hover, press or focus state — `Avatar` is not interactive. Wrap
it in a `Button` or `a` when it must be clickable.

**Accessibility contract.**

- The image is `alt=""` and the initials are `aria-hidden`: the person's name
  must be present as text beside the avatar. An avatar is never the only place a
  name appears.
- `presence` and `verified` render `aria-label` on plain `span` elements, which
  screen readers do not reliably announce. Treat them as visual reinforcement
  and put the same information in text when it matters.

**Do / Don't**

- Do pass the full display name so initials and hue are stable.
- Do use `ring="live"` only while the person is actually broadcasting.
- Don't use presence colour as the only indicator of availability.
- Don't set `width`/`height` in CSS; set `size` or override `--avatar-size`.

### 8.2 AvatarGroup

**What it is for.** Showing that several people are involved — participants,
attendees, collaborators — in the width of roughly two avatars.

**When not to use it.** Do not use it where the individual identities matter;
use a list. Do not use it above about six visible faces — that is a count, not a
group.

**Anatomy.**

```
span.sy-avatar-group                       (--overlap: size * 0.3)
├── Avatar × min(people.length, max)
└── span.sy-avatar-group__overflow          "+N"
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `people` | `{ name: string; src?: string }[]` | — | Required. |
| `max` | `number` | `4` | Faces shown before overflowing. |
| `size` | `number` | `28` | Diameter of each face. |

**Sizing.** Each subsequent avatar is pulled back by `size * 0.3`. Every face
and the overflow chip carry a `0 0 0 2px var(--sy-bg-surface)` ring so they
separate against the surface. The overflow chip uses `--sy-bg-active` with
`--sy-fg-muted` text at `size * 0.34`.

**States.** None; not interactive.

**Accessibility contract.** The group is decorative in the same sense as
`Avatar`: names are not announced. Always render a text summary nearby, for
example "Priya, Sam and 12 others".

**Do / Don't**

- Do keep `max` at 3–5 so the "+N" stays meaningful.
- Do pass people in a stable order — the component does not sort.
- Don't use the group as the only representation of a participant list.
- Don't mix sizes within one row of groups.

---

## 9. Forms

### 9.1 Field

**What it is for.** The label / hint / error shell every input sits in. It owns
label association and description wiring so no individual input can get it
wrong. Screens rarely use it directly — `Input`, `Textarea` and `Select` all
wrap themselves in it — but it is exported for custom controls.

**When not to use it.** Do not use it for a control that already has a visible
adjacent label pattern (`Switch` and `Checkbox` provide their own rows). Do not
use it as a generic layout wrapper.

**Anatomy.**

```
div.sy-field[.is-invalid]
├── label.sy-field__label.sy-label       (+ span.sy-field__required "*")
├── children({ id, describedBy, invalid })
├── p.sy-field__hint.sy-caption          (suppressed while an error is showing)
└── p.sy-field__error.sy-caption         role="alert", error icon 13px
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Associated with the control via `htmlFor`/`id`. |
| `hint` | `string` | — | Persistent help text. Hidden while `error` is set. |
| `error` | `string` | — | Error message. Sets `.is-invalid` and `role="alert"`. |
| `required` | `boolean` | — | Renders an `aria-hidden` asterisk; the control receives the real `required`. |
| `children` | `(props: { id, describedBy, invalid }) => ReactNode` | — | Render prop. Wire all three onto the control. |
| `className` | `string` | — | |

**Layout.** Column, `gap: var(--sy-space-1_5)` (6px), `min-inline-size: 0` so it
can shrink inside a grid. Required marker and error text use
`--sy-danger-fg`; hint uses `--sy-fg-muted`.

**States.**

| State | Rendering |
|---|---|
| Rest | Label `--sy-fg-default`, hint `--sy-fg-muted`. |
| Error | `.is-invalid` on the wrapper, hint replaced by the error, error line prefixed with the `error` icon in `--sy-danger-fg`, announced politely via `role="alert"`. |

**Accessibility contract.**

- IDs come from `useId()`; the hint is `${id}-hint`, the error `${id}-error`,
  and `aria-describedby` is the space-joined list of whichever exist.
- Errors are always *text*: colour alone never communicates an invalid field.
- The asterisk is `aria-hidden`; `required` on the control is what assistive
  technology reads.

**Do / Don't**

- Do write errors as instructions ("Enter a handle of 3–20 characters"), not
  diagnoses ("Invalid").
- Do keep hints permanently visible rather than only on focus.
- Don't set `error` to a truthy empty string; it will render an empty alert.
- Don't duplicate the label as a placeholder.

### 9.2 Input

**What it is for.** Single-line text entry of every type (`text`, `email`,
`number`, `url`, `password`, …) with optional leading icon and trailing content.

**When not to use it.** Do not use it for multi-line entry (`Textarea`), for a
fixed set of options (`Select`), or for search in a chrome position
(`SearchInput`).

**Anatomy.**

```
Field
└── div.sy-input.sy-input--{inputSize}[.is-invalid]
    ├── Icon.sy-input__icon        (icon prop, 18px)
    ├── input                      (id, aria-describedby, aria-invalid, required)
    └── span.sy-input__trailing    (trailing prop)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Passed to `Field`. |
| `hint` | `string` | — | Passed to `Field`. |
| `error` | `string` | — | Passed to `Field`; also drives `.is-invalid` and `aria-invalid`. |
| `icon` | `IconName` | — | Leading icon, always 18px. |
| `trailing` | `ReactNode` | — | Trailing adornment: a unit, a counter, a small `IconButton`. |
| `inputSize` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Height. Named `inputSize` because `size` is a native input attribute. |
| `className` | `string` | — | Applied to the `Field` wrapper. |
| …rest | `InputHTMLAttributes<HTMLInputElement>` minus `size` | — | Spread onto the `input`. |

**Sizing.**

| `inputSize` | Height | Class |
|---|---|---|
| `xs` | 28px | `.sy-input--xs` |
| `sm` | 32px | `.sy-input--sm` |
| `md` | 40px | default `--input-height`, no class rule |
| `lg` | 48px | `.sy-input--lg` |
| `xl` | 56px | `.sy-input--xl` |

Shared: `padding-inline: var(--sy-space-3)` (12px), `gap: var(--sy-space-2)`
(8px), `border-radius: var(--sy-radius-md)` (10px), border
`1px solid var(--sy-border-default)`, text at `--sy-type-body-size` (15px).

**Inputs are the one place the light theme goes down rather than up.** A field
is a well you write into, so it takes the *page* colour — `--sy-bg-canvas`,
which in light is a step darker than the card it sits on — plus
`--sy-elevation-sunken`, a faint inset edge. Every other control in the product
sits above the page. That inversion is what makes a form scannable at a glance:
everything raised is a control, everything recessed is a place to type. Dark
theme cannot express a well by darkening, so `[data-theme='dark'] .sy-input`
fills with `--sy-bg-raised` and drops the inset shadow entirely.

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | Light: `--sy-bg-canvas` fill with `--sy-elevation-sunken`. Dark: `--sy-bg-raised`, no shadow. Border `--sy-border-default`, placeholder `--sy-fg-quiet`, icon and trailing `--sy-fg-quiet`. | — |
| Hover | Border `--sy-border-strong`. | `--sy-transition-hover` |
| Focus | `:focus-within` on the wrapper: background lifts to `--sy-bg-surface` — the field comes up to meet you — border `--sy-accent-solid`, plus `0 0 0 3px color-mix(in oklab, var(--sy-accent-solid) 20%, transparent)`. Focus-within rather than focus, because the visible ring belongs to the whole field while the actual focus is on the inner input — without it the ring would only appear around a 1px caret. | `--sy-transition-hover` |
| Invalid | Border `--sy-danger-solid`; when also focused the ring becomes the danger colour at 20%. | `--sy-transition-hover` |
| Disabled | Native `disabled` on the inner input; the wrapper is not restyled, so pair it with visibly reduced content when a field is unavailable. | — |
| Loading | Not modelled; put a `Spinner` in `trailing`. | — |

**Accessibility contract.** `id` and `aria-describedby` come from `Field`;
`aria-invalid` is set when `error` is present; `required` propagates to the real
input. The inner input's outline is removed because the ring is drawn on the
wrapper — the wrapper ring is the focus indicator and must never be removed.
Placeholders, the leading icon and trailing adornments all sit on
`--sy-fg-quiet`, which is a *text* step in both themes (`porcelain.9`) and is
audited at 4.5:1 against canvas and surface. It used to be a border step, which
is how placeholders ended up at roughly 2:1.

**Do / Don't**

- Do use `icon` for the field's *type* (a `search`, `link`, `coin` glyph), not
  for an action.
- Do put actions in `trailing` as an `IconButton` with a real label.
- Don't use placeholder text as the label.
- Don't use `inputSize="xs"` on touch surfaces; 28px is a desktop density.

### 9.3 Textarea

**What it is for.** Multi-line free text: bios, post composers, descriptions,
moderation notes.

**When not to use it.** Do not use it for rich text or code entry; neither is
modelled here. Do not use it for a single-line value that happens to be long.

**Anatomy.** `Field` → `div.sy-input.sy-input--textarea[.is-invalid]` →
`textarea`.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | |
| `hint` | `string` | — | |
| `error` | `string` | — | |
| `rows` | `number` | `4` | Initial visible rows. |
| `className` | `string` | — | Applied to the `Field` wrapper. |
| …rest | `TextareaHTMLAttributes<HTMLTextAreaElement>` | — | |

**Sizing.** `block-size: auto`, `padding-block: var(--sy-space-3)` (12px),
`align-items: flex-start` so the label icon column aligns to the first line,
`resize: vertical`, `line-height: var(--sy-type-body-line)` (22px). There is no
size scale — height comes from `rows`.

**States.** Identical to `Input`: hover, `:focus-within` ring, `.is-invalid`
border and ring.

**Accessibility contract.** Same as `Input`. `resize: vertical` is deliberate:
users must be able to enlarge a long-form field, and horizontal resize would
break the layout.

**Do / Don't**

- Do set `rows` to the expected length of a typical answer.
- Do show a character counter in `hint` when a limit exists.
- Don't disable resizing.
- Don't grow a textarea automatically past the height of the viewport.

### 9.4 Select

**What it is for.** Choosing one value from a known, closed list of more than
about five options.

**When not to use it.** For two to four mutually exclusive options use `Tabs`
with `variant="segmented"` or a row of `Chip`s — a select hides its options
behind a click. For multi-select, use chips.

**Anatomy.** `Field` → `div.sy-input.sy-input--select[.is-invalid]` → native
`select` + `Icon name="chevronDown" size={16}` as `.sy-input__trailing`.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `{ value: string; label: string }[]` | — | Required. Rendered in order given. |
| `label` | `string` | — | |
| `hint` | `string` | — | |
| `error` | `string` | — | |
| `className` | `string` | — | Applied to the `Field` wrapper. |
| …rest | `SelectHTMLAttributes<HTMLSelectElement>` | — | |

**Sizing.** Inherits `.sy-input` at the default 40px height; there is no size
prop. `appearance: none` with `cursor: pointer`, so the chevron is the only
disclosure affordance.

**States.** Hover, `:focus-within`, `.is-invalid` as per `Input`. The dropdown
list itself is the platform's, and is intentionally not restyled.

**Accessibility contract.** A native `select`, so keyboard interaction, type-
ahead and mobile pickers are the platform's. `id`, `aria-describedby` and
`aria-invalid` come from `Field`. The chevron is decorative.

**Do / Don't**

- Do sort options the way the user thinks, not alphabetically by accident.
- Do include an explicit "no preference" option rather than relying on an empty
  first entry.
- Don't put more than about 20 options in a select without a search.
- Don't restyle the option list; the native list is more accessible than a
  reimplementation.

### 9.5 SearchInput

**What it is for.** Search in chrome positions: the shell top bar, a screen's
own filter header, a picker.

**When not to use it.** Do not use it as a form field that needs a label, hint
or error — it is deliberately not wrapped in `Field`. Use `Input` with
`icon="search"` when search is part of a form.

**Anatomy.**

```
div.sy-input.sy-input--search
├── Icon name="search" size={18} .sy-input__icon
├── input[type=search]        aria-label = placeholder
└── kbd.sy-kbd                (shortcut, optional)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Search'` | Also becomes the `aria-label`. |
| `value` | `string` | — | Controlled value. |
| `onChange` | `(value: string) => void` | — | Receives the string, not the event. |
| `shortcut` | `string` | — | Keyboard hint, e.g. `"/"` or `"⌘K"`. Visual only — the screen must bind the key. |
| `className` | `string` | — | |

**Sizing.** 40px tall (inherits `.sy-input`), `border-radius:
var(--sy-radius-pill)`, background `--sy-bg-surface`. It is the one input that
overrides the recessed fill: search in a chrome bar sits *on* the bar rather
than being cut into it, and in light theme `--sy-bg-surface` is a step brighter
than the `--sy-bg-canvas` every other field takes. The `kbd` is 11px
mono on `--sy-bg-active` with a `--sy-radius-xs` corner and a
`--sy-border-subtle` border. The native search cancel button is suppressed.

**States.** Hover and `:focus-within` as per `Input`. No invalid state.

**Accessibility contract.** `aria-label` is taken from `placeholder`, so a
meaningful placeholder is required — "Search" alone is acceptable only when the
scope is obvious from context. `type="search"` gives platform behaviours
(clear-on-escape on some engines).

**Do / Don't**

- Do scope the placeholder: "Search SYLORA", "Search this community".
- Do render `shortcut` only where you have actually bound the key.
- Don't use it in the compact posture top bar — `.sy-topbar__search` is hidden
  below 768px because the screen owns search in thumb reach.
- Don't put a submit button beside it; search is live.

### 9.6 Switch

**What it is for.** An immediate, self-applying boolean: notifications on/off,
visibility, autoplay. The change takes effect the moment it is flipped.

**When not to use it.** If the change only takes effect on save, use a
`Checkbox`. If the two states are not opposites ("Public" vs "Followers"), use
`Tabs` with `variant="segmented"`.

**Anatomy.**

```
div.sy-switch-row
├── div.sy-switch-row__text
│   ├── label.sy-label            (htmlFor → the switch)
│   └── p.sy-caption.sy-fg-muted  (description)
└── button.sy-switch[.is-on]      role="switch" aria-checked
    └── span.sy-switch__thumb
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | — | Required. Controlled. |
| `onChange` | `(checked: boolean) => void` | — | Called with the *next* value. |
| `label` | `string` | — | Required. |
| `description` | `string` | — | Secondary line under the label. |
| `disabled` | `boolean` | — | |

**Sizing.**

| Part | Value |
|---|---|
| Track | 44 x 26px, `--sy-radius-pill` |
| Thumb | 18 x 18px, offset 3px from the inline start |
| Travel | 18px |
| Row | `justify-content: space-between`, `gap: var(--sy-space-4)` (16px) |

**States.**

| State | Rendering | Timing |
|---|---|---|
| Off | Track `--sy-bg-active` with `--sy-border-default`; thumb `--sy-porcelain-11`. | — |
| On | Track and border `--sy-accent-solid`; thumb `--sy-on-accent`, translated 18px. | thumb `--sy-dur-base` (200ms) with `--sy-ease-spring`, which gives a small overshoot so it feels mechanical |
| Hover | Track colours transition on `--sy-transition-hover`; no dedicated hover fill. | 140ms |
| Focus-visible | Global double ring on the track. | instant |
| Disabled | Native `disabled`; not tone-restyled. | — |

**Accessibility contract.** `role="switch"` with `aria-checked` — not a
checkbox, because a switch reports a state rather than a selection. The `label`
is associated with the switch via `htmlFor`/`id`, so clicking the text toggles
it. Space and Enter both activate it (native button behaviour). The state is
carried by thumb position *and* track fill, so it survives greyscale.

**Do / Don't**

- Do phrase the label as the thing being enabled ("Autoplay previews"), not as a
  question.
- Do put the consequence in `description` when it is not obvious.
- Don't use a switch for an action that needs confirmation.
- Don't render a switch whose change only applies after a save button.

### 9.7 Checkbox

**What it is for.** Selecting zero or more items from a set, or agreeing to a
term, where the change is applied by a subsequent action.

**When not to use it.** For an instantly applied setting use `Switch`. For a
single choice from a small set, use segmented `Tabs` or chips — there is no
radio component in the system.

**Anatomy.**

```
div.sy-check-row
├── button.sy-checkbox[.is-on]   role="checkbox" aria-checked
│   └── Icon name="check" size={13}   (only when checked)
└── label.sy-body-sm             (htmlFor → the checkbox)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | — | Required. Controlled. |
| `onChange` | `(checked: boolean) => void` | — | Called with the next value. |
| `label` | `ReactNode` | — | Required. Accepts nodes so terms can contain links. |
| `disabled` | `boolean` | — | |

**Sizing.**

| Part | Value |
|---|---|
| Box | 20 x 20px, `--sy-radius-xs` (4px) |
| Border | 1.5px `--sy-border-interactive` |
| Check glyph | 13px, colour `--sy-on-accent` |
| Row gap | 10px (`--sy-space-2_5`) |

**States.**

| State | Rendering | Timing |
|---|---|---|
| Unchecked | Transparent fill, `--sy-border-interactive` border, no glyph. | — |
| Checked | Fill and border `--sy-accent-solid`, check glyph visible. | `--sy-transition-press` (80ms) on background and border |
| Focus-visible | Global double ring. | instant |
| Indeterminate | **Not modelled.** A partially selected parent must be expressed some other way. | — |
| Disabled | Native `disabled`. | — |

**Accessibility contract.** `role="checkbox"` with `aria-checked` on a real
`button`, so it is focusable and Space-activated. The label is associated via
`htmlFor`. The state is carried by fill *and* glyph, never colour alone.

**Do / Don't**

- Do allow the label to wrap; it is `.sy-body-sm`, not truncated.
- Do group related checkboxes under a heading that names the group.
- Don't use a checkbox as a filter toggle in a scannable row — that is a `Chip`.
- Don't rely on an indeterminate state; it does not exist.

### 9.8 Slider

**What it is for.** Choosing a value from a continuous range where the exact
number matters less than the relative position: volume, opacity, price ceiling,
text scale.

**When not to use it.** Do not use a slider for a precise numeric entry — pair
it with an `Input`, or use the input alone. Do not use it for fewer than about
six discrete steps.

**Anatomy.** `div.sy-slider.sy-tone-{tone}` carrying `--percent`, wrapping a
native `input[type=range]`. Track and thumb are styled through
`::-webkit-slider-runnable-track` / `::-moz-range-track` and
`::-webkit-slider-thumb` / `::-moz-range-thumb`.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | — | Required. Controlled. |
| `min` | `number` | `0` | |
| `max` | `number` | `100` | |
| `onChange` | `(value: number) => void` | — | Receives a `Number`, not the event. |
| `label` | `string` | — | Required. Becomes `aria-label`. |
| `tone` | `Tone` | `'accent'` | Filled portion of the track. |

**Sizing.**

| Part | Value |
|---|---|
| Track | 6px tall, `--sy-radius-pill` |
| Filled portion | `--tone-solid` up to `--percent`, `--sy-bg-active` beyond it |
| Thumb | 16 x 16px, `--sy-porcelain-12`, `0 1px 4px var(--shadow-color-32)` |

`--percent` is computed as `((value - min) / (max - min)) * 100` and is what
paints the filled section of the gradient.

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | As above. | — |
| Active (dragging) | WebKit thumb scales to `1.15`. | `--sy-transition-press` (80ms) |
| Focus-visible | Global double ring on the input. | instant |
| Disabled | Native `disabled`; not restyled. | — |

**Accessibility contract.** A native range input, so arrow keys, Home/End and
Page Up/Down work without any code. `aria-label` is required by the prop type.
The current value is **not** rendered anywhere by the component — the screen
must display it as text, otherwise the value is only available by measuring a
thumb position.

**Do / Don't**

- Do render the current value beside the slider, with units.
- Do use `tone` to match the thing being adjusted (`live` for stream bitrate,
  `creator` for gift amount).
- Don't use a slider where a wrong value is expensive or irreversible.
- Don't hide the min and max labels; a bare track has no scale.

---

## 10. In-screen navigation

### 10.1 Tabs

**What it is for.** Switching between views of the same subject within one
screen: profile sections, analytics ranges, inbox filters.

**When not to use it.** Tabs are not primary navigation — the rail and the
bottom tab bar own destinations. Do not use tabs where the panels are unrelated,
where there are more than about seven options, or where multiple options can be
active at once (chips).

**Anatomy.**

```
div.sy-tabs.sy-tabs--{variant}          role="tablist"
└── button.sy-tabs__tab[.is-active] × n role="tab" aria-selected tabIndex 0|-1
    ├── Icon size={16} filled={selected}   (optional)
    ├── span                                (label)
    └── span.sy-tabs__badge                 (optional)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `{ id: string; label: string; icon?: IconName; badge?: string \| number }[]` | — | Required. |
| `active` | `string` | — | Required. Id of the selected tab. |
| `onChange` | `(id: string) => void` | — | Required. |
| `variant` | `'underline' \| 'segmented' \| 'pill'` | `'underline'` | |
| `className` | `string` | — | |

**Sizing per variant.**

| Variant | Tab height | Padding-inline | Gap | Radius | Container |
|---|---|---|---|---|---|
| `underline` | 40px | 0 | 16px (`--sy-space-4`) | — | 1px `--sy-border-subtle` bottom rule |
| `segmented` | 32px | 12px (`--sy-space-3`) | 2px | `--sy-radius-sm` per tab | 3px padding, `--sy-radius-md`, `--sy-bg-canvas` fill, `--sy-border-subtle` border; tabs are `flex: 1` |
| `pill` | 34px | 12px | 4px (`--sy-space-1`) | `--sy-radius-pill` per tab | none |

Shared: label at `--sy-type-label-size` (13.5px) / weight 550, rest colour
`--sy-fg-muted`, container scrolls horizontally with the scrollbar hidden. The
badge is an 18px `--sy-radius-pill` chip on `--sy-bg-active` at 11px with
tabular figures.

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | `--sy-fg-muted`. | — |
| Hover | `--sy-fg-default`. | `--sy-transition-hover` |
| Focus-visible | Global double ring on the tab. | instant |
| Active — `underline` | Colour `--sy-fg-default` plus a 2px `--sy-accent-solid` rule under the tab, drawn with `::after` scaling from `scale: 0 1` to `1 1`. | `--sy-dur-base` (200ms) with `--sy-ease-emphasized` |
| Active — `segmented` | Tab background `--sy-bg-raised` with `--sy-elevation-surface`, colour `--sy-fg-default`. | `--sy-transition-hover` |
| Active — `pill` | Background `--sy-accent-bg`, colour `--sy-accent-fg`. | `--sy-transition-hover` |
| Selected icon | `filled={selected}` adds the 20% translucent fill, so selection survives greyscale. | — |
| Disabled / loading / error | Not modelled. Omit a tab rather than disabling it. | — |

**Accessibility contract.**

- Implements the WAI-ARIA tabs pattern: `role="tablist"` on the container,
  `role="tab"` and `aria-selected` on each tab, and a roving `tabIndex` so the
  tab strip is a single tab stop.
- Keyboard: `ArrowRight` / `ArrowLeft` move and wrap, `Home` jumps to the first
  tab, `End` to the last. Selection follows focus, and focus is moved
  programmatically to the newly selected tab.
- The component does **not** render or link panels. The screen must render the
  panel with `role="tabpanel"` and wire `aria-controls` / `aria-labelledby`, or
  the relationship is invisible to assistive technology.
- Selection is carried by colour *and* a shape change (rule, raised pill, or
  filled icon).

**Do / Don't**

- Do keep labels to one or two words so the strip does not scroll on a 393px
  screen.
- Do use `segmented` for two or three peer views, `underline` for a page's
  sections, `pill` for filters over a feed.
- Don't nest one tab strip inside another.
- Don't put a destructive action in a tab.

---

## 11. Feedback and status

### 11.1 Skeleton

**What it is for.** Holding the shape of content that is arriving, so the layout
does not jump when it lands.

**When not to use it.** Do not use a skeleton for content that may never arrive
— that is `EmptyState`. Do not use it for a busy control — that is `Button`'s
`loading` or a `Spinner`.

**Anatomy.** A single `span.sy-skeleton.sy-skeleton--{radius}` with inline width
and height.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number \| string` | — | Any CSS length; omit for full width. |
| `height` | `number \| string` | `16` | |
| `radius` | `'sm' \| 'md' \| 'lg' \| 'pill' \| 'full'` | `'md'` | |
| `className` | `string` | — | |

**Radius map.**

| Prop value | Resolved radius |
|---|---|
| `sm` | `--sy-radius-xs` (4px) |
| `md` | `--sy-radius-sm` (6px) |
| `lg` | `--sy-radius-md` (10px) |
| `pill` | `--sy-radius-pill` |
| `full` | `50%` — for avatars |

**States.**

| State | Rendering |
|---|---|
| Loading | A 90° gradient `--sy-bg-raised` → `--sy-bg-hover` → `--sy-bg-raised` at `background-size: 220% 100%`, swept by `sy-skeleton-sweep` from `120%` to `-120%` over 1.4s with `--sy-ease-standard`. Skeletons sweep rather than pulse: a sweep implies "content is arriving from somewhere", a pulse implies "something is wrong". The sweep is a single `background-position` animation, which the compositor handles without layout. |
| Reduced motion | Animation removed, `opacity: 0.6`. |

**Accessibility contract.** `aria-hidden="true"` — skeletons are pure visual
scaffolding. The region containing them should carry the busy semantics
(`aria-busy` on the container), and the real content should be announced when it
arrives.

**Do / Don't**

- Do mirror the real layout: the same number of lines, at the same widths.
- Do vary line widths so the block does not look like a table.
- Don't animate more than one screenful of skeletons.
- Don't leave skeletons on screen as a permanent placeholder for missing data.

### 11.2 EmptyState

**What it is for.** A region that has no content yet, has no results, or has
been fully cleared — with a way forward.

**When not to use it.** Do not use it for an error; an error needs the cause and
a retry, not an invitation. Do not use it while data is still loading.

**Anatomy.**

```
div.sy-empty
├── span.sy-empty__icon      (56px tile, Icon at 26px)
├── h3.sy-title-3            (title)
├── p.sy-body-sm.sy-fg-muted.sy-measure   (description)
└── action                   (usually a Button)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `IconName` | `'sparkles'` | Rendered at 26px inside the tile. |
| `title` | `string` | — | Required. Rendered as an `h3`. |
| `description` | `string` | — | Constrained to `--sy-measure-comfortable` (68ch). |
| `action` | `ReactNode` | — | Usually a single `Button`. |

**Sizing and tokens.**

| Part | Value |
|---|---|
| Padding | `48px 24px` (`--sy-space-12` / `--sy-space-6`) |
| Gap | 12px (`--sy-space-3`) |
| Icon tile | 56 x 56px, `--sy-radius-xl` (20px), `--sy-accent-bg` fill, `--sy-accent-fg` glyph |

**States.** One. Not interactive except through `action`.

**Accessibility contract.** The title renders as `h3`, so it must sit under an
`h2` in the screen's heading order — `ScreenSection` titles are `h2`, so an
empty state inside a section is correctly ordered. The icon is decorative.

**Do / Don't**

- Do name the specific thing that is empty ("No missions this week"), not the
  generic condition ("Nothing here").
- Do give exactly one action, and make it the thing that fills the space.
- Don't use an empty state to apologise; state the situation and the next step.
- Don't repeat several empty states on one screen — collapse them into one.

### 11.3 Stat

**What it is for.** A single headline metric with an optional signed change and
a status chip: followers, watch time, revenue, error rate.

**When not to use it.** Do not use it for a value that only makes sense as a
series — put a `Sparkline` or `BarChart` beside it. Do not use it for a label /
value pair in a detail list; that is `.sy-kv`.

**Anatomy.**

```
div.sy-stat.sy-tone-{tone}
├── div.sy-stat__head
│   ├── span.sy-stat__icon      (22px tile, Icon 15px)
│   ├── span.sy-caption.sy-fg-muted   (label)
│   └── span.sy-stat__status    (pushed to the end)
├── div.sy-stat__value.sy-mono-lg     (30px mono, tabular)
└── div.sy-stat__delta[.is-up|.is-down]
    └── Icon trendUp | trendDown (13px) + delta text
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Required. |
| `value` | `string` | — | Required. Pre-formatted, including units. |
| `delta` | `string` | — | Signed change, e.g. `"+12.4%"` or `"−8.1%"`. The sign drives the arrow. |
| `polarity` | `'higher-is-better' \| 'lower-is-better' \| 'neutral'` | `'higher-is-better'` | Which direction is *good*. |
| `icon` | `IconName` | — | Rendered at 15px in a tinted tile. |
| `tone` | `Tone` | `'accent'` | Tints the icon tile only. |
| `status` | `ReactNode` | — | Optional state chip, e.g. an SLO or health label. |

**Polarity — the important part.** A rising error rate, latency or cost is bad
news, so tying green to "+" would actively mislead on roughly a third of the
metrics in this product.

| `polarity` | `+` delta | `−` delta |
|---|---|---|
| `higher-is-better` | `.is-up`, `--sy-success-fg` | `.is-down`, `--sy-danger-fg` |
| `lower-is-better` | `.is-down`, `--sy-danger-fg` | `.is-up`, `--sy-success-fg` |
| `neutral` | no colour class, `--sy-fg-muted` | no colour class, `--sy-fg-muted` |

Sign detection accepts both the ASCII hyphen and the typographic minus (U+2212),
since correctly typeset figures use U+2212 and would otherwise read as "no
change". The arrow (`trendUp` / `trendDown`) follows the *direction of movement*
in every polarity, including `neutral`; only the colour is withheld.

**Sizing.**

| Part | Value |
|---|---|
| Stack gap | 4px (`--sy-space-1`) between label row, value and delta |
| Head row gap | 6px (`--sy-space-1_5`) |
| Icon tile | 22 x 22px, `--sy-radius-xs`, `--tone-bg` fill, `--tone-fg` glyph |
| Value | `.sy-mono-lg` — 30px, line 36px, weight 500, tracking -0.014em, tabular figures |
| Delta | 12px caption, weight 550, 3px gap to its arrow |

**States.** No interactive states. The only variation is up / down / no
judgement, above.

**Accessibility contract.** Label, value and delta are all text; the arrow icon
is decorative. Colour is never the only signal — the arrow direction carries the
same information. Tabular figures are on by default at the document level, so a
grid of stats does not shift width as values update.

**Do / Don't**

- Do set `polarity="lower-is-better"` for latency, cost, churn and error rates.
- Do use `polarity="neutral"` when "better" genuinely depends on context.
- Don't put an unformatted number in `value`; format it, including the unit.
- Don't use `tone` to imply good or bad — that is `polarity`'s job.

### 11.4 Tooltip

**What it is for.** A short, supplementary label revealed on hover or focus,
typically naming a dense icon control on a pointer-driven surface.

**When not to use it.** Never for information a user needs to complete a task,
and never as the only label of a control: tooltips do not exist on touch, and
this implementation puts `aria-describedby` on the wrapper rather than on the
trigger. `IconButton`'s `label` is the correct way to name an icon control.

**Anatomy.**

```
span.sy-tooltip-wrap      aria-describedby={id}
├── children              (the trigger)
└── span.sy-tooltip       role="tooltip" id={id}
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Required. The tooltip text. |
| `children` | `ReactNode` | — | Required. The trigger. |

**Sizing and tokens.**

| Property | Value |
|---|---|
| Position | Above the trigger, `calc(100% + 8px)`, centred |
| Padding | `6px 10px` (`--sy-space-1_5` / `--sy-space-2_5`) |
| Radius | `--sy-radius-sm` |
| Background / foreground | `--sy-porcelain-12` fill with `--sy-bg-canvas` text — a deliberate inversion of the page |
| Type | 12px caption, weight 500, `white-space: nowrap` |
| Stacking | `z-index: var(--sy-z-tooltip)` (800) |

**States.**

| State | Rendering | Timing |
|---|---|---|
| Hidden | `opacity: 0`, `translate: -50% 4px`, `pointer-events: none`. | — |
| Shown | On `:hover` or `:focus-within` of the wrapper: `opacity: 1`, `translate: -50% 0`. | `--sy-transition-hover` (140ms) for both opacity and translate |

**Accessibility contract.**

- The tooltip element carries `role="tooltip"` and an `id`, and
  `aria-describedby` pointing at that `id` sits on the **wrapper span**, not on
  the trigger the user actually focuses. A `role="tooltip"` element that nothing
  references is invisible to screen readers, and describing a non-focusable
  wrapper is close to the same failure: most assistive technology will not
  announce the description when focus lands on the inner control. Treat the
  tooltip as visual reinforcement only.
- It appears on `:focus-within`, so keyboard users see it — but it cannot be
  dismissed with Escape, and it cannot be hovered.
- Because `white-space: nowrap` is set, long labels will overflow their
  container rather than wrap.

**Do / Don't**

- Do keep labels to two or three words.
- Do use it as reinforcement on desktop-density toolbars.
- Don't put keyboard shortcuts, prices, or anything actionable in a tooltip
  alone.
- Don't wrap a disabled control — a disabled element does not receive hover or
  focus in every engine.

### 11.5 Toast

**What it is for.** Confirming that something happened outside the user's focus,
or reporting a background failure, without interrupting the task.

**When not to use it.** Do not use a toast for validation of a field the user is
editing (`Field`'s `error`), for a decision that must be made (`Surface` with
`elevation="overlay"` as a dialog), or for anything the user must read — toasts
are transient by convention and this one is not focus-managed.

**Anatomy.**

```
div.sy-toast.sy-tone-{tone}      role="status"
├── span.sy-toast__icon          (30px tile, Icon 18px)
├── div.sy-toast__body
│   ├── p.sy-label               (title)
│   └── p.sy-caption.sy-fg-muted (description)
└── IconButton icon="close" label="Dismiss" variant="ghost" size="xs"
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `tone` | `Tone` | `'neutral'` | Tints the icon tile only. |
| `icon` | `IconName` | — | Rendered at 18px in the tile. |
| `title` | `string` | — | Required. |
| `description` | `string` | — | |
| `onDismiss` | `() => void` | — | Renders the dismiss button when provided. |

**Sizing and tokens.**

| Property | Value |
|---|---|
| Width | `min(380px, calc(100vw - var(--sy-space-8)))` |
| Padding | `12px 16px` (`--sy-space-3` / `--sy-space-4`) |
| Radius | `--sy-radius-lg` (14px) |
| Background / border | `--sy-bg-raised` / `--sy-border-default` |
| Shadow | `--sy-elevation-overlay` |
| Icon tile | 30 x 30px, `--sy-radius-sm`, `--tone-bg` / `--tone-fg` |
| Gap | 12px (`--sy-space-3`) |

**States.** The component renders one state. It has no entrance or exit
animation, no auto-dismiss timer, no stacking, and no positioning of its own —
the screen owns placement (use `--sy-z-toast`, 700) and lifetime.

**Accessibility contract.** `role="status"` announces politely, so a toast never
interrupts what a screen reader is currently reading. Because it is polite and
undismissable by keyboard shortcut, anything critical must also appear in the
page. The dismiss control is an `IconButton`, so it is named and focusable.

**Do / Don't**

- Do write the title as the outcome ("Stream key rotated"), and put the detail
  in `description`.
- Do provide `onDismiss` whenever the toast persists.
- Don't use `tone="danger"` for a recoverable warning; reserve it for failures.
- Don't stack more than two toasts; collapse repeats into a count.

---

## 12. Structure

### 12.1 SectionHeader

**What it is for.** A titled band above a group of content, with an optional
eyebrow, description and trailing action. Used inside a screen where the group
needs explanation.

**When not to use it.** If the group needs no description and no size choice,
`ScreenSection` already renders a title and action and also owns the section's
spacing. Do not use `SectionHeader` for the screen's own title — that is
`PageHeader` from `patterns/AppShell.tsx`, which renders the `h1`.

**Anatomy.**

```
header.sy-section-header
├── div.sy-section-header__text
│   ├── span.sy-overline.sy-fg-accent   (eyebrow)
│   ├── h2.{sy-headline|sy-title-3|sy-title-2}
│   └── p.sy-body-sm.sy-fg-muted.sy-measure (description)
└── div.sy-section-header__action
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `eyebrow` | `string` | — | Uppercase overline in `--sy-accent-fg`. |
| `title` | `string` | — | Required. Always rendered as `h2`. |
| `description` | `string` | — | Capped at 68ch by `.sy-measure`. |
| `action` | `ReactNode` | — | Trailing control; does not shrink. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Title type ramp only. |

**Size map.**

| `size` | Title class | Size / line | Face |
|---|---|---|---|
| `sm` | `.sy-headline` | 17px / 23px, weight 600 | Instrument Sans |
| `md` | `.sy-title-3` | 21px / 27px, weight 400 | Instrument Serif |
| `lg` | `.sy-title-2` | 27px / 33px, weight 400 | Instrument Serif |

`sm` is the step where the face changes. 21px is the floor for the serif: below
it the thick/thin modulation stops resolving and the sans takes over, so
`size="sm"` is not merely a smaller title, it is a different voice.

**Layout.** `display: flex`, `align-items: flex-end`, `justify-content:
space-between`, `gap: var(--sy-space-4)`, `margin-block-end:
var(--sy-space-4)`. The action never shrinks; the text column can.

**States.** None.

**Accessibility contract.** Always an `h2`, regardless of `size` — the size prop
changes appearance, not document structure. Do not use `size` to fake a
different heading level; nest sections instead.

**Do / Don't**

- Do use the eyebrow for the category and the title for the content.
- Do keep the action to one control.
- Don't use `size="lg"` for a subsection inside another section.
- Don't put a description longer than two lines here.

### 12.2 ScreenSection

**What it is for.** The standard content block of a screen: optional eyebrow and
title, an optional trailing action, and the section's own vertical rhythm. Most
screens are a stack of these.

**When not to use it.** Do not use it for a card — that is `Surface`. Do not use
it when you need a description under the title; use `SectionHeader` inside it,
or beside it.

It is documented here rather than in section 13 because it is structural rather
than content-bearing, but it is exported from `src/screens/components.tsx`
alongside the composites, not from `primitives/index.tsx`.

**Anatomy.**

```
section.sy-screen-section
├── header.sy-screen-section__head       (only when title is set)
│   ├── div
│   │   ├── span.sy-overline.sy-fg-accent  (eyebrow)
│   │   └── h2.sy-title-3                  (title)
│   └── action
└── children
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Optional; the header is omitted entirely without it. |
| `eyebrow` | `string` | — | Only rendered when `title` is present. |
| `action` | `ReactNode` | — | Trailing control in the head row. |
| `children` | `ReactNode` | — | Required. |
| `className` | `string` | — | Appended to `.sy-screen-section`. |

**Layout.**

| Property | Value |
|---|---|
| Direction | column |
| Gap | 16px (`--sy-space-4`) |
| Margin-block-end | 32px (`--sy-space-8`) — the standard gap between sections |
| Head | `flex`, `align-items: flex-end`, `space-between`, gap 12px |

**States.** None.

**Accessibility contract.** The title is an `h2` under the screen's `h1`, so a
stack of `ScreenSection`s produces a correct outline with no extra work. A
section without a `title` has no accessible name; use it only for a visually
grouped run of content that the preceding section already names.

**Do / Don't**

- Do pair it with `.sy-enter` on a child container to get the 40ms entrance
  cascade.
- Do put the section's "See all" control in `action`.
- Don't nest `ScreenSection` inside `ScreenSection`; the bottom margins compound.
- Don't add your own bottom margin — the 32px is the system's rhythm.

---

## 13. Shared composites

These live in `src/screens/components.tsx` and are styled by
`src/design-system/styles/screens.css`. They are product-shaped, not generic:
they encode the exact anatomy of a post, a stream, a creator and a chart.

### 13.1 Media

**What it is for.** Every image slot in the product. There are no photographic
assets, so `Media` synthesises deterministic cover art from a seed: two radial
washes at a seeded hue over a linear base, a conic light sweep, and a faint
grain layer. The same seed always produces the same artwork, so screenshots are
stable and layouts are stress-tested with real visual weight in every image
slot.

**When not to use it.** Do not use `Media` where a real asset exists. Do not use
it as a decorative background for text — the `scrim` exists for overlaid text,
but body copy belongs on a surface.

**Anatomy.**

```
div.sy-media.sy-media--radius-{radius}[.sy-media--scrim]   (--seed-hue, aspect-ratio)
├── span.sy-media__art     (two radial gradients + a linear base)
├── span.sy-media__sweep   (conic highlight, mix-blend-mode: overlay)
├── span.sy-media__grain   (inline SVG fractal noise at 0.14 opacity)
└── div.sy-media__content  (children, padding 12px, z-index 1)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `seed` | `string` | — | Required. Hashed to a 0–359 hue (`hash * 37 % 360`). |
| `ratio` | `string` | `'16/9'` | Any CSS `aspect-ratio` value. |
| `children` | `ReactNode` | — | Overlay content, e.g. a `LiveBadge` or duration pill. |
| `className` | `string` | — | |
| `scrim` | `boolean` | `false` | Bottom-weighted darkening so overlaid captions stay legible. |
| `radius` | `'md' \| 'lg' \| 'xl' \| 'none'` | `'lg'` | |

**The art is generated per theme, not tinted per theme.** The light recipe is
not the dark one lightened; it inverts the construction. Light art is a pale,
high-lightness ground with colour arriving only at the edges, like light passing
through the corner of a lens. Dark, saturated artwork on a porcelain page pulls
every eye to the images and turns a feed into a contact sheet — content should
sit *in* the page, not on top of it.

| Layer | Light (`:root`) | Dark |
|---|---|---|
| Base | `linear-gradient(152deg, oklch(96.5% 0.022 H+18), oklch(93% 0.03 H+64))` | `linear-gradient(152deg, oklch(32% 0.11 H+40), oklch(20% 0.07 H+260))` |
| Wash 1 | `radial-gradient(124% 104% at 14% 6%, oklch(90% 0.072 H), transparent 64%)` | `radial-gradient(120% 100% at 12% 8%, oklch(66% 0.19 H), transparent 58%)` |
| Wash 2 | `radial-gradient(118% 116% at 88% 94%, oklch(84% 0.078 H+46), transparent 68%)` | `radial-gradient(110% 110% at 88% 92%, oklch(58% 0.17 H+128), transparent 62%)` |

Two rules govern the light recipe. Chroma is held at roughly half, because on
white saturation reads as loudness and a premium surface is never loud. And the
hues within one cover stay *analogous* — 18, 46 and 64 degrees apart rather than
complementary — because two opposed hues blended across a soft gradient pass
through their desaturated midpoint, which is grey-brown, and that is where a
gradient spends most of its area. Analogous hues never cross it, so every
generated cover is harmonious by construction rather than by luck of the seed.

**Layers.** The sweep is a conic highlight at `mix-blend-mode: overlay`, giving
the surface a sense of direction. The grain layer exists specifically to stop
the large flat gradients from banding on 8-bit displays; it is an inline SVG
turbulence filter at `opacity: 0.14`, so there is no network request and no
asset pipeline.

**The scrim is dark in both themes.** Overlaid captions are white in both
themes — they resolve through `--sy-fg-on-media`, which is pinned to the dark
ramp regardless of the active theme — so the surface they sit on cannot flip.
It runs `oklch(16% 0.03 266 / 0.78)` at the bottom, `oklch(16% 0.03 266 / 0.24)`
at 34%, and transparent from 58% up, reaching full strength only in the bottom
fifth. That leaves pale light-theme artwork pale everywhere a caption is not
actually sitting.

**Sub-elements screens compose inside it.**

| Class | Purpose | Geometry |
|---|---|---|
| `.sy-media__play` | Centre play affordance | 52px disc, translucent white fill, `blur(12px)`, scales to `1.08` on media hover |
| `.sy-media__duration` | Bottom-right time pill | `oklch(10% 0 0 / 0.72)`, 11px, `--sy-radius-xs` |

**States.** Only one interactive behaviour: hovering the media enlarges the play
disc. The art itself is static.

**Accessibility contract.** All three art layers are `aria-hidden`. `Media`
carries no accessible name — if the artwork stands in for real content, the
screen must supply the description in adjacent text or an `.sy-sr-only` span
(the live viewer does exactly this).

**Do / Don't**

- Do pass a stable `seed` — the item id — so the art does not change between
  renders.
- Do enable `scrim` whenever text sits on top.
- Don't render a grey box as a placeholder instead.
- Don't put long-form text inside `.sy-media__content`.

### 13.2 PostCard

**What it is for.** The canonical social post: author, timestamp, optional
space, body text, optional media, and the five post actions.

**When not to use it.** Do not use it for chat messages, comments, or feed items
with a different internal structure — a chronological feed is expected to render
polls and digests inline as their own shapes rather than forcing them through
`PostCard`.

**Anatomy.**

```
Surface as="article" padding="none" elevation={compact ? 'flat' : 'surface'} .sy-post
├── header.sy-post__head
│   ├── Avatar size={40} verified
│   ├── div.sy-post__identity   (name + handle, then time · space)
│   └── IconButton icon="more" label="Post options" variant="ghost" size="sm"
├── p.sy-post__body.sy-body     (max-inline-size: --sy-measure-comfortable)
├── Media radius="md"           (optional; play + duration when kind === 'video')
└── footer.sy-post__actions
    ├── Like, Comment, Repost   (with counts)
    ├── span.sy-grow
    └── Save, Share
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `post` | `Post` | — | Required. From `src/screens/data.ts`. |
| `compact` | `boolean` | `false` | Uses `elevation="flat"` — for lists that already sit on a card. |

**Sizing.**

| Part | Value |
|---|---|
| Card padding | 16px (`--sy-space-4`), supplied by `.sy-post`, not by `Surface` |
| Vertical gap | 12px (`--sy-space-3`) |
| Body measure | `--sy-measure-comfortable` (68ch) — the reading measure applies even inside a card |
| Action button | 34px tall, 8px padding-inline, `--sy-radius-md` |

**States.**

| State | Rendering | Timing |
|---|---|---|
| Action rest | `--sy-fg-quiet`. | — |
| Action hover | `--sy-fg-default` on `--sy-bg-hover`. Like — the first action — additionally turns `--sy-danger-fg`, because it is the emotional one. | `--sy-transition-hover` |
| Action active | `scale: 0.92`. | `--sy-transition-press` |
| Card | Not `interactive` — the card itself is not a click target. | — |

**Accessibility contract.** Renders as `article`. Each action is a real button
whose `aria-label` includes the count ("Like, 1.2K"), so the number is not
orphaned from its meaning. The author's name is text, not only an avatar. The
overflow control is an `IconButton` with a real label.

**Do / Don't**

- Do use `compact` when posts are nested inside another surface.
- Do rely on the built-in measure rather than constraining the card's width.
- Don't add a sixth action; the row is balanced around the `.sy-grow` spacer.
- Don't make the whole card clickable — the body contains links and actions.

### 13.3 StreamCard

**What it is for.** A live or recorded stream in a grid or a horizontal rail:
cover art, live badge, duration, creator and category.

**When not to use it.** Do not use it for a non-video item, and do not use it
for the currently playing stream — that is the immersive live viewer.

**Anatomy.**

```
Surface as="article" padding="none" elevation="flat" interactive .sy-stream-card--{size}
├── Media ratio="16/9" scrim radius="lg"
│   └── div.sy-stream-card__overlay-top
│       ├── LiveBadge viewers
│       └── span.sy-stream-card__duration.sy-mono
└── div.sy-stream-card__meta
    ├── Avatar ring="live" size={size === 'sm' ? 28 : 36}
    └── div.sy-stream-card__text  (title clamp-2, creator, category)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `stream` | `Stream` | — | Required. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | `sm` fixes the width to 220px for rails; `md` is fluid at 100%. `lg` is accepted by the type but has no CSS rule, so it renders at the default fluid width. |

**Sizing.**

| Size | Width | Avatar |
|---|---|---|
| `sm` | 220px fixed | 28px |
| `md` | 100% | 36px |
| `lg` | 100% (no rule) | 36px |

Gap 12px, transparent background and border (it sits directly on the canvas),
title at `--sy-type-label-size` weight 600 line-height 1.35, clamped to two
lines. The duration pill is `oklch(10% 0 0 / 0.66)` at 11px.

**States.** `interactive` on the `Surface`: hover lifts 2px with
`--sy-elevation-raised` (plus a `--sy-border-strong` border in dark theme only);
active settles back to `translate: 0`.

**Accessibility contract.** Renders as `article` with an `h3` title. The card is
visually interactive but is not itself a control — the screen must place a real
link or button (usually wrapping the title) for keyboard users. `LiveBadge`
carries the live state as text.

**Do / Don't**

- Do use `size="sm"` inside `.sy-scroller` rails and `md` inside `.sy-grid`.
- Do keep titles at two lines; the clamp is deliberate.
- Don't use it without a live badge or a duration — one of the two must anchor
  the state.
- Don't nest it in another `interactive` surface.

### 13.4 CreatorCard

**What it is for.** A creator's summary in a directory, recommendation rail or
search result: banner, avatar, name, handle, bio, follower count, category, and
one action.

**When not to use it.** Do not use it for the creator's own profile screen
header, and do not use it in a dense list — use `ListRow` with an `Avatar`.

**Anatomy.**

```
Surface padding="none" elevation="surface" interactive .sy-creator-card
├── Media ratio="5/2" radius="none" .sy-creator-card__banner
└── div.sy-creator-card__body
    ├── Avatar size={56} .sy-creator-card__avatar   (margin-block-start: -28px)
    ├── h3.sy-headline.sy-truncate
    ├── p.sy-caption.sy-fg-muted.sy-truncate        (handle)
    ├── p.sy-body-sm.sy-clamp-2.sy-creator-card__bio
    ├── div.sy-creator-card__stats                  (followers + category Badge)
    └── action
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `creator` | `Creator` | — | Required. `creator.live` drives `ring="live"`; `creator.verified` drives the check. |
| `action` | `ReactNode` | — | Usually a follow `Button` with `fullWidth`. |

**Sizing.**

| Part | Value |
|---|---|
| Banner ratio | 5/2, square corners (the card's `overflow: hidden` clips them) |
| Avatar overlap | `margin-block-start: -28px` — exactly half the 56px avatar, the classic profile overlap, tokenised |
| Avatar ring | `0 0 0 3px var(--sy-bg-surface)` |
| Body padding | `0 16px 16px` |
| Bio | Clamped to 2 lines with `min-block-size: 40px`, so cards in a grid stay the same height whether or not a bio is short |

**States.** `interactive` hover lift, as `Surface`.

**Accessibility contract.** `h3` name, text handle, and a `Badge` for the
category. As with `StreamCard`, the interactive surface is presentational — the
real control is the `action` or a link on the name.

**Do / Don't**

- Do pass a `fullWidth` button as the action so a grid of cards has an even
  bottom edge.
- Do let the bio clamp; the reserved 40px is what keeps the grid aligned.
- Don't put more than one action on the card.
- Don't remove the banner; the avatar overlap depends on it.

### 13.5 BarChart

**What it is for.** Comparing a small number of labelled values — up to about
seven — such as a week of views or a breakdown by day.

**When not to use it.** Do not use it for a trend line (`Sparkline`) or a
share-of-total (`Donut`). Do not use it for more than seven columns: the
entrance stagger only defines delays for seven, and the labels will collide.

**Anatomy.**

```
div.sy-barchart.sy-tone-{tone}
├── div.sy-barchart__plot        aria-hidden, inline height
│   └── div.sy-barchart__col × n
│       ├── div.sy-barchart__bar
│       │   └── span.sy-barchart__value.sy-caption
│       └── span.sy-barchart__label.sy-caption.sy-fg-quiet
└── table.sy-sr-only             caption "Chart data", one row per point
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `{ label: string; value: number }[]` | — | Required. |
| `tone` | `'accent' \| 'live' \| 'creator' \| 'success'` | `'accent'` | A deliberately narrower tone set than `Tone`. |
| `height` | `number` | `160` | Plot height in px. |
| `unit` | `string` | `''` | Appended to every value, in both the visual label and the table. |

**Sizing and rendering.**

| Property | Value |
|---|---|
| Bar width | Fluid, capped at 44px |
| Bar radius | `--sy-radius-sm` top corners, 2px bottom corners |
| Bar fill | `linear-gradient(to top, color-mix(in oklab, var(--tone-solid) 42%, transparent), var(--tone-solid))` |
| Column gap | 8px (`--sy-space-2`) |
| Value label | 20px above the bar, tabular figures, `--sy-fg-muted` |

Bars are scaled as `value / max * 100%`, so the chart shows relative shape, not
an absolute axis.

**States.**

| State | Rendering | Timing |
|---|---|---|
| Mount | `sy-bar-grow` from `scale: 1 0; opacity: 0` with `transform-origin: bottom` — bars grow from the baseline, because the axis is the origin. | `--sy-dur-slower` (520ms) with `--sy-ease-emphasized`, staggered 40ms per column for columns 1–7 |
| Reduced motion | `animation: none`. | — |

**Accessibility contract.** The plot is `aria-hidden` and the same numbers are
exposed through a visually hidden table with `<caption>Chart data</caption>` and
a `<th scope="row">` per label, so the chart is not information that only sighted
users can access. Built from flexbox rather than a charting library: at this
data density a library costs more bytes than the whole design system.

**Do / Don't**

- Do give the table meaning by writing real labels ("Mon", "Tue"), not indices.
- Do pass `unit` so both the visual and the table read as quantities.
- Don't exceed seven columns.
- Don't rely on bar height for precise comparison; the value sits above each bar
  for that reason.

### 13.6 Sparkline

**What it is for.** The *shape* of a series next to a number: a 7-day trend
beside a `Stat`, a latency curve beside an SLO.

**When not to use it.** Never as the only representation of the data — it is
deliberately axis-free and `aria-hidden`. If the reader needs values, use
`BarChart` or a table.

**Anatomy.** One `svg.sy-sparkline.sy-tone-{tone}` containing a `polyline`
stroke and a `polygon` fill.

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `number[]` | — | Required. |
| `width` | `number` | `120` | |
| `height` | `number` | `36` | |
| `tone` | `'accent' \| 'success' \| 'danger'` | `'accent'` | Narrower than `Tone`. |

**Rendering.** Points are normalised into the box with a 2px inset top and
bottom (`height - ((value - min) / span) * (height - 4) - 2`), so peaks are not
clipped by the stroke. The line is `--tone-solid` at 2px with round caps and
joins; the area fill is the same colour at `opacity: 0.12`. A flat series is
handled by `span = max - min || 1`.

**States.** Static. No hover, no tooltip, no interaction.

**Accessibility contract.** `aria-hidden="true"`. The precise number is always
shown beside it as text — that is a requirement of using this component, not a
suggestion.

**Do / Don't**

- Do pair it with a `Stat` value and delta.
- Do keep the series between about 7 and 40 points.
- Don't use `tone="danger"` unless the trend itself is the problem.
- Don't scale it below about 60 x 20px, where the shape stops reading.

### 13.7 Donut

**What it is for.** Share-of-total breakdowns with a small number of segments:
revenue by source, traffic by platform, storage by type.

**When not to use it.** Do not use it for a single percentage — that is
`ProgressRing`. Do not use it for more than about five segments, and never for
time series.

**Anatomy.**

```
div.sy-donut                     (inline width/height)
├── svg (aria-hidden)
│   └── circle × segments        (stroked arcs on one shared circle)
├── div.sy-donut__centre         (centre content, absolutely centred)
└── table.sy-sr-only             (caption "Breakdown", one row per segment)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `segments` | `{ label: string; value: number; tone: string }[]` | — | Required. **`tone` here is a raw CSS colour** passed straight to `stroke` — it is not a `Tone` name and does not go through tone indirection. Pass `var(--sy-accent-solid)` or similar. |
| `size` | `number` | `140` | Outer diameter. |
| `thickness` | `number` | `16` | Arc stroke width. |
| `centre` | `ReactNode` | — | Centre content, usually the total. |

**Geometry.** `radius = (size - thickness) / 2`, `circumference = 2πr`; each
segment's arc length is `value / total * circumference`, drawn with
`stroke-dasharray: {length} {circumference - length}` and a running
`stroke-dashoffset`. Every arc is rotated `-90°` so the series starts at 12
o'clock. Segments are drawn in array order, clockwise.

**States.** Static. Segments do not respond to hover.

**Accessibility contract.** The `svg` is `aria-hidden`; the same breakdown is
rendered as a `.sy-sr-only` `<table>` with the caption "Breakdown", a
`<th scope="row">` per label and the share as a percentage to one decimal place.
The percentages in that table are computed from `value / total`, so the arc and
the announced figure cannot drift apart.

**Do / Don't**

- Do render a legend beside it, with the value and the label.
- Do pass ordered segments largest-first so the eye reads the dominant share
  immediately.
- Don't use more than five segments.
- Don't rely on colour alone to match legend to arc — order them the same way.

### 13.8 ListRow

**What it is for.** One line in a dense list: a setting, a transaction, a
person, a file. Leading visual, title, subtitle, trailing content.

**When not to use it.** Do not use it where each item needs media, several
actions, or more than two lines of text — use a `Surface`. Do not use it as a
layout primitive for non-list content.

**Anatomy.**

```
button|div.sy-list-row[.sy-list-row--wrap]
├── span.sy-list-row__leading    (Avatar, .sy-tile-icon, Icon)
├── span.sy-list-row__text
│   ├── span.sy-list-row__title
│   └── span.sy-caption.sy-fg-muted.sy-truncate   (subtitle)
└── span.sy-list-row__trailing   (value, Badge, chevron)
```

**Props.**

| Prop | Type | Default | Description |
|---|---|---|---|
| `leading` | `ReactNode` | — | Does not shrink. |
| `title` | `ReactNode` | — | Required. |
| `subtitle` | `ReactNode` | — | Always truncated to one line. |
| `trailing` | `ReactNode` | — | Row of controls or values; `--sy-fg-muted`. |
| `onClick` | `() => void` | — | When present, the row renders as a `button`; otherwise a `div`. |
| `className` | `string` | — | |
| `wrapTitle` | `boolean` | `false` | Lets the title wrap with `text-wrap: pretty`. Off by default so dense lists stay one line. |

**Sizing.**

| Property | Value |
|---|---|
| Padding | 12px (`--sy-space-3`) |
| Gap | 12px (`--sy-space-3`) |
| Radius | `--sy-radius-md` (10px) |
| Title | 13.5px, weight 550, `--sy-fg-default`, truncated unless `wrapTitle` |
| Trailing gap | 8px (`--sy-space-2`) |

**States.**

| State | Rendering | Timing |
|---|---|---|
| Rest | Transparent background. | — |
| Hover | `--sy-bg-hover` — **only** when rendered as a `button` (`button.sy-list-row:hover`). A non-clickable row has no hover, which is correct. | `--sy-transition-hover` |
| Focus-visible | Global double ring, when it is a button. | instant |
| Active / selected / disabled | Not modelled. Express selection with a trailing `Icon name="check"` or a `Badge`. | — |

**Accessibility contract.** The element type follows the behaviour: `onClick`
produces a real `button` with `type="button"`, otherwise a plain `div` with no
interactive semantics. Never attach a click handler to the `div` form. Nested
controls in `trailing` inside a `button` row would be invalid — put them in a
non-clickable row instead.

**Do / Don't**

- Do use `.sy-tile-icon` as the leading element for settings-style lists.
- Do use `wrapTitle` for content-bearing rows such as threads and notifications.
- Don't put an `IconButton` in `trailing` when `onClick` is set.
- Don't use a chevron in `trailing` unless the row navigates.

---

## 14. Known gaps and inconsistencies

Documented so nobody spends an afternoon looking for these:

| Item | Detail |
|---|---|
| `StreamCard` `size="lg"` | Accepted by the type, no `.sy-stream-card--lg` rule exists; renders as `md`. |
| `.sy-progress--md`, `.sy-badge--sm`, `.sy-input--md` | Classes are emitted but have no CSS rule; the defaults come from the base custom-property values (6px, 20px, 40px). Harmless, but the class list implies more than it does. |
| `LiveBadge` doc comment | The comment in `primitives/index.tsx` still says "deliberately crimson rather than the flux family". Both families were renamed: the CSS uses `--sy-rose-9`, and `tone="live"` now resolves to `pulse`. The behaviour is unchanged and correct; only the names in the comment are stale. |
| `Surface` `glass` prop | The prop, its union values and the `SurfaceProps` comment still say "glass"; every class and token it applies is `vellum`. Renaming the prop is the only outstanding half of that migration. |
| `Donut` `segments[].tone` | Named `tone` but takes a raw CSS colour, unlike every other `tone` prop in the system. |
| `Sparkline` accessibility | `aria-hidden` with no data table, unlike `BarChart` and `Donut`. Deliberate — its doc comment says the precise number is always shown as text beside it — but it is the one chart whose contract depends on the calling screen. |
| `Tooltip` wiring | `aria-describedby` is on `span.sy-tooltip-wrap` rather than on the trigger element, so the description is attached to something that is never focused. |
| `Avatar` `ring` prop comment | Documented as "Draws the aurora story ring"; the CSS uses `--sy-gradient-prism`. `aurora` no longer exists as a gradient name. |
| `Avatar` `presence` / `verified` | `aria-label` on a plain `span` with no role; not reliably announced. |
| `Tabs` doc comment | Claims the underline variant "animates its indicator between tabs"; the CSS comment beside the implementation is honest that each tab owns its own rule and scales it open in place, because a travelling indicator needs JavaScript measurement on every resize and font swap. |
| `Tabs` panels | The component renders no panel and sets no `aria-controls`; screens must supply both. |
| `ThemeContext` default | `createContext` defaults to `{ theme: 'dark' }` while the product is light-first and `DEFAULT_THEME` is `'light'`. Only reachable by a consumer rendered outside `ThemeProvider`. |
| `Button` `variant="glass"` | Applies the vellum panel fill and rim, but its `backdrop-filter` is `blur()` and `saturate()` only. It omits the `brightness()` lift that `.sy-vellum` applies, so a glass button does not transmit the way every other vellum surface does. |
| `Chip` `--tone-*` on a `span` | A removable chip's `.sy-tone-*` class lands on the wrapping `span`, not on either button. That is correct for inheritance, but it means the outer element carries a tone class while having no interactive role of its own. |
