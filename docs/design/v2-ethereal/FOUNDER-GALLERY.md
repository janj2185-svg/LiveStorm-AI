# Founder Gallery — Unified Ethereal Core (approval set)

**Style locked:** Ethereal (founder-approved direction).  
**Rule:** No production code until final written approval of this pack.  
**SSOT:** `DESIGN-SYSTEM.md` · **IA:** `PRODUCT-MAP.md`

All `core-*.png` comps use the **same** shell, tokens, glass, radii, icon language, and ambient light so the product reads as one universe.

## Design system & map
| Asset | Path |
|---|---|
| System board | `mockups/core/ds-system-board.png` (artifacts: `ds-system-board.png`) |
| Product map visual | `ds-product-map-visual.png` |
| Motion storyboard | `core-24-motion-storyboard.png` |
| Ecosystem gallery | `core-99-ecosystem-gallery.png` |

## Core tabs (requested)

| # | Screen | Desktop | Mobile |
|---|---|---|---|
| 1 | Landing | `core-01-landing-desktop.png` | `core-01-landing-mobile.png` |
| 2 | Авторизація | `core-02-login-desktop.png` | — (same card stack) |
| 3 | Реєстрація | — | `core-03-register-mobile.png` |
| 4 | Home | `core-04-home-desktop.png` | `core-04-home-mobile.png` |
| 5 | Стрічка | `core-05-feed-desktop.png` | — |
| 6 | Профіль | — | `core-06-profile-mobile.png` |
| 7 | Повідомлення | `core-07-messages-desktop.png` | — |
| 8 | Друзі | `core-08-friends-desktop.png` | — |
| 9 | AI Aura | `core-09-aura-desktop.png` | expanded in prior batch |
| 10 | Live | `core-10-live-desktop.png` | viewer `core-21-live-viewer-mobile.png` |
| 11 | Creator Studio | `core-11-studio-desktop.png` | scene `core-25-scene-editor-desktop.png` |
| 12 | Магазин подарунків | `core-12-giftshop-desktop.png` | — |
| 13 | Перегляд подарунків | — | `core-13-gift-preview-mobile.png` |
| 14 | Бізнес | `core-14-business-desktop.png` | — |
| 15 | Освіта | `core-15-education-desktop.png` | — |
| 16 | Музика | `core-16-music-desktop.png` | player in batch-08 |
| 17 | Гаманець | — | `core-17-wallet-mobile.png` |
| 18 | Налаштування | `core-18-settings-desktop.png` | — |
| 19 | Адмін | `core-19-admin-desktop.png` | — |
| 20 | Маркет | `core-20-marketplace-desktop.png` | — |
| 21 | Ще (More) | — | `core-22-more-mobile.png` |
| 22 | Пошук | `core-23-search-desktop.png` | — |

Prior `batch-01`…`batch-10` remain as extended coverage (auth states, calls, destinations, etc.).

## Living interface (design intent — not coded yet)
- Animated Liquid S Sigil as ecosystem symbol  
- Ambient light drift + particles + parallax ≤12px  
- Glass specular sheen on hover  
- Shared page transitions + button micro-interactions  
- Aura orb → sheet → immersive only on activation  

## Multilingual readiness
- Flexible CTA widths (+40% locale buffer)  
- No baked-in English on UK comps (fix if any mockup drift)  
- Same layout skeleton for all locales  

## Consistency audit (this pass)

| Check | Result |
|---|---|
| Shared shell across app screens | PASS on core set |
| Porcelain + glass + gold/cyan/violet accents | PASS |
| Sigil as brand (not Aura landing hero) | PASS |
| Aura minimized on Home | PASS |
| Wallet / Gifts single homes | PASS in map + comps |
| Admin still Ethereal (not alien dark admin skin) | PASS |
| Old Lumen pages in this pack | None (design-only) |
| 100% every deep sub-screen hi-fi | PARTIAL — see inventory Todo rows |

**Honest gap:** deep secondary screens (every Settings pane, every Studio sub-tool, every Admin sub-page) are covered by **system templates + Product Map**, with representative hi-fi. They must not invent new styles at build time.

## Founder decision needed
Reply with **APPROVE ETHEREAL FINAL** (or list changes).  
Only then does implementation begin — full restyle of every existing page to this SSOT, zero pages left in old style.
