---
name: React icon className never
description: React.ElementType as icon field type causes className to resolve to `never` in JSX under React 19 + strict TypeScript.
---

**Rule:** Never use `React.ElementType` as the type for icon fields in arrays, maps, or interfaces. Use `React.ComponentType<{ className?: string }>` instead.

**Why:** `React.ElementType` is `string | React.JSXElementConstructor<any>`. Under React 19 with strict TypeScript, when TS resolves JSX props for a `React.ElementType` variable, the intersection of string-element prop types and component prop types causes `className` to narrow to `never`. Any `<Icon className="..."/>` then produces `TS2322: Type 'string' is not assignable to type 'never'`.

**How to apply:** Any place in the codebase that stores Lucide (or other) icons in a typed container:
- `Record<string, React.ElementType>` → `Record<string, React.ComponentType<{ className?: string }>>`
- `icon: React.ElementType` in an interface → `icon: React.ComponentType<{ className?: string }>`

Affected files historically: `layout.tsx` (NavItem), `dashboard.tsx` (StatCard props), `boss-battle.tsx` (attackTypeIcon), `gamification.tsx` (ICON_MAP), `moderation.tsx` (RULE_META), `ai-content.tsx` (CONTENT_TYPES).
