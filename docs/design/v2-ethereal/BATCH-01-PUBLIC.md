# Batch 1 — Public experience (hi-fi review)

**Locale on comps:** Ukrainian  
**Visual system:** Ethereal v2 (see `00-DIRECTION.md`)  
**Implementation:** blocked until full design pack approval

## Screen inventory (Batch 1)

| ID | Screen | Desktop | Tablet | Mobile | States covered |
|---|---|---|---|---|---|
| P-01 | Animated landing | ✅ | =desktop scaled | ✅ | normal; motion: Sigil breath/particles (spec) |
| P-02 | Product / About SYLORA | ✅ | rail note | mobile = stacked columns | normal |
| P-03 | Creator presentation | ✅ | rail note | stacked | normal |
| P-04 | AI (Aura) presentation | ✅ | rail note | stacked | normal — Aura NOT landing hero |
| P-05 | Live presentation | ✅ | rail note | stacked | normal |
| P-06 | Business presentation | ✅ | rail note | stacked | normal |
| P-07 | Education presentation | ✅ | rail note | stacked | normal |
| P-08 | Registration | mobile hi-fi ✅ | =mobile+pad | ✅ | + shared auth states board |
| P-09 | Login | ✅ | ✅ | =auth card stack | + shared states |
| P-10 | Password recovery | ✅ | =desktop card | stack | empty email error via states board |
| P-11 | Email verification (OTP) | ✅ | =desktop card | stack | resend disabled cooldown |
| P-12 | Legal / Privacy | =desktop prose | =desktop | ✅ | accept sticky |

Tablet rule for public marketing: same composition as desktop with 32px side padding and max content width 920; auth uses centered card like desktop.

## Comps

### Landing
<img src="/opt/cursor/artifacts/assets/batch1-landing-desktop.png" alt="Landing desktop" />
<img src="/opt/cursor/artifacts/assets/batch1-landing-mobile.png" alt="Landing mobile" />

**Notes**
- Hero = Liquid S Sigil + energy orb only.
- Dual CTA: gold primary + glass secondary.
- Four module teasers below fold — not in first viewport budget if mark needs room; concept allows a tight four-up under CTA on desktop.
- No Aura portrait.

### Auth
<img src="/opt/cursor/artifacts/assets/batch1-login-desktop.png" alt="Login desktop" />
<img src="/opt/cursor/artifacts/assets/batch1-login-tablet.png" alt="Login tablet" />
<img src="/opt/cursor/artifacts/assets/batch1-register-mobile.png" alt="Register mobile" />
<img src="/opt/cursor/artifacts/assets/batch1-password-recovery-desktop.png" alt="Password recovery" />
<img src="/opt/cursor/artifacts/assets/batch1-email-verify-desktop.png" alt="Email verification" />
<img src="/opt/cursor/artifacts/assets/batch1-auth-states-board.png" alt="Auth states" />

### Product chapters
<img src="/opt/cursor/artifacts/assets/batch1-about-product-desktop.png" alt="About / product" />
<img src="/opt/cursor/artifacts/assets/batch1-creator-presentation-desktop.png" alt="Creator" />
<img src="/opt/cursor/artifacts/assets/batch1-ai-presentation-desktop.png" alt="AI Aura presentation" />
<img src="/opt/cursor/artifacts/assets/batch1-live-presentation-desktop.png" alt="Live presentation" />
<img src="/opt/cursor/artifacts/assets/batch1-business-presentation-desktop.png" alt="Business" />
<img src="/opt/cursor/artifacts/assets/batch1-education-presentation-desktop.png" alt="Education" />

### Legal
<img src="/opt/cursor/artifacts/assets/batch1-privacy-mobile.png" alt="Privacy mobile" />

## Interaction & motion (public)

| Moment | Motion |
|---|---|
| Landing enter | Sigil fades + scales 0.92→1 (700ms), orb particles ease in, then wordmark/CTAs rise |
| Sigil idle | Breath (scale ±2%), filament/energy shimmer, 3–5 orbiting motes |
| CTA hover | Glass brighten / gold glow +2%; press scale 0.98 |
| Auth submit | Button → spinner in-place; card locks |
| OTP | Auto-advance focus; paste support |
| Locale | Entire public surface swaps language; never mix UK/EN strings |

## Open design questions (Batch 1)

1. Tagline: keep English concept line on UK locale, or full Ukrainian equivalent?
2. Landing four-up under CTA vs true below-fold chapters only?
3. Legal: single Privacy+Terms hub vs separate routes?

## Founder gate for Batch 1

Approve / request changes on mark, auth chrome, and chapter layouts before we treat Batch 1 as locked. Next batch: **Home & social network**.
