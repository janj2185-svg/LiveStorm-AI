# SYLORA Companion for OBS Studio

The companion is a local Python 3.12 process. It exposes a small authenticated API to the
SYLORA desktop app, speaks the official OBS WebSocket 5.x protocol, and optionally opens one
outbound WSS connection to SYLORA. It does not accept cloud-initiated network connections and
does not contain a generic OBS request proxy.

## Install and run

```bash
cd services/companion
# Debian/Ubuntu only, if venv support is absent: sudo apt install python3.12-venv
python3.12 -m venv .venv
.venv/bin/pip install -e '.[dev]'
cp .env.example .env
# Edit .env, then export it; this service intentionally does not parse dotenv files.
set -a; . ./.env; set +a
.venv/bin/sylora-companion token-rotate --show
.venv/bin/sylora-companion run
```

`token-rotate --show` is the only command that prints a secret. It prints only the newly
generated local API token, once. Run it while the companion is stopped, store the value in the
SYLORA local app, and restart the companion. Normal startup generates a token silently if one
does not exist. The OS keyring is used when available. On Linux without a usable keyring, the
service warns and uses a mode-0600 file below `STATE_DIR`, whose directory is mode 0700.

Other commands:

```bash
sylora-companion status
sylora-companion pair                 # securely prompts for the one-time pairing token
sylora-companion update-check
sylora-companion update-check --stage
```

`status` authenticates to the running local API and does not display credentials. Pairing
requires configured `CLOUD_API_URL=https://...` and `CLOUD_WS_URL=wss://...`; restart the
companion after pairing. `update-check` is unavailable unless both a trusted Ed25519 public key
and HTTPS manifest URL are configured.

The process holds an OS lock under `STATE_DIR`, writes a permission-restricted watchdog
heartbeat, and shuts down OBS/cloud sockets on SIGINT or SIGTERM through Uvicorn's graceful
shutdown.

## OBS configuration

1. Use OBS Studio 28 or newer, which includes OBS WebSocket 5.x.
2. Open **Tools → WebSocket Server Settings**.
3. Enable the WebSocket server, leave its port at `4455`, enable authentication, and choose a
   strong password.
4. Set `OBS_WS_URL=ws://127.0.0.1:4455` and put the password in `OBS_WS_PASSWORD`.
5. Keep OBS on loopback when possible. For an explicitly approved private-LAN OBS host, set
   `OBS_WS_URL` to a private IP literal such as `ws://192.168.1.50:4455`, restrict the host
   firewall to the creator machine, and prefer `wss://` when OBS is behind a trusted TLS proxy.

The password is used only for the official Hello/Identify SHA-256 plus base64 challenge
calculation. It is never sent in Identify and is never logged.

## Local HTTP API

