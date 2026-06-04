---
name: storybook-testing
description:
  Create Storybook stories with browser-rendered interaction tests for React UI components using CSF Next format and
  .test() method. Covers visual states, user interactions (clicks, typing, hover), form validation UI, and component
  accessibility in isolation. Use when testing React component rendering, UI interactions, visual states, or documenting
  component behavior in Storybook. Trigger this skill whenever the user mentions Storybook, stories, CSF Next,
  component interaction tests, .test() method, or wants to test a React UI component in isolation. NOT for unit testing
  pure functions/hooks (use unit-testing), API endpoints (use api-test), or full E2E page flows (use playwright-cli).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Storybook Testing Skill

Generate Storybook stories with interaction tests for React components using **Storybook 10+ CSF Next format** and the
`.test()` method.

This file is the **complete rule set** — everything you need to write correct stories lives here. Open a reference file
only when you need the thing it holds:

> - [references/api-reference.md](./references/api-reference.md) — exact signatures: every query, assertion, `userEvent`
>   method, factory option, import path, plus a common-element table (which roles render in portals; dialog/toast/loading
>   patterns). The lookup when you forget an API or how a specific element behaves.
> - [references/mocking.md](./references/mocking.md) — copy-paste recipes for each mock mechanism (`fn()`, `sb.mock()`,
>   MSW REST/GraphQL, Next.js navigation, Context decorators, builders, `beforeEach`).
> - [references/examples.md](./references/examples.md) — full worked `.stories.tsx` files and per-component-type
>   templates (Button, Form, Dialog, Select, List, Input, Card, Tabs). Reach for these when you want a whole file to adapt.

## When to Use This Skill vs Others

| Scenario                                               | Use This Skill? | Alternative           |
| ------------------------------------------------------ | --------------- | --------------------- |
| Test React component UI rendering and interactions     | YES             | —                     |
| Test form validation UI (error messages, field states) | YES             | —                     |
| Test component visual states (loading, error, empty)   | YES             | —                     |
| Test design system component behavior                  | YES             | —                     |
| Test pure utility functions (formatCurrency, etc.)     | NO              | `unit-testing`        |
| Test server actions or API logic                       | NO              | `unit-testing`        |
| Test hooks (useDebounce, etc.) in isolation            | NO              | `unit-testing`        |
| Test Zod schemas or validation logic                   | NO              | `unit-testing`        |
| Test API endpoints / route handlers                    | NO              | `api-test`            |
| Perform WCAG accessibility audit                       | NO              | `accessibility-audit` |
| Create mock data builders                              | NO              | `builder-factory`     |

## Workflow

1. **Analyze the component** — props, interactions, states, callbacks, conditional rendering.
2. **Create the story file** — same directory as the component: `component.stories.tsx`.
3. **Write minimal stories** — 1–2 stories per distinct component state (different args = different story).
4. **Add tests with `.test()`** — group static content into one test; one `.test()` per distinct behavior.
5. **Run tests** — `npm run test:storybook`. Read failures, fix, re-run.

## CSF Next Format

CSF Next uses factory functions for full type safety. The chain is:

```
definePreview → preview.meta → meta.story
```

- **Import the preview**: `import preview from "~/.storybook/preview"` — provides the type-safe factories.
- **No default export** — unlike CSF 3.0, you never `export default meta`.
- **Let types be inferred** — don't add manual `Meta`/`StoryObj` type annotations.
- **`definePreview` lives only in `.storybook/preview.tsx`**, never in a story file.

| CSF 3.0                                     | CSF Next                                     |
| ------------------------------------------- | -------------------------------------------- |
| `import type { Meta, StoryObj }`            | `import preview from "~/.storybook/preview"` |
| `const meta = { } satisfies Meta<typeof C>` | `const meta = preview.meta({ })`             |
| `export default meta`                       | No default export needed                     |
| `type Story = StoryObj<typeof meta>`        | Types inferred automatically                 |
| `export const Story: Story = { }`           | `export const Story = meta.story({ })`       |

## ⭐ Prefer the `.test()` Method

Attach multiple independent tests to a single story with `.test()` instead of creating separate test stories. This is
the right tool for ~90% of tests: fewer stories, each test isolated, names describe behavior, individual results in the
Storybook UI, no repeated `meta.story()` boilerplate.

### `.test()` vs `play` — when to use which

- **`.test()` (≈90%)** — every independent test assertion. Default choice.
- **`play` without assertions** — a demo that shows the component after some interaction in Storybook docs.
- **`play` with `step()` (≈10%, rare)** — ONE cohesive flow whose steps genuinely depend on each other (e.g. a complete
  multi-step sign-up journey viewed as one narrative).
