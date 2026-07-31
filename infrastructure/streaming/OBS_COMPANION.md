# OBS WebSocket local companion boundary

SYLORA's hosted API must not attempt to connect directly to OBS on a user's
LAN. NAT, host firewalls, and tenant isolation make inbound control unreliable
and unsafe. The production control path is a separately distributed, signed
local companion:

1. The user enrolls the companion with a short-lived, single-use device code.
2. The companion creates a device key pair and opens an outbound TLS WebSocket
   connection to a SYLORA companion gateway.
3. SYLORA signs narrowly scoped commands for that device. The companion checks
   the signature, tenant, device, expiry, nonce, and monotonically increasing
   sequence before dispatch.
4. The companion translates allowed commands to OBS WebSocket 5.x requests at
   `ws://127.0.0.1:4455`.
5. Results and an audit event return over the existing outbound connection.

This repository adds the media plane and the architecture contract only. It
does not ship or claim an implemented companion or gateway.

## Local OBS boundary

- Bind OBS WebSocket to loopback only. Do not expose port `4455` on a LAN,
  router, tunnel, or public interface.
- Enable OBS WebSocket authentication and use a unique high-entropy password.
  The companion stores it in the operating-system credential store, never in a
  SYLORA cloud database, log, crash report, or command payload.
- The companion pins its OBS destination to `127.0.0.1:4455`; configuration
  must not accept arbitrary hosts or ports.
- Keep the companion unprivileged. It needs no inbound listener, shell
  execution, browser-cookie access, or filesystem access outside its own
  settings and credential-store records.

## Command and token policy

Commands use a versioned envelope containing device ID, tenant ID, command
type, constrained arguments, issued-at time, expiry no more than 60 seconds in
the future, nonce, and sequence. The device verifies an asymmetric SYLORA
signature before applying an allowlisted OBS request such as start/stop
streaming, start/stop recording, scene selection, or status retrieval.
Arbitrary OBS vendor requests, local file paths, scripts, and process launch
are not accepted.

Device access tokens are short lived and refreshed over the authenticated
outbound channel. Rotate device keys with an overlap window in which the old
and new public keys are both registered; retire the old key immediately after
the new key is confirmed. A server-side revocation closes the socket and
prevents refresh. Re-enrollment is required after device reset, credential
loss, suspicious nonce reuse, or tenant transfer.

## Threat model

| Threat | Required control |
|---|---|
| Internet scanning of OBS | Loopback-only OBS bind and no inbound companion port |
| Stolen cloud access token | Short expiry, device-bound key proof, revocation |
| Replayed start/stop command | Signed expiry, nonce cache, monotonic sequence |
| Cross-tenant command | Tenant and device claims checked before dispatch |
| Malicious command arguments | Explicit command schema and action allowlist |
| Compromised SYLORA database | Private device key and OBS password remain local |
| Compromised local account | OS credential store, least privilege, auditable re-enrollment |
| Downgrade or binary replacement | Signed packages, verified updates, rollback protection |

Production packages should be code-signed per operating system and updates
should be fetched over TLS from an authenticated channel. Log command IDs and
outcomes, but never OBS passwords, media keys, device private keys, or signed
token bodies.
