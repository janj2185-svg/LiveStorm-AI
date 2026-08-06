# SYLORA Ethereal — Design System (Single Source of Truth)

**Status:** Design approval — **no production implementation** until founder final sign-off.  
**Codename:** Ethereal  
**Principle:** One living digital universe. Every screen is the same product, different rooms.

This document is the **only** allowed source for color, type, space, icons, components, motion, interaction, accessibility, and responsiveness.  
Any screen that invents local styles is out of system and must be corrected before build.

---

## 0. Product laws (non-negotiable)

1. **One ecosystem** — modules share shell, tokens, motion, icons. Never feel like a different app.
2. **One primary home per feature** — no duplicated Wallet / Gifts / Earnings / Settings.
3. **Brand mark first** — animated Liquid S Sigil is the ecosystem symbol; Aura is never the public landing hero.
4. **Aura is contextual** — hidden/minimized by default; appears on activation or contextual need.
5. **Locale purity** — when Ukrainian is selected, every visible string is Ukrainian (same for every locale). Layouts are multilingual-ready (flexible widths, no hard-cropped labels).
6. **Timeless over trendy** — glass + light + restraint. Avoid seasonal fashion (neon overload, meme UI, chaotic gradients).
7. **Depth with air** — premium space; one job per section; reusable components only.

---

## 1. Color system

### 1.1 Core surfaces
| Token | Value | Role |
|---|---|---|
| `canvas` | `#F4F6FA` | Page ground |
| `canvasElevated` | `#FBFCFF` | Raised sheet |
| `glass` | `rgba(255,255,255,0.55)` | Default glass fill |
| `glassStrong` | `rgba(255,255,255,0.78)` | Modals / auth |
| `glassSoft` | `rgba(255,255,255,0.35)` | Nested glass |
| `stroke` | `rgba(255,255,255,0.72)` | Luminous 1px border |
| `strokeSoft` | `rgba(255,255,255,0.40)` | Hairline |

### 1.2 Ink
| Token | Value | Role |
|---|---|---|
| `ink` | `#121826` | Primary text |
| `inkSoft` | `#5B6574` | Secondary |
| `inkMute` | `#8B93A1` | Captions / placeholders |
| `inkInverse` | `#FFFFFF` | On gold / dark media chrome |

### 1.3 Brand & energy (accent only — never full-page washes)
| Token | Value | Role |
|---|---|---|
| `gold` | `#E6C88B` | Brand metal / CTA start |
| `goldDeep` | `#C9A45C` | CTA end / emphasis |
| `goldLight` | `#F5DEB3` | Highlights |
| `cyan` | `#5EC8FF` | Live / energy |
| `violet` | `#8B7CFF` | Aura / intellect (**accent only**) |
| `aqua` | `#6ED6C5` | Success-adjacent soft |

### 1.4 Feedback
| Token | Value |
|---|---|
| `success` | `#3ECF8E` |
| `warning` | `#FFB020` |
| `danger` | `#FF6B6B` |
| `info` | `#5EC8FF` |

### 1.5 Ambient field (background energy — not chrome color)
Soft layered radials: cyan `22` alpha + violet `14` alpha + gold `18` alpha on `canvas`.  
**Forbidden:** purple-on-white theme, flat single-color pages, random neon fills.

### 1.6 Module glow map (icon under-glow only)
| Module | Glow |
|---|---|
| Home | gold soft |
| Live | cyan |
| Aura | violet soft |
| Messages | gold-cyan mix |
| Friends | aqua |
| Market | gold |
| Learning | violet soft |
| Business | goldDeep |
| Music | cyan-gold |
| Studio | cyan |
| Wallet | gold |
| Settings | inkMute glass |

---

## 2. Typography

**Family direction:** one geometric premium sans for UI (custom later; comps: clean geometric).  
**Display optional:** same family at heavier tracking for wordmark — not a second personality.

| Role | Size (mobile → desktop) | Weight | Tracking |
|---|---|---|---|
| Display | 32–48 | 600–700 | -0.02em |
| Title | 22–28 | 600 | -0.01em |
| TitleSm | 18–20 | 600 | 0 |
| Body | 15–16 | 400–500 | 0 |
| BodySm | 13–14 | 400–500 | 0 |
| Caption | 12–13 | 500 | 0.02em |
| Overline | 11–12 | 600 | 0.14em |
| Wordmark | 14–18 | 600 | 0.28–0.42em |

**Multilingual:** never truncate critical CTAs; allow 2 lines on buttons where locale expands (~40% buffer). Prefer sentence case for CTAs (not shouty ALL CAPS), except overlines.

---

## 3. Modular grid & spacing

### Spacing scale (8-pt base)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

### Layout
| Zone | Mobile | Tablet | Desktop |
|---|---|---|---|
| Page padding X | 16 | 24 | 32 |
| Content max | fluid | 920 | 1200 (main) |
| Sidebar | — | 72 rail | 240 expanded / 72 rail |
| Bottom bar | 64 + safe | — | — |
| Card gap | 12–16 | 16 | 16–24 |
| Section gap | 24–32 | 32 | 40–48 |

### Columns
- Mobile: 4  
- Tablet: 8  
- Desktop: 12  
Gutter: 16 (mobile) / 20 (tablet+)  

---

## 4. Shape & depth

