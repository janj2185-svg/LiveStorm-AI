# Figma handoff

The design system's source of truth is code, not a Figma file. This document
explains how to get the system *into* Figma, how to keep it in sync, and how to
build screens there that will survive implementation.

## Why code is the source of truth

Three of the system's guarantees cannot be expressed in a design tool:

1. **Colour ramps are generated**, not picked. Step 9 is solved numerically
   against WCAG luminance per family per theme. A hand-maintained Figma palette
   would drift the moment a hue changed.
2. **Contrast is build-enforced.** 82 assertions run on every build and fail it
   on regression. Figma has no equivalent gate.
3. **Layout responds to a container**, not a viewport. Figma frames cannot
   express "this screen receives 676px on a 1280px display because the shell
   spent 604px on navigation".

So Figma is the **exploration and communication surface**, and the token export
keeps it honest.

---

## 1. Importing the tokens

`design/tokens.figma.json` is emitted by `pnpm tokens` in **W3C DTCG** format.

### With Tokens Studio for Figma

1. Install the *Tokens Studio for Figma* plugin.
2. Plugin → **Tools → Load from file** → select `design/tokens.figma.json`.
3. The file contains four token sets:

| Set | Contents |
|---|---|
| `dark` | `color.*` (7 families × 12 steps) and `semantic.*` aliases |
| `light` | The same structure for the light theme |
| `dimension` | `space.*` and `radius.*` |
| `typography` | Composite type styles with family, size, line height, weight and tracking |
| `duration`, `cubicBezier` | Motion tokens |

4. Enable `dark` and `light` as **themes**, and `dimension` / `typography` /
   `duration` as **global** sets.
5. **Create Variables** to push them into Figma Variables, using `dark` and
   `light` as the two modes of a `Theme` collection.

### Colour values

Figma cannot read OKLCH, so every colour is exported as its **gamut-mapped sRGB
hex** — the value a standard display actually renders. Each token's
`$description` carries the authored OKLCH string, so the true value is never
lost:

```json
"9": {
  "$type": "color",
  "$value": "#7e6bfa",
  "$description": "iris step 9 — oklch(62.00% 0.2050 285)"
}
```

On a P3 display the implementation will look marginally more saturated than the
Figma file. That is correct and intended.

---

## 2. Building the library

Recommended file structure:

```
SYLORA — Foundations     variables, type styles, effect styles, grids
SYLORA — Components      the component library
SYLORA — Patterns        shell, navigation, layout templates
SYLORA — Product         screen designs, organised by product area
```

### Variables

| Collection | Modes | Contents |
|---|---|---|
| `Theme` | Dark, Light | All colour tokens |
| `Space` | — | The 4px scale |
| `Radius` | — | The radius scale |
| `Size` | — | Control heights, shell dimensions |

**Bind everything.** A fill picked from the colour picker rather than a variable
is a fill that will not re-theme, and it is the most common way a Figma library
falls out of step with the code.

### Effect styles

Elevation is theme-dependent, so each level needs both modes. Dark mode is a
rim highlight plus ambient occlusion; light mode is a tinted shadow. Values are
in [FOUNDATIONS.md](./FOUNDATIONS.md) §5 and in
`src/design-system/tokens/elevation.ts`.

Figma cannot express `backdrop-filter` faithfully. For glass surfaces, use a
**Background blur** effect at the recipe's blur radius plus a fill at the
recipe's alpha, and note in the layer name which recipe it represents
(`glass/panel`, `glass/veil`, `glass/dome`).

### Grids

Create layout grid styles per breakpoint from the table in
[FOUNDATIONS.md](./FOUNDATIONS.md) §6, and a **4px baseline grid** applied
everywhere. Because all line heights are absolute multiples of 4, text lands on
that grid without nudging.

---

## 3. Frame sizes

Design at these exact sizes. They are the real logical resolutions of current
reference hardware, not rounded approximations — a layout that only works at
tidy numbers has not been tested.

