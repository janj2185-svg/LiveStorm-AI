# Ethereal v2 — Design tokens (draft for approval)

Authoritative after founder approval. Values are design targets; not wired to Flutter yet.

## Color

| Token | Hex / style | Use |
|---|---|---|
| `--sy-canvas` | `#F4F6FA` cool porcelain | Page ground |
| `--sy-canvas-glow` | radial cyan `#7EC8FF22` + violet `#A78BFF18` + gold `#E6C88B22` | Ambient field |
| `--sy-glass` | `rgba(255,255,255,0.55)` | Cards / panels |
| `--sy-glass-strong` | `rgba(255,255,255,0.78)` | Modals / auth |
| `--sy-glass-stroke` | `rgba(255,255,255,0.72)` | 1px luminous border |
| `--sy-ink` | `#121826` | Primary text |
| `--sy-ink-soft` | `#5B6574` | Secondary |
| `--sy-ink-mute` | `#8B93A1` | Tertiary / captions |
| `--sy-gold` | `#E6C88B` | Brand metal / CTA start |
| `--sy-gold-deep` | `#C9A45C` | CTA end / emphasis text |
| `--sy-cyan` | `#5EC8FF` | Live / energy |
| `--sy-violet` | `#8B7CFF` | Aura / intellect (accent only) |
| `--sy-success` | `#3ECF8E` | Success |
| `--sy-danger` | `#FF6B6B` | Errors |
| `--sy-warning` | `#FFB020` | Warnings |

**Rule:** Violet is an *accent*, never a full purple-on-white theme wash. Gold remains the commercial CTA metal.

## Typography

| Role | Family direction | Size desktop | Weight |
|---|---|---|---|
| Display | Geometric sans (custom later) / Satoshi-like | 40–56 | 600–700 |
| Title | same | 24–32 | 600 |
| Body | same | 15–16 | 400–500 |
| Caption | same | 12–13 | 500 |
| Brand wordmark | tracked caps | 14–18 | 600 |

No Inter / Roboto / Arial as brand voice.

## Radius

| Token | Value |
|---|---|
| `--r-sm` | 12 |
| `--r-md` | 16 |
| `--r-lg` | 24 |
| `--r-xl` | 32 |
| `--r-cta` | 20 (soft, not 999 pill by default) |

## Elevation / glass

- Blur: 18–28px backdrop
- Glow: colored, low alpha, keyed to module
- Avoid multi-layer black shadows

## Spacing

4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

## Breakpoints

| Name | Width |
|---|---|
| Mobile | 0–767 |
| Tablet | 768–1199 |
| Desktop | 1200+ |
