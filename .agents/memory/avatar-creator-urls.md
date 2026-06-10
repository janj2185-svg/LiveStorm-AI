---
name: RPM and Avaturn iframe URLs
description: Both old avatar creator URLs are dead; correct URLs and SDK approach for each provider.
---

## Ready Player Me (RPM)

Old broken URL: `https://readyplayer.me/avatar?frameApi` — **deprecated, returns broken page**.

RPM now requires a registered subdomain: `https://{subdomain}.readyplayer.me/avatar?frameApi`

For public demo (no registration): `https://demo.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody`

postMessage API is unchanged — still `source:"readyplayerme"`, events `v1.frame.ready` and `v1.avatar.exported`.

**Why:** RPM shut down the bare-domain Frame API URL. All embeds now require a subdomain provisioned via studio.readyplayer.me. The `demo` subdomain is their public sandbox with no auth required.

**How to apply:** Use `demo.readyplayer.me` for the public demo. For production, the user registers their own subdomain at studio.readyplayer.me.

---

## Avaturn

Old broken URL: `https://avaturn.me/sdk/` — **HTTP 404, completely dead**.

Correct approach: install `@avaturn/sdk` npm package. Public demo subdomain: `https://demo.avaturn.dev`

```ts
import { AvaturnSDK } from "@avaturn/sdk";
const sdk = new AvaturnSDK();
await sdk.init(containerElement, { url: "https://demo.avaturn.dev" });
sdk.on("export", (data) => {
  const glbUrl = data.url; // ExportAvatarResult.url — httpURL or dataURL
});
// Cleanup:
sdk.destroy();
```

The SDK handles the iframe creation + postMessage handshake internally. Raw iframe without the SDK gives a black screen because no handshake occurs.

`ExportAvatarResult` shape: `{ url, urlType, avatarId, sessionId, avatarSupportsFaceAnimations, bodyId, gender }`

**Why:** Avaturn migrated their iframe embed to subdomain-based URLs (`{subdomain}.avaturn.dev`) and the SDK package. The old `avaturn.me/sdk/` was their legacy path and is now completely gone.

**How to apply:** Always use `@avaturn/sdk` (not raw iframe) for Avaturn. `demo` subdomain is free/public. Paid API users create their subdomain at developer.avaturn.me.
