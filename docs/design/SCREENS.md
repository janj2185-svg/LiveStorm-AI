# SYLORA screen specification

The specification for all 38 product screens. Every entry describes what is
implemented in `src/screens/`, not what is planned. Where a behaviour is drawn
but not wired to anything, that is stated in the entry.

Companion documents: `docs/design/FLOWS.md` (end-to-end user flows),
`docs/design/SCREEN_AUTHORING_GUIDE.md` (conventions),
`docs/design/COMPONENTS.md` (primitives).

---

## How to read this document

### Screens respond to their content column, not the device

Every screen renders inside `.sy-main`, which declares `container: screen /
inline-size` (`src/design-system/styles/patterns.css`). A screen therefore
never sees the viewport — it sees the column the shell hands it after the shell
has taken its own chrome.

`AppShell` has three postures, chosen by a container query on `.sy-shell`:

| Posture | Shell container | Chrome |
|---|---|---|
| Compact | `< 768px` | Top bar, content, floating bottom tab bar |
| Medium | `>= 768px` | Collapsed 76px icon rail, content |
| Expanded | `>= 1280px` | Expanded 264px rail, content, 340px context panel |

The resulting content columns for the five reference devices in
`src/showcase/devices.ts`:

| Device | Reference | Viewport | Posture | Content column |
|---|---|---|---|---|
| iPhone | iPhone 15 Pro | 393 | Compact | **393** |
| Android | Pixel 8 Pro | 412 | Compact | **412** |
| Tablet | iPad Pro 11-inch | 834 | Medium | **758** (less the 76px collapsed rail) |
| Web | Desktop browser | 1280 | Expanded | **676** (less 264 rail + 340 context panel) |
| Desktop | MacBook Pro 14-inch | 1512 | Expanded | **908** (less 264 rail + 340 context panel) |

Two consequences the code comments call out repeatedly:

1. Web at 1280 is **narrower** than tablet at 834. The expanded posture spends
   604px on navigation, so 676px is the tightest multi-column case in the
   product.
2. A `min-width: 768px` container query fires on **neither** the tablet nor the
   1280 web posture. Device-shaped numbers are the wrong numbers here.

### The context-panel qualifier

`AppShell` only renders `.sy-context` when the screen supplies a
`contextPanel`. Four screens do: `home`, `assistant`, `creator-dashboard` and
`wallet`. For those four the expanded columns are 676 and 908 exactly as
`patterns.css` documents.

For the other 30 non-immersive screens the panel is never rendered, so the
expanded posture only deducts the 264px rail and the columns are **1016** (web
1280) and **1248** (desktop 1512). This matters: a `min-width: 960px` query
fires on those 30 screens at web and desktop, and would not fire on a
panel-bearing screen at either.

| Screen class | 393 | 412 | 834 | 1280 | 1512 |
|---|---|---|---|---|---|
| Non-immersive, no context panel (30 screens) | 393 | 412 | 758 | **1016** | **1248** |
| Non-immersive, with context panel (4 screens) | 393 | 412 | 758 | **676** | **908** |
| Immersive (4 screens) | 393 | 412 | **834** | **1280** | **1512** |

Immersive screens take the whole frame: `AppShell` returns
`.sy-shell-frame.sy-shell--immersive` before any chrome is built, and that
element establishes the `screen` container itself.

Each entry below lists the container queries the screen actually declares and
which of the five reference columns they fire at. The authoring guide names
560 / 640 / 768 / 840 / 880 / 1024 / 1280 as the house thresholds; individual
group stylesheets frequently choose other values (700, 720, 900, 960, 992,
1100, 1152) and say why in a comment. The values below are the ones in the CSS.

### What "implemented" means here

The product is a screen gallery (`src/showcase/App.tsx`), not a running
application. There is no router, no data layer and no network. Screens render
the fixtures in `src/screens/data.ts` plus local constants, and any behaviour
described as stateful is React component state (`useState`) held for the life
of the mounted screen. `AppShell` accepts an `onNavigate` callback but the
gallery does not pass one, so shell navigation targets are inert. Nothing
persists across a reload.

