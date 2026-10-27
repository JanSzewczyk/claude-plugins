# Final report template

Print this after the last group is processed. It exists to answer the user's three explicit questions: **what got
updated**, **which updates forced code changes (and what those changes were)**, and **what didn't get updated and why**.
Fill in only the sections that apply — drop empty ones rather than showing "none, none, none".

Keep it scannable. Use the exact section order below.

---

```markdown
# Dependency Update Report

**Package manager:** <npm | pnpm | yarn | bun> · **Verification:** <type-check, lint, build, tests — list what ran; note any "not available">
**Groups processed:** <N> · ✅ <updated> · ⚠️ <updated with code changes> · ⏸️ <deferred> · ❌ <failed/rolled back>

## ✅ Updated cleanly

These updated and passed all checks with no code changes. Each is its own commit.

| Group     | Package          | From    | To      | Bump  | Commit                                     |
| --------- | ---------------- | ------- | ------- | ----- | ------------------------------------------ |
| Storybook | @storybook/react | 8.3.1   | 8.4.0   | minor | `chore(deps): update storybook dependencies` |
| …         | …                | …       | …       | …     | …                                          |

## ⚠️ Updated, required code changes

The libraries below had changes that needed code migrations to keep the app working. Each entry says **why** and
**what** changed.

### <package> <old> → <new> (<bump>)
- **Why:** <the breaking/deprecating change, e.g. "renamed `foo()` to `bar()`", "config moved to flat format">
- **Files changed:** `path/a.ts`, `path/b.tsx`
- **What I changed:** <concrete description — the actual edit, not a vague summary>
- **Commit:** `chore(deps): update <x> and migrate <y>`

## ⏸️ Deferred — major bumps awaiting your go-ahead

Not applied. These are breaking and you chose to hold (or they need a decision). Migration notes from Context7 included
so you can decide.

### <package> <old> → <new> (major)
- **Breaking changes:** <bullet summary from the migration guide>
- **Estimated effort / blast radius:** <files/areas likely affected>
- **To proceed:** re-run and confirm this group, or say "apply <group>".

## ❌ Failed / rolled back

Attempted but reverted because verification couldn't be made to pass. The tree is clean for these — nothing committed.

### <package> <old> → <new> (<bump>)
- **Failed at:** <type-check | lint | build | tests>
- **Error:** <key error message>
- **Why rolled back:** <what blocked the fix>
- **Suggestion:** <e.g. "upgrade via intermediate v2 first", "wait for patch release", "needs design decision">

## 🔒 Security audit

Run after all groups were processed, against the final dependency tree.

**Vulnerabilities before → after:** critical <N→N> · high <N→N> · moderate <N→N> · low <N→N>

- **Auto-fixed:** <packages fixed within existing semver ranges, commit reference>
- **Fixed via breaking bump (confirmed):** <package old → new, commit reference>
- **Deferred (breaking bump declined):** <package, advisory summary, why held>
- **Unresolved (no fix available):** <package, advisory summary>

## Summary

<1–3 sentences: how many groups committed, anything that needs the user's attention, suggested next step.>
```

---

## Guidance

- **The ⚠️ section is the one the user cares about most** — be specific about the code changes. "Updated imports" is too
  vague; "changed `import { NextRequest } from 'next/server'` usage in 3 route handlers to await `params`" is right.
- If everything updated cleanly, the report can be just the ✅ table and a one-line summary.
- Commit hashes are nice-to-have; the commit **message** is what makes the report readable, so always include it.
