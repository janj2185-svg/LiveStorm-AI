# SYLORA — Database design (foundation)

## Engine

PostgreSQL 16 with extensions:

- `pgcrypto` — UUID generation
- `citext` — case-insensitive handles/emails

## Naming conventions

- Tables: `snake_case`, plural (`users`, `sessions`)
- Primary keys: `UUID` (`gen_random_uuid()`)
- Timestamps: `created_at`, `updated_at` (UTC, `timestamptz`)
- Soft delete: `deleted_at` where applicable

## Core schemas (Phase 0–1)

### identity

| Table | Purpose |
|-------|---------|
| `users` | Account root; status, email verified |
| `user_credentials` | Password hash, OAuth subject refs |
| `sessions` | Refresh token family, device metadata |
| `mfa_factors` | TOTP/WebAuthn records |

### profile

| Table | Purpose |
|-------|---------|
| `profiles` | handle, display_name, bio, avatar_url, locale |
| `profile_links` | External links |

### social_graph

| Table | Purpose |
|-------|---------|
| `follows` | follower → followed |
| `blocks` | blocker → blocked |

### content (Phase 1)

| Table | Purpose |
|-------|---------|
| `posts` | text/media posts |
| `post_media` | media references |
| `comments` | threaded comments |
| `reactions` | polymorphic reactions |

### wallet (Phase 4)

| Table | Purpose |
|-------|---------|
| `ledger_accounts` | Per-user/asset accounts |
| `ledger_entries` | **Immutable** double-entry lines |

> Balances are **derived** from ledger entries, not stored as a single mutable number without history.

## Migrations

- Tool: Alembic
- Location: `services/platform-api/alembic/`
- Every schema change requires a migration file in git

## Indexing strategy

- Unique indexes on `users.email`, `profiles.handle`
- Composite indexes on feed queries (`posts.author_id`, `posts.created_at DESC`)
- Partial indexes for `deleted_at IS NULL`
