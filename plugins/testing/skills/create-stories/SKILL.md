---
name: create-stories
description: Creates or updates the Storybook file for a React component — a CSF Next `.stories.tsx` with one story per visual state and browser-run `.test()` interaction tests. Checks the project's Storybook setup first and proposes fixes. On an existing file it adds missing states and tests, fixes convention violations (CSF 3, imported `userEvent`, test ids) and rewrites weak tests, keeping what is sound. Works with no arguments — picks the components changed in this session or the diff. Use for stories, Storybook interaction tests, `play` functions, testing a component in isolation, or fixing/migrating a `.stories.tsx` — "write stories for this component", "add interaction tests", "update the stories", "napisz storiesy", "dodaj testy w storybooku". NOT for pure functions, hooks or schemas (unit-testing), API endpoints (api-test), full-page E2E (playwright-cli), or a WCAG audit (accessibility-audit).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "[component path or name, optional] — which component to cover; without it, components changed in this session or the diff"
---

# Create Stories

A story file documents a component's states and proves its behaviour. This skill produces that file
in one shape: CSF Next, one story per visual state, independent `.test()` checks attached to those
stories, and mocks chosen by what is being faked. It works the same way whether the file is new or
already there — on an existing file it converges it onto the convention instead of starting over.

Each step loads only the reference it needs. The references hold the rules; this file holds the
procedure and the handful of rules that must never be skipped.

| Reference                                                     | Holds                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [setup.md](./references/setup.md)                             | `main.ts`, `preview.tsx`, Vitest addon, test script, preview import path — and how to check them |
| [csf-next.md](./references/csf-next.md)                       | File shape: `preview.meta` → `meta.story` → `.test()`, `title`, story naming          |
| [stories.md](./references/stories.md)                         | What becomes a story, args, the state checklist, builders for data                   |
| [testing.md](./references/testing.md)                         | `.test()` rules: queries, `canvas` vs `screen`, grouping, test names, `step()`       |
| [play.md](./references/play.md)                               | The two legitimate uses of `play`                                                    |
| [mocking.md](./references/mocking.md)                         | `fn()`, `sb.mock()`, MSW, Next.js navigation, decorators, `beforeEach` — rules and recipes |
| [quality-checklist.md](./references/quality-checklist.md)     | Violations to look for in an existing file and when to rewrite instead of patch     |
| [migration.md](./references/migration.md)                     | CSF 3 → CSF Next, by codemod or by hand                                              |
| [api-reference.md](./references/api-reference.md)             | Lookup: queries, assertions, `userEvent`, `waitFor`, element/role table              |
| [examples.md](./references/examples.md)                       | Whole worked files: Button, Form, Dialog, Select, List, Input, Card, Tabs            |

## Rules that are never skipped

These cause failures that are slow to debug. They apply in every step that writes code.

- **Never import `userEvent`, `within` or `canvas`.** Destructure `canvas`, `userEvent`, `args`,
  `step` from the `.test()` / `play` parameter. In story files import only `expect`, `fn`,
  `waitFor`, `screen`, `mocked` from `storybook/test` (`sb` belongs in `.storybook/preview` only).
- **`await` every `userEvent.*` call and every `expect(...)`.**
- **Semantic queries only** — `getByRole`, `getByLabelText`, `getByText`. Never `getByTestId` or
  `querySelector`.
- **Portal content (dialogs, tooltips, popovers, option lists) is queried with `screen`**, not
  `canvas`.
- **`.test()` for independent checks, `play` only for a demo or one dependent flow.**
- **CSF Next only** — `preview.meta()` / `meta.story()`, no `export default`, no `Meta` / `StoryObj`
  annotations. Never mix CSF 3 and CSF Next in one file.

## Steps

### 1. Pick the target

- **Argument given** → resolve it to a component file (`Glob` by name if it is not a path).
- **No argument** → collect `.tsx` components touched in this session, else `git diff --name-only`
  (staged + unstaged) against the base branch. Keep the ones that render UI. Prefer those with no
  `.stories.tsx` next to them, then those whose story file breaks the convention.
