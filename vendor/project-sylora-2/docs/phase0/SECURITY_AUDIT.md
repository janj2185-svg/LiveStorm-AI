# SECURITY_AUDIT — Project-Sylora-2

## Strengths

- Auth.js database sessions with httpOnly cookies
- BFF pattern: internal secret not shipped to client bundles as a public API key for end users
- Developer API keys stored as SHA-256 digests; raw key returned once
- Action Engine blocks `EXECUTE_ALLOWED` without permission
- Knowledge soft-delete fields prepared for retention policies
- No production secrets committed; `.env.example` documents required vars

## Gaps (honest)

| Risk | Severity | Mitigation plan |
|---|---|---|
| `INTERNAL_API_SECRET` default in dev | Medium | Force non-default in production deploy docs |
| No object-level auth beyond user_id ownership checks | Medium | Expand ABAC on shared resources |
| No rate limiting on chat / actions | High for abuse | Redis token bucket (Stage 7) |
| Prompt injection on tool use | High when tools execute | Tool allowlist + confirmation (partial now) |
| Marketplace agents not sandboxed | High | Stage 2 runtime isolation |
| CSRF on cookie session for state-changing BFF | Medium | SameSite=lax + Auth.js; review for custom forms |
| File upload / SSRF | N/A yet | When adding uploads/webhooks |
| Multi-tenant org isolation | N/A yet | Business OS stage |
| Admin routes | Missing | Must ship with server auth, not UI-only |

## AI-specific

- Chat without `OPENAI_API_KEY` never pretends to be a remote model (`provider: local_persona`)
- Activity log records `data_used` + `permission_snapshot`
- Critical actions default to confirmation
