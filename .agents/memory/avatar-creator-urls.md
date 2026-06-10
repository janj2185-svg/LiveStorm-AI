---
name: RPM and Avaturn iframe URLs
description: Both old avatar creator URLs are dead; correct URLs, DNS facts, and SDK approach for each provider.
---

## Ready Player Me (RPM)

Old broken URL: `https://readyplayer.me/avatar?frameApi` — **deprecated, returns broken page**.

RPM now requires a registered partner subdomain: `https://{subdomain}.readyplayer.me/avatar?frameApi`

**`demo.readyplayer.me` does NOT resolve in DNS** — confirmed from both Replit server (`Could not resolve host`) and user's browser. It is only a placeholder in RPM docs/npm README, not a live deployment.

The `@readyplayerme/react-avatar-creator` npm package uses `demo` as its default fallback value but that domain does not exist. Every partner must register at https://studio.readyplayer.me to get a real subdomain (free tier available).

**Fix implemented**: Subdomain config UI — user enters their subdomain once, saved to `localStorage` key `livestorm_rpm_subdomain`. Once set, iframe loads `https://{subdomain}.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody`. postMessage events unchanged: `v1.frame.ready` and `v1.avatar.exported`.

**Why:** RPM removed the public demo subdomain access. No workaround exists without a registered partner app.

**How to apply:** Always require the user to enter their own RPM subdomain. Never assume `demo` or any other subdomain exists. Link to https://studio.readyplayer.me for registration.

---

## Avaturn

Old broken URL: `https://avaturn.me/sdk/` — **HTTP 404, completely dead**.

Current approach: `@avaturn/sdk` npm package with `https://demo.avaturn.dev`

**`demo.avaturn.dev` requires a free Avaturn account** — visiting it shows a login/signup screen. This is expected; users sign up for free inside the iframe, then use the avatar creator.

```ts
import { AvaturnSDK } from "@avaturn/sdk";
const sdk = new AvaturnSDK();
await sdk.init(containerElement, { url: "https://demo.avaturn.dev" });
sdk.on("export", (data) => {
  const glbUrl = data.url; // ExportAvatarResult.url
  // urlType is 'httpURL' (CDN) or 'dataURL' (base64 GLB)
});
sdk.destroy(); // cleanup on unmount
```

`ExportAvatarResult` shape: `{ url, urlType, avatarId, sessionId, avatarSupportsFaceAnimations, bodyId, gender }`

**AvatarCanvas isRpmUrl detection** must include ALL Avaturn CDN variants:
- `avatarUrl.includes("avaturn.me")` — covers api.avaturn.me, hub.avaturn.me, etc.
- `avatarUrl.includes("avaturn.dev")` — covers demo.avaturn.dev CDN exports
- `avatarUrl.startsWith("data:model/gltf")` — dataURL fallback
- `avatarUrl.startsWith("data:application/octet-stream")` — dataURL alt format

Old patterns `startsWith("https://api.avaturn.me")` and `startsWith("https://avaturn.me")` are too narrow — exports from `demo.avaturn.dev` use different CDN paths.

**Why:** Avaturn migrated entirely to subdomain-based URLs (`{subdomain}.avaturn.dev`). The SDK package handles iframe + postMessage handshake; raw iframe gives black screen (no handshake). The `demo` subdomain is their free/public demo requiring account signup.

**How to apply:** Always use `@avaturn/sdk` (not raw iframe). Show "free account required" note. In AvatarCanvas use broad `includes("avaturn")` matching.