- **Never use `play` for independent test assertions** — that's what `.test()` is for.

| Component type                     | Approach                                         |
| ---------------------------------- | ------------------------------------------------ |
| Simple (Button, Badge, Icon)       | `.test()` only, keep minimal                     |
| Forms & inputs                     | `.test()` primary; `play` only for truly dependent flows |
| Complex interactive (wizard, checkout) | `.test()` for features; `play` for the end-to-end workflow |

## CRITICAL — Correctness Rules

These cause real, hard-to-debug failures if violated.

- **Never import `userEvent`.** Always destructure it from the test/play function parameters. An imported `userEvent`
  bypasses Storybook's integration and breaks interaction timing.
  - Import **only** `expect`, `fn`, `waitFor`, `screen` from `storybook/test`.
  - **Never import** `userEvent`, `within`, or `canvas` — `userEvent`, `canvas`, `canvasElement`, `args`, `step` all
    come from the function parameter.

```typescript
// ❌ WRONG — breaks Storybook timing integration
import { expect, fn, userEvent } from "storybook/test";
Story.test("Test", async ({ canvas }) => {
  await userEvent.click(button);
});

// ✅ CORRECT
import { expect, fn } from "storybook/test";
Story.test("Test", async ({ canvas, userEvent }) => {
  await userEvent.click(button);
});
```

- **Await everything.** Every `userEvent.*` call and every `expect(...)` assertion is async — always `await` it.
- **Use semantic queries** — `getByRole`, `getByLabelText`, `getByText`. Never `getByTestId` or `querySelector` (they
  test implementation, not behavior).
- **Use `queryBy*` for negative assertions** — it returns `null` instead of throwing (`getBy*` throws and fails the
  test before your `not.toBeInTheDocument()` runs).
- **Use `findBy*` / `waitFor()` for dynamic content** — anything that appears after an interaction, async state change,
  or animation.
- **Test user-visible behavior, not implementation** — assert on `toBeVisible()`, `toBeDisabled()`,
  `toHaveTextContent()`, not on internal component state.

## canvas vs screen

- **`canvas`** — Testing Library queries scoped to the story root. Default for normal inline content (buttons, inputs,
  text, headings).
- **`screen`** — queries the whole document. **Required for portal content** — modals/dialogs, tooltips, popovers,
  dropdown/select option lists — because portals render to `document.body`, outside the story root.
- **`canvasElement`** — the raw DOM element; only for direct DOM access (rare).
- **Portal pattern**: trigger the interaction inside `canvas`, then query the portal content via `screen.findBy*`.
- Prefer `screen` over `within(canvasElement.parentElement)` unless you hit test-isolation issues.

```typescript
await userEvent.click(canvas.getByRole("button", { name: /open/i })); // trigger in canvas
const dialog = await screen.findByRole("dialog"); // portal content via screen
await userEvent.click(screen.getByRole("button", { name: /close/i }));
```

## Story & Test Naming

**Stories** represent component states.

- **Single story for a component** → name it `ComponentNameStory` with a `name:` field. The `Story` suffix avoids a
  namespace collision with the imported component binding.
  - `export const UserCardStory = meta.story({ name: "User Card" })`
- **Multiple stories** → plain descriptive state names, no suffix: `EmptyForm` / `FilledForm`, `LoadingButton` /
  `IdleButton`, `ErrorState` / `SuccessState`, `Primary` / `Secondary` / `Destructive`.
- **Avoid generic names**: never `Default`, `Basic`, `Example`, `Test1`, `Story2`.
- **Different args/props → separate stories.** Same args → share one story with multiple `.test()` calls.

**Title field** — use human-readable, space-separated words matching the component's display name: `"Components/Country
Select"`, not `"Components/CountrySelect"`.

**Test names** describe a specific behavior as a sentence.

- ✅ `"Shows validation error on empty submit"`, `"Clicking card triggers onSelect"`, `"Disabled button prevents submission"`
- ❌ `"Test 1"`, `"Works correctly"`, `"Validation"`

## Test Organization

**Group assertions by category, not per element.** Over-splitting (a separate `.test()` for every text node) is an
anti-pattern.

- **Content** → ONE test per story state: `"Renders all expected content"` (all text, headings, labels, classes).
  Skip it if behavior tests already cover those elements implicitly.
