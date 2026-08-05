# SYLORA Ethereal v2 — Design Direction

**Status:** Design review only. No production implementation until explicit founder approval.  
**Reference:** Founder-attached concept board (glass · ethereal light · modular dashboard · liquid S mark).  
**Language default for review comps:** Ukrainian (EN comps only when language toggle is the subject).

---

## 1. What this direction replaces

| Previous (Lumen / champagne-glass) | Ethereal v2 (concept) |
|---|---|
| Warm ivory / champagne / soft sky | Cool light porcelain + cyan · violet · metallic gold energy |
| Lumen Gate (crescents + filament + diamond) | **Liquid metallic S** in a luminous energy orb |
| Aura as optional companion | Aura **hidden/minimized by default**; contextual activation only |
| Champagne CTA pills | Gold solid CTAs + frosted glass secondary CTAs |
| Warm radial washes | Ethereal light streaks + glass refraction |

This is a **full visual system reset**, not a recolor of the old boards.

---

## 2. Brand mark — Liquid S (working name: *Sylora Sigil*)

- Instantly readable as **S** at favicon size.
- Iridescent metal: cyan → magenta → gold (subtle, never rainbow noise).
- Lives inside a soft energy orb with sparse particles (living tech, not disco).
- **Landing hero = animated Sigil**, never Aura portrait, never giant wordmark competing with the mark.
- Wordmark `SYLORA` is secondary (tracked geometric sans or refined display).
- Tagline gold accent: `ONE WORLD. INFINITE CREATION.` / UK equivalent when locale = uk.

---

## 3. Visual physics

1. **Light is the material.** Elevation = more light / frost, not heavy drop shadows.
2. **Glass surfaces** = semi-transparent white fills + thin luminous border + backdrop blur.
3. **Glow, not shade** for accents (inner/outer soft glows keyed to module hue).
4. **Module color** = one soft circular glow under a thin-line icon — never a loud filled icon tile.
5. **Whitespace is premium.** One job per section; no card soup in the hero.
6. **Motion** = living energy on the Sigil + soft glass transitions; avoid spin-only logos.

---

## 4. Information architecture (single primary home per feature)

| Feature | Primary home | Must NOT also live as |
|---|---|---|
| Wallet / balance / transactions | `/wallet` | Duplicate tile on Home, More, Live, Market |
| Gift purchase / inventory | Gift Shop (`/gifts`) | Separate “shop” inside Wallet |
| Gift send | **Live only** (contextual) | Global gift button on Home |
| Creator earnings / payouts | Creator Studio → Monetization | Second earnings hub in Wallet (Wallet links once) |
| Aura | `/ai` + contextual sheets | Always-on floating chatbot |
| Live go-live | Live → Start / Creator Studio | Fake “live” without media path |
| Settings | `/settings` (from More) | Scattered mini-settings clones |

---

## 5. Navigation skeleton

### Public
Landing → Product chapters → Auth (login / register / recover / verify) → Legal

### Authenticated — Desktop
Left sidebar (icon + label): Home, Live, Aura, Messages, Friends, Market, Learning, Business, Music, Creator Studio, Wallet, Settings.  
Top bar: Search · Create (+) · Notifications · Messages shortcut · Profile.

### Authenticated — Mobile
Bottom bar (primary 5): Home · Live · Create · Messages · More.  
Aura = entry in More + contextual FAB only when activated (not persistent cover).  
More opens: Friends, Market, Learning, Business, Music, Creator Studio, Wallet, Gifts, Settings, Profile.

### Tablet
Sidebar collapsed to icons (rail) + content; same IA as desktop.

---

## 6. Universal states (apply to every screen)

Documented once; each screen inventory references these patterns:

| State | Pattern |
|---|---|
| Loading | Glass skeleton shimmer OR centered Sigil pulse + short status line |
| Empty | Soft illustration (line) + one sentence + one primary action |
| Error | Inline glass banner + retry; never blank dead ends |
| Disabled | 40% opacity + no glow; still readable |
| Success | Soft gold check glow + short confirmation; auto-dismiss or single CTA |
| Hover (desktop) | Glass brighten + 1px luminous border; 120–180ms |
| Pressed | Scale 0.98 + glow tighten; 80–120ms |

---

## 7. Review method

Designs are shown in **batches**. For each screen:

- Desktop + Mobile hi-fi comps (Tablet = rail adaptation of desktop unless layout uniquely differs).
- State coverage called out in the batch note (shared patterns + unique states).
- Ukrainian strings on all review comps unless the screen is language settings.

**No Flutter / API / CSS production implementation** until the founder explicitly approves the complete design pack.
