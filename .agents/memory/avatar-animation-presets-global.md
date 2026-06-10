---
name: Avatar animation presets global table
description: avatar_animation_presets is a global shared table with no streamerId column.
---

**Rule:** The `avatar_animation_presets` table (`lib/db/src/schema/avatar.ts`) has no `streamerId` column. It is a global, shared list of animation presets — not per-streamer.

**Why:** The schema only has: `id, name, category, description, glbUrl, previewGifUrl, durationMs, isLoop, isDefault, createdAt`. Any route querying this table must NOT filter by `streamerId` and must NOT insert `streamerId` when seeding defaults.

**How to apply:**
- `GET /api/avatar/animation-presets` → `db.query.avatarAnimationPresetsTable.findMany()` (no WHERE)
- Seed: `DEFAULT_PRESETS.map(p => ({ ...p }))` — never spread streamerId into seeds
- If per-streamer customization is needed in future, a new join table is required