| Frame | Size | Reference | Safe top / bottom |
|---|---|---|---|
| iPhone | 393 × 852 | iPhone 15 Pro | 59 / 34 |
| Android | 412 × 915 | Pixel 8 Pro | 48 / 24 |
| Tablet | 834 × 1194 | iPad Pro 11″ portrait | 24 / 20 |
| Web | 1280 × 800 | Desktop browser viewport | 0 / 0 |
| Desktop | 1512 × 945 | MacBook Pro 14″ scaled | 0 / 0 |

### The content-column trap

**This is the single most important thing to get right in Figma.** The frame is
not the space your screen gets. The shell takes its chrome first:

| Device | Frame | Column, no context panel | Column, with context panel |
|---|---|---|---|
| iPhone | 393 | 393 | 393 |
| Android | 412 | 412 | 412 |
| Tablet | 834 | 758 | 758 |
| Web | 1280 | 1016 | **676** |
| Desktop | 1512 | 1248 | 908 |

With a context panel, **web at 1280 is narrower than tablet at 834**, because
the expanded posture spends 264px on the rail and 340px on the panel. 676px is
the tightest multi-column case in the product and the one most worth designing
against first.

Build the shell as a component with the rail and context panel as boolean
properties so this is visible while you work, rather than discovered in review.

### Breakpoints

Screens respond to their content column, so design decisions should change at
**560 / 840 / 880**, not at device-shaped numbers. A `768` breakpoint would fire
on neither the tablet's 758px column nor a 1280 web posture with a panel.

---

## 4. Component structure

Mirror the code so a design and its implementation share vocabulary.

| Figma component | Code | Key properties |
|---|---|---|
| `Button` | `Button` | variant, tone, size, icon, iconEnd, loading, disabled |
| `Icon button` | `IconButton` | variant, tone, size, icon |
| `Surface` | `Surface` | elevation, glass, padding, radius, interactive |
| `Badge` | `Badge` | tone, variant, size |
| `Chip` | `Chip` | selected, icon, removable, tone |
| `Avatar` | `Avatar` | size, ring, presence, verified |
| `Field / Input` | `Input` | size, state (rest/hover/focus/error/disabled), icon, trailing |
| `Tabs` | `Tabs` | variant, count, active index |
| `Stat` | `Stat` | polarity, delta direction, tone |

Use **variant properties**, not separate components, wherever the code uses a
prop. If Figma needs a component the code does not have, that is a signal the
system is missing something — raise it rather than working around it.

### Naming

Match the token names exactly: `color/iris/9`, `space/4`, `radius/lg`,
`type/title2`, `elevation/raised`. A designer saying "iris 9" and an engineer
writing `--sy-iris-9` should be describing the same thing without translation.

---

## 5. Annotating a screen for handoff

A screen is ready to build when it states:

1. **Which breakpoints it changes at**, in content-column terms, and what
   changes at each.
2. **Which components it uses**, by name, and which are new.
3. **Every state**: loading, empty, error, and the states of any control that
   holds state.
4. **What is scrollable**, and in which direction.
5. **What is fixed** versus what scrolls away.
6. **The accessible name** of every icon-only control.
7. **Any motion** beyond the catalogue in [MOTION.md](./MOTION.md).

Anything not annotated will be built from the defaults in this system — which is
usually the right outcome, and is why the defaults are documented.

---

## 6. Keeping in sync

| Direction | Process |
|---|---|
| Code → Figma | Re-run `pnpm tokens`, reload `design/tokens.figma.json` in Tokens Studio, push to Variables. Colour, space, radius, type and motion all update |
| Figma → Code | Token changes are proposed as edits to `src/design-system/tokens/*.ts`, never applied directly to CSS. The compiler regenerates everything and the contrast audit gates the change |

`src/design-system/styles/tokens.css` is generated and carries a
`DO NOT EDIT` header. Editing it directly is the one way to break the guarantee
that Figma and the product agree.

---

## 7. The gallery is the reference

Before designing a new screen, open the running gallery. Every screen renders as
real code, in both themes, in true-resolution device chrome, and each view is
deep-linkable:

```
#/<screenId>?device=<iphone|android|tablet|web|desktop>&theme=<dark|light>
```

Append `&chrome=0` to render the device alone, which is what the screenshot
pipeline uses.

A running screen answers questions a static mockup cannot: whether the layout
survives 676px, whether the focus order makes sense, whether the contrast holds
in light mode. Check there first.