| Token | Value |
|---|---|
| `r.sm` | 12 |
| `r.md` | 16 |
| `r.lg` | 24 |
| `r.xl` | 32 |
| `r.cta` | 20 |
| `r.pillSoft` | 999 only for chips/badges — **not** primary CTAs |

**Glass recipe:** fill `glass` + border `stroke` + backdrop-blur 20–28px + optional soft colored outer glow.  
**Elevation:** light, not black stacks. Prefer glow / soft sky shadow `ink @ 6–10%`.

---

## 5. Icon system

- Style: **thin-line**, 1.5–2px optical, rounded joins/caps.
- Optical size: 20 / 24 / 28.
- Sit on soft circular module glow (see glow map) — never loud filled glyph tiles.
- One set for entire product. No mixed emoji-as-icon in chrome.
- Broken / placeholder icons are release blockers.

---

## 6. Component library (reusable only)

### 6.1 Actions
- `ButtonPrimary` — gold gradient, r.cta, hover glow, press 0.98
- `ButtonGlass` — glass + stroke, secondary
- `ButtonGhost` — text/inkSoft
- `ButtonDanger` — danger soft fill
- `IconButton` — 40–44 tap

### 6.2 Inputs
- `Field` / `TextArea` / `SearchField` / `OTP` / `Select` / `Toggle` / `Checkbox` / `Radio`
- States: default · hover · focus (cyan/gold ring) · error · disabled · success

### 6.3 Surfaces
- `GlassCard` · `ModuleTile` · `Sheet` · `Modal` · `Popover` · `Banner` · `Toast`

### 6.4 Navigation
- `NavRail` (desktop/tablet) · `BottomBar` (mobile) · `TopBar` · `Tabs` · `Breadcrumbs` (rare)

### 6.5 Data & content
- `Avatar` · `Badge` · `ListRow` · `FeedCard` · `StatChip` · `Progress` · `Skeleton` · `EmptyState` · `ErrorState`

### 6.6 Brand & presence
- `Sigil` (sm / md / hero, static / living)
- `AuraOrb` (minimized)
- `AuraPresence` (expanded — immersive only when activated)
- `LiveBadge` · `GiftTile` · `PlayerBar` · `CallControls`

**Rule:** screens compose from this library. No one-off buttons/cards/fields.

---

## 7. Motion system (“living interface”)

### 7.1 Laws
1. Energy, not spin-for-spin.
2. Glass settles; no cartoon bounce.
3. Aura never ambient-covers UI.
4. Shared easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
5. `prefers-reduced-motion`: crossfade/opacity only.

### 7.2 Durations
`fast 140` · `med 320` · `slow 700` · `scene 1100` · `sigilLoop 5200–6800`

### 7.3 Global living layer (subtle, always-on where appropriate)
- Soft ambient field drift (parallax ≤ 12px vs pointer)
- Sparse canvas particles (budgeted; fewer on mobile)
- Glass specular sheen on hover (buttons/cards)
- Sigil breath + iridescent shift + motes (brand surfaces)

### 7.4 Interaction catalogue
| Event | Motion |
|---|---|
| Button hover | glow +2%, sheen sweep 400ms |
| Button press | scale 0.98, 80–120ms |
| Nav change | content fade/slide 8–12px, 280–360ms |
| Modal/sheet | dim + glass scale 0.98→1 |
| Page enter | stagger rise 40–80ms/item |
| Sigil idle | breath ±2%, particles, light filaments |
| Aura open | orb → sheet → optional immersive |
| Live gift | sheet up; gift arc 600–900ms |
| Toast | rise + soft gold/cyan glow |

---

## 8. Interaction rules

- Primary action: one per view region.
- Destructive: confirm sheet.
- Offline/error: inline banner + retry; never blank dead end.
- Loading: skeleton preferred; Sigil pulse only for full-route boots.
- Empty: one sentence + one CTA.
- Focus visible for keyboard.
- Touch targets ≥ 44×44.

---

## 9. Accessibility

- Text contrast ≥ WCAG 2.2 AA on ink/canvas and ink on gold (verify goldDeep text).
- Don’t rely on color alone for state.
- Motion-safe mode mandatory.
- Hit areas and labels for icon-only controls.
- Screen reader names for Sigil, Aura, Live badges.

---

## 10. Responsiveness

| Breakpoint | Width | Shell |
|---|---|---|
| Mobile | 0–767 | Bottom bar + More |
| Tablet | 768–1199 | Icon rail + content |
| Desktop | 1200+ | Expanded sidebar + top bar |

Studio / Live stage / Calls may use darker media chrome **inside** the module while shell stays Ethereal light.

---

## 11. Design tokens export shape (for later build)

Logical groups: `color.*` · `space.*` · `radius.*` · `type.*` · `motion.*` · `elevation.*` · `z.*`  
Build maps tokens → Flutter/`ThemeExtension` + CSS variables. **No literal hex in feature widgets.**

---

## 12. Anti-patterns (blocked)

- Old Lumen ivory/champagne pages left untouched  
- Hexagon / generic AI orb / Aura-as-landing-hero  
- Duplicate Wallet tiles across modules  
- Mixed icon styles / emoji chrome  
- Mixed languages on one screen  
- Random radii / one-off CTA colors  
- Persistent floating chatbot covering content  

---

**Next:** Product Map + complete screen comps must all cite this SSOT. Implementation starts only after founder final approval.
