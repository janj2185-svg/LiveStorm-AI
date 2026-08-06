# SYLORA — Security & threat model (foundation)

## Threat model (STRIDE summary)

| Threat | Mitigation |
|--------|------------|
| Spoofing | JWT + session rotation; MFA; OAuth state parameter |
| Tampering | HTTPS; signed webhooks; immutable ledger |
| Repudiation | Audit logs for admin and financial actions |
| Information disclosure | RBAC; object-level auth; no secrets in logs |
| Denial of service | Rate limiting; upload size caps; queue backpressure |
| Elevation of privilege | Role checks on every admin route |

## Authentication

- Passwords: Argon2id (via passlib)
- Access tokens: short-lived JWT
- Refresh tokens: stored hashed, rotation on use, family revocation
- Web: httpOnly secure cookies optional; mobile uses bearer

## Authorization

- **RBAC** for platform roles (`user`, `creator`, `moderator`, `admin`)
- **Object-level** checks: users can only mutate owned resources
- Admin actions require `admin` role + audit log entry

## Input validation

- Pydantic models on all API inputs
- HTML stripped from user text fields
- Media uploads: MIME sniff + size limits + virus scan hook (Phase 2)

## AI-specific

- Tool execution requires explicit user grant per scope
- Prompt injection defenses on AI Host (system prompt isolation, tool allowlist)
- Memory stored only with consent flags

## Secrets

- Never commit `.env`, keys, or tokens
- Use `.env.example` with required variable names only
- Production: secret manager (not env files on disk)

## Dependency security

- `pip-audit` / `npm audit` in CI
- Pin major versions in lockfiles
