# SYLORA production infrastructure

**Target host:** Hetzner Cloud, Ubuntu 24.04  
**Stack:** Docker Compose · PostgreSQL 16 · Redis 7 · Caddy HTTPS · Cloudflare DNS · Cloudflare R2 (S3)  
**Canon app:** SYLORA (PR #7 lineage)

> **URL status:** not live until you provide a Hetzner server + Cloudflare domain + secrets.  
> This package is production-ready to deploy; Cursor’s VM is not a permanent host.

---

## 1. URL

| Field | Value |
|---|---|
| Public URL | `https://${DOMAIN}` (you choose, e.g. `https://app.sylora.dev`) |
| Health | `https://${DOMAIN}/health/live` · `https://${DOMAIN}/health/ready` |
| API | `https://${DOMAIN}/v1/...` |
| Status until deploy | **BLOCKED — owner hosting credentials required** |

After deploy, open the URL on a phone over **mobile data** before announcing.

---

## 2. Deploy instructions (Hetzner)

### A. Cloudflare DNS
1. Create A/AAAA record for `DOMAIN` → Hetzner server IP.
2. Pick one TLS path:
   - **DNS-01 (recommended with orange cloud):** create API token `Zone.DNS:Edit`, set `CLOUDFLARE_API_TOKEN` in `.env`.
   - **HTTP-01:** keep record **DNS-only** until first cert issues; Cloudflare SSL mode **Full**; then you may enable proxy.

### B. Cloudflare R2
1. Create buckets `sylora-app` and `sylora-backups`.
2. Create R2 API token with object read/write.
3. Endpoint form: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

### C. VPS bootstrap
```bash
# as root on Hetzner Ubuntu 24.04
bash infrastructure/production/install-host.sh
su - sylora
git clone <YOUR_REPO_URL> sylora && cd sylora
git checkout cursor/sylora-public-https-stand-fc9f   # or main after merge
```

### D. Secrets + first deploy
```bash
cd infrastructure/production
./generate-secrets.sh
# edit .env: DOMAIN, ACME_EMAIL, SMTP_*, S3_*/R2, CLOUDFLARE_API_TOKEN
./deploy.sh
```

### E. Verify
```bash
curl -fsS https://$DOMAIN/health/ready
# optional multi-tester script if APP_ENVIRONMENT=staging with TEST_STAND_*:
# ../public-stand/verify-external.sh https://$DOMAIN
```

---

## 3. Environment variables

See `.env.example`. Groups:

| Group | Keys |
|---|---|
| Identity | `DOMAIN`, `ACME_EMAIL`, `CLOUDFLARE_API_TOKEN` |
| Mode | `APP_ENVIRONMENT` (`production` \| `staging`), `IMAGE_TAG` |
| DB/Redis | `POSTGRES_*`, `REDIS_PASSWORD`, `REDIS_MAXMEMORY` |
| Crypto | `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `IP_HASH_KEY`, `JWT_AUDIENCE` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, `SMTP_USERNAME`, `SMTP_PASSWORD`, TLS flags |
| R2/S3 | `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| Backups | `BACKUP_S3_*`, `BACKUP_RETENTION_DAYS`, `BACKUP_INTERVAL_SECONDS` |
| Optional | `OPENAI_API_KEY`, `BOOTSTRAP_SOFT_PING` |
| Beta only (`APP_ENVIRONMENT=staging`) | `TEST_STAND_*` |

**Rules**
- Never commit `.env`.
- `APP_ENVIRONMENT=production` requires SMTP and forbids `TEST_STAND_MODE=true`.
- For open beta with auto-verify + sandbox credits on this same infra: set `APP_ENVIRONMENT=staging` and enable `TEST_STAND_*`.

---

## 4. Architecture

```text
                    Internet / Cloudflare DNS (+ optional proxy)
                                      │
                                      ▼
                         ┌────────────────────┐
                         │  Caddy :443/:80    │  Let's Encrypt
                         │  HTTPS terminate   │  HTTP-01 or DNS-01 (CF)
                         └─────────┬──────────┘
                    /v1 /health    │     static SPA
                         ┌─────────┴──────────┐
                         ▼                    ▼
                  ┌────────────┐       ┌────────────┐
                  │ api :8000  │◄─────►│ api2 :8000 │  round-robin + health
                  └──────┬─────┘       └──────┬─────┘
                         │                    │
                         ▼                    ▼
                  ┌────────────┐       ┌────────────┐
                  │ Postgres 16│       │  Redis 7   │  named volumes
                  └──────┬─────┘       └────────────┘
                         │
                         ▼
                  ┌────────────┐       ┌────────────┐
                  │ backup job │──────►│ Cloudflare │
                  │ (every 6h) │       │ R2 buckets │  app + backups
                  └────────────┘       └────────────┘

Flutter web build → volume web-dist → Caddy file_server
Logs: json-file (50m×7) per container + Caddy access log volume
Restart: unless-stopped on all long-running services
```

---

## 5. Zero-downtime update

```bash
cd infrastructure/production
git pull
./update.sh
```

What it does:
1. Build new API image  
2. `alembic upgrade head`  
3. Recreate **api** while **api2** still serves  
4. Health-check api  
5. Recreate **api2**  
6. Rebuild Flutter web into `web-dist`  
7. `caddy reload`  

Caddy load-balances `api` + `api2` with `/health/ready` checks, so clients keep HTTPS connectivity during the roll.

---

## 6. Backup & restore

### Automatic backups
The `backup` service runs `backup-postgres.sh` on an interval (default **6 hours**) and uploads encrypted/plain custom-format dumps to R2 (`BACKUP_S3_BUCKET` / prefix). Retention: `BACKUP_RETENTION_DAYS` (default 14).

Manual:
```bash
./backup-now.sh
docker compose logs -f backup
```

### Restore
```bash
# List objects in R2 (aws cli with endpoint), then:
RESTORE_CONFIRMATION="RESTORE sylora" \
  ./restore.sh .env s3://sylora-backups/postgres/sylora/sylora_YYYYMMDDThhmmssZ.dump
```
API replicas are stopped during restore (short write downtime), then restarted.

---

## Operations cheat-sheet

| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Logs | `docker compose logs -f api api2 caddy` |
| Backup now | `./backup-now.sh` |
| Rolling update | `./update.sh` |
| Tear down (DANGER) | `docker compose down` (add `-v` only if wiping volumes) |

---

## Owner checklist before a live URL exists

1. Hetzner CX22/CX32 (or larger) Ubuntu 24.04 + SSH  
2. Cloudflare domain + DNS  
3. R2 buckets + access keys  
4. SMTP provider (production) **or** staging+TEST_STAND for beta  
5. Fill `.env` (never paste secrets into chat/Issues)
