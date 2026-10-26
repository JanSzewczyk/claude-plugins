---
name: create-stories
description: Creates or updates the Storybook file for a React component — a CSF Next `.stories.tsx` with one story per visual state and browser-run `.test()` interaction tests; on an existing file it fills missing states and fixes convention violations instead of starting over. Works with no arguments — picks the components changed in this session or the diff. Use for any test of a React component (`.tsx`) — "test this component", "add tests for Button.tsx", "write stories", "add interaction tests", "update the stories", "fix the stories" — and, unasked, right after a component is created or changed without a `.stories.tsx`, or when a story test fails. For a batch of many components, delegate to the storybook-tester agent. NOT for pure functions, hooks or schemas (unit-testing), API endpoints (api-test), full-page E2E (playwright-cli / true-dom-tester), a WCAG audit (accessibility-audit), or mock data alone (builder-factory).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git diff:*), Bash(git merge-base:*), Bash(npx vitest:*), Bash(npm run:*), Bash(npx storybook:*)
argument-hint: "[component path(s) or name(s), optional] — which components to cover; without it, components changed in this session or the git diff"
---

# Create Stories

A story file documents a component's states and proves its behaviour. This skill produces that file
in one shape: CSF Next, one story per visual state, independent `.test()` checks attached to those
stories, and mocks chosen by what is being faked. It works the same way whether the file is new or
already there — on an existing file it converges it onto the convention instead of starting over.

Each step loads only the reference it needs. The references hold the rules; this file holds the
procedure and the handful of rules that must never be skipped.

| Reference                                                     | Read it when                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [setup.md](./references/setup.md)                             | step 2 — what `main.ts`, `preview.tsx`, the Vitest addon and the test script must contain |
| [csf-next.md](./references/csf-next.md)                       | step 5 — file shape, file name, `title`                                              |
| [stories.md](./references/stories.md)                         | step 5 — which states become stories, story naming, args, builders for data          |
| [mocking.md](./references/mocking.md)                         | step 5 — choosing a mock per dependency, then the one recipe you need                 |
| [testing.md](./references/testing.md)                         | step 6 — `.test()` rules, queries, `canvas` vs `screen`, grouping, `step()`, `play`  |
| [quality-checklist.md](./references/quality-checklist.md)     | step 4 — auditing an existing file: keep, fix or rewrite                            |
| [migration.md](./references/migration.md)                     | step 4 — the file is still CSF 3                                                     |
| [examples.md](./references/examples.md)                       | step 6 — one worked file (LoginForm) and what to test per component kind             |
| [api-reference.md](./references/api-reference.md)             | any time — test context, element/role table, imports                                 |

## Prerequisites

| Tool                                    | Check                     | If missing                                                       |
| --------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| git (target discovery)                  | `git --version`           | pass the component as an argument instead                        |
| Storybook ≥ 10 with a Vite framework    | `npx storybook --version` | `npm create storybook@latest` — the user's call, never run unasked |
| Vitest ≥ 3 + `@storybook/addon-vitest`  | `npx vitest --version`    | `npx storybook add @storybook/addon-vitest` (after acceptance)   |
| Playwright Chromium (browser mode)      | `npx playwright --version`| `npx playwright install chromium`                                |
| `msw` + `msw-storybook-addon` — only if the component makes HTTP requests | `npm ls msw` | `npm i -D msw msw-storybook-addon` (after acceptance) |
| `mimicry-js` — only if builders are used | `npm ls mimicry-js`      | via the `builder-factory` skill                                  |

## Rules that are never skipped

Each one causes a failure that is slow to trace back. They apply in every step that writes code.

- **Never import `userEvent`, `within` or `canvas`** — destructure `canvas`, `userEvent`, `args`,
  `step` from the `.test()` / `play` parameter. The injected `userEvent` is bound to this story's
  canvas and recorded in the Interactions panel; an imported one is not, and its timing drifts. In
  story files import only `expect`, `fn`, `waitFor`, `screen`, `mocked` from `storybook/test` (`sb`
  belongs in `.storybook/preview` only).
- **`await` every `userEvent.*` call and every `expect(...)`** — a missing `await` lets the test
  finish before the assertion runs, so it passes while proving nothing.
- **Semantic queries only** — `getByRole`, `getByLabelText`, `getByText`, never `getByTestId` or
  `querySelector`: they test what a user or screen reader perceives and survive markup refactors.
- **Portal content is queried with `screen`, not `canvas`** — dialogs, tooltips, popovers and option
  lists render into `document.body`, outside the story root `canvas` is scoped to. Anything that
  opens as an overlay is a portal until proven otherwise.
