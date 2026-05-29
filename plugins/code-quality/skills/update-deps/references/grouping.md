# Grouping packages into version-locked families

The goal of grouping is **safety**, not tidiness. Packages that share a release train must move together or the build
breaks on a peer-version mismatch — even when each individual bump installs without error. Group those packages, label
the group by theme, and treat the group as a single unit for risk classification, confirmation, verification, and commit.

## The one rule that matters

> **A group = the set of packages that must be on a compatible version with each other.** Its risk level is the
> **maximum** risk of any member (a family with one major bump is a major group). Never pull a major member out of its
> family to "do it later" — the family moves together or not at all.

## Common families

Match by package-name prefix/pattern, not a hardcoded list — new packages join these families over time. These are the
families you'll see most often; detect others by the same logic (shared scope, shared release cadence, peer-dep links).

| Theme label          | Packages that move together (patterns)                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Storybook**        | `storybook`, `@storybook/*`, `eslint-plugin-storybook`, framework addons (`@chromatic-com/storybook`, etc.)            |
| **Next.js**          | `next`, `eslint-config-next`, `@next/*` (e.g. `@next/bundle-analyzer`, `@next/mdx`)                                     |
| **React**            | `react`, `react-dom`, `@types/react`, `@types/react-dom` — keep all four on the same major                             |
| **Vitest**           | `vitest`, `@vitest/*` (`@vitest/coverage-v8`, `@vitest/ui`, `@vitest/browser`)                                          |
| **Jest**             | `jest`, `@types/jest`, `ts-jest`, `babel-jest`, `jest-environment-*`                                                    |
| **Testing Library**  | `@testing-library/*` (`react`, `dom`, `user-event`, `jest-dom`)                                                        |
| **Playwright**       | `@playwright/test`, `playwright`, `playwright-core`                                                                    |
| **ESLint**           | `eslint`, `@eslint/*`, `eslint-plugin-*`, `eslint-config-*` (except `eslint-config-next` → Next group), `typescript-eslint`, `@typescript-eslint/*` |
| **TypeScript types** | `typescript` + standalone `@types/*` that don't belong to another family (`@types/node`, `@types/lodash`, …)           |
| **Tailwind**         | `tailwindcss`, `@tailwindcss/*`, `postcss`, `autoprefixer`                                                              |
| **tRPC**             | `@trpc/*`                                                                                                               |
| **Prisma**           | `prisma`, `@prisma/*`                                                                                                   |
| **Firebase**         | `firebase`, `firebase-admin`, `@firebase/*`                                                                            |

Notes:

- `@types/react` / `@types/react-dom` belong to the **React** family, not generic types — they're version-locked to the
  React major.
- `eslint-config-next` belongs to the **Next.js** family, not ESLint — it tracks the Next version.
- A standalone `@types/x` whose runtime package isn't being updated can go in the **TypeScript types** group on its own.

## Anything that isn't in a family

Leftover single packages (a lone utility like `zod`, `date-fns`, `clsx`) don't need a family. Batch them by risk:

- One **patch/minor singletons** group — low risk, update together.
- Each **major singleton** as its own group — so a breaking bump gets its own confirmation and its own rollback point.

## Ordering the groups

Process **lowest risk first**, so the safe wins are committed before you touch anything breaking:

1. `@types/*` and tooling **patch/minor** groups (types, lint, tailwind tooling)
2. Feature/runtime **patch/minor** groups (Storybook, Vitest, etc. when not majors)
3. **All major groups last**, individually — each one fetches its Context7 migration guide and pauses for confirmation.

## Small projects

If there are only a handful of outdated packages (≈ 5 or fewer) and none of them form a family, don't over-engineer it:
a single group, or one package per group, is fine. Grouping exists to manage coupling and blast radius — when there's
little of either, keep it simple.
