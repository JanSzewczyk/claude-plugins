# Canonical rules — source of truth

Every `.md` file in this folder (except this `README.md`) is a canonical `.claude/rules/`
file distributable to any repository via the `sync-rules` skill. Subfolders are preserved on
sync (e.g. `frontend/api-style.md` lands at `.claude/rules/frontend/api-style.md`), so use them
to mirror the grouping described in the
[rules docs](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/).

## Current rules

| File | Scope (`paths:`) | Covers |
|------|-------------------|--------|
| `code-style.md` | unscoped (applies everywhere) | Function declarations, React namespace import, `Array<Type>`, ternary conditional rendering, enum const objects, list keys |
| `db-patterns.md` | `**/server/**/*.ts` | Drizzle ORM + PostgreSQL (Supabase) canonical DB/service layer patterns |
| `nextjs-page-layout-patterns.md` | `app/**/*.{ts,tsx}` | `page.tsx` / `layout.tsx` structure for the Next.js App Router |
| `feature-architecture.md` | `features/**/*.{ts,tsx}` | `features/<domain>/` directory structure, server/client boundary, layer rules |

`sync-rules` never assumes a rule applies just because it exists here — the skill judges
relevance against the target repo's stack and asks the user to approve before writing anything.
Unscoped rules (no `paths:`) load into every session once synced, so keep them short and truly
universal; anything stack-specific should carry a `paths:` scope.

## Editing a rule

1. Edit or add a `.md` file here (add `paths:` frontmatter unless the rule is meant to load
   unconditionally).
2. Commit and push to this repository.
3. Every consuming repo re-evaluates the change and re-approves it next time someone runs
   `/sync-rules` there — nothing pushes automatically.

## Adding a new rule

Create `<topic>.md` (or `<team>/<topic>.md`) here and add a row to the table above.
`sync-rules` will surface it as a candidate in every repo that doesn't already have a
same-named file; existing unrelated files are never touched.

Do not hand-edit files inside a consumer's `.claude/rules/` once they're synced — edits made
there are treated as local drift and `sync-rules` will refuse to overwrite them without
explicit re-approval (`--force`). Fix the rule here instead so the fix propagates everywhere.
