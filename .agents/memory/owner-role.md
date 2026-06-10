---
name: Owner role system
description: How the permanent owner account bypass works — DB state, middleware, and frontend badge locations.
---

## Rule
The project owner email is stored only in `artifacts/api-server/src/middlewares/featureGate.ts` as `OWNER_EMAIL` constant. All plan gates and admin gates are bypassed for this email.

**Why:** Project owner must have lifetime access to all features without any subscription.

**How to apply:**
- `OWNER_EMAIL` constant in `artifacts/api-server/src/middlewares/featureGate.ts` — single source of truth for the owner email
- `isOwner(email)` returns true when email matches; called at the top of `requirePlan()` and `requireAdmin()`
- `requirePlanOrOwner(plan)` = alias for `requirePlan(plan)` (owner bypass is built in)
- `getOrCreateUser()` in `users.ts` auto-sets `role="owner"`, `plan="studio"` for this email on every login — self-healing even if DB is modified
- DB record: `users` table, role=owner, plan=studio (seeded at project setup)
- Audit log: `platform_events` table, event_type=`owner_access_granted`
- Frontend: `UpgradeGate` checks `profile.role === "owner"` and renders children unconditionally
- Frontend: `usePlan().isOwner` and `usePlan().atLeast()` both return true for owner
- Owner badge (KeyRound icon, amber gradient) appears in: Dashboard hero, Settings header, Settings billing tab (shows "Lifetime Access" card instead of subscription UI), Admin panel header
