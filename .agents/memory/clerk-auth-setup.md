---
name: Clerk Auth Setup
description: Exact patterns required for Clerk to work correctly in the Replit proxy environment
---

## Required patterns (copy verbatim)

1. Use `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` from `@clerk/react/internal`
2. Route paths must be EXACTLY `path="/sign-in/*?"` and `path="/sign-up/*?"` — never omit `/*?`
3. SignIn/SignUp must use `routing="path"` and `path={\`\${basePath}/sign-in\`}`
4. Home route: show landing to signed-out, redirect to /dashboard for signed-in — never redirect root to sign-in
5. `VITE_CLERK_PROXY_URL` is empty in dev; auto-populated in production
6. ClerkProvider must use `routerPush` and `routerReplace` with `stripBase(to)` to strip basePath
7. `@clerk/themes` provides `shadcn` theme — install separately

**Why:** The Replit proxy prefix causes standard Clerk routing to break; these patterns ensure correct path handling.
