---
name: i18n 20-language setup
description: How the Language type, LANGUAGES array, FLAGS map, and LanguageContext work together across 20 languages including RTL.
---

## Rule
The `Language` type in `i18n.ts` is a union of 20 string literals including `"zh-TW"` (hyphen is valid in TypeScript string literal unions). Every component that declares `Record<Language, X>` must include all 20 codes or TypeScript will error.

**Known places requiring all 20 codes:**
- `src/components/layout.tsx` — `FLAGS: Record<Language, string>`
- `src/lib/i18n.ts` — `LANGUAGES` array and `translations` object
- `src/contexts/LanguageContext.tsx` — `allCodes` array in `getStoredLanguage`

## RTL
Only Arabic (`ar`) has `dir: "rtl"`. `getLanguageDir()` in `i18n.ts` returns `"rtl"` for Arabic, `"ltr"` for all others. `LanguageContext` applies `document.documentElement.dir` and `document.documentElement.lang` on every language change.

**Why:** Browser text rendering and CSS `rtl:` Tailwind variants depend on the `dir` attribute being set on `<html>`.

## DB Sync
`LanguageContext` fires `PATCH /api/users/me { uiLanguage }` on every language change (fire-and-forget, errors silently ignored). `VALID_UI_LANGUAGES` in `api-server/src/routes/users.ts` must match all 20 codes.

## Vite HMR quirk
Changing `LanguageContext.tsx` triggers a "Could not Fast Refresh — useLanguage export is incompatible" warning. This is cosmetic — the app does a full module reload automatically and recovers without manual intervention. The runtime error `useLanguage must be used within LanguageProvider` during HMR transition is transient and self-resolves.
