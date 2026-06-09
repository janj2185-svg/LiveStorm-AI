---
name: Pricing plan type narrowing
description: TypeScript narrowing bug when using typeof PLANS[0] as a function parameter type with nullable fields.
---

## Rule
When passing a plan from an array where some elements have `priceId: null` and others have `priceId: "some_string"`:

**Wrong:**
```typescript
const handleUpgrade = async (plan: typeof PLANS[0]) => {
  if (!plan.priceId) return;
  // plan.priceId is now `never` — TS sees PLANS[0] as the free plan with priceId: null
```

**Correct:**
```typescript
const handleUpgrade = async (plan: (typeof PLANS)[number]) => {
  if (!plan.priceId) return;
  const basePriceId = plan.priceId as string; // safe: guard proved it's truthy
```

**Why:** `typeof PLANS[0]` gives the type of the first element (free plan where `priceId` is `null`). TypeScript narrows `null` through the truthiness guard to `never`. `(typeof PLANS)[number]` gives the union of all element types, making `priceId: string | null`, which narrows correctly to `string` after the guard. The `as string` cast is still needed because TypeScript can't always track the narrowing across the `??` operator chain.
