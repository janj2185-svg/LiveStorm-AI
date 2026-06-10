---
name: kingdoms.buildings JSONB vs kingdom_buildings table
description: Two separate write paths for kingdom buildings — one uses a JSONB array on the kingdoms table, the other uses a separate relational table. Risk of silent divergence.
---

## Rule
Before adding any new kingdom building logic, audit which path it will use and document it. Do NOT add a third path.

## Why
Two write paths co-exist:
1. `kingdoms` table (`kingdoms.ts` routes) has a `buildings` JSONB array column — read/written via `kingdoms.ts` API routes
2. `kingdom_buildings` relational table (in `gamification.ts` schema) — written by `gamificationEngine.ts` and read by `universe.ts` routes

These are separate data sources. A building can exist in one but not the other if the write paths diverge. This was not cleaned up in the second architecture pass because `kingdom_buildings` is actively used (gamificationEngine, universe routes) and removing it requires a migration.

## How to Apply
- `gamificationEngine.ts` → uses `kingdom_buildings` relational table (threshold-based building unlock)
- `universe.ts` routes → uses `kingdom_buildings` relational table (build/upgrade actions)
- `kingdoms.ts` routes → uses `kingdoms.buildings` JSONB field (read/display)
- Fix: consolidate to `kingdom_buildings` relational table; remove `kingdoms.buildings` JSONB field after migration
