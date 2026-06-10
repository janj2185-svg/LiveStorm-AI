---
name: Avaturn SDK flicker / destroy loop
description: Root cause and fix for AvaturnSDK being destroyed and recreated every ~1 second in a React effect loop.
---

## Symptom
Browser console logs `["destroy"]` 40+ times per minute. Avaturn iframe flickers and is unusable.

## Root cause chain
1. Three.js render loop in `AvatarCanvas` calls `setRendererStats()` at ~60fps.
2. This triggers a re-render of the parent (`ai-assistant`), which re-renders `AvatarCreatorModal`.
3. `handleAvaturnSuccess` was an **inline function** (no `useCallback`) → new reference on every render.
4. It was passed as the `onSuccess` prop to `AvaturnTab`.
5. `AvaturnTab` had `handleSuccess = useCallback(..., [onSuccess])` → invalidated every render.
6. `useEffect` had `[handleSuccess]` as deps → fired on every render → `sdk.destroy()` + `new AvaturnSDK()` every ~1 second.

## Fix: ref-callback pattern + empty deps

**In `AvaturnTab`** (and any SDK-owning component):
```ts
// Track callback via ref — always current, never triggers re-runs
const onSuccessRef = useRef(onSuccess);
onSuccessRef.current = onSuccess;

useEffect(() => {
  const sdk = new AvaturnSDK();
  sdk.init(container, { url }).then(() => {
    sdk.on("export", (data) => {
      onSuccessRef.current(data.url); // use ref, not closure
    });
  });
  return () => sdk.destroy();
}, []); // ← EMPTY: one init on mount, one destroy on unmount
```

**In parent (`AvatarCreatorModal`)** — wrap all callbacks:
```ts
const handleAvaturnSuccess = useCallback((url: string) => {
  setPending({ avatarUrl: url, renderer: "avaturn" });
}, []);
```

**Why:** `useEffect` deps must be stable references for SDK lifecycle effects. The ref-callback pattern decouples callback identity from effect scheduling. Parent callbacks must be wrapped in `useCallback([], [])` to prevent identity churn from re-renders triggered by unrelated state (e.g. Three.js stats).

**How to apply:** Any `useEffect` that initialises a third-party SDK (Avaturn, similar WebGL/iframe SDKs) must use empty `[]` deps and the ref-callback pattern. Never put parent-supplied callbacks in effect deps — use a ref instead.

## Also fixed: `ReadyPlayerMeTab`
Same ref-callback pattern applied to `onSuccessRef`. The `useEffect` now has only `[phase]` in its deps (so it re-registers the postMessage listener when phase changes), not `[phase, handleSuccess]`. The callback is accessed via `onSuccessRef.current` inside the listener.
