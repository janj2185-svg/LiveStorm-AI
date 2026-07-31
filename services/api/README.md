# SYLORA API

FastAPI modular-monolith foundation for SYLORA identity, account security, RBAC,
profiles, first-party social networking, persisted messaging, and account
settings. PostgreSQL and Redis are required at runtime.
SQLite is accepted only when `ENVIRONMENT=test`.

## Local setup

Run these commands from the repository root:

```bash
cd services/api
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[test]"
cp .env.example .env
```

Generate independent values for the three secret settings and place only their
outputs in `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use the outputs for `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `IP_HASH_KEY`,
respectively. Configure `DATABASE_URL` for PostgreSQL, `REDIS_URL` for Redis,
and the `SMTP_*` values for a real SMTP receiver. Mailpit is valid for local
development when it is running and the configured host/port reach it. The API
does not emulate email delivery.

Create an empty PostgreSQL database, then apply the schema:

```bash
cd services/api
source .venv/bin/activate
alembic upgrade head
```

Start the API:

```bash
cd services/api
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Start an outbox drain from a worker process or scheduler:

```bash
cd services/api
source .venv/bin/activate
python -m app.cli drain-outbox --limit 50
```

The command sends due messages using SMTP and records retry attempts with
exponential backoff. `app.email.celery_drain_outbox` is an async callable that
can be wrapped by a Celery task without changing email behavior.

## Tests and compilation

Tests create isolated SQLite databases and an in-process Redis behavior double.
They do not alter product runtime configuration or simulate external provider
success.

```bash
cd services/api
source .venv/bin/activate
python -m pytest
python -m compileall app
```

To validate the migration against a disposable database, point `.env` at that
database and run:

```bash
alembic upgrade head
alembic downgrade base
alembic upgrade head
```

## Production configuration

`ENVIRONMENT=production` rejects startup unless:

- `DATABASE_URL` is PostgreSQL and `REDIS_URL` is Redis.
- `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `IP_HASH_KEY` are explicitly set.
- JWT issuer/audience values identify the deployment.
- SMTP host/from values are configured.
- CORS origins and trusted hosts are explicit and do not contain wildcards.
- `WEB_BASE_URL` is HTTPS and is not localhost.

Startup verifies PostgreSQL and Redis, then idempotently seeds the built-in
`user`, `creator`, `business`, `moderator`, and `admin` roles and their minimal
permission matrix. If either dependency is unavailable, startup fails.
`/health/live` reports process liveness, `/health/ready` checks both
dependencies, and `/metrics` exposes Prometheus request counts and latency.

OAuth providers are configured by name:

```dotenv
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration
OAUTH_GOOGLE_REDIRECT_URI=https://api.sylora.example/v1/auth/oauth/google/callback
OAUTH_GOOGLE_SCOPES=openid email profile
```

The provider must expose valid OIDC discovery metadata. The callback validates
state, PKCE, nonce, signature, issuer, audience, expiry, subject, and verified
email before linking or creating an identity. An unconfigured provider returns
an explicit `oauth_provider_unavailable` response; it never reports simulated
success.

## Security model

Access tokens are short-lived bearer JWTs supplied only in the
`Authorization` header. Refresh tokens are opaque 256-bit values; only SHA-256
hashes are stored, and every use rotates the token. Reuse revokes the entire
rotation family. Access authentication checks the database session, account
status, and user token version on every request.

Because the API does not authenticate with cookies, browsers do not
automatically attach API credentials and ordinary cookie-CSRF does not apply.
OAuth requires one short-lived `HttpOnly`, `Secure`, `SameSite=Lax` state
cookie; the callback verifies that cookie, the query state, nonce, and PKCE.

Verification and reset records store token hashes only. The durable email
outbox contains the message needed for later SMTP delivery and must receive the
same database access controls and encryption-at-rest policy as other sensitive
production data. Tokens, TOTP secrets, recovery codes, passwords, and message
bodies are never written to application logs.

## Social and messaging API

Authenticated social APIs are mounted at `/v1/social`. They cover public
handles and privacy-aware profiles, follows and follow requests, canonical
friendships, blocks and mutes, communities and channels, memberships and roles,
posts and feeds, polls, comments, reactions, reposts, bookmarks, search,
notifications, reports, and the RBAC-protected moderation queue. Feed,
notification, report, and post listing cursors are signed and opaque.

Authenticated messaging APIs are mounted at `/v1/messages`. Direct
conversations use one canonical pair key and non-friend conversations enter a
message-request state. Message and channel history use signed cursor
pagination. Message bodies and attachments, edits, soft deletion, delivery/read
receipts, and user-specific transport events are durable database records.
`/v1/ws/messages` accepts an access token only through the
`Authorization: Bearer` header, subscribes the socket only to that authenticated
user, supports replay through its signed `since` cursor, and uses a bounded
outgoing queue.

Media and message attachment references are metadata only. They must use
`https://` or `s3://bucket/key`; this service does not accept binary uploads.
Bodies are treated as plain text and HTML markup is rejected.

Search currently uses portable SQL `ILIKE`, including the SQLite behavior used
by tests. For larger PostgreSQL deployments, migrate the same authorization
predicates into indexed `tsvector` queries before changing ranking. At a scale
where an external search index is justified, publish committed content changes
through an outbox into Elasticsearch/OpenSearch and reapply privacy, community,
and block filters at query time. No Elasticsearch integration is currently
active.

WebSocket queues and connection bookkeeping are intentionally process-local;
the database remains the source of truth and every transport event is committed
before publication. Multi-replica deployments require Redis Streams, Kafka, or
equivalent fan-out plus consumer recovery to deliver committed events to
sockets attached to other replicas. No cross-replica Kafka/Redis fan-out is
currently implemented. Recommendation scoring is also local SQL/application
logic, transparently combining followed authors, joined communities, category
affinity, and recency; it is not represented as an AI model.