The default base URL is `http://127.0.0.1:8765`. Every route except the two health probes
requires `Authorization: Bearer <local-token>`. WebSocket clients must also send that header;
query-string tokens are intentionally unsupported.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health/live` | Process liveness, no secrets |
| `GET` | `/health/ready` | `200` only after OBS Identify; otherwise `503` |
| `GET` | `/v1/status` | Companion, OBS, cloud, updater status |
| `GET` | `/metrics` | Authenticated Prometheus metrics |
| `GET` | `/v1/obs/version` | `GetVersion` |
| `GET` | `/v1/obs/status` | Stream, record, and virtual-camera statuses |
| `GET` | `/v1/obs/scenes` | Scene list |
| `GET`, `PUT` | `/v1/obs/scenes/current` | Get/switch program scene |
| `GET` | `/v1/obs/scenes/{scene}/items` | Scene items |
| `PUT` | `/v1/obs/scenes/{scene}/items/{id}/enabled` | Enable/disable scene item |
| `GET`, `PUT` | `/v1/obs/inputs/{input}/mute` | Get/set input mute |
| `GET`, `PUT` | `/v1/obs/inputs/{input}/volume` | Get/set multiplier or dB volume |
| `POST` | `/v1/obs/stream/start`, `/stop` | Start/stop streaming |
| `POST` | `/v1/obs/record/start`, `/stop` | Start/stop recording |
| `POST` | `/v1/obs/virtual-camera/start`, `/stop` | Start/stop virtual camera |
| `POST` | `/v1/obs/screenshots/take` | Return official source screenshot data |
| `POST` | `/v1/obs/screenshots/save` | Ask OBS to save a source screenshot |
| `GET` | `/v1/confirmations` | Pending local cloud-command confirmations |
| `POST` | `/v1/confirmations/{id}` | Approve or deny a pending command |
| `WS` | `/v1/events?since=N` | Sequenced normalized OBS events with bounded replay |

Bodies are strict JSON schemas: unknown fields, invalid types, invalid dimensions, and ambiguous
volume representations are rejected. JSON field names use lower camel case (`sceneName`,
`sceneItemId`, `inputName`, `imageFormat`, and `filePath`). OBS failures return HTTP 502 with the
official OBS status code and comment; a missing OBS connection returns 503. A successful response
is only emitted after the matching OBS response ID reports `result: true`.

## Listener and local security

`BIND_HOST` defaults to `127.0.0.1`. A non-loopback bind (including `0.0.0.0`) is refused unless
`ALLOW_LAN=true`, `TLS_CERT` and `TLS_KEY` are set, and `LAN_CIDRS` contains explicit client
networks. Requests outside those networks are rejected. Add every legitimate HTTP Host value to
`ALLOWED_HOSTS`; all others are rejected to prevent DNS rebinding. CORS responses are emitted
only for the single exact `CORS_ORIGIN`.

For example:

```bash
ALLOW_LAN=true
BIND_HOST=192.168.1.20
TLS_CERT=/secure/path/companion.crt
TLS_KEY=/secure/path/companion.key
LAN_CIDRS=192.168.1.40/32
ALLOWED_HOSTS=192.168.1.20,companion.creator.lan
CORS_ORIGIN=https://app.creator.lan
```

Use a valid certificate, firewall the port, and keep the CIDR list narrow. Request bodies default
to 64 KiB and a per-client in-memory limit defaults to 120 HTTP requests per minute. On POSIX,
the TLS private key must not be group- or world-accessible. Logs are single-line JSON and
recursively redact bearer tokens, credentials, signatures, passwords, and pairing codes.

## Cloud pairing and command policy

Without cloud configuration or a stored credential, `/v1/status` explicitly reports `unpaired`;
all local OBS control remains available. `pair` posts the user-supplied one-time token over HTTPS,
stores the returned rotating companion credential in the secure store, and later uses that
credential only for an outbound WSS connection. Redirects and plaintext cloud URLs are rejected.

Inbound command messages on that authenticated socket additionally require an HMAC-SHA256 over
canonical JSON (all fields except `signature`), a fresh timestamp, and a unique nonce. Credential
rotation messages must be signed by the old credential. Replay and stale messages are rejected.
Only these fixed actions exist: `scene.switch`, `scene_item.enable`, `input.mute`,
`input.volume`, `stream.start`, `stream.stop`, `record.start`, `record.stop`,
`virtual_camera.start`, and `virtual_camera.stop`.

No action runs unless it appears in `CLOUD_CAPABILITIES`. Actions listed in
`CONFIRMATION_ACTIONS` pause until the local authenticated confirmation API approves them or
`CONFIRMATION_TIMEOUT` expires. Stream, recording, and virtual-camera starts/stops require local
confirmation by default.

## Signed updates

The updater accepts an HTTPS JSON manifest with `version`, `platform`, `url`, `sha256`, and
base64 `signature`. The signature is Ed25519 over canonical sorted JSON of the first four fields.
`platform` must exactly match `<sys.platform>-<lowercase machine>`, the artifact URL must be
HTTPS, and the downloaded bytes must match `sha256`. The trusted raw 32-byte public key is
configured as base64 or hex in `UPDATE_PUBLIC_KEY` (or can be compiled into a packaged build).

`--stage` writes a mode-0700 artifact below `STATE_DIR/updates`; it never replaces or executes the
running binary. Staging is refused if streaming is active or OBS status cannot be checked.

## Tests and limitations

```bash
ruff check .
mypy
pytest
python -m compileall -q src tests
```

Tests use deterministic test transports; no real OBS installation is required. The production
path always uses `websockets` for OBS and cloud connections.

This implementation was **not live-verified against OBS in this environment**. It implements OBS
WebSocket RPC version 1 (protocol 5.x) from the official opcode/request contract, but an
integration run with the target OBS release is still required before release signing. Other
limitations:

- Browser WebSocket APIs cannot attach an `Authorization` header; `/v1/events` is intended for
  the native SYLORA local app, not arbitrary browser JavaScript.
- Replay, rate-limit, and pending-confirmation state is in memory and resets on restart.
- `screenshots/save` writes on the machine running OBS, using the path interpreted by OBS.
- The OBS WebSocket frame limit is 8 MiB; very large screenshot responses are rejected.
- The updater only stages a verified artifact; an installer or signed packaging layer must apply
  it after the companion exits.
- TLS certificate issuance/rotation and OS code signing are deployment responsibilities, not
  generated by this service.
