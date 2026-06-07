---
name: React Query Hook Patterns
description: Correct patterns for using Orval-generated React Query hooks in LiveStorm AI
---

## refetchInterval pattern
Generated query hooks wrap options in `{ query: { ... } }`. When adding `refetchInterval`, you MUST include `queryKey` too (TypeScript requires it):

```tsx
// WRONG
useGetActiveSession({ query: { refetchInterval: 5000 } })

// CORRECT
useGetActiveSession({ query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 5000 } })
```

**Why:** Orval generates hooks where the inner `query` field is typed as `UseQueryOptions`, which requires `queryKey` in some React Query versions.

## Path+body mutations (e.g. update/delete by ID)
When the OpenAPI path has `{id}` AND a request body, the generated mutation takes `{ id: number; data: BodyType<...> }` directly — no `params` wrapper:

```tsx
// WRONG
updateAutomation.mutate({ params: { id: String(id) }, data: { isEnabled } })

// CORRECT
updateAutomation.mutate({ id, data: { isEnabled } })
```

For delete (path param only):
```tsx
// CORRECT
deleteAutomation.mutate({ id })
```

**Why:** Orval flattens path params into the same level as `data` in the mutation input type.

## TypeScript project references
Before typechecking `@workspace/api-server`, always build `lib/db` first:
```bash
pnpm --filter @workspace/db exec tsc --build tsconfig.json
```
**Why:** `lib/db` uses `composite: true` and needs declaration emit before dependent packages can typecheck.