- Several candidates and no clear signal → list them and ask which ones; do not guess silently.
- Skip internal sub-components that are not exported, unless asked.

### 2. Check the Storybook setup — [setup.md](./references/setup.md)

Run the checklist in `setup.md` once per project, not per component: framework package, CSF Next
`defineMain` / `definePreview`, `features.experimentalTestSyntax`, the Vitest addon project, the
test script, and the import path existing stories use for the preview.

- **All present** → note the test command and preview import path, continue.
- **Something missing or still CSF 3** → show the exact diff `setup.md` prescribes and apply it only
  after the user accepts. Large gaps (no Storybook at all) → stop and say what is missing.
- **Running as a subagent or anywhere you cannot ask** → do not edit config files. Write stories in
  the convention, report the setup gaps in the final report, and skip step 7 if tests cannot run.

### 3. Read the component

Read the source, not just the props type. Record: props and their types, callback props, internal
state and conditional branches (loading, error, empty, disabled, …), what renders in a portal,
external dependencies (fetch, server actions, `next/navigation`, context, modules), keyboard
behaviour. These decide the stories (step 5) and the mocks.

### 4. Create or update

- **No `.stories.tsx` next to the component** → create mode, go to step 5.
- **File exists** → update mode. Read it and audit it against
  [quality-checklist.md](./references/quality-checklist.md). Classify every existing story and test:
  - **keep** — sound, matches the convention;
  - **fix** — sound intent, convention violation (CSF 3 syntax, imported `userEvent`, missing
    `await`, generic name, `getByTestId`) → correct it in place, keep the intent;
  - **rewrite** — crosses the rewrite threshold in the checklist → replace the test with one that
    covers the same behaviour properly.
  - A CSF 3 file is migrated as a whole first — [migration.md](./references/migration.md).
  - Never delete a story or test without carrying its behaviour over; nothing disappears silently.

### 5. Plan the stories — [stories.md](./references/stories.md), [csf-next.md](./references/csf-next.md)

Map the states from step 3 onto stories: different args → different story, same args → one story
with several tests. Name them per `csf-next.md`. Decide the data source (builders, via
`/builder-factory` when none exists) and the mocks per dependency ([mocking.md](./references/mocking.md)).
In update mode the plan is a delta: which states are missing.

### 6. Write the file and its tests — [testing.md](./references/testing.md), [play.md](./references/play.md)

Write or edit the `.stories.tsx` next to the component. For each story attach tests per
`testing.md`: one grouped content test, one accessibility test, one test per distinct interaction,
validation rule or callback. Use `play` only where `play.md` allows it. Copy a whole-file shape from
[examples.md](./references/examples.md) when one fits; look up signatures in
[api-reference.md](./references/api-reference.md).

### 7. Run and fix

Run the project's Storybook test command from step 2, scoped to the file (e.g.
`npx vitest --run --project=storybook <path>.stories.tsx` — `--run` avoids watch mode). Read each failure, fix the story or test —
never the component — and re-run. At most 3 attempts per failing test; then leave a `// TODO:` with
the failure reason and move on. A failure that points at a real component bug is reported, not
papered over.

### 8. Report

Per component: file path, mode (created / updated), stories added, tests kept / fixed / rewritten /
added, mocks or builders introduced, the test run result, and any setup gaps or TODOs left behind.

## Guardrails

- Never modify the component under test; never mock the component itself.
- Never edit `.storybook/` or Vitest config without the user's acceptance (step 2).
- In update mode, the user's existing intent wins over your preferred structure — converge on the
  convention, do not replace working coverage with different coverage.
- Out of scope, hand off: pure logic, hooks, schemas → `unit-testing`; route handlers → `api-test`;
  whole-page flows → `playwright-cli`; a WCAG audit → `accessibility-audit`; new data builders →
  `builder-factory`.
