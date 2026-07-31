# SYLORA Gift Studio

Gift Studio is a Vite/React authoring client for the backend `RuntimeManifest`
v1.0 contract. It uses the real `/v1/gifts/author/*`, review, moderation,
catalog category, asset download, and signed object-storage APIs. It contains
no catalog fixtures, demo gift, bundled media, fake API, or local save
simulation.

## Setup

Requirements: Node.js 20 or newer, npm, a deployed SYLORA API, an authenticated
user, and configured S3-compatible gift storage.

```bash
cd packages/gift-runtime
npm install
npm run build

cd ../../apps/gift-studio
npm install
npm run dev
```

Production verification:

```bash
npm run typecheck
npm test
npm run build
```

`@sylora/gift-runtime` is linked from `../../packages/gift-runtime`. Studio
scripts build that dependency first, so no root workspace configuration is
required.

## Authentication and launcher setup

The API base and bearer token are supplied at runtime. There are no credentials
or API URLs in source. Manual developer entry keeps the bearer token only in a
closure-backed `MemoryToken`; it never writes tokens, manifests, IDs, or upload
grants to `localStorage`, `sessionStorage`, IndexedDB, URLs, or service workers.
Refreshing or ending the session clears the token.

For a trusted launcher, configure a comma-separated build-time origin
allowlist:

```bash
VITE_TRUSTED_LAUNCHER_ORIGINS=https://creator.example,https://admin.example npm run dev
```

The Studio posts:

```json
{ "type": "sylora:gift-studio:ready" }
```

to each allowed opener/parent origin. The launcher replies from the same window
and an allowlisted origin:

```json
{
  "type": "sylora:gift-studio:session",
  "apiBase": "https://api.example",
  "token": "<one-time bearer token>",
  "definitionId": "<optional UUID>",
  "versionId": "<optional UUID>"
}
```

The launcher should issue a narrowly scoped, short-lived token and remove it
from its own memory after the `sylora:gift-studio:accepted` acknowledgement.
Production API bases must be HTTPS. HTTP is accepted only for `localhost` and
`127.0.0.1`.

## API workflow and permissions

The UI calls these backend capabilities:

| Workflow | Endpoint family | Required permission |
| --- | --- | --- |
| Browse author categories/projects/versions/assets | `GET /v1/gifts/author/*` | `gifts:author` |
| Create categories/definitions/versions | `/v1/gifts/author/*` | `gifts:author` |
| Patch draft manifest and upload/complete assets | `/v1/gifts/author/*` | `gifts:author` plus authorship, or backend publisher override |
| Submit a draft | `/v1/gifts/author/versions/{id}/submit` | `gifts:author` |
| Validate review content | `/v1/gifts/review/versions/{id}/validate` | `gifts:review` |
| Publish or retire | `/v1/gifts/review/versions/{id}/*` | `gifts:publish` |
| Emergency retirement | `/v1/gifts/moderation/versions/{id}/emergency-retire` | `gifts:moderate` |
| Load a published runtime and signed assets | `/v1/gifts/catalog/{slug}/runtime`, `/v1/gifts/assets/{id}/download` | authenticated and eligible user |
| Issue a one-time browser event ticket | `POST /v1/gifts/events/ticket` | authenticated user |

Backend RFC7807 errors, including RBAC, immutable-state, validation, storage, and
ultra-premium separation failures, are shown without being converted into a
success state. Autosave is debounced and reports “Saved” only after the patch
response. If an API deployment returns an `ETag`, Studio sends it as
`If-Match`; the current backend does not emit an `ETag`, so its draft-state and
409 protections are the available conflict boundary.

Studio lists real authoring definitions, filters by lifecycle, fetches all
versions for the selected definition, and fetches the selected version and its
asset records. Launcher definition/version IDs use the same GET endpoints.
Nothing is synthesized when a list is empty.

The supported bootstrap sequence is:

1. Create or select a definition.
2. `POST` an empty draft version with `{}`.
3. Request signed uploads, PUT bytes, and complete backend verification.
4. Build/import the strict manifest from the returned asset UUIDs.
5. `PATCH` the manifest, wait for the confirmed save, then submit.

Manifest save is disabled until a version exists. The submit action remains
disabled until a strict manifest has been persisted by the backend.

## File support

Every import is size-checked (backend maximum 100 MiB), signature/structure
checked, and SHA-256 hashed with Web Crypto before requesting an upload:

- `.glb`: GLB 2 container; recommended for self-contained browser rendering.
- `.gltf`: GLTF 2 JSON with embedded `data:` resources only. External resource
  URLs are rejected.
- `.png`, `.jpg`, `.jpeg`, `.webp`: sprite/particle images with magic-byte
  checks.
- `.json`: Lottie JSON containing a version and layers array.
- `.wav`, `.ogg`, `.mp3`, `.m4a`, `.mp4`: audio with container signature
  checks. Authors must supply measured `peak_dbfs`.
- `.glsl`, `.vert`, `.frag`: verified shader text, maximum 64 KiB and requiring
  a `main` function. Shader code is never entered inline in Studio. Runtime
  accepts an optional `// @sylora vertex` section followed by
  `// @sylora fragment`; fragment-only files use the runtime’s restricted
  default vertex shader.
- `.blend`: uploaded only as `source` platform/quality metadata. Blender source
  is never rendered or executed in the browser.

SVG and externally linked GLTF are intentionally unsupported because active
content and secondary URLs would bypass the verified asset mapping.

## Security and runtime behavior

- Asset bytes are fetched only by asset ID through host-provided, verified
  metadata and signed HTTPS/backend URLs. Manifest strings are never treated
  as executable URLs.
- Signed PUT requests receive only backend-required headers and never receive
  the bearer token.
- Cache entries include schema version, asset ID, and SHA-256. Fetched bytes
  are MIME/size checked and SHA-256 verified before decode.
- GLSL comes only from a verified shader asset. Restricted directives and
  operations are rejected; compile errors replace the material and surface an
  error.
- Audio uses Web Audio gain caps and HRTF panning. Autoplay remains pending
  until a user gesture. No sound is bundled.
- Reduced-motion, low-end, and no-audio selection uses declared fallback
  assets and verified MIME metadata. If no compatible renderer exists, preview
  fails explicitly.
- Preview hook buttons are labelled **Local preview event**. They call only the
  local renderer hook and never send, purchase, deliver, combine, or mutate a
  ledger.
- Browser live events request a short-lived, one-time ticket through
  authenticated `POST /v1/gifts/events/ticket`, then connect once to
  `/v1/ws/gifts?ticket=…&since=…`. The bearer token is never put in the
  WebSocket URL. Authenticated HTTP replay remains available.

## Content quality

State-of-the-art/AAA content itself is not bundled. Achieving that quality
requires authored or licensed assets, Blender/DCC production, material and
shader review, audio mastering, performance capture, renderer QA, and physical
device validation across each declared target and quality tier. Passing this
Studio’s schema and budget checks does not replace those content and device QA
programs.
