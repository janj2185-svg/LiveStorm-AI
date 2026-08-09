# @sylora/avatar-runtime

Living-avatar life simulation for SYLORA's AI co-host **Liora**.

The engine does not render pixels. It produces a continuous `AvatarPose` every
frame: breath, blinks (including double / asymmetric), saccadic gaze, head
micro-motion, gesture curves, expression plate weights, and viseme lip-sync.

## Reactions (shared with Live Hub)

`idle` · `listen` · `talk` · `wave` · `nod` · `glance` · `gift_react` · `think` · `smile`

These match `DialogueScheduler` `avatar_reaction` values and
`LocalAvatarLifeController` on the API.

## Usage

```ts
import { AvatarLifeEngine } from "@sylora/avatar-runtime";

const life = new AvatarLifeEngine({ seed: 7 });
life.react("listen");
const duration = life.speak({ text: "Привіт, я Ліора." });
requestAnimationFrame(function frame(now) {
  life.tick(1 / 60);
  // drive LivingAvatar / OBS overlay from life.pose
  requestAnimationFrame(frame);
});
```

## Persona

Default persona is **Liora** — feminine presentation, she/her, warm mid-alto
voice hint. Photoreal expression plates live in `src/assets/avatar/liora/`.
