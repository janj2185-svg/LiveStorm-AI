# ARCHITECTURE_AUDIT — Project-Sylora-2

## Style

**Modular monolith** (correct for current stage). Do not split into microservices yet.

```
Browser → nginx → Next.js (Auth.js + BFF)
                      │
                      ▼
                 FastAPI /v1/*
                      │
                 PostgreSQL
```

## Auth bridge

1. User authenticates via Auth.js (database sessions).
2. Next.js BFF reads `session.user.id`.
3. BFF calls FastAPI with `X-Sylora-User-Id` + `X-Sylora-Internal-Secret`.
4. FastAPI never trusts browser-sent secrets without the BFF.

## Core domain modules (API)

| Module | Tables / concerns |
|---|---|
| Identity | `identity_profiles`, privacy enum |
| Personal AI | `personal_ai_agents`, permissions JSON, tools, context sources |
| Memory | `ai_memory_items` (tiers), export/delete |
| Activity | `ai_activities` (what/why/data used) |
| Chat | `chat_messages` |
| Knowledge | `knowledge_nodes`, `knowledge_edges` + soft delete |
| Actions | `agent_actions` + confirmation states |
| Marketplace | `marketplace_agents`, `installed_agents` |
| Developer | `developer_applications` (hashed keys) |

## Conflicts / risks

1. **Two Sylora codebases** historically (LiveStorm-AI vs this repo). This branch only evolves **Project-Sylora-2**.
2. Redis is provisioned but unused by Personal AI — keep for future queues/rate limits.
3. OpenAI is optional; local persona replies are PARTIAL, not production LLM.
4. Marketplace install does not yet run agent sandboxes — foundation only.
5. Public REST for third parties is scaffolded via developer apps keys, not full OAuth/OIDC yet.

## Design principles preserved

- One Personal AI identity (Command Center), not per-page chat clones
- Existing visual language (Fraunces + Manrope, green/gold)
- No hardcoded production secrets
- No fake “payments production”