Consequently, most screens have no loading or error state to specify: there is
nothing that can be slow or fail. `EmptyState` appears exactly twice
(`MessagesScreen` archived tab, `SearchScreen` events facet) and `Skeleton`
exactly once (`AssistantScreen`'s in-flight turn). Entries say so plainly
rather than describing states that do not exist.

---

## Index

| # | Name | id | Group | Primary device posture | Immersive |
|---|---|---|---|---|---|
| 1 | Welcome | `welcome` | Entry | Not declared | No |
| 2 | Authentication | `auth` | Entry | Not declared | No |
| 3 | Onboarding | `onboarding` | Entry | Not declared | No |
| 4 | Home | `home` | Core | Not declared | No |
| 5 | Feed | `feed` | Core | Not declared | No |
| 6 | Search | `search` | Core | Not declared | No |
| 7 | Discover | `discover` | Core | Not declared | No |
| 8 | Profile | `profile` | Core | Not declared | No |
| 9 | Settings | `settings` | Core | Not declared | No |
| 10 | Notifications | `notifications` | Core | Not declared | No |
| 11 | AI Assistant | `assistant` | Core | Not declared | No |
| 12 | Video Player | `player` | Media | Not declared | **Yes** |
| 13 | Stories | `stories` | Media | iPhone — compact (declared) | **Yes** |
| 14 | Short Videos | `shorts` | Media | iPhone — compact (declared) | **Yes** |
| 15 | Long Videos | `long-video` | Media | Not declared | No |
| 16 | Live Streaming | `live-viewer` | Live | iPhone — compact (declared) | **Yes** |
| 17 | Live Studio | `live-studio` | Live | Desktop — expanded (declared) | No |
| 18 | Chat | `chat` | Communication | Not declared | No |
| 19 | Messages | `messages` | Communication | Not declared | No |
| 20 | Friends | `friends` | Communication | Not declared | No |
| 21 | Communities | `communities` | Communication | Not declared | No |
| 22 | Creator dashboard | `creator-dashboard` | Creator | Not declared | No |
| 23 | Analytics | `analytics` | Creator | Not declared | No |
| 24 | Monetization | `monetization` | Creator | Not declared | No |
| 25 | Premium subscription | `premium` | Creator | Not declared | No |
| 26 | Marketplace | `marketplace` | Commerce | Not declared | No |
| 27 | Digital Products | `digital-products` | Commerce | Not declared | No |
| 28 | Wallet | `wallet` | Commerce | Not declared | No |
| 29 | Virtual Gifts | `gifts` | Commerce | Not declared | No |
| 30 | Inventory | `inventory` | Commerce | Not declared | No |
| 31 | Courses | `courses` | Learning | Not declared | No |
| 32 | Events | `events` | Learning | Not declared | No |
| 33 | Leaderboards | `leaderboards` | Gamification | Not declared | No |
| 34 | Achievements | `achievements` | Gamification | Not declared | No |
| 35 | Missions | `missions` | Gamification | Not declared | No |
| 36 | Admin panel | `admin` | Operations | Desktop — expanded (declared) | No |
| 37 | Moderator dashboard | `moderator` | Operations | Desktop — expanded (declared) | No |
| 38 | Business dashboard | `business` | Operations | Desktop — expanded (declared) | No |

Only seven screens declare `preferredDevice` in their `ScreenDefinition`; the
gallery opens those on the named device and leaves the rest on whatever device
is already selected. "Not declared" therefore means the screen is designed to
be correct at all five columns, not that it has no natural posture — each entry
names the posture it is composed for.

Group counts: Entry 3, Core 8, Media 4, Live 2, Communication 4, Creator 4,
Commerce 5, Learning 2, Gamification 3, Operations 3. `SCREEN_GROUPS` also
declares `Account` and `Foundations`; no screen currently uses `Account`, and
`FOUNDATION_SCREENS` is an empty array.

---

## Entry

Three screens, all unauthenticated, all without a context panel. Content
columns: 393 / 412 / 758 / 1016 / 1248. Stylesheet: `src/screens/entry/entry.css`.

### 1. Welcome

| Field | Value |
|---|---|
| id | `welcome` |
| Group | Entry |
| navId | `home` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/entry/WelcomeScreen.tsx` |

**Purpose.** The only screen a person sees before handing over an email
address, so it optimises for one decision: *is this a serious place to build a
career?* It answers with a claim, four measurable capabilities, and a preview
built from the shipping primitives rather than a screenshot.

**Information hierarchy.**

1. Brand mark and version badge — establish what this is.
2. Display headline naming the four surfaces SYLORA unifies (the claim).
3. Lede paragraph describing the concrete capabilities.
4. Primary and secondary calls to action, immediately followed by the cost line
   ("Free below 1,000 followers. No card up front...") — the question standing
   between the reader and the button is answered next to the button.
5. Four value propositions stated as facts (the proof).
6. Social proof: creator avatars and aggregate numbers, deliberately last,
   because numbers persuade nobody who has not first understood the product.
7. Product preview stack — a live stream tile, a watch-time stat with sparkline,
   and an assistant proposal with Approve / Not now.

**Anatomy.**

- `.sy-aurora` ambient brand field (decorative, absolutely positioned).
- `.sy-welcome__hero` — brand lockup, `.sy-display-2` headline, lede,
  `.sy-welcome__cta` button pair, cost note, `.sy-welcome__props` list,
  `.sy-welcome__proof` row.
- `.sy-welcome__preview` — three stacked `Surface` cards from three different
  product surfaces, proving the "one system" claim instead of repeating it.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | CTA pair goes from a stacked full-width column to a row with auto-width buttons; value props become two columns; the proof row goes horizontal. |
| `min-width: 768px` | 1016, 1248 | `.sy-welcome__inner` becomes a `1.1fr / minmax(320px, 0.9fr)` grid: hero left-aligned, preview beside it, and the stat and assistant cards overhang the column edges. |
| `min-width: 1024px` | 1248 | Column gap grows to `--sy-space-16`; the prop grid gains column gap. |

At 393 and 412 the whole column is centred and stacked, the preview sitting
under the hero. At 758 the composition stays the phone's, at a larger scale —
the 768px query deliberately does not fire in the medium posture, because
splitting there would leave a display-scale headline in a ~360px column.

**Key interactions.** Presentational only. The CTA pair, the preview's Approve
and Not now buttons and the proof avatars carry no handlers.

**Empty, loading and error.** None. The screen has no variable content.

**Accessibility.** `LogoMark` takes `title="SYLORA"` so the mark is named. The
aurora field is decorative and not announced. Headline is the `h1`; each value
proposition title is an `h2`. The cost note is `--sy-fg-muted` rather than
`--sy-fg-quiet` because it is load-bearing text, not a footnote.

### 2. Authentication

| Field | Value |
|---|---|
| id | `auth` |
| Group | Entry |
| navId | none |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/entry/AuthScreen.tsx` |

**Purpose.** Sign in and create account on one card behind one segmented
control, with the phishing-resistant passkey path placed above passwords —
ordering as a security decision, not a layout one.

**Information hierarchy.**

1. Brand mark, then a heading and subheading that both change with the mode.
2. Create account / Sign in segmented control.
3. Passkey button — the safe path is the default path.
4. Email and password, with live validation.
5. Federated providers (Apple, Google, Work SSO).
6. Legal note stating EU processing, no data sale, and export or delete from
   Settings.
7. A mode-switch line beneath the card for anyone who read past it.

**Anatomy.** `.sy-aurora` field; `.sy-auth__card` (the only opaque object on
the field); inside it `.sy-auth__head`, `Tabs`, `.sy-auth__passkey`, an "or"
divider, `.sy-auth__form`, an "or continue with" divider,
`.sy-auth__providers`, `.sy-auth__legal`; then `.sy-auth__switch` outside the
card.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-auth__inner` gains inline padding. |

The card itself is the main responsive move: below 640px it sheds its border,
background and radius and fills the width, because a bordered card inside a
bordered device frame is two frames doing one job and the inner one steals
horizontal space from the inputs. At 758, 1016 and 1248 the card is a centred,
raised object on the aurora field; it does not widen indefinitely.

**Key interactions (stateful).**

- `mode` — Create account / Sign in. Switches the heading, the subheading, the
  passkey button label, the password `autoComplete` (`new-password` versus
  `current-password`), the presence of "Forgot password?" and the hint text.
  The bottom switch link sets the same state.
- `email`, `password` — controlled inputs.
- `revealed` — password visibility toggle rendered as an `IconButton` with
  `aria-pressed`, so it announces its state rather than relying on an
  eye-with-slash glyph the icon set does not have.
- `remember` — "Keep me signed in" checkbox.
- Live validation: in create mode a password shorter than 12 characters shows
  `Use at least 12 characters. This one has N.` and disables "Continue with
  email". Validation runs as the person types, not on submit.

**Empty, loading and error.** The password rule is the only error state in the
screen and it is inline and immediate. There is no authentication backend:
neither the passkey button, the providers nor "Continue with email" submits
anything.

**Accessibility.** Every input is labelled. The reveal toggle uses
`aria-pressed`. Provider buttons carry the provider name as text as well as an
icon, because the icon set intentionally ships no third-party brand marks. The
error is passed through `Input`'s `error` prop, which wires the description to
the field.

### 3. Onboarding

| Field | Value |
|---|---|
| id | `onboarding` |
| Group | Entry |
| navId | none |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/entry/OnboardingScreen.tsx` |

**Purpose.** Step 2 of 4 — choosing interests — designed so the cost of
continuing is always legible and the taxonomy choice comes with an explicit,
checkable promise: interests feed Discover and nothing else, and never reorder
the chronological feed.

**Information hierarchy.**

1. Pinned progress header: "Step 2 of 4" plus the four named steps
   (Identity, Interests, Creators, Notifications).
2. Question and the rule ("Pick at least three"), with the promise stated in
   the same paragraph.
3. Live count with an icon and a sentence — the reason Continue is disabled is
   in text, never implied by a greyed-out button alone.
4. The interest chip grid.
5. "Why we ask" disclosure, collapsed, containing the full commitment.
6. Aside: a live Discover preview of the creators the current picks would
   surface, plus the picks themselves as removable chips.
7. Pinned footer: Back, count, Continue.

**Anatomy.** `.sy-onboard__steps` (sticky header with `.sy-steps` ordered
list) → `.sy-onboard__body` containing `.sy-onboard__main`
(intro, `.sy-onboard__count` live region, `.sy-onboard__chips`, `details.sy-why`)
and `aside.sy-onboard__aside` (`.sy-onboard__preview` with matches and picks)
→ `footer.sy-onboard__footer`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | Per-step names appear in the progress indicator (`.sy-step__name`); body gains vertical padding; the footer's "N of M interests" count becomes visible. |
| `min-width: 700px` | 758, 1016, 1248 | `.sy-onboard__body` becomes `1fr / minmax(260px, 300px)`; the preview moves beside the chips and becomes sticky, so a pick and its consequence are never a scroll apart. |
| `min-width: 1024px` | 1248 | Aside fixes at 320px; gap grows to `--sy-space-8`. |

The 700px threshold is chosen over 768 precisely so it fires in the medium
posture, where the icon rail leaves the screen roughly 758px.

At 393 and 412 the steps are numbered dots without names, the preview stacks
below the chips, and Back / Continue stay outside the scrolling region so
Continue is never something you have to scroll to find.

**Key interactions (stateful).** `selected` is an array of interest ids.
Chips toggle on click; the picks list in the aside renders each selection as a
removable `Chip` that toggles the same state. The live count, the Discover
preview matches and the disabled state of Continue all derive from it —
Continue is disabled below three picks.

**Empty, loading and error.** With no picks the preview shows "Pick an interest
to see who Discover would suggest." The count region is the closest thing to an
error state and is phrased as a requirement, not a failure.

**Accessibility.** `.sy-onboard__count` is `aria-live="polite"`, so the
selection count and the minimum-met message are announced as chips are
toggled. The chip grid is a `role="group"` labelled "Interests"; the aside is
labelled "What your selection changes"; the step list is an `ol` labelled
"Setup progress". The "Why we ask" disclosure is a native `details`/`summary`,
not a tooltip, because the explanation is two paragraphs and tooltips are
unusable on touch.

---

## Core

Eight screens. `home` and `assistant` declare context panels (columns 393 / 412
/ 758 / 676 / 908); the other six do not (393 / 412 / 758 / 1016 / 1248).
Stylesheets: `src/screens/core/core.css`, `src/screens/assistant/assistant.css`.

`AI Assistant` is declared in `src/screens/assistant/index.ts` but carries
`group: 'Core'`, and `registry.ts` splices `ASSISTANT_SCREENS` in after
`CORE_SCREENS`. It is documented last in this section, matching registry order.

### 4. Home

| Field | Value |
|---|---|
| id | `home` |
| Group | Core |
| navId | `home` |
| Immersive | No |
| Context panel | `HomeContextPanel`, titled "Today" |
| Component | `src/screens/core/HomeScreen.tsx` |

**Purpose.** Answers "what should I do right now?" by ordering content by
perishability: things that expire soonest sit highest.

**Information hierarchy.** The ordering *is* the information architecture:

1. **Live now** — gone in minutes.
2. **Stories** — gone in 24 hours. (Rendered above Live in the DOM as the
   avatar rail; the live shelf is the first titled section.)
3. **Daily brief** — an assistant report, useful all day, so it sits above the
   feed and below the broadcast.
4. **Your feed** — durable, and strictly chronological within source.

**Anatomy.**

- `.sy-home__search` — a duplicated search field plus a notifications button,
  present only in compact because the shell's top bar is out of thumb reach on
  a phone.
- `.sy-stories` avatar rail, own story first with a plus affordance.
- `ScreenSection "Live now"` — horizontal `.sy-scroller` of `.sy-live-tile`.
- `.sy-brief` — the assistant's daily brief as a *card*, not a chat window:
  three findings each with a source-bearing sentence, then "Open assistant" and
  "Dismiss".
- `ScreenSection "Your feed"` — `PostCard` list.
- Context panel: today's missions with progress rings, trending topics,
  suggested creators.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 560px` | 758, 676, 908 | `.sy-home__search` is hidden — search has moved into the shell top bar, and showing both would be a duplicate control costing 40px of a 393px screen. |
| `min-width: 1024px` | none of the five | `.sy-live-tile` would widen to 268px. With a context panel the widest column is 908, so this rule does not fire on any reference device. |

At 393 and 412 the in-screen search is present and the live shelf scrolls
horizontally with edge bleed. At 676 (web) the column is the tightest expanded
case and the context panel carries missions, trending and suggestions. At 908
the same layout with more room.

**Key interactions.** Presentational. The context panel is the only place in
Home with no state either; missions, trends and suggestions are static.
Everything in the panel is reachable elsewhere, which is the contract for
context-panel content.

**Empty, loading and error.** None implemented. The brief is a static card with
a Dismiss button that does not dismiss.

**Accessibility.** The stories rail is a labelled region; each story is a real
`button` with the creator's name as text. `AiOrb state="idle"` is decorative
inside the brief header, which is titled by an `h2`. Section headings descend
from the screen's structure rather than being visual-only.

### 5. Feed

| Field | Value |
|---|---|
| id | `feed` |
| Group | Core |
| navId | `home` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/core/FeedScreen.tsx` |

**Purpose.** The strictly chronological timeline: what the people you chose to
follow published, in the order they published it. Nothing is ranked, boosted or
reordered — ranking lives on Discover, which is labelled as such.

**Information hierarchy.**

1. Sticky filter bar (Following / Spaces / Saved, plus a sort control) —
   scanning a timeline and changing which timeline you are scanning are the
   same task.
2. Composer row.
3. "12 new posts" pill — new items never insert themselves above the scroll
   position.
4. The stream itself, deliberately heterogeneous: `PostCard`, a poll, another
   post, a space digest, then more posts.
5. End-of-feed marker stating what was hidden and why.
6. In-screen sidebar (wide columns only) with "Who to follow".

**Anatomy.** `.sy-fdscreen__bar` (sticky) → `.sy-fdscreen__layout` containing
`.sy-fdscreen__main` (`.sy-composer`, `.sy-newpill`, `.sy-fdscreen__stream`,
`.sy-fdscreen__end`) and `aside.sy-fdscreen__side`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-composer__hint` ("Posting as @handle") becomes visible. |
| `min-width: 768px` | 1016, 1248 | The sticky bar's negative margin and padding widen to `--sy-space-6` so it bleeds to the column edge. |
| `min-width: 960px` | 1016, 1248 | `.sy-fdscreen__layout` becomes `1fr / 300px` and `.sy-fdscreen__side` appears, sticky. |
| `min-width: 1280px` | none of the five | Bar bleed would widen again to `--sy-space-8`. |

The 960px threshold is documented in `core.css`: the shell hands the screen 948
at a 1100px window, 1016 at 1280 once the rail expands to 264px, and 1248 at
1512. Using 1024 would make the sidebar appear at 1100, vanish at 1280 and
return at 1368 — a layout that goes backwards as the window grows. Below the
threshold the column is dropped outright rather than stacked, because
everything in it is reachable from Discover and Search.

**Key interactions (stateful).**

- `source` — Following / Spaces / Saved pill tabs.
- `composerOpen` — the composer row is a disclosure (`aria-expanded`) that
  reveals five post-type chips rather than an always-open text area.
- `pillDismissed` — the new-posts pill has a working dismiss control.

The post actions (like, comment, share) are labelled buttons without handlers.

**Empty, loading and error.** No empty state; the end-of-feed marker
("You are caught up to 06:14 this morning. 3 older posts from muted spaces were
hidden.") is the closest thing, and it states the hidden count rather than
silently dropping items. "Load older posts" is inert.

**Accessibility.** Post actions carry counts in their `aria-label`
("Like, 612"). The sidebar is an `aside` labelled "Suggestions". The composer's
disclosure state is exposed with `aria-expanded`, and its type chips are hidden
with the `hidden` attribute rather than CSS so they leave the tab order when
closed.

### 6. Search

| Field | Value |
|---|---|
| id | `search` |
| Group | Core |
| navId | none |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/core/SearchScreen.tsx` |

**Purpose.** One query across six object types — creators, streams, posts,
spaces, products, courses — blended by confidence in an All tab where each
result type keeps its own shape, because the shape is what tells you what kind
of thing you found before you read a word.

**Information hierarchy.**

1. The query field, at the top of the scroll area rather than sticky: on a
   results page the query is already visible in the result set, and a sticky
   field eats a quarter of a phone list.
2. Keyboard hint row.
3. Facet chips (filters) in a horizontal scroller.
4. Recent searches as removable chips.
5. Result-type tabs with counts on them, so "should I narrow to Creators?" can
   be answered before the click.
6. Result-set summary sentence stating every active constraint.
7. The results, grouped by type in the All tab.

**Anatomy.** `.sy-search__field` → `.sy-search__kbd` → `.sy-search__chiprow`
→ `.sy-search__recent` → `.sy-search__tabs` → `.sy-search__summary` → the
active result panel. Result rows are type-specific: `.sy-result--creator`,
`.sy-result--space`, `.sy-result--product`, plus `StreamCard` and `PostCard`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 768px` | 1016, 1248 | `.sy-search__chiprow` gains negative margin and padding so the chip scroller bleeds to the column edge. |

Otherwise the screen is a single column at every width; the result rows are
flex rows that reflow, and the chip rows scroll horizontally rather than
wrapping into a block that pushes results off the first screenful.

**Key interactions (stateful).**

- `query` — controlled `SearchInput` with a working Clear button; the summary
  sentence and the empty-state copy both interpolate it.
- `tab` — All / Creators / Streams / Posts / Spaces / Products / Events.
  Switches the whole result panel.
- `dismissedRecent` — recent-search chips can be removed individually, and
  clicking one sets it as the query.

Facet chips render a fixed `selected` state and are not interactive.

**Empty, loading and error.** The Events facet is designed as the zero-result
case and uses `EmptyState`: "No events match design tokens this week", with the
reason (the next event falls outside the current time filter) and two ways out
— "Search all dates" and "Alert me for new events". This is deliberate: real
queries rarely return nothing overall, they return nothing in one facet, which
is the case worth designing.

**Accessibility.** The filter chip row is a `role="group"` labelled "Filter
results". Tab counts are rendered as badges inside the tab labels, so they are
announced with the tab. Keyboard shortcuts are marked up as `kbd`. Clear is an
`IconButton` with the label "Clear search".

### 7. Discover

| Field | Value |
|---|---|
| id | `discover` |
| Group | Core |
| navId | `discover` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/core/DiscoverScreen.tsx` |

**Purpose.** The deliberate opposite of Feed: the explicitly ranked surface,
where every shelf can explain the signal that produced it. Feed answers "why am
I seeing this?" with "because you follow them"; Discover answers with the
reason printed on the shelf.

**Information hierarchy.**

1. Editorial hero committing to a single live recommendation, with its own
   "why" line beneath it ("Featured because deep-sea streams are the
   fastest-growing category you watch, and this one started 12 minutes ago").
2. Category chips.
3. Six recommendation shelves, each with an eyebrow that names the ranking
   basis and a "Why this?" disclosure: Live now, Rising creators, Because you
   follow Amara, Long-form worth your evening, New in Design Systems Guild,
   Learn it properly.

Shelves beat a grid here because a shelf can be skipped in one glance, which is
the main thing someone browsing recommendations wants to do.

**Anatomy.** `section.sy-disc__hero` (`Media` with scrim, `LiveBadge`,
category badge, title, creator row, three actions, then `.sy-disc__hero-why`)
→ `nav.sy-disc__categories` → six `Shelf` sections, each
`header.sy-shelf__head` + optional `.sy-shelf__reason` panel + a
`.sy-scroller` of cards.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 768px` | 1016, 1248 | Hero scrim content gains `--sy-space-6` padding and the hero title takes a `max-inline-size`, so the headline keeps a readable measure instead of running the full width. |

The shelves are horizontal scrollers at every width, so the screen degrades by
showing fewer cards per shelf rather than by rewrapping.

**Key interactions (stateful).**

- `category` — chips select, one at a time.
- Each `Shelf` owns an `open` boolean: "Why this?" is a disclosure
  (`aria-expanded`) that expands a `.sy-shelf__reason` panel with the
  explanation and a "Tune this shelf" button. It is a disclosure and not a
  tooltip because the explanation is three lines long.

**Empty, loading and error.** None implemented.

**Accessibility.** The hero is `aria-labelledby` its own title. Everything
inside the scrim re-declares `data-theme="dark"`, because the scrim is dark in
both themes and the light theme's dark-on-light foregrounds would otherwise be
unreadable over it — the fix keeps the colours tokenised instead of hard-coding
white. The category row is a labelled `nav`.

### 8. Profile

| Field | Value |
|---|---|
| id | `profile` |
| Group | Core |
| navId | `profile` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/core/ProfileScreen.tsx` |

**Purpose.** A creator's public page, answering "who is this?" and "what do I
get if I pay?" within the first screenful, in that order.

**Information hierarchy.**

1. Banner and avatar — identity.
2. Name, handle, verification, bio.
3. Four stats establishing scale.
4. Actions: Follow, Subscribe, Message, More.
5. Subscription tiers — three, because three is the most a person will actually
   compare, each stating perks in the creator's own terms.
6. Content tabs: Posts (412), Streams (96), Videos (148), Shop (6), About.

Subscribe is styled in the creator tone rather than the brand accent: Follow is
free and belongs to SYLORA, subscribing is a transaction with the person whose
page you are on, and the colour split is what stops someone paying by muscle
memory.

**Anatomy.** `.sy-profile__banner` → `.sy-profile__head` (identity, stats,
`.sy-profile__actions`) → `.sy-tiers` → `.sy-profile__tabs` →
`.sy-profile__panel` rendering the selected tab.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | Banner grows to 180px; avatar goes to 112px with a larger negative offset; `.sy-profile__actions` becomes a wrapping flex row; the tier grid becomes three columns; the Shop tab's feature block becomes `280px / 1fr`. |
| `min-width: 1024px` | 1248 | Banner grows again to 232px. |

At 393 and 412 the banner is short, the avatar drops a size and the four
actions become a two-up grid. Buttons in a row at 393px would either wrap
unpredictably or shrink below the 44px target, so the wrap is made deliberate.
The avatar size override is the one place the screen uses `!important`, because
`Avatar` writes width and height inline.

**Key interactions (stateful).** `tab` switches the panel between Posts (a
`PostCard` list), Streams (an on-air `StreamCard` plus past broadcasts), Videos,
Shop (a featured product plus a grid) and About (links to the creator's site,
space and course). Tier "Join" buttons, Follow and Subscribe are inert.

**Empty, loading and error.** None implemented; every tab has content.

**Accessibility.** Tabs are the shared `Tabs` primitive with full arrow-key
support. The stats wrap rather than scroll, because a number you have to scroll
to reach is a number nobody compares. The More control is an `IconButton`
labelled with the creator's name ("More options for Amara Okonkwo").

### 9. Settings

| Field | Value |
|---|---|
| id | `settings` |
| Group | Core |
| navId | `settings` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/core/SettingsScreen.tsx` |

**Purpose.** Ten categories laid out so the map and the territory stay on the
same screen, with Appearance designed in full because it is the section where a
control has to *look like* what it does.

**Information hierarchy.**

1. Header.
2. Category list: Account, Privacy, Notifications, Appearance, Playback,
   Creator, Payments, Security, Accessibility, Data.
3. The active category's detail panel, labelled by the row that opened it.
4. "Data and privacy", which sits below whichever category is open because it
   applies everywhere.

**Anatomy.** `.sy-settings__head` → `.sy-settings__layout` containing
`nav.sy-settings__nav` and the detail panel. Appearance renders bespoke
sections — Theme (live tiles), Accent colour, Text and motion, Preview — while
every other category renders a `ListRow` list from its `rows` definition.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | Category rows gain their summary line (`.sy-settings__navsummary`); the theme grid becomes three columns; the accent grid becomes six. |
| `min-width: 960px` | 1016, 1248 | `.sy-settings__layout` becomes `288px / 1fr` and the nav becomes sticky. |

The 960px value is chosen for the same monotonicity reason as the Feed sidebar
and is commented as such. At 393, 412 and 758 the list stays and the detail
stacks *below* it with the active row marked — the alternative, a full-screen
push, is the platform convention but needs a back stack the gallery does not
have and, more importantly, hides the fact that nine other categories exist.
The cost is one extra scroll, which is cheaper than a person never discovering
Accessibility.

**Key interactions (stateful).** Seven independent pieces of state, all
working:

- `active` — which category is open.
- `theme` — the theme tiles are real interface rendered at small scale with the
  target theme's own tokens re-scoped onto them, so they cannot drift from the
  product and stay correct when the accent family changes.
- `accent` — six accent families.
- `textSize` — a `Slider`.
- `reduceMotion`, `increaseContrast` — switches.
- `adPersonalisation` — a switch that defaults to **off**.
- `colourFilter` — a `Select` for colour-vision filters.

The Appearance "Preview" section re-renders from these values.

**Empty, loading and error.** None. Nothing is saved anywhere.

**Accessibility.** Theme and accent grids are `role="radiogroup"` with labelled
radios; selection is a filled check plus a weight change, not colour alone.
Every switch states its consequence in its description rather than in a help
article ("Turning this off makes Discover fall back to what people you follow
watch"). Accessibility is itself one of the ten categories.

### 10. Notifications

| Field | Value |
|---|---|
| id | `notifications` |
| Group | Core |
| navId | none |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/core/NotificationsScreen.tsx` |

**Purpose.** A triage queue for interruptions that have already happened: what
is new, what needs a reply, what can be ignored forever.

**Information hierarchy.**

1. Header with a live unread summary and "Mark all read".
2. Type tabs with unread counts: All, Mentions, Gifts, System.
3. A muted-types notice, when anything is muted.
4. Rows grouped by time (Today, This week, Earlier) rather than paginated —
   "Today" is the only group most people read, and a group heading is a much
   cheaper stopping cue than a date on every row.
5. Footer.

**Anatomy.** `.sy-notif__head` → `.sy-notif__tabs` → optional
`.sy-notif__muted` → `section.sy-notif__group` per time bucket, each with an
`.sy-overline` heading and rows → `.sy-notif__foot`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-notif__avatar` is displayed alongside the type tile. |
| `min-width: 768px` | 1016, 1248 | Row actions fade in on hover but stay in the tab order, so a keyboard reveals them with focus rather than needing a different path. |

**Key interactions (stateful).**

- `tab` — filters rows by kind; every tab badge recomputes its unread count
  from current state.
- `read` — marking rows read, individually or all at once. "Mark all read" is
  disabled when nothing is unread, and the header sentence switches to "Nothing
  unread. The last 12 items are kept for 30 days."
- `muted` — muting a notification kind surfaces an undo affordance.
- `expanded` — the gift row is the only type that expands in place, because a
  reply is the useful next action there; it carries the gift tile and a
  thank-you field inline.
- `thanks` — the controlled thank-you message.

**Empty, loading and error.** No zero-row empty state, but the header copy
handles the all-read case in words. The muted notice is a reversible,
explicitly undoable state rather than a silent filter.

**Accessibility.** Unread is carried by three independent channels: a filled
dot, a tinted row background and a visually hidden "Unread" label. The leading
tile is tinted by *type* and reuses the product's existing tone meanings
(gifting = creator, realtime = live, money = success), so the palette is
learned once. Row actions stay in the DOM and the tab order at all widths.

### 11. AI Assistant

| Field | Value |
|---|---|
| id | `assistant` |
| Group | Core (declared in `src/screens/assistant/index.ts`) |
| navId | `home` |
| Immersive | No |
| Context panel | `AssistantContextPanel`, titled "Assistant" |
| Component | `src/screens/assistant/AssistantScreen.tsx` |

**Purpose.** A conversational surface built on the premise that an assistant
which cannot show its work and cannot be told "no" is a liability on a platform
where a wrong action costs someone their income.

**Information hierarchy.** Three decisions drive the whole screen:

1. **Assistant output is a document, not a chat message.** The user's turn is a
   right-aligned bubble because it is an utterance; the assistant's turn is
   full-width body copy with a heading, citations and a proposal block because
   it is a short report. The asymmetry makes it legible at a glance who is
   talking and who is answering.
2. **Every claim carries its source.** Each paragraph ends in a numbered
   reference that resolves in the `.sy-cites` row beneath it.
3. **Nothing runs without approval.** Proposed actions are a separate,
   explicitly bordered block with a lock icon, an "awaiting approval" badge and
   per-action approve/dismiss controls.

Within one answer the order is body → sources → proposals: what do you claim,
on what evidence, and what are you asking me to allow.

**Anatomy.** `.sy-assistant__head` (live `AiOrb`, title, reasoning badge, new
conversation, and a scope note — "Reads your analytics, encoder logs and
ledger. Nothing outside your own account") → `.sy-thread` of turns →
`GeneratingAnswer` → `.sy-composer-dock` outside the scrolling region
(`Textarea`, attach, dictate, mode segmented control, send, and a mode
consequence note). Context panel: usage stat and quota progress, recent
conversations, capability notes.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 676, 908 | The mode selector moves back into its natural order in the composer bar and the separator rule appears; thread gap increases. |
| `min-width: 1024px` | none of the five | Would cap `.sy-thread`, `.sy-assistant__head` and `.sy-composer` at a maximum measure. With a context panel the widest column is 908, so this does not fire on any reference device. |

The header's scope note wraps onto its own line rather than squeezing the title
row, so it survives 393px without truncation. The composer dock sits outside
the scroll region at every width, so it is always reachable without covering
the answer being read — and the mode selector stays permanently visible,
because the mode is what decides whether a proposed action needs approval at
all.

**Key interactions (stateful).**

- `mode` — Copilot / Autopilot / Manual. The note under the composer states the
  consequence, not the name:
  - *Copilot*: "proposes and waits. Nothing reaches your channel, your ledger
    or your audience without an explicit approval."
  - *Autopilot*: "runs reversible actions on its own and writes each one to the
    activity log. Payouts, deletions and going live always stop for approval."
  - *Manual*: "answers questions and nothing else. No actions are proposed, and
    no tools are called."
  Switching to Autopilot also changes the proposal block's badge to "Auto-run"
  (warning tone) and its subtitle to "Autopilot would run these and log them.
  They are still shown before they happen."
- `decisions` — per-action Approve / Dismiss, which replaces the controls with
  an "Approved" or "Dismissed" state.
- `draft` — the controlled composer field.
- `readingAloud` — per-answer read-aloud toggle.

**Empty, loading and error.** The only loading state in the product:
`GeneratingAnswer` renders an in-flight turn that names the step it is on
rather than showing an anonymous spinner — "reading your encoder logs" is both
a progress indicator and a disclosure of what the assistant is touching. Its
`Skeleton` lines are deliberately unequal, because three identical bars read as
a loading graphic and uneven ones read as text arriving. Each answer footer
carries "Report an error". **No inference runs**: the conversation is the
fixture in `AI_CONVERSATION`, and Approve records a local decision without
executing anything.

**Accessibility.** Each assistant turn is an `article` labelled "Assistant
answer"; the generating turn is labelled "Assistant is answering". The mode
note is `aria-live="polite"`, so changing mode announces the new contract.
Citations are real buttons with a visible index. Dismiss controls name the
action they dismiss. The aurora hairline is reserved for surfaces the assistant
authored, so generated content is always separable from the user's own.

---

## Media

Four screens. `player`, `stories` and `shorts` are immersive and receive the
full device width (393 / 412 / 834 / 1280 / 1512). `long-video` is a normal
screen with no context panel (393 / 412 / 758 / 1016 / 1248). Stylesheet:
`src/screens/media/media.css`.

### 12. Video Player

| Field | Value |
|---|---|
| id | `player` |
| Group | Media |
| navId | `home` |
| Immersive | **Yes** |
| Context panel | None |
| Component | `src/screens/media/PlayerScreen.tsx` |

**Purpose.** Playback where the picture is the product and every control is
borrowed pixels that must be handed back.

**Information hierarchy.** A chrome budget, stated as geometry: the top strip
takes at most 12% of the frame, the bottom strip at most 24%, and the centre
transport occupies only a horizontal band through the middle. Together they
leave the central 64% — where faces, subtitles and burned-in graphics live —
permanently unobstructed. The live viewer follows the same rule, so the two
surfaces read as one player family.

**Anatomy.**

- `Media` fills the frame.
- `header.sy-player__top` — back, title and creator, then cast / picture-in-
  picture / overflow.
- `.sy-player__transport` — skip back 10s, play/pause, skip forward 10s, dead
  centre. Play/pause and ±10s are *aimed at*, so they sit where a thumb or a
  cursor lands without looking.
- `footer.sy-player__bottom` — the scrubber on the bottom edge (scrubbing is a
  tracked gesture and wants the widest travel with the finger resting against
  the frame), then a control row: pause, volume, timecode, chapter name,
  captions, settings, fullscreen.
- `.sy-player__menu` — the playback settings menu, rendered open so the design
  is documented rather than hidden behind a click. Groups: quality, playback
  speed, audio and captions.

The scrubber shows three values, not two: elapsed, buffered and unloaded.
Buffered is the fact that predicts whether a seek will stall, so it gets its own
track colour instead of being folded into the background.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `max-width: 519px` | 393, 412 | All top actions except the overflow control are hidden; the transport moves to `inset-block-start: 30%` and shrinks (66px play, 50px skips) so it and the settings sheet do not both own the middle of the frame; the chapter name is dropped from the control row; chapter thumbnails are hidden. |
| `max-width: 639px` | 393, 412 | The volume track and the quality/codec badges are hidden. |
| `max-width: 899px` | 393, 412, 834 | The settings menu becomes a bottom sheet inset from both edges, capped at 48% of the frame height, with per-option detail lines ("4K · 28 Mbps") and the caption-styling footer removed — on a narrow surface the option name is the decision, and a menu that clips its last row mid-height reads as a bug. |

At 1280 and 1512 nothing is hidden: full top actions, volume track, badges,
chapter name and a proper anchored settings menu. The transport stays on the
vertical centre line rather than being pushed up by the bottom panel, because a
transport that drifts with the chrome height cannot be hit blind.

**Key interactions.** No component state. Every control is a real, labelled
button — "Skip back 10 seconds", "Pause", "Seek", "Volume", "Captions on",
"Enter fullscreen" — but the frame is a still and nothing plays.

**Empty, loading and error.** No buffering or playback-error state is
implemented. The buffered segment of the scrubber is the only affordance that
speaks to network conditions, and it is a static value.

**Accessibility.** Every icon-only control has an `aria-label`. The transport's
container is `pointer-events: none` with its children re-enabling pointer
events, so the invisible band never intercepts a tap meant for the picture. The
settings menu is `role="menu"` and labelled. The speed control is a
`role="radiogroup"`.

### 13. Stories

| Field | Value |
|---|---|
| id | `stories` |
| Group | Media |
| navId | `home` |
| Immersive | **Yes** |
| Preferred device | iPhone (compact) |
| Component | `src/screens/media/StoriesScreen.tsx` |

**Purpose.** Stories are watched, not read. The surface is one photograph with
four thin bands around it, and the format has to prove it carries an
interaction layer, not just pixels.

**Information hierarchy.** Progress first (how many more taps until I am out of
this person's day), then identity, then the interactive sticker, then reply.

**Anatomy.**

- Two invisible full-height tap zones, `is-prev` and `is-next`.
- `header.sy-stories-screen__top` — a segmented progress bar (seven segments;
  we are two thirds through the fourth), the author row, and mute / options /
  close.
- The sticker layer: a poll floating in the middle third, placed above the safe
  centre band but clear of the tap zones' visual centre, because a sticker that
  swallows a "next" tap is the fastest way to make people stop tapping
  stickers.
- `footer.sy-stories-screen__bottom` — a six-emoji reaction row, a reply field,
  a like button and share.

The progress bar is segmented rather than continuous because a single bar
answers "how long is this story", which nobody asks. Seen segments stay filled
so the remaining count is readable without counting.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 600px` | 834, 1280, 1512 | `.sy-stories-screen__stage` stops filling the width: it keeps a 9:16 aspect ratio, takes the full height, centres in black and gains a corner radius. |

At 393 and 412 the card is the viewport. On anything wider the card is the
object the author framed — stretched to a tablet's full width the poll sticker
ends up a metre wide and the reaction row spreads past the reach of either
thumb.

**Key interactions.** No component state. Previous and next are real `button`
elements with labels rather than a click handler on the background, so a
keyboard user and a screen-reader user get the same two controls a thumb gets,
in the same order. The poll options, reactions, reply field, mute, share and
close are all present and labelled but inert.

**Empty, loading and error.** None; a story is either there or the surface is
not shown.

**Accessibility.** The progress group is labelled "Story 4 of 7", so the
position is available without seeing the segments. The tap zones are labelled
"Previous story" and "Next story". The poll is a `role="group"` labelled
"Which glaze?". The reply field is labelled with the author's name.

### 14. Short Videos

| Field | Value |
|---|---|
| id | `shorts` |
| Group | Media |
| navId | `discover` |
| Immersive | **Yes** |
| Preferred device | iPhone (compact) |
| Component | `src/screens/media/ShortsScreen.tsx` |

**Purpose.** A vertical reel where the format teaches itself: one item fills
the viewport and the next peeks over the bottom edge, which is the entire
onboarding for the gesture.

**Information hierarchy.** Video, then the action rail, then the caption, then
the peek. The rail is right-aligned and sits low because a right thumb held
one-handed sweeps an arc whose comfortable zone is the bottom-right of the
display; like, comment and share are the three most repeated gestures in the
product, so they are placed inside that arc and stacked vertically, letting the
thumb travel *along* the arc instead of across it.

**Anatomy.** `.sy-shorts__reel` → active `.sy-shorts__item` containing the
`Media`, `header.sy-shorts__top` (For you / Following, search), the follow
affordance, `.sy-shorts__actions` (like with count, comments, share, gift,
more, then the audio disc at the far end because it is browsed rather than
tapped in a hurry), `footer.sy-shorts__meta` (creator, clamped caption, music),
and a playback progress bar → `.sy-shorts__peek` showing the next item.

The caption is clamped to two lines — the most text that can sit over a moving
picture before it stops being a caption and starts being a paragraph — and
"more" expands in place rather than opening a sheet, because leaving the video
to read about the video is the wrong trade.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 600px` | 834, 1280, 1512 | `.sy-shorts__reel` stops stretching: it keeps a 9:17 aspect ratio (9:16 for the item plus the peek strip on top of it), takes the full height and centres. |

**Key interactions.** No component state. Every rail control is a labelled
button; the like button renders in its `is-liked` state so the active
appearance is documented.

**Empty, loading and error.** None.

**Accessibility.** Action labels carry their counts ("Like, 24.1K likes",
"Comments, 892"). The audio disc is labelled with the track. The caption is
also exposed as screen-reader text on the `Media` itself, so the video has an
accessible name. The peek item is labelled "Next: <creator>".

### 15. Long Videos

| Field | Value |
|---|---|
| id | `long-video` |
| Group | Media |
| navId | `home` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/media/LongVideoScreen.tsx` |

**Purpose.** The watch page for a multi-hour recording. A long video is a thing
you commit forty minutes to, so the page has to answer "is this worth it?"
before it answers "play".

**Information hierarchy.**

1. Player with a resume marker ("Resume at 1:12:44") and total runtime.
2. Title, then view count, date and format badges.
3. Creator row with Subscribe, separated from the reaction group because it is
   a relationship decision rather than a reaction to this video.
4. Reaction pills — like/dislike as one group, then share, save, gift.
5. Chapters / Description / Resources behind a tab pair in one card: they answer
   the same question, and splitting them into two stacked cards doubled the
   distance to the comments.
6. Comments — the reason people scroll a watch page at all.
7. "Up next" rail, last and only when there is room.

**Anatomy.** `.sy-watch` → `.sy-watch__main` (`.sy-watch__player`, title,
`.sy-watch__meta`, `.sy-watch__bar`, `section.sy-watch__card` with tabs,
description and `.sy-chapters`, then the comments section with a sort control,
a composer and threaded comments) and `aside.sy-watch__side`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `max-width: 519px` | 393, 412 | Chapter thumbnails are hidden and the timecode column narrows to 56px, so a chapter row stays a timecode plus a title. |
| `min-width: 700px` | 758, 1016, 1248 | `.sy-watch__bar` becomes a wrapping flex row: creator identity and the action group share a line while both fit and split cleanly when they do not — wrapping, never overlapping, because the related rail can take 372px out of this column without warning. |
| `min-width: 960px` | 1016, 1248 | `.sy-watch` becomes `1fr / 372px` and `.sy-watch__side` appears, sticky. |

The file comment says the related list appears "at 1024px and above"; the CSS
threshold is **960px**, chosen so the video column can still hold a comfortable
measure once the rail is subtracted. Below it the rail is dropped rather than
stacked, because three screenfuls of thumbnails between the video and the
comments is the failure this page is designed to avoid.

**Key interactions (stateful).** `tab` switches the card between Chapters (a
list of eight, with the current chapter marked "Here"), Description and
Resources. Like is rendered pressed (`aria-pressed="true"`); the rest of the
action row, the chapter list, the comment composer and the sort control are
inert.

**Empty, loading and error.** No empty comment state — the fixture always has
1,284 comments. No buffering or playback error state.

**Accessibility.** Like and dislike are drawn as one arrow and its mirror
rather than thumbs: the icon set has no thumb and a heart cannot be negated, so
the relationship between the two glyphs carries the meaning. Both use
`aria-pressed`; the dislike control carries an explicit `aria-label` because it
has no text. Comment actions include their counts in the label. The chapter
list is an `ol`, so its length is announced.

---

## Live

Two screens with opposite postures: the viewer is immersive and phone-first
(393 / 412 / 834 / 1280 / 1512), the studio is a desktop control room with no
context panel (393 / 412 / 758 / 1016 / 1248). Stylesheet:
`src/screens/live/live.css`.

### 16. Live Streaming (viewer)

| Field | Value |
|---|---|
| id | `live-viewer` |
| Group | Live |
| navId | `live` |
| Immersive | **Yes** |
| Preferred device | iPhone (compact) |
| Component | `src/screens/live/LiveViewerScreen.tsx` |

**Purpose.** The broadcast is the interface. Everything else is a layer over
it, and every layer has to earn the pixels it covers.

**Information hierarchy.** A chrome budget again: on a phone, chat and controls
together may never cover more than the bottom 45% of the frame, and the top
strip is capped at 12%. Those two numbers keep a 16:9 stream fully visible in
the middle band at all times.

**Anatomy.**

- `.sy-live-viewer__stage` — the video, plus:
  - `header.sy-live-viewer__top` — creator identity on glass, viewer count,
    connection state, follow, leave.
  - the stream title block.
  - `footer.sy-live-viewer__bottom` — pause, volume, quality, captions,
    fullscreen.
- `aside.sy-live-chat` — header with settings, the message list (including gift
  messages in the creator tone and system messages in the accent tone), and a
  composer whose trailing control is a gift button in the creator hue.

Glassmorphism is used here and almost nowhere else: this is the canonical case,
a layer genuinely floating over moving photographic content, where blurring is
what keeps a caption legible when the scene cuts from dark to bright. Fill
opacity is set high enough that text contrast holds against a white frame.

The gift rail is the product's highest-intent action, so on phones it sits in
the bottom-right corner — the single easiest point to reach with a right thumb
— and it is the only control that uses the creator hue.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 1024px` | 1280, 1512 | `.sy-live-viewer` becomes a row: chat docks to the side at a fixed 360px with a leading border instead of a top border, and the title moves from the top of the stage to sit 104px above the bottom edge. |

At 393, 412 and 834 the layout is stacked: video above, chat below, with the
45% cap governing. At 1280 and 1512 the stream keeps the full remaining width
and chat becomes a permanent column.

**Key interactions.** No component state. Chat composer, gift button, follow,
reactions and player controls are labelled and inert.

**Empty, loading and error.** No reconnecting, offline or stream-ended state.
The connection indicator in the top chrome is static.

**Accessibility.** The video carries a screen-reader description ("Live
broadcast video"). Chat is an `aside` labelled "Live chat" and the composer
input is labelled "Send a chat message". Gift messages are distinguished by
tone *and* an icon *and* the word, not by colour alone.

### 17. Live Studio

| Field | Value |
|---|---|
| id | `live-studio` |
| Group | Live |
| navId | `studio` |
| Immersive | No |
| Context panel | None |
| Preferred device | Desktop (expanded) |
| Component | `src/screens/live/LiveStudioScreen.tsx` |

**Purpose.** The broadcaster's control room. Unlike every other screen in
SYLORA this one is not trying to be calm: the operator is live to fourteen
thousand people and needs every number on the glass at once. Density is the
feature.

**Information hierarchy.** The three columns are three time horizons, and
reading left to right is reading forward in time:

- **Left** — what is *about* to happen: scenes and sources you stage next.
- **Centre** — what is happening *now*: programme, preview, transitions,
  health, output toolbar, audio mixer.
- **Right** — what just happened: chat and the activity that reacts to it.

Transition controls sit between preview and programme rather than in a menu,
because they are literally the moment one becomes the other.

**Anatomy.**

- `.sy-studio__switch` — a compact-only Scenes / Chat / Audio segmented
  control.
- `aside.sy-studio__scenes` — scene list with thumbnails, then sources.
- `main.sy-studio__stage` — `.sy-studio__monitors` (programme, then preview),
  `.sy-transition` (Cut / Fade / Aurora, a duration field in milliseconds and
  "Take to programme"), `.sy-health` (bitrate, dropped frames, CPU, latency,
  plus a wide ingest cell), `.sy-studio__toolbar` (End broadcast, uptime,
  device toggles, settings), `section.sy-mixer` (mic, desktop, guest faders).
- `aside.sy-studio__side` — live chat with moderation tools and a reply
  composer, then an activity feed.

Programme carries a red rim and the LIVE badge; preview carries a neutral rim
and the word "Preview". Confusing the two is the single most expensive mistake
available on this screen, so the distinction is stated with a border, a badge
*and* a caption rather than by position alone. Health is never a bare dot: every
meter prints its value in mono, its unit, and a word for the state — a green dot
tells you nothing when the question is "is 4.1% dropped frames bad".

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 700px` | 758, 1016, 1248 | `.sy-studio__monitors` pairs programme and preview at `1.65fr / 1fr`; the mixer goes to three columns. |
| `min-width: 992px` | 1016, 1248 | The full three-column room: `216px / 1fr / 288px`, `overflow: hidden` so the page itself stops scrolling and only the panels meant to scroll do, the compact switch is hidden, and every region is shown regardless of the `data-panel` value. Scene thumbnails shrink to 44px, because in the narrow room the scene name matters more than the scene picture. |
| `min-width: 1152px` | 1248 | Columns widen to `268px / 1fr / 344px` with a larger gap and 56px scene thumbnails. |

Below 992px the room collapses to one column with the monitor pinned first and
the tab pair swapping Scenes / Chat / Audio underneath. That is a deliberate
demotion, not a responsive accident: on a phone a broadcaster is monitoring a
stream they started elsewhere, so seeing the output and killing it are the only
two things that must stay one tap away. Every region stays mounted, so focus
order and landmarks never change with width.

**Key interactions (stateful).**

- `panel` — the compact region switch (Scenes / Chat / Audio), written to
  `data-panel` on `.sy-studio` and overridden entirely at ≥992px.
- `transition` — Cut / Fade / Aurora, a working `role="radiogroup"`.
- `levels` — mic, desktop and guest faders, each a controlled slider.

"Go live" does not exist here; the studio is shown mid-broadcast. "End
broadcast" is the only danger-toned control in the room and is separated from
the device toggles by the uptime readout, because ending is irreversible for
everyone watching.

**Empty, loading and error.** No dropped-connection or ingest-failure state,
though the health cells model a `warn` state and one metric renders in it. No
encoder is attached: monitors are `Media` stills and the health figures are
constants.

**Accessibility.** Every region is a labelled landmark ("Scenes and sources",
"Programme output", "Chat and activity", "Stream health", "Audio mixer",
"Transition style", "Capture devices"). Faders carry per-channel labels. Device
toggles use `aria-pressed`. Regions are toggled with `display`, never
unmounted, so the tab order is stable across widths.

---

## Communication

Four screens, none with a context panel: 393 / 412 / 758 / 1016 / 1248.
Stylesheet: `src/screens/comms/comms.css`.

### 18. Chat

| Field | Value |
|---|---|
| id | `chat` |
| Group | Communication |
| navId | `messages` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/comms/ChatScreen.tsx` |

**Purpose.** A one-to-one conversation that stays readable while three other
jobs — switching threads, checking who you are talking to, and finding what was
shared — compete for the same screen.

**Information hierarchy.** The panes are a progressive disclosure, not a
layout. Thread first, because a phone conversation is a place you are *in* and
the list is one back tap away. The index returns next, because once switching
threads is cheap it becomes the frequent act. Shared files and mute settings
come last, since they are the least urgent things here and therefore the first
thing worth cutting.

**Anatomy.** `.sy-chat` grid → `aside.sy-chat__list` (search plus conversation
rows with unread counts) → `section.sy-chat__thread` (`header.sy-chat__header`
with back, identity, call controls; the message list with a date divider,
yesterday's tail and today's messages; `footer.sy-chat__composer`) →
`aside.sy-chat__details` (identity, Profile and Mute, shared files, shared
media grid).

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 700px` | 758, 1016, 1248 | Two columns, `288px / 1fr`: the conversation list returns as a permanent index and the thread's back button is hidden. |
| `min-width: 1152px` | 1248 | Three columns, `300px / 1fr / 300px`: the details pane appears. |

The screen definition describes the index arriving "at 768px"; the implemented
threshold is **700px**, which is what actually fires in the medium posture.
This is the one screen in the group that must not scroll as a page: the
composer has to stay reachable and the header pinned, so the thread scrolls
inside a fixed frame the way a real messenger does.

**Key interactions.** No component state. The composer, attach, emoji, send,
call controls and the conversation rows are labelled and inert.

**Empty, loading and error.** None; the thread always has content.

**Accessibility.** Own messages are right-aligned and accent-tinted, theirs
left-aligned on surface: alignment does the work and the tint is a second,
redundant signal so the thread still parses in greyscale. Bubbles are capped at
a readable measure rather than the column width, because a full-width bubble
stops looking like speech. Unread counts carry a text label
("3 unread"). Every pane is a labelled landmark, and the thread is labelled
with the other person's name.

### 19. Messages

| Field | Value |
|---|---|
| id | `messages` |
| Group | Communication |
| navId | `messages` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/comms/MessagesScreen.tsx` |

**Purpose.** The triage inbox. The only decision it supports is "which of these
do I open", so every row is optimised to be *skipped* quickly.

**Information hierarchy.**

1. Page header with search.
2. Tabs: All, Unread, Requests, Archived.
3. The requests notice — a policy stated in words, once, at the top.
4. Pinned conversations.
5. Recent conversations.

Name and preview sit on the same left edge, timestamp and unread count on the
same right edge, and nothing else moves between rows.

**Anatomy.** `PageHeader` → `SearchInput` → `.sy-inbox__tabs` → either the
archived `EmptyState` or `aside.sy-inbox__notice` plus two
`section.sy-inbox__group` blocks (Pinned, Recent) of `InboxRow`s.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `max-width: 519px` | 393, 412 | Tab inline padding and gap tighten so four tabs fit; the requests notice wraps its action onto a new line; per-row hover actions are hidden outright. |

At 758 and above the rows keep their trailing action cluster and the tabs sit
at their natural size. The inbox is a single column at every width.

**Key interactions (stateful).** `tab` switches the list. Selecting **Archived**
renders the empty state rather than an empty list.

**Empty, loading and error.** The archived tab is one of the product's two
`EmptyState` usages: "Nothing archived", with an explanation of what archiving
does and how to do it, and a "Back to all messages" button that actually
returns to the All tab. The rationale is explicit — an inbox with nothing in it
should say so and offer the way back, because a blank column is
indistinguishable from a failed load.

**Accessibility.** Unread is three simultaneous signals — a tinted row, a bolder
name and a numeric pill — because any one alone fails somebody: the tint fails
in bright sun, the count fails when it is one, the weight fails at small sizes.
The requests policy is an `aside` labelled "About message requests" rather than
being implied by a tab label. Groups are `section`s labelled by their headings.

### 20. Friends

| Field | Value |
|---|---|
| id | `friends` |
| Group | Communication |
| navId | `profile` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/comms/FriendsScreen.tsx` |

**Purpose.** Relationships split by decision type: a short stack of requests to
answer, then a directory to browse. Deciding wins the top of the screen because
it is finite — two requests take ten seconds, and once they are gone the page
becomes a directory.

**Information hierarchy.**

1. Page header with tabs carrying counts: Following (348), Followers (12.4K),
   Mutuals (96), Requests (2), Blocked (4).
2. Follow requests, as cards.
3. The Following directory, as a grid.
4. "Find people" suggestions.

Requests are cards because a card carries enough context to make a judgement
without opening a profile: who they are, why they might be reaching out, and
who you both know. A grid cell carries only enough to recognise someone.
Different decision, different density.

**Anatomy.** `PageHeader` (with `Tabs`) → `section.sy-friends__requests`
(`.sy-request-card` each with avatar, name, handle, reason, mutuals, timestamp,
Accept and Decline) → `section.sy-friends__directory` (auto-fill grid of
`.sy-person-card`) → `section.sy-friends__find`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `max-width: 519px` | 393, 412 | `.sy-request-card` wraps and its actions justify to the end, so Accept and Decline sit on their own line at full target size. |
| `max-width: 639px` | 393, 412 | `.sy-request-card` wraps. |

The directory is a `--min: 256px` auto-fill grid, so it goes from one column at
393 to two at 758 and more at 1016 and 1248 without a breakpoint.

**Key interactions (stateful).** `tab` selects the relationship view. Accept
and Decline are given identical visual weight — the design refuses to bias the
decision — but neither is wired. The Following button is a state-and-action
control in one: it reads "Following" at rest and "Unfollow" on hover or focus,
with the *label* changing rather than only the colour. The first card is pinned
into that hover state so the transition is designed rather than discovered.

**Empty, loading and error.** None; there is no zero-requests state.

**Accessibility.** The Following toggle carries an explicit
`aria-label="Unfollow <name>"`, because its visible label changes with pointer
state. Every card's overflow control is labelled with the person's name.
Sections are labelled by their headings via `aria-labelledby`.

### 21. Communities

| Field | Value |
|---|---|
| id | `communities` |
| Group | Communication |
| navId | `discover` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/comms/CommunitiesScreen.tsx` |

**Purpose.** Two different questions share this screen — "where was I" and
"where else could I be" — and privacy is communicated three redundant ways so
nobody presses a button expecting a different outcome.

**Information hierarchy.**

1. Page header stating the privacy promise in the subtitle.
2. Your spaces, in a horizontal rail: short, familiar, scanned by muscle
   memory.
3. One space opened up — channels, the pinned post, and who is in it right now
   — because a card can say a space exists but only the inside can say what
   being a member feels like.
4. Discover spaces, in a vertical grid, because comparing unfamiliar things
   needs them side by side at equal weight.

**Anatomy.** `PageHeader` → `section` "Your spaces" (`.sy-scroller` of
`.sy-space-tile`) → `section.sy-space-detail` (`.sy-space-detail__main` with
identity, `.sy-pinned` announcement and the active-members row;
`nav.sy-space-detail__channels`) → `section.sy-spaces__discover`
(auto-fill `--min: 280px` grid of `.sy-space-card`).

Privacy is stated three times, any one of which carries the meaning alone: the
badge pairs an icon (globe, lock, key) with the word; the join control relabels
itself ("Join" for public, "Request" for private, "Request invite" for invite
only); and the member counts drop the live "online" figure for spaces you
cannot see into.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `max-width: 899px` | 393, 412, 758 | `.sy-space-detail__identity` wraps, so the crest, the name block and the Following control stack instead of crushing. |
| `min-width: 700px` | 758, 1016, 1248 | `.sy-space-detail` becomes `1fr / 264px`, moving the channel list beside the space content. |

Note the overlap at 758: the identity row wraps *and* the detail is two columns
on a tablet, which is the intended combination.

**Key interactions.** No component state. Join and Request buttons, channels,
the pinned post and the Following control are labelled and inert.

**Empty, loading and error.** None.

**Accessibility.** Channels are real buttons in a labelled `nav`; unread counts
carry a visually hidden "unread messages". Read-only channels show a lock icon
in addition to their styling. Each section is labelled by its own heading.

---

## Creator

Four screens. `creator-dashboard` declares a context panel (393 / 412 / 758 /
676 / 908); `analytics`, `monetization` and `premium` do not (393 / 412 / 758 /
1016 / 1248). Stylesheet: `src/screens/creator/creator.css`.

### 22. Creator dashboard

| Field | Value |
|---|---|
| id | `creator-dashboard` |
| Group | Creator |
| navId | `studio` |
| Immersive | No |
| Context panel | `CreatorDashboardContextPanel`, titled "Today" |
| Component | `src/screens/creator/CreatorDashboardScreen.tsx` |

**Purpose.** The creator's home base, ordered by what can still be changed.

**Information hierarchy.**

1. **Hero metrics** — the scoreboard, read in under two seconds.
2. **Next broadcast** — the only thing on the screen with a deadline, so it
   gets the accent border and a live countdown.
3. **Trend and uploads** — the evidence behind the scoreboard.
4. **AI insight** — one finding, with its source, at the bottom.

The AI card is last on purpose. On consumer Home the assistant leads, because
there the user has no agenda; here the creator arrives with one, and an
interpretation is only useful after the raw numbers have been seen — otherwise
it becomes the numbers.

**Anatomy.** `.sy-cd__head` (greeting plus a 7d / 30d / 90d / year segmented
range) → `section.sy-cd__stats` (four `.sy-metric` cards, each with icon,
value, delta and a sparkline) → `.sy-cd__next` (scheduled badge, title,
reminder count, countdown, Go live and Edit) → "Watch time" bar chart →
"Recent uploads" table → the AI insight card. Context panel: a today checklist,
"Waiting on you" comments, and payout status.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 676, 908 | The range control stops being full width and takes a minimum inline size; `.sy-cd__stats` goes from two columns to four. |

At 393 and 412 the range control spans the width and the metrics are a two-up
grid. The uploads table is wrapped in `.sy-table-scroll`, so it keeps its
designed column widths and moves overflow into a horizontal scroll the user
controls rather than clipping numbers.

**Key interactions (stateful).**

- `range` — 7d / 30d / 90d / year, which swaps the four hero metrics. The bar
  chart is explicitly labelled "last 7 days" and stays fixed, because a daily
  bar chart stops being readable past about a fortnight and silently
  reinterpreting it as weekly buckets would make two charts wear one label.
- Context panel `done` — a working checklist of four tasks, one pre-checked.

**Empty, loading and error.** None. The payout card in the panel models a
"Processing" state as content, not as a system state.

**Accessibility.** The metrics region is labelled with the active range
("Headline metrics, last 7d"), so changing the range changes the accessible
name of the region. Deltas carry a direction icon as well as a sign. Everything
in the context panel is reachable elsewhere in the product — the panel is a
shortcut for the expanded posture, never the only route.

### 23. Analytics

| Field | Value |
|---|---|
| id | `analytics` |
| Group | Creator |
| navId | `analytics` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/creator/AnalyticsScreen.tsx` |

**Purpose.** Deep channel analytics: a comparison chart against the previous
period, breakdowns by source, device and country, a retention curve with the
drop-off marked, and a sortable table of top content.

**Information hierarchy.**

1. Header: scope, period and the comparison period, stated in mono.
2. Metric tiles — the primary metric switcher, each showing total and delta.
3. The trend chart for the selected metric, with the previous period drawn as a
   muted dashed line on the same axis.
4. Breakdown: traffic sources (donut), devices (bars), geography (ranked list).
5. Audience retention, with the drop-off called out.
6. Top content, as a sortable table.

**Anatomy.** `.sy-an__head` (title block, a compact-only metric `Select`, a
14d / 28d / 90d segmented range, Export) → `.sy-an__tiles` → the chart surface
→ `.sy-an__breakdown` (three panels) → the retention surface →
`.sy-table-scroll` containing a `sy-data-table--sortable`.

Three decisions shape the screen and are documented in the file:

- **Charts are hand-built SVG, not a library.** The plot is an SVG on a 0–100
  `viewBox` with `preserveAspectRatio="none"` and
  `vector-effect="non-scaling-stroke"`, while axis labels, markers and the
  tooltip are HTML positioned by percentage on top of it. The geometry
  stretches; the type never does.
- **Comparison is always drawn, never stated.** "+17.0%" is meaningless without
  its shape: a rise driven by one spike is visibly different from a rise driven
  by a shifted baseline.
- **Tables scroll, they do not shrink.** Below roughly 620px a six-column table
  would wrap cells or clip numbers, and a clipped number is worse than no
  number.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | The metric `Select` is hidden — it exists only in the compact posture, where the tiles scroll horizontally and the current selection can end up off-screen — and `.sy-an__tiles` becomes a five-column grid. Breakdown panels go to two columns. |
| `min-width: 768px` | 1016, 1248 | Chart heights increase (trend and retention independently); the chart callout becomes absolutely positioned over the plot instead of sitting beneath it. |
| `min-width: 1024px` | 1248 | Breakdown panels go to three columns. |

This is the screen most likely to be read on a 676px column with a context
panel stealing the rest — the file says so — even though `analytics` itself
declares no panel and therefore receives 1016 at web.

**Key interactions (stateful).**

- `metricId` — six metrics, switchable from the tiles (`aria-pressed`) or from
  the compact `Select`. Both controls write the same state.
- `range` — 14d / 28d / 90d.
- `sort` — a working sortable table: clicking a column header sorts descending,
  clicking again reverses, and switching columns resets to descending.

**Empty, loading and error.** None. The retention section carries a "Needs
attention" badge as an editorial signal, not a system state.

**Accessibility.** The table uses `aria-sort` on the active column header and a
visually hidden `caption` that states the current sort ("Top content by Views,
highest first"). Row headers are `th scope="row"`. The tile row is a
`role="group"` labelled "Choose a metric". Chart legends pair a swatch with a
text label, and the geography list is an `ol` so rank is structural. A note
under the table warns that average view duration is measured against full
runtime, so a two-hour broadcast and a four-minute clip are not directly
comparable.

### 24. Monetization

| Field | Value |
|---|---|
| id | `monetization` |
| Group | Creator |
| navId | `wallet` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/creator/MonetizationScreen.tsx` |

**Purpose.** Money screens usually show a big encouraging number and hide the
arithmetic that turns it into the smaller number that lands in a bank account.
This one is built the other way round.

**Information hierarchy.**

1. **Gross, split by source** — where the money came from, with a line stating
   that the subtraction to net is at the bottom of this screen.
2. **Streams** — which of the six sources are switched on and which are not.
3. **Payout** — when the money moves, and to where, plus recent transactions.
4. **Eligibility** — the Partner Programme, as a separate panel from earning,
   because they are separate things.
5. **Fees** — the full subtraction, gross to net, with net emphasised.

**Anatomy.** `.sy-mz__head` → `.sy-mz__summary` (gross total, delta, and a
donut with a legend listing amount and share per source) →
`.sy-mz__streams` (six `.sy-mz-stream` cards, each with an Active / Not set up
badge and a Manage or Set up button) → `.sy-mz__split` containing "Payouts"
and `.sy-mz__aside` ("Partner Programme" criteria and "What you actually
receive").

The donut and the stream cards are generated from one array, so a revenue chart
that disagrees with the revenue list beside it is impossible by construction.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-mz__streams` goes to two columns. |
| `min-width: 768px` | 1016, 1248 | `.sy-mz__summary` becomes `1fr / 1.1fr`, putting the gross figure beside the donut. |
| `min-width: 960px` | 1016, 1248 | `.sy-mz__streams` goes to three columns; `.sy-mz__split` becomes `1fr / 0.82fr`, moving eligibility and the fee breakdown into a right column. |

At 393, 412 and 758 everything is a single column and the fee breakdown sits at
the bottom, which is where it belongs in the reading order regardless.

**Key interactions.** No component state. Set up / Manage per stream, Statement
and the payout controls are inert.

**Empty, loading and error.** The "Not set up" stream state is content, not an
empty state: those cards show an em dash for amount and an outline "Set up"
button. **There is no payment infrastructure** — figures, payout dates and fee
percentages are constants in the module.

**Accessibility.** Every eligibility criterion carries an icon *and* a word,
plus a visually hidden "— met" / "— not yet met" suffix, because a green tick
and a grey dash are the same shape to a colour-blind reader. Net is the only
emphasised row in the fee table, because it is the only number the creator can
spend. Processing fees are attributed to the acquirer rather than to SYLORA in
plain text.

### 25. Premium subscription

| Field | Value |
|---|---|
| id | `premium` |
| Group | Creator |
| navId | none |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/creator/PremiumScreen.tsx` |

**Purpose.** The only consumer-facing screen in the Creator group and the only
one allowed a hero: the other three are read daily by someone who already pays
us, this one is read once by someone deciding whether to.

**Information hierarchy.**

1. Hero: mark, badge, headline, and a lede stating that creators are paid more
   when you subscribe than when you watch ads.
2. Billing-cycle toggle with the saving stated as a percentage.
3. Three plan cards (Free, Premium, Pro).
4. The full capability matrix — ten rows across three plans.
5. FAQ.
6. Payment method and cancellation reassurance.

**Anatomy.** `header.sy-pr__hero` → `.sy-pr__plans` → `.sy-table-scroll`
containing `.sy-pr__table` → `.sy-pr__faq` → `.sy-pr__checkout`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-pr__plans` goes from one column to three. |
| `min-width: 768px` | 1016, 1248 | The FAQ goes to two columns. |

The comparison table keeps its shape and scrolls horizontally at every width
with the capability column pinned, rather than collapsing into three per-plan
lists. Collapsing would destroy the only thing a comparison table is for:
reading one capability across all three plans on a single line.

**Key interactions (stateful).** `cycle` — Monthly / Annual. Annual shows the
annual price *and* its monthly equivalent *and* the cash saving, so the
comparison against the monthly plan is arithmetic the reader does not have to
do. The Free plan's CTA is disabled because it is the current plan.

**Empty, loading and error.** None. No checkout runs; the stored card is a
static block and the plan CTAs do not submit.

**Accessibility.** The comparison table has a visually hidden caption and
`scope`-ed headers; capability cells render a check, a cross or a text value
rather than colour-only marks. The featured column is marked with a class and a
"Most popular" badge, not with colour alone.

---

## Commerce

Five screens. `wallet` declares a context panel (393 / 412 / 758 / 676 / 908);
`marketplace`, `digital-products`, `gifts` and `inventory` do not (393 / 412 /
758 / 1016 / 1248). Stylesheet: `src/screens/commerce/commerce.css`.

### 26. Marketplace

| Field | Value |
|---|---|
| id | `marketplace` |
| Group | Commerce |
| navId | `marketplace` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/commerce/MarketplaceScreen.tsx` |

**Purpose.** A storefront for work made by people the buyer already follows, so
the unit of trust is the creator rather than the platform. The creator row sits
above the rating on every card.

**Information hierarchy.** The order follows how browsing actually decays:
people arrive curious (hero), narrow by kind (category chips), narrow by
constraint (filters), then scan (grid). Putting filters above the chips would
ask for a budget before anyone knows what is on sale.

1. Editorial hero — one product at four times card size, with maker, rating,
   price, previous price and both Wishlist and Add to cart.
2. Category chips.
3. Filter surface: maximum price slider, minimum rating, sort, free-only
   switch.
4. Product grid.
5. Creator picks rail.

**Anatomy.** `.sy-mkt-hero` (media with an "Editor's choice" ribbon, then the
body) → `.sy-scroller.sy-mkt-cats` → `Surface.sy-mkt-filters` →
`.sy-market-grid` → the picks scroller.

Filters are a surface, not a drawer: on a marketplace the constraint set *is*
the query, and hiding it makes people forget what they asked for when the grid
comes back nearly empty. Ratings are shown as stars *and* the number, because a
five-star row is fast to read but impossible to compare — 4.7 and 4.9 look
identical as stars.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | The hero becomes `5fr / 6fr` with a stretched media panel; the filter surface goes to two columns. |
| `min-width: 900px` | 1016, 1248 | `.sy-market-grid` goes to three columns. |
| `min-width: 1024px` | 1248 | Filters become a four-column row (`1.4fr / 1fr / 1fr / 1.1fr`); creator-pick cards widen to 300px. |

**Key interactions (stateful).** `category` (chips), `maxPrice` (a slider whose
value is echoed in mono as "€0 – €160"), and `freeOnly` (a switch). The grid is
not filtered by these values — the controls hold and display their own state
but no query runs.

**Empty, loading and error.** No zero-results state, which is the notable gap
given that the filter surface exists to produce one.

**Accessibility.** The category row is a `role="group"` labelled "Product
categories". The price slider has a spelled-out label ("Maximum price in
euro"). Star ratings are accompanied by the numeric value and review count as
text.

### 27. Digital Products

| Field | Value |
|---|---|
| id | `digital-products` |
| Group | Commerce |
| navId | `marketplace` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/commerce/DigitalProductsScreen.tsx` |

**Purpose.** The seller's side of the marketplace. Sellers arrive for two
different reasons and the screen answers them in that order: "how is my
catalogue doing" and "let me fix one thing".

**Information hierarchy.**

1. Header with Import and New product.
2. Four catalogue stats: revenue, units, conversion, average order value.
3. Published / Drafts / Archived tabs over the catalogue list.
4. The edit panel for one product: title, description, pricing and licence,
   pay-what-you-want, files.
5. The publish checklist, which blocks rather than warns.

**Anatomy.** `.sy-dp__head` → `.sy-cols--4` stat row → `Tabs` +
`.sy-dp-table` (a head row plus `.sy-dp-row` items) → `.sy-cols--sidebar`
containing the edit surfaces and `Surface.sy-dp-check`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 560px` (`.sy-cols--4`) | 758, 1016, 1248 | Stats go from one column to two. |
| `min-width: 640px` | 758, 1016, 1248 | `.sy-dp-pricing` becomes `1fr / 1.4fr`, putting price beside licence. |
| `min-width: 768px` | 1016, 1248 | `.sy-dp-table__head` and `.sy-dp-row` become a real grid with right-aligned numerics; the column headers stop being decorative. |
| `min-width: 840px` (`.sy-cols--4`) | 1016, 1248 | Stats go to four columns. |
| `min-width: 880px` (`.sy-cols--sidebar`) | 1016, 1248 | The edit panel and the publish checklist sit side by side. |

Below 768px the row folds into a two-line block and the column headers retire,
because a real table there would either scroll horizontally or lie. Each cell
keeps a `data-label` so the folded layout can still name its values.

**Key interactions (stateful).**

- `tab` — Published / Drafts / Archived, which filters the catalogue list by
  status.
- `payWhatYouWant` — a switch that reveals a "Suggested amount" field plus a
  warning that suggestions above 1.5× the minimum reduce total revenue.

**Empty, loading and error.** The publish checklist is the one deliberately
blocking element in the product: Publish is `disabled`, the checklist shows "3
of 5 requirements met" with a cross against each unmet item, and a warning line
states how many remain. The rationale is spelled out in the file — every unmet
item is a promise to a buyer that the platform would otherwise have to break on
the seller's behalf, so gating here is cheaper than a refund queue later. The
Drafts and Archived tabs render their filtered lists; neither has an empty
state, because both have content.

**Accessibility.** The table head is `aria-hidden` in the folded layout and the
per-cell `data-label` carries the column name. Numerics are mono, tabular and
right-aligned. File rows have per-file remove labels. The checklist's blocking
reason is text, not just a disabled button.

### 28. Wallet

| Field | Value |
|---|---|
| id | `wallet` |
| Group | Commerce |
| navId | `wallet` |
| Immersive | No |
| Context panel | `WalletContextPanel`, titled "Earnings" |
| Component | `src/screens/commerce/WalletScreen.tsx` |

**Purpose.** One hero answers what is mine, what is not mine yet, and how to
move it, so the rest of the screen can be calm. Euro and credits are kept
visually separate so a top-up can never be mistaken for a cash charge.

**Information hierarchy.**

1. The balance card — available balance in display-scale numerals, with pending
   clearance directly beneath at the same alignment, because the gap between
   those two numbers is what people check most often. Next payout and lifetime
   earnings sit alongside; Add credits, Withdraw and a breakdown control below.
2. Credits — a separate section with its own balance, expiry warning and
   top-up packages.
3. Payment methods.
4. Transactions, grouped by date.

**Anatomy.** `Surface.sy-balance` → `ScreenSection "Credits"`
(`.sy-credit-balance` + `.sy-topups` radiogroup) →
`ScreenSection "Payment methods"` → `ScreenSection "Transactions"` (filters
plus date-grouped `.sy-tx-row` lists). Context panel: earnings breakdown.

Two currencies live here and must never blur: euro is real money that leaves
the platform, credits are a closed-loop balance that only buys gifts and
boosts. They are separated by section, by glyph and by type treatment. The
credit glyph is drawn as SVG rather than typeset, so credits are never mistaken
for a currency with a real exchange rate — no country has that mark.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 676, 908 | Transaction filters become `1fr / 1fr / auto`; transaction rows become a four-column grid. |
| `min-width: 768px` | 758, 908 | `.sy-balance__body` padding increases to `--sy-space-8`. **Does not fire at 676**, the web expanded column. |
| `min-width: 900px` | 908 | `.sy-topups` becomes four columns. |
| `min-width: 1024px` | none of the five | Would make `.sy-wallet-credits` `260px / 1fr`. With a context panel the widest column is 908, so the credits section stays stacked on every reference device. |

The 676px column is the tightest case in the product and this screen shows why:
two of its four thresholds land above it, so web at 1280 gets a *narrower*
composition than a tablet.

**Key interactions (stateful).** `selectedPackage` — the top-up packages are a
working `role="radiogroup"`; the selected package shows a check and the word
"Selected".

**Empty, loading and error.** None. **No payment infrastructure exists**: Add
credits, Withdraw and the top-up packages do not initiate anything, and the
balances are constants.

**Accessibility.** Amount signs are literal "+" and "−" characters, not colour,
because a red number in a monochrome screenshot, to a colour-blind eye, or
under a blue-light filter is just a number. Transaction status pairs a tone with
an icon and a word (Cleared / Pending / Processing). The top-up grid is a
labelled radiogroup with `aria-checked` on each option.

### 29. Virtual Gifts

| Field | Value |
|---|---|
| id | `gifts` |
| Group | Commerce |
| navId | `wallet` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/commerce/GiftsScreen.tsx` |

**Purpose.** Gifting is the most emotional transaction on SYLORA and the one
most easily turned predatory, so the screen slows the moment down by exactly
one beat: catalogue, then a composer that shows recipient, total and remaining
balance together before the send button is reachable.

**Information hierarchy.**

1. Featured limited-edition gift, with scarcity stated as numbers ("1,412 of
   5,000 remaining", "28% of the mint left") and a countdown, not as the word
   "limited".
2. Catalogue, grouped by rarity rather than price, because rarity is what
   people shop by and price within a tier is the secondary sort.
3. The send composer: recipient, chosen gift, quantity stepper, message,
   totals, send.
4. On-stream preview, explicitly badged "Simulation".
5. Recent gifts, sent and received.

**Anatomy.** `.sy-gift-featured` → `ScreenSection "Catalogue"` with four
`section.sy-gift-tier` blocks → `ScreenSection "Send a gift"` laid out as
`.sy-cols--sidebar`: `.sy-gift-send` beside the preview and recent list.

Rarity carries four independent signals: the written tier name on both the
section and the tile, a pip count (one to four diamonds) countable in
greyscale, a border that thickens with tier, and finally hue. Legendary adds a
halo glow, which survives as a luminance difference.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-gift-featured` becomes `240px / 1fr`, putting the artwork beside the description. |
| `min-width: 880px` (`.sy-cols--sidebar`) | 1016, 1248 | The composer and the preview column sit side by side. |

Tier grids are `.sy-grid` with `--min: 124px`, so they reflow without
breakpoints from two tiles at 393 to a full shelf at 1248.

**Key interactions (stateful).**

- `selected` — clicking any catalogue tile selects it (`aria-pressed`), which
  updates the section eyebrow, the composer's chosen-gift block, the on-stream
  preview and the send button label.
- `quantity` — a stepper clamped to 1–99, which recomputes the line total, the
  balance-after figure and the final total live.

**Empty, loading and error.** None. Nothing is sent, and the balance is a
constant. The composer states the irreversibility in words: "Gifts are final
and cannot be refunded once they play on stream."

**Accessibility.** The stepper value is `aria-live="polite"`, so quantity
changes are announced. The preview is badged "Simulation" so nobody thinks
their gift is already live, and the cheer element is `role="status"`. Pips are
labelled with the tier name.

### 30. Inventory

| Field | Value |
|---|---|
| id | `inventory` |
| Group | Commerce |
| navId | `wallet` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/commerce/InventoryScreen.tsx` |

**Purpose.** An inventory is only useful if it answers "what am I wearing right
now" before "what do I own".

**Information hierarchy.**

1. Equipped loadout — four named slots pinned at the top, with empty slots
   *shown* rather than hidden, because a gap is the clearest prompt to fill it
   and it also explains why some items cannot be equipped simultaneously.
2. Expiring soon — the other thing collection screens habitually hide, given
   its own band with a countdown in mono, because a badge that vanishes
   silently feels like theft even when the terms said 30 days.
3. Collection, filterable by kind.
4. Rarity legend, naming each tier in text.

**Anatomy.** `ScreenSection "Equipped loadout"` (`.sy-loadout` grid of
`.sy-slot`) → `ScreenSection "Expiring soon"` (`.sy-inv-expiring` list) →
`ScreenSection "Collection"` (`Tabs` + `.sy-grid` of `.sy-inv-card`) →
`ScreenSection "Rarity legend"`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | Expiring rows become `auto / 1fr / auto / auto`, putting the countdown and Extend on the same line as the item. |
| `min-width: 768px` | 1016, 1248 | The rarity legend goes to two columns. |

Loadout slots use `--min: 152px` and collection cards `--min: 158px`, so both
grids reflow continuously rather than at breakpoints.

**Key interactions (stateful).** `tab` — All / Gifts / Badges / Effects /
Frames / Passes, each carrying a live count, filtering the collection grid.
Equip, Use, Choose and Extend are inert.

**Empty, loading and error.** Empty loadout slots are a designed content state
with their own elevation (`sunken`), label and Choose button — not an empty
state in the `EmptyState` sense. A tab with no items would render an empty grid;
every tab currently has content.

**Accessibility.** Equipped state is a filled check *plus* the word "Equipped"
*plus* a border change. Rarity repeats the gift catalogue's pip system, and the
legend names each tier in text so nothing depends on remembering a hue.

---

## Learning

Two screens, neither with a context panel: 393 / 412 / 758 / 1016 / 1248.
Stylesheet: `src/screens/learning/learning.css`.

### 31. Courses

| Field | Value |
|---|---|
| id | `courses` |
| Group | Learning |
| navId | `discover` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/learning/CoursesScreen.tsx` |

**Purpose.** Optimised for resuming, not for browsing. The single largest
predictor of whether someone finishes a course is whether they can resume it in
one tap, so the hero names the *next lesson* rather than the course.

**Information hierarchy.**

1. "Continue learning" hero — the next lesson's title, module, duration,
   remaining time, a progress ring and a progress bar, then Resume lesson,
   Syllabus and an offline download control.
2. My courses — everything already owned, with per-course progress or a "Not
   started" marker.
3. Catalogue — category chips and cards with ratings, price and enrolment
   counts.
4. Course detail — curriculum, outcomes, enrolment card, instructor, and the
   earned certificate.

Owned courses sit above the catalogue: a learning product that sells before it
serves teaches people to distrust the home screen, and the enrolment numbers in
the catalogue are already doing the selling.

**Anatomy.** `Surface.sy-resume` → `ScreenSection "My courses"`
(`.sy-course-grid`) → `ScreenSection "Catalogue"` (`.sy-learn-cats` scroller +
`.sy-course-grid`) → `ScreenSection` course detail laid out as
`.sy-cols--sidebar`: `.sy-curriculum` (modules, lessons, `.sy-outcomes`) beside
a stack of `.sy-enrol`, `.sy-instructor` and the certificate card.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 560px` | 758, 1016, 1248 | `.sy-course-grid` goes to two columns. |
| `min-width: 640px` | 758, 1016, 1248 | `.sy-resume` becomes `5fr / 6fr`, putting the cover beside the lesson details. |
| `min-width: 880px` (`.sy-cols--sidebar`) | 1016, 1248 | Curriculum and the enrolment column sit side by side. |
| `min-width: 1024px` | 1248 | The outcomes list goes to two columns. |

**Key interactions (stateful).**

- `category` — catalogue chips.
- `openModule` — the curriculum is an accordion; exactly one module is open,
  and clicking the open module closes it. Module headers use `aria-expanded`
  and show a "done/total" count.

Resume lesson, Enrol now, Gift this course, Download PDF and Share are inert.

**Empty, loading and error.** None. Curriculum state uses three *shapes* — a
filled check, an open circle and a padlock — so completed, available and locked
survive greyscale. Locked rows keep muted-not-quiet text, because a syllabus
you cannot read is not a preview.

**Accessibility.** Progress is always stated as a number as well as drawn
(`ProgressRing` with a visible percentage, `Progress` with a label naming the
course). The certificate is presented as an artefact with a visible credential
id, and its actions are ordinary buttons. Category chips are a labelled group.

### 32. Events

| Field | Value |
|---|---|
| id | `events` |
| Group | Learning |
| navId | `discover` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/learning/EventsScreen.tsx` |

**Purpose.** Two people use this screen with opposite mental models — "what is
on soon" (a queue) and "what does my February look like" (a shape) — and
neither is a superset of the other, so both views are first-class rather than
one hidden behind a preference.

**Information hierarchy.**

1. Header with the List / Calendar segmented control and Host an event.
2. Featured event hero, with date, time, venue, host, attendees, price and
   registration state.
3. The active view: either the list of upcoming events or the February grid.
4. Your events — hosting and attending, side by side.
5. Event detail — description, agenda, who is going, host, ticket, recording
   and refund terms, add to calendar.

**Anatomy.** `.sy-events__head` → `.sy-event-hero` →
(`.sy-cal` grid | `.sy-event-row` list) → `ScreenSection "Your events"`
(`.sy-cols--2`) → `ScreenSection "Event detail"`
(`.sy-event-detail__grid`).

In the list the date is a tile rather than a line of text: a repeated,
fixed-width block lets the eye scan down the column and find "the 16th" without
reading any of the titles beside it. The calendar's first row deliberately
carries five days of January, because a month view that starts on the 1st lies
about where the weekends fall.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 560px` (`.sy-cols--2`) | 758, 1016, 1248 | Hosting and attending go side by side. |
| `min-width: 640px` | 758, 1016, 1248 | `.sy-event-hero` becomes `5fr / 7fr`. |
| `min-width: 768px` | 1016, 1248 | `.sy-event-row` becomes `auto / 1fr / auto` so the date tile, the details and the register control share one line; calendar day cells grow to a 74px minimum height. |
| `min-width: 1024px` | 1248 | `.sy-event-detail__grid` becomes `1fr / 300px`, moving host and ticket terms into an aside. |

**Key interactions (stateful).**

- `view` — List or Calendar, a real view switch.
- `selectedDay` — the calendar grid is a working day selection.

Register, Manage and Add to calendar are inert.

**Empty, loading and error.** None. A month with no events would render an
empty grid; the fixture month has events.

**Accessibility.** Registration state is a filled check plus the word
"Registered", never a colour swap on the button — a green button and a purple
button look identical to a significant share of people. The calendar is marked
up with `role="grid"`, `role="row"` and `role="columnheader"`. The agenda is an
ordered list with mono timestamps.

---

## Gamification

Three screens, none with a context panel: 393 / 412 / 758 / 1016 / 1248.
Stylesheet: `src/screens/game/game.css`.

### 33. Leaderboards

| Field | Value |
|---|---|
| id | `leaderboards` |
| Group | Gamification |
| navId | `discover` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/game/LeaderboardsScreen.tsx` |

**Purpose.** A leaderboard has two audiences with almost nothing in common: the
three people at the top and everyone else. The podium serves the first, the
dense table serves the second.

**Information hierarchy.**

1. Header: season and week, the ranking basis in a sentence, the settlement
   rule ("Scores settle at 00:00 CET and are final after 24 hours"), and a
   Global / Following / Space scope switch.
2. Controls: ranking-category chips and a period select.
3. Podium — three pedestals of different heights with first in the centre. The
   heights are proportional to nothing; they are ceremonial, and the numbers
   underneath carry the actual ranking.
4. Full ranking table.
5. The current user's row, pinned to the bottom, with the distance to the next
   rank.

Pinning "you" is the point of the screen: scrolling to rank 412 to check
whether you moved is the most common failure of this pattern, and the gap to
the next rank is the only number that makes a leaderboard actionable.

**Anatomy.** `.sy-lb__head` → `.sy-lb-controls` → `Surface.sy-podium`
(`.sy-podium__stage` with three `.sy-podium__col`) →
`ScreenSection "Full ranking"` (`.sy-lb-table` with a head row, an `ul` of
`.sy-lb-row`, and `.sy-lb-you`).

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-lb-controls` becomes `1fr / 180px`; `.sy-lb-row` and `.sy-lb-you` become `40px / 1fr / 110px / 84px`, which is what makes the movement column visible. |
| `min-width: 720px` | 758, 1016, 1248 | The podium stage is capped at 620px and centred, so it does not sprawl. |
| `min-width: 768px` | 1016, 1248 | Podium padding and gap increase, and the first- and second-place blocks grow taller. |

At 393 and 412 rows drop the movement column and the podium fills the width.

**Key interactions (stateful).** `scope` (Global / Following / Space), `period`
(Today / This week / This month / All time) and `category` (Watch time / Gifts
sent / Gifts received / Community answers). The category selection is echoed in
the header sentence ("Ranked on watch time"); the ranking data itself does not
change.

**Empty, loading and error.** None.

**Accessibility.** Movement is an arrow *and* a signed number *and* the words
"no change" for the flat case, because a green triangle alone is meaningless to
a large minority of people and invisible in a monochrome screenshot. The header
row of the table is `aria-hidden` because the semantic content is carried by
each row's own labelled parts. The pinned row states its context in text
("1,204 behind sana.p at rank 41").

### 34. Achievements

| Field | Value |
|---|---|
| id | `achievements` |
| Group | Gamification |
| navId | `profile` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/game/AchievementsScreen.tsx` |

**Purpose.** Built around the achievements you have *not* earned yet, because
those are the reason to come back. Locked cards keep full text contrast and an
exact "x of y" count.

**Information hierarchy.**

1. Summary: an overall completion ring, the unlocked count, an explanation of
   why the ring runs ahead of the count, and the current tier with the distance
   to the next.
2. Recently unlocked, as a horizontal rail.
3. All achievements, filterable by tier.
4. One achievement in detail.

**Anatomy.** `Surface.sy-ach-summary` → `ScreenSection "Recently unlocked"`
(scroller of `.sy-ach-recent`) → `ScreenSection "All achievements"`
(tier chips + `.sy-grid` with `--min: 244px` of `.sy-ach-card`) →
`ScreenSection` achievement detail.

Medals are built in CSS rather than shipped as art: four tiers, one shape, and
a fill that changes — metal ramps for Bronze, Silver and Gold, and the aurora
gradient for Prism, the only place in gamification the brand gradient appears,
which is what makes it read as the top of the ladder.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 1024px` | 1248 | `.sy-ach-summary` becomes `auto / 1fr / auto`, moving the tier block out of the stacked flow and onto the same row as the ring and the text; `.sy-ach-detail__grid` goes to three columns. |

Everything else is handled by the auto-fill card grid, which goes from one
column at 393 to five at 1248 without a breakpoint.

**Key interactions (stateful).** `tier` — All / Bronze / Silver / Gold / Prism
chips, which filter the grid and update the section eyebrow's count.

**Empty, loading and error.** None. Locked is a content state, not an empty
state: locked cards are dimmed by saturation and elevation, never by dropping
text contrast below 4.5:1.

**Accessibility.** Progress is always "x of y" in words as well as a bar,
because a bar at 83% does not tell you whether one more publish finishes it or
forty. Locked and unlocked each carry an icon and a word. Progress bars are
labelled with the achievement name.

### 35. Missions

| Field | Value |
|---|---|
| id | `missions` |
| Group | Gamification |
| navId | `profile` |
| Immersive | No |
| Context panel | None |
| Component | `src/screens/game/MissionsScreen.tsx` |

**Purpose.** The season track is the hero because it is the only thing on the
screen that shows *distance*: how far you have come and what the next node
costs. Missions are the mechanism; the track is the reason anyone runs them.

**Information hierarchy.**

1. Header: season name, days remaining, the expiry rule ("Unclaimed rewards
   expire with it"), and credits earned this season.
2. Season pass track — a physical rail with nodes on it, exactly one of which
   is claimable at a time, because a screen with six glowing buttons has no
   call to action at all. The rail's filled portion is the same width as the
   progress, so there is one truth on screen rather than a bar and a track that
   can disagree.
3. Daily streak.
4. Active missions, in Daily / Weekly / Seasonal tabs, sorted by closeness to
   completion.

Sorting by proximity rather than reward size is deliberate: finishing something
is a stronger pull than earning more, and sorting by reward would bury a
mission sitting at 18 of 25.

**Anatomy.** `.sy-ms__head` → `ScreenSection "Season pass"` (`Surface.sy-track`
with `.sy-track__rail`, `.sy-track__nodes` and a footer carrying overall
progress and a days-left badge) → `ScreenSection "Daily streak"`
(`.sy-streak`) → `ScreenSection "Active missions"` (`Tabs` +
`.sy-mission-grid`).

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 560px` | 758, 1016, 1248 | `.sy-mission-grid` goes to two columns. |
| `min-width: 768px` | 1016, 1248 | `.sy-streak` becomes `auto / 1fr`, putting the streak count beside the week strip. |

The track itself is a horizontal scroller at every width, so nodes are never
compressed below a legible size.

**Key interactions (stateful).** `tab` — Daily / Weekly / Seasonal, each with a
count badge; the mission list is re-sorted by completion ratio on every switch.
The Claim button on the claimable node is present but inert.

**Empty, loading and error.** None. Node states — claimed, claimable, locked —
each carry an icon and a word; the claimable node adds a glow, which is
decoration on top of a label that already says "Claim".

**Accessibility.** Streak days carry a visually hidden "complete" / "not yet
complete" per day. The track rail is `aria-hidden` and the progress is
duplicated as a labelled `Progress` plus an exact "11,400 of 20,000 season
points" line. The streak note states the reset rule in words.

---

## Operations

Three screens, all declaring `preferredDevice: 'desktop'`, none with a context
panel: 393 / 412 / 758 / 1016 / 1248. Stylesheet: `src/screens/ops/ops.css`.

### 36. Admin panel

| Field | Value |
|---|---|
| id | `admin` |
| Group | Operations |
| navId | none |
| Immersive | No |
| Context panel | None |
| Preferred device | Desktop (expanded) |
| Component | `src/screens/ops/AdminScreen.tsx` |

**Purpose.** Platform operations, ordered by how fast the reader has to act.

**Information hierarchy.**

1. **Health tiles** — is anything on fire right now.
2. **Services** — where it is burning, and how badly.
3. **Open incident** — who owns it and what can be done from here.
4. **Users** — the slow work: accounts, appeals, verification.
5. **Flags and audit** — what we changed, and who changed it.

Nothing here is celebratory: no gradient, no glow, no entrance animation. An
operator reading a latency figure at 03:00 should not have to wait for it to
arrive, and an admin surface that looks pleased with itself teaches people to
skim it.

**Anatomy.** `.sy-ad__head` (scope, window, refresh timestamp, Refresh, Export)
→ `section.sy-ad__health` (six `.sy-ad-health` tiles) → `.sy-ad__split`
(Services list, Open incident card) → `ScreenSection "Users"` (filters plus a
`.sy-table-scroll` data table) → `.sy-ad__split--even` (Feature flags, Audit
log).

One open incident gets a whole card. Two would get a list, and the list is what
stops anyone reading either of them.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 480px` | 758, 1016, 1248 | Per-service sparklines become visible. |
| `min-width: 640px` | 758, 1016, 1248 | Health tiles go from two columns to three. |
| `min-width: 960px` | 1016, 1248 | `.sy-ad__split` becomes `1.15fr / 1fr`, putting the incident card beside the service list. |
| `min-width: 1100px` | 1248 | Health tiles go to six columns — the full single-row scoreboard, which is the composition the screen is designed for. |

At 393 and 412 the screen is a readable single column with two-up health tiles
and no sparklines, which is the "check it from a phone" posture rather than the
working posture.

**Key interactions (stateful).**

- `flags` — every feature flag switch works, with rollout percentage and
  environment badges alongside.
- `query` and `accountType` — the user table filters live on both.

Refresh, Export, incident actions and per-row account actions are inert.

**Empty, loading and error.** No loading or fetch-failure state; the "refreshed
09:47:12 UTC" line is a constant. Filtering to no matches would render an empty
table body with no message — the one place this screen would benefit from an
empty state.

**Accessibility.** Every state is a dot *and* a word: a red dot alone tells
roughly 8% of men nothing at all, and this is the one screen in the product
where missing a state has an operational cost rather than an aesthetic one.
Filters are labelled rather than placeholder-only, because the table is read by
people who did not build it, often under time pressure. The audit log is
monospaced end to end so times, actors and object ids compare vertically, and
automated entries carry a visually hidden "Automated action".

### 37. Moderator dashboard

| Field | Value |
|---|---|
| id | `moderator` |
| Group | Operations |
| navId | none |
| Immersive | No |
| Context panel | None |
| Preferred device | Desktop (expanded) |
| Component | `src/screens/ops/ModeratorScreen.tsx` |

**Purpose.** A triage tool, not a report reader. The queue never moves, the
evidence for the selected case fills the right, and the decision sits at the
bottom of the evidence rather than beside the queue — so no action can be taken
from the list alone.

**Information hierarchy.**

1. Header: languages covered and shift end.
2. Queue health stats.
3. Queue — severity, reporter, age, target, reason, and the AI recommendation
   with a numeric confidence.
4. Case detail — identity, the reported content *in context*, reporter notes,
   target history.
5. The recommendation, restated as a recommendation.
6. Actions: reversible first, then the irreversible pair behind an
   acknowledgement.
7. Policy reference — the exact clauses.

**Anatomy.** `.sy-mod__head` → `section.sy-mod__stats` →
`.sy-mod__work` containing `section.sy-mod__queue` (an advisory line —
"Recommendations are advisory. Nothing is applied until you apply it." — and
the case list) and `section.sy-mod__detail` (`.sy-mod-detail__head`,
`.sy-mod-excerpt`, `.sy-mod-detail__cols`, `.sy-mod-rec`, `.sy-mod-actions`,
then `ScreenSection "Policy reference"`).

Confidence is shown as a number because the model's output is a calibrated
probability and the whole job of the screen is to let a human decide how much
of it to trust. A label collapses that: "High" would cover 0.71 and 0.96 alike,
and those two cases warrant genuinely different amounts of reading. A number is
also auditable — a moderator can say "it was 0.63 and I disagreed", which is a
sentence you cannot write about a badge.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | Queue stats go from two columns to four. |
| `min-width: 768px` | 1016, 1248 | `.sy-mod-detail__cols` splits reporter notes and target history into two columns. |
| `min-width: 960px` | 1016, 1248 | `.sy-mod__work` becomes `0.78fr / 1.22fr` and the queue becomes sticky — the two-pane triage layout the screen is designed for. |

Below 960 the queue and the detail stack, which keeps the screen usable but is
not the working posture; `preferredDevice: 'desktop'` reflects that.

**Key interactions (stateful).**

- `selectedId` — selecting a case swaps the whole detail pane.
- `acknowledged` — a checkbox naming the specific policy clause. Suspend and
  Ban are `disabled` until it is ticked, with a "Confirm above to enable" hint
  beside them. Selecting a different case **resets the acknowledgement**,
  because carrying it across would mean the moderator confirmed a case they had
  not opened.
- `timeoutLength` — 1h / 24h / 7d / 30d.

No decision is recorded anywhere; the buttons are the end of the implemented
flow.

**Empty, loading and error.** No empty-queue state. The advisory line is the
screen's standing disclaimer about model output.

**Accessibility.** The confidence bar keeps one colour at every value, because
colouring it would imply the model is more right when it is more sure — the
number is the fact and the bar exists only to make the column rankable. The
flagged line in the excerpt carries a flag icon plus a visually hidden
"Reported". Each case button uses `aria-current`. Destructive controls are
danger-toned, disabled by default and paired with a text explanation of the
gate.

### 38. Business dashboard

| Field | Value |
|---|---|
| id | `business` |
| Group | Operations |
| navId | none |
| Immersive | No |
| Context panel | None |
| Preferred device | Desktop (expanded) |
| Component | `src/screens/ops/BusinessScreen.tsx` |

**Purpose.** The brand-side view: what was spent, what it bought, and which
creators produced it — written for someone who has to defend the number in a
meeting.

**Information hierarchy.**

1. Account switcher, campaign count and reporting period. The switcher sits in
   the header rather than the shell, because an agency operating six brands
   changes it more often than it changes screen.
2. Performance stats, with **cost per engagement** as a hero metric rather than
   a footnote: impressions are the figure agencies quote and clients discount;
   unit cost is the one that survives the meeting.
3. Active campaigns table, where budget and spend share one cell because a
   percentage is meaningless without the ceiling it is a percentage of.
4. Budget pacing — planned *and* actual on the same axis, because a single
   "spent so far" bar cannot answer "are we early or late".
5. Billing.
6. Creator roster, ranked with eCPM beside audience size.
7. Team and permissions.

The roster runs full width rather than sharing a row with the team list: at
roughly 640px — the table's minimum — eCPM, the one figure that justifies the
panel over a follower count, ended up past the edge of a horizontal scroll.

**Anatomy.** `.sy-bz__head` → `section.sy-bz__stats` →
`ScreenSection "Active campaigns"` → `.sy-bz__split` (Budget pacing with
`PacingChart`, Billing) → `ScreenSection "Creator roster"` →
`ScreenSection "Team & permissions"`.

**Responsive behaviour.**

| Container query | Fires at | Change |
|---|---|---|
| `min-width: 640px` | 758, 1016, 1248 | `.sy-bz__stats` goes from two columns to four. |
| `min-width: 960px` | 1016, 1248 | `.sy-bz__split` becomes `1.4fr / 1fr`, putting billing beside the pacing chart. |

Both tables live in `.sy-table-scroll`, so they keep their designed column
widths and scroll horizontally at 393, 412 and 758 rather than clipping
numbers.

**Key interactions (stateful).** `range` — This month / This quarter / Year to
date. The account chip, New campaign, Invite, Download PDF and the per-member
access controls are inert.

**Empty, loading and error.** None. No billing or invoicing infrastructure
exists; the invoice, VAT figure and payment method are constants.

**Accessibility.** Both tables carry visually hidden captions describing their
columns. `AvatarGroup` cells are followed by a visually hidden list of the
creator names, so the group is not just a decorative pile of faces. The pacing
legend distinguishes planned, actual and over-plan with labelled swatches, and
the note beneath states the variance in words as well as showing it.

---

## Notable divergences between name and behaviour

Recorded here so the specification is not read as a promise:

| Screen | What the name suggests | What is implemented |
|---|---|---|
| `live-studio` | Starting a broadcast | Opens mid-broadcast. The only broadcast-lifecycle control is "End broadcast"; "Go live" lives on `creator-dashboard`. |
| `digital-products` | Buying digital products | Entirely the *seller's* side: catalogue performance, a product editor and a blocking publish checklist. Buying happens on `marketplace`. |
| `premium` | A creator monetization screen (it sits in the Creator group) | A consumer subscription upsell, the only consumer-facing screen in that group. |
| `gifts` | A gift inbox or history | A catalogue and send composer. Received gifts appear on `notifications` and `inventory`. |
| `assistant` | Its own product area | Declared `group: 'Core'` in `src/screens/assistant/index.ts`, so it is documented and indexed under Core. |
| `feed` vs `home` | Interchangeable timelines | Deliberately different questions: `home` is ordered by perishability, `feed` is strictly chronological and unranked. |
| `search` | A blank search entry point | Opens on a populated result set for "design tokens"; the zero-result case is designed per facet, not per screen. |
| `chat` vs `messages` | One inbox | `messages` is the triage inbox, `chat` is a single conversation with its own pane model. |




