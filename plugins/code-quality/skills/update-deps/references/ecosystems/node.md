# Node profile

**Status: verified.** Covers npm, pnpm, yarn and bun.

## Tool detection

Pick the package manager from the lockfile and use it consistently:

| Lockfile                 | Tool |
| ------------------------ | ---- |
| `package-lock.json`      | npm  |
| `pnpm-lock.yaml`         | pnpm |
| `yarn.lock`              | yarn |
| `bun.lock`, `bun.lockb`  | bun  |

## Verification

Read the `"scripts"` block in `package.json` and map each check to what exists. Note the missing ones as "not available" in the report.

| Check      | Look for                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type-check | `type-check`, `typecheck`, `tsc`, or fall back to `npx tsc --noEmit`                                                                             |
| Lint       | `lint`, `eslint`                                                                                                                                 |
| Build      | `build`                                                                                                                                          |
| Tests      | `test`, `test:ci`, `test:unit`. **Disable watch mode** or the run hangs: append `--run` (Vitest), `--watchAll=false` / `--ci` (Jest), or set `CI=true` |

## Outdated

Run the manager's outdated command in JSON form, e.g. `npm outdated --json`. It exits non-zero when anything is outdated, so capture the output anyway. Parse current, wanted and latest for every dependency.

## Apply

Preserve each entry's semver range operator (`^`, `~`, or exact) and its dependency section (`--save-dev` for devDependencies). One install command for the whole group is fine.

## Rollback

```bash
git checkout -- package.json <lockfile>
```

Then reinstall to restore the tree. In a workspace, restore every `package.json` the group touched.

## Audit

| Tool | Audit                 | Non-breaking auto-fix |
| ---- | --------------------- | --------------------- |
| npm  | `npm audit --json`    | `npm audit fix`       |
| pnpm | `pnpm audit --json`   | `pnpm audit --fix`    |
| yarn | `yarn npm audit --json` | `yarn npm audit fix`, where available |

The auto-fix only moves packages within existing semver ranges, so it needs no confirmation. Anything that needs `--force` goes through the breaking path in SKILL.md.

## Families

Match by package-name pattern, not a fixed list: new packages join these families over time. Detect others by the same logic (shared scope, shared release cadence, peer-dependency links).

| Theme label          | Packages that move together (patterns)                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storybook**        | `storybook`, `@storybook/*`, `eslint-plugin-storybook`, framework addons (`@chromatic-com/storybook`, etc.)                                         |
| **Next.js**          | `next`, `eslint-config-next`, `@next/*` (e.g. `@next/bundle-analyzer`, `@next/mdx`)                                                                 |
| **React**            | `react`, `react-dom`, `@types/react`, `@types/react-dom`: keep all four on the same major                                                           |
| **Vitest**           | `vitest`, `@vitest/*` (`@vitest/coverage-v8`, `@vitest/ui`, `@vitest/browser`)                                                                      |
| **Jest**             | `jest`, `@types/jest`, `ts-jest`, `babel-jest`, `jest-environment-*`                                                                                |
| **Testing Library**  | `@testing-library/*` (`react`, `dom`, `user-event`, `jest-dom`)                                                                                     |
| **Playwright**       | `@playwright/test`, `playwright`, `playwright-core`                                                                                                 |
| **ESLint**           | `eslint`, `@eslint/*`, `eslint-plugin-*`, `eslint-config-*` (except `eslint-config-next` → Next group), `typescript-eslint`, `@typescript-eslint/*` |
| **TypeScript types** | `typescript` + standalone `@types/*` that don't belong to another family (`@types/node`, `@types/lodash`, …)                                        |
| **Tailwind**         | `tailwindcss`, `@tailwindcss/*`, `postcss`, `autoprefixer`                                                                                          |
| **tRPC**             | `@trpc/*`                                                                                                                                           |
| **Prisma**           | `prisma`, `@prisma/*`                                                                                                                               |
| **Firebase**         | `firebase`, `firebase-admin`, `@firebase/*`                                                                                                         |

- `@types/react` and `@types/react-dom` belong to **React**, not generic types: they are version-locked to the React major.
- `eslint-config-next` belongs to **Next.js**, not ESLint: it tracks the Next version.
- A standalone `@types/x` whose runtime package isn't being updated can go in **TypeScript types** on its own.

Lowest-risk groups here are `@types/*` and tooling (types, lint, Tailwind tooling).

## Edge cases

- **Workspaces**: update a dependency consistently across packages and respect the workspace tool.
- **`patch-package` or other patches**: don't clobber custom patches; flag it if a bump invalidates one.
- **Peer-dependency warnings after install**: investigate before verifying. They usually mean a sibling package needs to move into the same group.