- **Accessibility** → ONE test covering the a11y checks (roles, ARIA, focusability).
- **Interaction / Validation / Callbacks** → ONE test per distinct action, rule, or callback.

**`step()`** groups phases within a test and produces labelled, structured output in the test runner (comments are
invisible there).

- Use `step()` when a test has **3+ phases** or assertion groups (fill → submit → verify).
- Skip `step()` for 1–2 line tests.
- `step()` works in both `.test()` and `play`.

**Story coverage checklist** — consider: initial state, prefilled, loading, error (validation & server), success, edge
cases, interactions, multi-step flows, keyboard, accessibility.

**Extract repeated setup** into shared helper functions. For elements that may not exist (e.g. responsive/mobile-only),
**query first (`queryBy*`), then assert conditionally.**

## Mocking

Rules below; copy-paste recipes for each in [references/mocking.md](./references/mocking.md).

- **Callback props → `fn()`** from `storybook/test`. Put the mock in `meta.args` so every test shares one instance, then
  assert with `toHaveBeenCalled` / `toHaveBeenCalledWith` / `toHaveBeenCalledTimes`.
- **Real network requests → MSW**, not `fn()`. (`fn()` mocks a prop the component calls; MSW mocks HTTP the component
  makes.) Define handlers per story in `parameters.msw.handlers` so each story controls its own responses.
- **External modules → `sb.mock(import(...))` in `.storybook/preview.ts`**, never in a story file — module mocks must be
  registered globally before stories load. Configure behaviour per story via `mocked()` inside `beforeEach`.
- **React Context / providers → decorators**, not props. Define globally in `.storybook/preview.tsx`, or per story to
  override.
- **`beforeEach`** for mock configuration and to **reset mocks between tests** so state doesn't leak; story-level
  `beforeEach` overrides meta-level.

## Using Builders

Prefer test builders over hand-written inline mock data — they're reusable and typed. Use `.one()` for a single object,
`.many(n)` for lists, and pass overrides for deterministic values you assert against. If a builder doesn't exist, invoke
the `/builder-factory` skill to generate it.

## Migrating CSF 3.0 → CSF Next

1. Identify test stories whose `play` functions are independent assertions — those convert to `.test()`.
2. Group by component state: stories with the same args collapse into one story with multiple `.test()` calls.
3. Convert each `play` assertion to a `.test()`; destructure `userEvent` from the parameters (stop importing it).
4. Keep `step()` only where it adds clarity (3+ phases).
5. Verify each test runs independently — a failing test must not block the others.

## Canonical Example

A complete single-component story file. For more (forms, dialogs, portals, lists, tabs) see
[references/examples.md](./references/examples.md).

```tsx
// components/submit-button.stories.tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { SubmitButton } from "./submit-button";

const meta = preview.meta({
  title: "Components/Submit Button",
  component: SubmitButton,
  args: {
    onClick: fn(), // shared mock instance for all tests
  },
});

// Only story for this component → Story suffix + name field
export const SubmitButtonStory = meta.story({ name: "Submit Button" });

SubmitButtonStory.test("Renders all expected content", async ({ canvas }) => {
  const button = canvas.getByRole("button", { name: /submit/i });
  await expect(button).toBeVisible();
});

SubmitButtonStory.test(
  "Clicking button triggers onClick",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
);

SubmitButtonStory.test("Is activated by the Enter key", async ({ canvas, userEvent, args }) => {
  canvas.getByRole("button", { name: /submit/i }).focus();
  await userEvent.keyboard("{Enter}");
  await expect(args.onClick).toHaveBeenCalled();
});
```

## Common Mistakes to Avoid

1. **Importing `userEvent`** — always destructure it from the test parameters.
2. **Forgetting `await`** on `userEvent` calls or assertions — causes flaky/false passes.
3. **Using CSF 3.0 patterns** — use `preview.meta()` / `meta.story()`, never `satisfies Meta<>` / `export default meta`.
4. **A separate story per test** — use `.test()` on one story instead.
5. **Generic story names** — use descriptive state names, not `Default` / `Basic`.
6. **Using `canvas` for portal content** — use `screen` for modals, dropdowns, tooltips.
7. **Over-splitting content assertions** — group static content into one test.

## Questions to Ask Before Writing

- What interactions, validation rules, and keyboard behaviour must be tested?
- What states exist (loading, error, empty, success) — which need their own story?
- What needs mocking — callbacks (`fn()`), network (MSW), modules (`sb.mock()`), Context (decorators), data (builders)?
- Does any content render in a portal (→ `screen`)?
