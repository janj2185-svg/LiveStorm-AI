# Living Avatar — Liora

Photoreal female presence for the SYLORA AI assistant and live co-host.

## What it is

- Persona stills in `public/avatar/` (neutral, smile, speak, listen, think, blink)
- `PhysiologyEngine` — human blink cadence, breath, saccades, head micro-motion, speech envelope
- `LivingAvatar` React component — expression cross-fade + overlays
- Reaction vocabulary aligned with `AvatarController.react`: `idle`, `listen`, `talk`, `wave`, `gift_react`, `glance`, `thinking`, `smile`
- Gallery screen `#/living-avatar` and Assistant chrome integration

## Usage

```tsx
import { LivingAvatar } from '../design-system/avatar';

<LivingAvatar reaction="listen" size="hero" showIdentity />
<LivingAvatar reaction="talk" audioLevel={ttsAmplitude} size="sm" />
```

Feed real TTS amplitude into `audioLevel` (0…1) for production lip-sync. Without it, talk mode synthesises a natural syllable envelope.

## Co-host bridge

```ts
import { livingAvatarBridge } from '../design-system/avatar';

livingAvatarBridge.setReaction('gift_react');
livingAvatarBridge.setAudioLevel(0.62);
```

## Honesty

This is a high-fidelity **presence layer** (photoreal stills + physiology), not a generative video provider. Full peer-indistinguishable video streaming still requires a configured avatar/video provider on the API capability boundary.
