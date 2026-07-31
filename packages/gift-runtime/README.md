# `@sylora/gift-runtime`

Browser runtime for the backend’s strict `RuntimeManifest` v1.0. It validates
unknown fields and backend limits, performs semantic budget checks, negotiates
Three.js/Lottie fallbacks, and renders only host-mapped verified assets.

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Host contract

Construct an `AssetLoader` with backend asset metadata and short-lived download
URLs. Each descriptor must include the asset UUID, verified MIME, byte size,
SHA-256, and `verified: true`. URLs must be HTTPS or match an explicitly
trusted backend origin. The runtime verifies MIME, length, and SHA-256 before
decode and never resolves a URL from manifest content.

Pass the loader, manifest, and mount element to `GiftRenderer`. Optional host
boundaries provide localization, effect-scope elements, hook dispatch,
performance samples, and errors. Call `unlockAudioFromUserGesture()` from a
real user interaction when sound is allowed. Always call `dispose()`.

The package includes:

- strict Zod schemas matching backend v1.0;
- GLB/embedded GLTF, sprite, localized text, light, transform, and timeline
  rendering;
- seeded bounded `BufferGeometry`/`Points` emitters;
- verified restricted shader assets with compile fallback;
- Web Audio decode, loudness cap, spatial panning, mute, and gesture gating;
- quality/device/reduced-motion/no-audio fallback negotiation;
- deterministic combination and procedural parameter coordination;
- authenticated HTTP event replay, native WebSocket injection, and browser
  WebSocket authorization through a freshly requested one-time backend ticket;
- strict catalog runtime loading plus signed-download descriptor mapping from
  `/v1/gifts/catalog/{slug}/runtime` and `/v1/gifts/assets/{id}/download`;
- resize, DPR clamping, context-loss recovery, pause/resume/seek/disposal, and
  actual renderer performance counters.

`client_ai` parameters require a host `ClientAiProvider`; absence raises
`ProceduralCapabilityError`. The runtime never fabricates AI output.

Lottie, audio, models, images, shaders, and fonts are not bundled. AAA visual
quality depends on authored/licensed content and renderer/device QA outside
this package.
