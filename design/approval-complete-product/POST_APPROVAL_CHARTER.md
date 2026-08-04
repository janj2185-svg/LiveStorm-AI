# SYLORA — Post-Approval Implementation Charter

**Gate:** Wait for owner reply `APPROVE ALL` (or `APPROVE WITH CHANGES`) on the design package in this folder.  
**After approval:** Begin continuous full implementation without pausing after each module. Stop only for **major architectural decisions**.

## Non-negotiable outcomes

1. Match approved designs as closely as technically possible (boards 00–19).
2. One cohesive ecosystem — not disconnected modules.
3. Alive UI: premium motion, glass OS language, fluid interactions, performance-safe effects.
4. Production-ready: security, monitoring, logging, backups, error reporting, scalability.
5. Parallel multi-platform from one Flutter codebase:
   - Android · iOS · Web · Windows · macOS · Linux
6. Every screen responsive across phone / tablet / desktop sizes.
7. Third-party services: integrate fully when reasonably priced; never leave half-wired stubs. If keys/accounts/payment are required, tell the owner exactly what to buy/configure.
8. Contribute improvements that fit the vision; ask before direction-changing architecture.

## Architecture locks (from approved design)

- Gifts: send only in Live / Video / Guest / Multi-host / Voice Rooms; Gift Shop = buy/manage only.
- Messages = calls hub (voice, video, screen share, AI translation, group A/V, conference).
- Media stack production UI: camera, mic, audio routing, OBS, virtual camera, stream, record.
- Music = first-class module + integrated player.
- Aura = heart of SYLORA (alive: memory, emotion, voice, avatar, multi-role).

## Decision policy

| Kind | Action |
|------|--------|
| Major architecture (provider lock-in, data residency, billing model, Live IdP that needs legal approval, replacing MediaMTX, etc.) | Ask owner first |
| Smaller technical choices (libraries, folder structure, animation curves, caching, indexes) | Choose best professional option |

## Completion bar

Full manual audit of modules, pages, buttons, animations, APIs, DB, AI, streaming, payments, devices, responsive layouts, performance, security — then fix everything found. Complete only when stable and production-ready.