- **`.test()` for independent checks, `play` only for a demo or one dependent flow** — in `play` the
  first failing assertion hides all later ones and turns the story red in the docs.
- **CSF Next only, never mixed with CSF 3 in one file** — `preview.meta()` / `meta.story()`, no
  `export default`, no `Meta` / `StoryObj` annotations; `.test()` exists only on CSF Next stories.

## Steps

Step 2 runs once per project. Steps 3–7 run per component, finishing one before starting the next.
Step 8 reports all of them together.

### 1. Pick the target

- **Argument given** → resolve each name or path to a component file (`Glob` by name if it is not a
  path).
- **No argument** → collect `.tsx` components touched in this session, else
  `git diff --name-only $(git merge-base HEAD origin/HEAD)` — committed on this branch plus
  uncommitted work; use `main` in place of `origin/HEAD` when it is unset. Keep the files that render
  UI. Prefer those with no `.stories.tsx` next to them, then those whose story file breaks the
  convention.
- Several candidates and no clear signal → list them and ask which ones. When you cannot ask
  (running as a subagent), cover every candidate that has no story file, in diff order, and list the
  rest in the report as skipped.
- Skip internal sub-components that are not exported, unless asked.

### 2. Check the Storybook setup — [setup.md](./references/setup.md)

Read `setup.md` and inspect each file its checklist names — do not run its fix commands yet:
framework package, CSF Next `defineMain` / `definePreview`, `features.experimentalTestSyntax`, the
Vitest addon project, the test script, and the import path existing stories use for the preview.

- **All present** → note the test command and preview import path, continue.
- **Something missing or still CSF 3** → show the exact diff `setup.md` prescribes and apply it only
  after the user accepts. Large gaps (no Storybook at all) → stop and say what is missing.
- **Running as a subagent or anywhere you cannot ask** → do not edit config files. Write stories in
  the convention anyway — CSF Next is the target even when the project is not there yet — and skip
  step 7 if tests cannot run. When the gap is CSF Next itself (no `definePreview`), open the report
  with a line saying the story files will not load until the setup diff is applied, and include that
  diff.

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
  - A CSF 3 file is migrated as a whole first, by hand per [migration.md](./references/migration.md);
    use the codemod only when it can be scoped to this one file. Then classify the migrated file
    again before adding anything.
  - Never delete a story or test without carrying its behaviour over; nothing disappears silently.

### 5. Plan the stories — [csf-next.md](./references/csf-next.md), [stories.md](./references/stories.md), [mocking.md](./references/mocking.md)

Map the states from step 3 onto stories: different args → different story, same args → one story
with several tests. Name them per `csf-next.md`. For typed data, reuse an existing builder or create
one with the `builder-factory` skill — never hand-roll a factory inside the story file. Pick the mock
per dependency from the table at the top of `mocking.md`, then read only that recipe. In update mode
the plan is a delta: which states are missing.

### 6. Write the file and its tests — [testing.md](./references/testing.md)

Write or edit the `.stories.tsx` next to the component. For each story attach tests per
`testing.md`: one grouped content test, one accessibility test, one test per distinct interaction,
validation rule or callback. Use `play` only where `testing.md` allows it. Check
[examples.md](./references/examples.md) for what to cover for this kind of component and for the
worked file shape; look up the test context and element
roles in [api-reference.md](./references/api-reference.md).

### 7. Run and fix

Run the project's Storybook test command from step 2, scoped to the file (e.g.
`npx vitest --run --project=storybook <path>.stories.tsx` — `--run` avoids watch mode). Read each
failure, fix the story or test — never the component — and re-run. At most 3 attempts per failing
test, then leave a `// TODO:` with the failure reason and move on: past three attempts a fix is
usually guessing at the component or the environment, and a clear TODO costs the user less. Stop at
once when the failure is environmental (missing browser, config error) rather than in the test. A
failure that points at a real component bug is reported, not papered over.

### 8. Report

Per component: file path, mode (created / updated), stories added, tests kept / fixed / rewritten /
added, mocks or builders introduced, the test run result, and any setup gaps or TODOs left behind.

## Guardrails

- Never modify the component under test; never mock the component itself.
- Never edit `.storybook/` or Vitest config without the user's acceptance (step 2).
- In update mode, the user's existing intent wins over your preferred structure — converge on the
  convention, do not replace working coverage with different coverage.
- Out of scope, hand off: pure logic, hooks, schemas → `unit-testing`; route handlers → `api-test`;
  whole-page flows → `playwright-cli` / `true-dom-tester`; a WCAG audit → `accessibility-audit`.
