# Quality Checklist — Auditing an Existing Story File

Used in update mode (step 4). Read the existing file, score each story and test against the lists
below, then classify it **keep**, **fix** or **rewrite**. Nothing is removed without its behaviour
being carried over.

## File-level

| Check                                                         | If it fails                                   |
| ------------------------------------------------------------- | --------------------------------------------- |
| CSF Next (`preview.meta` / `meta.story`, no default export)   | migrate the whole file first (`migration.md`) |
| Mixed CSF 3 and CSF Next in one file                          | migrate the whole file                        |
| Preview imported via the project's preview path               | fix the import                                |
| `title` human-readable and in the project's grouping          | fix                                           |
| Callback props mocked with `fn()` in `meta.args`              | fix                                           |
| Mocks match what is faked (MSW for network, `sb.mock` for modules, decorators for context) | fix |
| No `sb.mock()` inside the story file                          | move to `.storybook/preview` (with approval)  |
| Every state from the component analysis has a story           | add the missing stories                       |

## Story-level

| Violation                                                     | Class   |
| ------------------------------------------------------------- | ------- |
| Generic name (`Default`, `Basic`, `Example`, `Test1`)         | fix     |
| Behaviour name (`ClickTest`, `TabNavigation`) — rename after the state | fix |
| Story that exists only to hold a test (same args as another)  | fix — fold its checks into `.test()` on the real story |
| Inline literal data where a builder exists                    | fix     |
| Values asserted on come from random generation               | fix     |

## Test-level — fix in place

Sound intent, wrong form. Correct the form, keep the behaviour under test.

- `userEvent` / `within` imported instead of destructured
- missing `await` on `userEvent` or `expect`
- `getByTestId` / `querySelector` where a semantic query exists
- `getBy*` used for an absence check (should be `queryBy*`)
- `getBy*` for content that appears asynchronously (should be `findBy*` / `waitFor`)
- `canvas` used for portal content (should be `screen`)
- independent assertions in `play` → split into `.test()` calls
- vague test name (`"works"`, `"Validation"`)
- one test per text node → merge into one content test

## Test-level — rewrite threshold

Rewrite the test (same behaviour, new body) instead of patching when **any** of these is true:

1. It asserts implementation, not behaviour — internal state, class names with no user meaning,
   snapshot of markup, call order of internal functions.
2. It cannot fail — no assertion, or assertions that hold whatever the component does.
3. It depends on another test having run first, or on shared mutable state.
4. It hits the real network or real modules where a mock is required.
5. It accumulates **3 or more** fix-in-place violations from the list above — patching would touch
   most of its lines anyway.
6. It is flaky for a structural reason (fixed `setTimeout` sleeps, racing an animation with `getBy*`).

When rewriting, preserve the name if it was good and the scenario it covered. If the original
intent is unclear, keep the test, mark it `// TODO: unclear intent — <what it seems to check>`, and
list it in the report rather than guessing.

## Report categories

Every story and test lands in exactly one bucket in the final report: **kept**, **fixed**,
**rewritten**, **added**, or **merged into <target>** (for folded stories / split `play`).
