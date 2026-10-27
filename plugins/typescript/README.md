# typescript

TypeScript and JavaScript tooling — Vitest unit tests, `mimicry-js` test data builders and their rules, coverage-gap ranking, dead-code sweeps with Knip, and safe npm dependency updates. The language layer that the `react` and `nextjs` plugins build on.

## Contents

### Agents

| Agent               | Description                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **unit-tester**     | Writes Vitest unit tests for utilities, Zod schemas, hooks, and Server Actions (with mocked dependencies). Phased, autonomous, SDD-aware — derives cases from acceptance criteria. |
| **library-updater** | Update npm packages safely — investigate breaking changes, execute migrations, verify quality (type-check, lint, build, test) after updates.                                       |

### Skills

| Skill                | Invoke with       | Description                                                                                                                                                     |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **unit-testing**     | `/unit-testing`   | Vitest unit tests for TypeScript — mocking, async testing, parameterized tests, server action testing, coverage                                                 |
| **builder-factory**  | `/builder-factory` | Test data builders with `mimicry-js` and Faker for any TypeScript interface or type — traits, overrides, field mappings |
| **coverage-gaps**    | `/coverage-gaps`  | Finds and ranks the coverage gaps that matter — weights uncovered branches, critical paths, and git churn over line percentages                                 |
| **dead-code**        | `/dead-code`      | Find unused files, exports, types, and dependencies via Knip's reachability graph; rank by confidence, propose safe removal                                     |
| **update-deps**      | `/update-deps`    | Update npm dependencies in sequential, theme-grouped batches; verify + commit each group on its own branch, pause on majors, then open a PR with the full report |
| **builder-rules-ts** | — (preloaded)     | Generated background knowledge: test data builder rules for TypeScript and `mimicry-js`, preloaded by the testing agents                                        |

`builder-rules-ts`, the `references/rules.md` files and the `BEGIN:knowledge` blocks in
`unit-testing` and `builder-factory` are generated from `knowledge/` at the repo root. Edit the notes there and run the
`knowledge-dev` build; never edit the generated files.

## Installation

```bash
/plugin install typescript@szum-tech
```

This also installs the **testing** core (`playwright-cli`), which `library-updater` preloads.

## Usage

**Write unit tests** for non-UI logic:

> "Use unit-tester to write tests for src/utils/format-currency.ts"

The `unit-tester` works in four phases (analyze → implement → run → optimize), mocks only at
module boundaries, runs `npm run test:unit` and self-corrects. In an SDD flow it derives test cases
from the PRD acceptance criteria and reports coverage back to the `product-owner`.

**Update a dependency:**

> "Use library-updater to update React Hook Form to the latest version"

**Skills** — invoke directly:

> `/builder-factory` — create a typed builder for a type
> `/coverage-gaps` — rank what is untested and worth testing first
> `/dead-code` — find unused files, exports and dependencies
> `/update-deps` — update all outdated packages in verified batches

## Tech Stack Compatibility

| Technology | Minimum Version |
| ---------- | --------------- |
| TypeScript | 5.7+            |

## Troubleshooting

| Problem                                                         | Solution                                                                                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| library-updater breaks after update                             | Run `npm run type-check && npm run lint && npm run build` to identify issues. Revert with `git checkout -- package.json package-lock.json && npm install` |
| dead-code flags Next.js `page.tsx`/`layout.tsx` etc. as unused  | Configure Knip's Next.js plugin (or a `knip.json` with the right `entry` globs) so framework files are excluded before ranking                             |
| Knip errors out on the project                                  | Usually a missing/misconfigured `entry`/`project` glob in `knip.json` — fix the config rather than falling back to a manual scan                          |
| Builder factories produce wrong data                            | Check that your builder uses functions `() => ...` for values that must be unique per instance                                                           |
| coverage-gaps finds no report                                   | Generate one with `npm run test:unit -- --coverage --coverage.reporter=json`                                                                              |

## Related Plugins

- [**testing**](../testing/) — technology-agnostic testing core this plugin depends on
- [**react**](../react/) — React layer built on top of this one
- [**nextjs**](../nextjs/) — Next.js layer built on top of `react`
- [**python**](../python/) — the equivalent language layer for Python
