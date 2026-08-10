# SECURITY_AUDIT — SYLORA Phase 0

**Audit date:** 2026-08-10  
**Scope:** repository code + declared production gates (not a penetration test)

## Verdict

Security foundations for a modular monolith are **PARTIAL and directionally sound** (JWT rotation, RBAC, encryption helpers, fail-closed providers, CSP, rate limits, production startup checks). The product is **not** ready to accept public user data or real money. Highest risks are **misrepresentation of unfinished integrations**, **orphaned infra attack surface if deployed**, and **missing Trust & Safety / KYC** for commerce.

## Positive controls (evidence)

| Control | Path |
|---|---|
| Rotating JWT sessions, logout-all, token_version | `auth_service.py`, `AccessSession` |
| Password hashing + TOTP | `security.py`, `auth.py` |
| OAuth state/PKCE-oriented flow | `routers/oauth.py` |
| RBAC `require_permission` / `has_permission` | `dependencies.py`, `database.ROLE_MATRIX` |
| Profile/settings IDOR checks | `routers/users.py` `authorize_owner_or` |
| Fernet encryption for AI credentials/memory | `DATA_ENCRYPTION_KEY`, AI provider/memory fields |
| IP hashing key required | `IP_HASH_KEY` |
| Payment/storage/email/AI fail-closed | `payments.py`, `storage.py`, `email.py`, `ai_providers.py` |
| Live webhook signature verify + dedupe | `live_service.accept_webhook`, tests |
| FakeTikTokTransport forbidden outside tests | `test_tiktok_live.py` |
| Security headers / CSP | `middleware.py` |
| Production rejects weak config | `config.py` / README production section |
| Gitleaks config | `.gitleaks.toml` |
| Diagnostics refuse to return secrets | `routers/diagnostics.py`, `test_stand.py` |
| Rate limits on AI/live/admin/business | `rate_limit.py`, routers |
| Audit events | `SecurityAuditEvent`, admin audit APIs |
| Companion binds loopback by default | `services/companion` |

## Security gaps

### Critical (before public / money)

| Gap | Evidence | Impact |
|---|---|---|
| No real PSP + KYC/KYB | `UnconfiguredPaymentProvider`; roadmap KYC only | Cannot safely take/store value or payout |
| Test-stand auto-verify / sandbox wallet | `test_stand.py`, `stand_provisioning.py` | Dangerous if enabled in production |
| Live platforms without approved credentials | TikTok blocked; others stub/unconfigured | Fake “connected” risk if UI mislabels |
| No content provenance / deepfake labeling | no C2PA | AI/media abuse attribution gap |
| Moderation lacks case/appeals dual-control | reports exist; no case workflow | Unsafe at scale UGC |

### High

| Gap | Evidence | Impact |
|---|---|---|
| Kafka/ES/Milvus exposed in Compose without app authz model | `infrastructure/compose/compose.yml` | Extra network services with no product ACL story |
| Object storage / SMTP / OIDC secrets owner-gated | `.env.example`, EXTERNAL_CAPABILITIES | Misconfigured deploy → outage or plaintext risk |
| AI tool execution can mutate user profile/settings/posts | `ai_service.TOOL_SPECS` | Prompt-injection → unwanted mutations if autopilot mis-set |
| Emotion/persona prompts influence model behavior | `sylora_persona.py` | Jailbreak / policy bypass needs eval harness |
| No passkeys; OAuth providers often unconfigured | `oauth.py` | Weaker auth options for consumers |
| Mobile push absent | no APNs/FCM | Limits secure device messaging channels |
| Certificate/PDF renderer unconfigured | `UnconfiguredCertificateRenderer` | Fake credentials risk if UI claimed issuance |

### Medium

| Gap | Evidence | Impact |
|---|---|---|
| Search is naive `ILIKE` | `routers/social.py` | Enumeration / perf abuse (mitigated partly by auth+limits) |
| Process-local AI event hub | `AIEventHub` | Multi-instance fan-out incomplete |
| Gallery fixtures show “verified” creators | `src/screens/data.ts` | Social-engineering if confused with product |
| Admin Flutter surface depth | `features/admin/` | Privileged UX may lag API controls |
| Observability docs warn not to log secrets — enforce via review | `OBSERVABILITY.md` | Operational leakage |

### Low / hygiene

- Stale docs claiming gallery-only or over-complete platform confuse security reviewers  
- Example invalid production hostnames in K8s must never be “fixed” with real secrets in git  
- Untracked local screenshots/webp in workspace should stay out of git  

## Threat themes for AI-native vision

1. **Prompt injection → tool abuse** — tools that write social/profile state need stricter confirmation UX and allowlists.  
2. **Live cohost harassment** — SafetyPolicy exists; still needs provider moderation + human escalation.  
3. **Memory privacy** — encrypted_at_rest memory is good; export/delete paths must stay complete under personalization.  
4. **Agent marketplace (future)** — do not ship third-party agents without capability manifests, sandbox, and billing isolation.  
5. **AI-to-AI economy (future)** — ledger is necessary but not sufficient; needs fraud, rate, and settlement finality design.

## What NOT to claim

- “Enterprise-ready security”  
- “Production Trust & Safety”  
- “Verified live platform integrations” without provider approval records  
- “Payment-secure” while PSP is unconfigured  

## Immediate security hardening backlog (modular monolith)

1. Ensure `TEST_STAND_*` / sandbox wallet flags cannot enable in `ENVIRONMENT=production`.  
2. Add explicit integration status to Flutter Live UI (BLOCKED/SPEC/unconfigured) — never “connected” without capability snapshot.  
3. Require step-up confirmation for medium/high AI tools; keep autopilot low-risk only.  
4. Do not deploy Kafka/ES/Milvus until ACL + network policy + product use exist.  
5. Document and test account export/delete completeness for AI memory + live viewer memory.  
6. Add moderation case schema before opening public UGC.  
