# Motion, sound and haptics

Motion in SYLORA has one job: **explain what just happened, before the user has
to think about it.** Decoration is a side effect, never the goal.

Source: `src/design-system/tokens/motion.ts`.

---

## 1. The five laws

**1. Origin.** Things enter from where they came from. A menu opened by a button
grows out of that button. A sheet summoned from the bottom bar rises from the
bottom bar. Motion is a line drawn between cause and effect — if you cannot name
the cause, the motion should not exist.

**2. Duration follows distance.** A 4px checkbox tick and a full-screen page
transition cannot share a duration. Larger travel and larger area get more time,
or the motion reads as a teleport.

**3. Exits are faster than entrances.** The user has already decided; making
them watch the decision play out is a tax. Exits run at roughly 0.6× entrance
duration.

**4. Nothing important waits on an animation.** Content is interactive the frame
it is committed. Animation is never on the critical path of intent.

**5. Reduced motion is a real mode, not a downgrade.** When requested, movement
is replaced by instant state plus a short opacity fade, so causality is still
legible without vestibular cost.

---

## 2. Duration

Anchored at 200ms, roughly the threshold where a transition stops registering as
"a change" and starts registering as "a movement". Below ~100ms motion is
subliminal; above ~500ms it becomes something the user waits for.

| Token | ms | Use |
|---|---|---|
| `instant` | 80 | State flips that must feel like the click itself: toggles, ticks, press scale |
| `fast` | 140 | Hover, focus, small colour and elevation changes |
| `base` | 200 | The default. Most enter/exit, most component state |
| `moderate` | 280 | Popovers, dropdowns, medium travel |
| `slow` | 380 | Sheets, drawers, dialogs |
| `slower` | 520 | Full page and shared-element transitions |
| `ambient` | 900 | Looping, non-blocking atmosphere only |

---

## 3. Easing

Named by physical intent, so the right curve is obvious at the call site. **The
asymmetry between `enter` and `exit` is the single highest-leverage detail in
the whole motion system.**

