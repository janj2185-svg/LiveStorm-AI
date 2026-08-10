# Sylora (Project-Sylora-2)

Independent Sylora repository — AI-native ecosystem foundations. Separate from LiveStorm-AI.

**Product core:** Human + Personal AI + Digital Identity + Knowledge + Creator/Business economy + Developer ecosystem.

## Stack

- Next.js + Auth.js (Google/GitHub)
- FastAPI modular monolith (`/v1/*` ecosystem APIs)
- Postgres 16 + Redis
- nginx TLS edge

## Quick start

```bash
cp .env.example .env
# set AUTH_*, INTERNAL_API_SECRET, optionally OPENAI_API_KEY
docker compose up -d --build
```

## Surfaces

| Path | Purpose |
|---|---|
| `/` | Landing + living Sylora |
| `/login` | OAuth |
| `/app` | Command Center (Personal AI) |
| `/app/identity` | SYLORA Identity |
| `/app/memory` | Memory controls |
| `/app/knowledge` | Knowledge Graph |
| `/app/marketplace` | Agent Marketplace |
| `/app/developer` | Developer apps |
| `/app/permissions` | Permissions + Action Engine |
| `/health` | API health |

## Docs

- Phase 0 audit: `docs/phase0/`
- Final honesty report: `docs/implementation/FINAL_IMPLEMENTATION_REPORT.md`
- Future protocol: `docs/architecture/SYLORA_PROTOCOL.md`

## API tests

```bash
cd services/api
pip install -r requirements.txt
pytest -q
```