| Token | Curve | Character | Use |
|---|---|---|---|
| `enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Decelerates hard | Entering the screen. The element arrives already moving and settles — it reads as "it was always on its way here" |
| `exit` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerates away | Leaving. No lingering, nothing to watch |
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric, weighted end | Moving between two on-screen positions. The element seems to have mass |
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Fast middle, soft landing | Hero and shared-element transitions |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot | Elements that should feel physical: a sent message, a claimed reward, a gift landing. **Never for anything that must be read immediately** — the overshoot delays legibility |
| `anticipate` | `cubic-bezier(0.68, -0.4, 0.32, 1.4)` | Pulls back first | Playful. Use sparingly |
| `linear` | `linear` | Constant rate | Only for continuous loops: spinners, marquees, the logo's lens cluster and the orb's rings, which are mechanisms genuinely rotating at constant rate |

### Canonical recipes

Pairing a duration with an easing is where most motion goes wrong, so the valid
pairs are enumerated rather than left to judgement.

| Token | Value |
|---|---|
| `--sy-transition-hover` | 140ms standard |
| `--sy-transition-press` | 80ms standard |
| `--sy-transition-enter` | 200ms enter |
| `--sy-transition-exit` | 140ms exit |
| `--sy-transition-popover` | 280ms enter |
| `--sy-transition-sheet` | 380ms emphasized |
| `--sy-transition-page` | 520ms emphasized |
| `--sy-transition-celebrate` | 280ms spring |

---

## 4. Travel

Deliberately small. Large translations at speed cause motion sickness and, at
these durations, read as sliding rather than arriving.

| Token | px | Use |
|---|---|---|
| `micro` | 2 | Card hover lift |
| `small` | 8 | Popover, tooltip entrance |
| `medium` | 16 | List item entrance, section cascade |
| `large` | 32 | Sheet, celebration toast |

---

## 5. Choreography

Lists animate as a **cascade, not in unison**. A unison entrance reads as one
object; a cascade reads as many.

| Token | ms | Use |
|---|---|---|
| `tight` | 30 | Dense rows, chips |
| `base` | 40 | Default. Cards, list items |
| `loose` | 60 | Large hero elements |

40ms is the smallest delay the eye reliably resolves as sequence. **Beyond 8
items the cascade is capped** and everything remaining enters with the eighth —
otherwise a long list turns the cascade into a loading bar.

`.sy-enter` applies this: children animate `sy-enter-up` (opacity 0 → 1,
translate 16px → 0) over 380ms with `enter` easing and `backwards` fill.

---

## 6. Ambient motion

Strictly decorative, runs below 1% CPU on integrated graphics, and is the first
thing disabled under reduced motion.

| Token | ms | What |
|---|---|---|
| `auroraDrift` | 24000 | The ambient brand field's drift. Slow enough to be felt, not watched |
| `livePulse` | 1800 | Live indicator. Matched to a resting heart rate — calm urgency |
| `thinkingSweep` | 1600 | AI processing shimmer |
| `skeletonSweep` | 1400 | Loading placeholder sweep |

Two caveats on the first row. The backdrop is now `.sy-lumen` — very wide, very
pale washes rather than an aurora — and `AMBIENT` is the one token group that is
**not** compiled into CSS. `.sy-lumen` reads `--sy-lumen-duration` with a
fallback of `26s`, so the value that actually ships is 26000, not the 24000 in
`motion.ts`. Treat `auroraDrift` as a stale name carrying a stale number until
the two are reconciled.

**Skeletons sweep rather than pulse.** A sweep implies "content is arriving from
somewhere"; a pulse implies "something is wrong". The sweep is a single
`background-position` animation, which the compositor handles without layout.

---

## 7. Interaction motion catalogue

| Interaction | Motion | Duration / easing |
|---|---|---|
| Button press | `scale: 0.97` | 80ms standard |
| Button hover (primary) | Light: background shift, 1px rise and a deeper shadow. Dark: no rise, and a refraction bloom at `--sy-refract-bloom-spread` in the button's own tone — a halo is invisible on a white page, so light uses shadow and only dark can use light | 140ms standard |
| Card hover | `translate: 0 -2px` and elevation rises to `raised`. The border strengthens in dark theme only, because an elevated surface in light theme has no border to strengthen | 140ms standard |
| Card press | Returns to `translate: 0` | 140ms |
| Chip press | `scale: 0.96` | 80ms |
| Tab bar item press | `scale: 0.92` | 80ms |
| Switch toggle | Thumb translates 18px | 200ms **spring** — the overshoot makes it feel mechanical |
| Checkbox check | Background and border fill | 80ms |
| Slider grab | Thumb `scale: 1.15` | 80ms |
| Input focus | Border to accent, a 3px ring at 20% accent, and the recessed fill lifts from `--sy-bg-canvas` to `--sy-bg-surface` — the well comes up to meet you | 140ms |
| Tab select (underline) | Indicator `scale: 0 1 → 1 1` | 200ms emphasized |
| Progress fill | Width interpolates | 200ms enter |
| Progress ring | `stroke-dashoffset` interpolates | 200ms enter |
| Indeterminate progress | 40%-wide fill slides −100% → 250% | 1400ms standard, loop |
| Bar chart entry | Bars scale from the baseline, 40ms stagger, capped at 7 | 520ms emphasized |
| Toast / gift land | Translate from −32px, `scale: 0.88 → 1`, fade | 280ms **spring** |
| Section entrance | 16px rise + fade, 40ms cascade | 380ms enter |
| Story ring press | `scale: 0.94` | 80ms |
| Media play hover | Play button `scale: 1.08`, fill lightens | 140ms |
| Drawer / nav panel | Translate −100% → 0 | 380ms emphasized |
| Spinner | Rotate 360° | 640ms linear, loop |
| Live dot | Opacity 1 → 0.45, `scale: 1 → 0.82` | 1800ms standard, loop |

### Page transitions

| Transition | Behaviour |
|---|---|
| Push (forward) | Incoming enters from 32px right with fade; outgoing exits left at 0.6× duration |
| Pop (back) | Mirrored |
| Tab switch | Cross-fade only, no travel — tabs are siblings, not a hierarchy |
| Modal | Scrim fades over 200ms; dialog scales 0.96 → 1 with fade over 380ms emphasized |
| Sheet | Translates from 100% with `emphasized`, scrim fades in parallel |
| Shared element | Media rect interpolates position and size over 520ms emphasized; surrounding chrome cross-fades |

---

## 8. Reduced motion

Under `prefers-reduced-motion: reduce`:

- Every `--sy-dur-*` token becomes **1ms** — not 0, so `transitionend` events
  still fire and component logic awaiting them does not stall.
- Every `--sy-transition-*` becomes `120ms linear`.
- Every `--sy-travel-*` becomes `0px`, so transforms collapse and opacity
  carries the change.
- Ambient animations (the lumen field's drift, the logo's lens rotation, orb
  rotation, live pulse, skeleton sweep, bar growth) are set to `none`.
- The brand still communicates state: the AI orb's core drops to 70% opacity
  for `thinking` rather than moving.
- Smooth scrolling is disabled.

---

## 9. Sound

SYLORA ships an optional, **off-by-default** audio layer.

Sound is used only where a state change happens **outside the user's gaze** — a
gift arriving, a stream going live, a message received. Confirmation of
something the user is already looking at gets haptics, not audio.

Frequencies sit in the 400–1000Hz band where small speakers are honest, and no
cue runs longer than 200ms so it never overlaps the next one. `error` is the
deliberate exception at 220Hz: a rejection should sit below the band everything
else occupies. The source comment in `motion.ts` states the band and the
duration limit more strictly than the table it annotates.

`SOUND` and `HAPTIC` are token definitions only. Nothing in `src/` imports
either — the gallery has no audio or vibration layer, so these values are a
specification awaiting an implementation.

| Cue | ms | Hz | Gain | Trigger |
|---|---|---|---|---|
| `tap` | 40 | 660 | 0.03 | Primary press. Barely audible |
| `toggle` | 60 | 520 | 0.04 | Switch and checkbox commit |
| `success` | 180 | 880 | 0.06 | Action completed |
| `error` | 160 | 220 | 0.07 | Action rejected |
| `message` | 120 | 740 | 0.05 | Incoming message |
| `gift` | 200 | 960 | 0.08 | Gift received on stream |
| `live` | 200 | 480 | 0.06 | A followed creator went live |

**Rules.** Sound is never the sole carrier of information. It is suppressed
entirely while the user is broadcasting or recording. It respects the OS silent
switch. And it is capped at one cue per 300ms so a burst of gifts does not
become noise.

---

## 10. Haptics

Patterns are millisecond arrays for the Vibration API. Haptics confirm what the
user just did; they never announce something new.

| Pattern | Sequence | Trigger |
|---|---|---|
| `tap` | `[8]` | Primary press |
| `select` | `[12]` | Selection change |
| `success` | `[12, 40, 18]` | Action completed |
| `warning` | `[20, 60, 20]` | Destructive confirmation shown |
| `error` | `[30, 50, 30, 50, 30]` | Action rejected |
| `gift` | `[10, 30, 10, 30, 24]` | Gift sent or received |

Haptics are suppressed under reduced motion, since vestibular sensitivity and
tactile sensitivity frequently travel together.
