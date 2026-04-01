---
name: storybook-testing
version: 3.1.0
lastUpdated: 2026-03-30
description:
  Create Storybook stories with browser-rendered interaction tests for React UI components using CSF Next format and
  .test() method. Covers visual states, user interactions (clicks, typing, hover), form validation UI, and component
  accessibility in isolation. Use when testing React component rendering, UI interactions, visual states, or documenting
  component behavior in Storybook. Trigger this skill whenever the user mentions Storybook, stories, CSF Next,
  component interaction tests, .test() method, or wants to test a React UI component in isolation. NOT for unit testing
  pure functions/hooks (use unit-testing), API endpoints (use api-test), or full E2E page flows (use playwright-cli).
tags:
  [
    testing,
    storybook,
    react,
    component-testing,
    integration-testing,
    interaction-testing,
    test-method,
    csf-next,
    stories,
    browser-testing,
  ]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
context: fork
agent: general-purpose
user-invocable: true
examples:
  - Write Storybook tests for UserProfileCard component
  - Create story tests for my LoginForm
  - Add Storybook interaction tests to the ProductCard component
  - Generate comprehensive Storybook stories with tests for NavBar
  - Test click and hover interactions for the Tooltip component in Storybook
  - Write Storybook tests for form validation on my CheckoutForm
---

# Storybook Testing Skill

Generate comprehensive Storybook stories with interactive tests using CSF Next format and `.test()` method for React
components.

> **Reference Files:**
>
> - [mocking.md](./mocking.md) - Comprehensive mocking guide (functions, modules, APIs, Next.js hooks, Context)
> - [patterns.md](./patterns.md) - Testing patterns and examples
> - [best-practices.md](./best-practices.md) - Best practices, migration guide, and common pitfalls
> - [examples-and-templates.md](./examples-and-templates.md) - Practical code examples and component test templates
> - [design-system.md](./design-system.md) - Testing @szum-tech/design-system components
> - [api-reference.md](./api-reference.md) - Complete API documentation

## Context

This project uses **Storybook 10+ with CSF Next format** - the latest Component Story Format with factory functions for
full type safety.

Stories are used for:

- **Component testing** - Test components in isolation
- **Interaction testing** - Verify user interactions (clicks, typing)
- **Validation testing** - Test form validation and error states
- **Accessibility testing** - Verify a11y with addon

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

1. **Analyze component** - Props, interactions, states, callbacks
2. **Create story file** - Same directory as component: `component.stories.tsx`
3. **Write minimal stories** - 1-2 stories for different component states
4. **Add multiple tests** - Use `.test()` method; ONE content test with `step()`, separate `.test()` per behavior
5. **Run tests** - `npm run test:storybook`

## ⭐ Preferred Pattern: `.test()` Method

**IMPORTANT:** Use `.test()` method to add multiple tests to a single story instead of creating separate test stories.

### Why `.test()` Over Multiple Stories?

- ✅ **Fewer stories** - 80% reduction in story count
- ✅ **Better isolation** - Each test is independent
- ✅ **Clearer intent** - Test names describe behavior
- ✅ **Better reporting** - Individual test results in Storybook UI
- ✅ **Less boilerplate** - No repeated `meta.story()` calls

## CRITICAL: userEvent Must Be Destructured from Parameters

**Never import `userEvent` from `storybook/test`.** Always destructure it from the test function parameters.

```typescript
// ❌ WRONG — breaks Storybook timing integration
import { expect, fn, userEvent } from "storybook/test";
Story.test("Test", async ({ canvas }) => {
  await userEvent.click(button);
});

// ✅ CORRECT — properly integrated with Storybook
import { expect, fn } from "storybook/test";
Story.test("Test", async ({ canvas, userEvent }) => {
  await userEvent.click(button);
});
```

**Rules:**

- **Import:** Only `expect`, `fn`, `waitFor`, `screen` from `storybook/test`
- **Destructure:** `userEvent`, `canvas`, `args`, `step` always come from the function parameter
- **Why:** The test framework provides these with proper Storybook integration to handle timing correctly

## CSF Next Format

CSF Next uses factory functions that provide full type safety:

```
definePreview → preview.meta → meta.story
```

### Story File Structure (Using `.test()` Method)

```typescript
import { expect, fn, waitFor } from "storybook/test";

import preview from "~/.storybook/preview";

import { SubmitButton } from "./submit-button";

const meta = preview.meta({
  title: "Components/Submit Button",
  component: SubmitButton,
  args: {
    onClick: fn(),
  },
});

// Story with Story suffix to avoid namespace conflict with imported component
export const SubmitButtonStory = meta.story({ name: "Submit Button" });

// Test 1: Rendering
SubmitButtonStory.test(
  "Renders button with correct text",
  async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /submit/i });
    await expect(button).toBeVisible();
  },
);

// Test 2: Interaction
SubmitButtonStory.test(
  "Clicking button triggers onClick",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button", { name: /submit/i });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
);

// Test 3: Accessibility
SubmitButtonStory.test("Button has correct ARIA label", async ({ canvas }) => {
  const button = canvas.getByRole("button", { name: /submit/i });
  await expect(button).toHaveAccessibleName();
});
```

> **Note:** `SubmitButtonStory` uses the `Story` suffix because this is the **only story** for this component — the suffix avoids namespace collision with the imported binding. For components with multiple stories, use plain descriptive state names (`EmptyForm`, `FilledForm`) without the suffix.

### When to Use `play` Instead of `.test()`

`play` has two valid use cases — **demos** and **dependent flows**. It should **never** be used for independent test assertions.

1. **Demos** — Use `play` **without assertions** to show component after user interaction in Storybook docs
2. **Complex Dependent Flows** (rare ~10%) — Use `play` with `step()` when steps depend on each other

> **See [best-practices.md](./best-practices.md) for the full decision matrix, component type guidelines, and code examples.**

### Key Differences from CSF 3.0

| CSF 3.0                                     | CSF Next                                     |
| ------------------------------------------- | -------------------------------------------- |
| `import type { Meta, StoryObj }`            | `import preview from "~/.storybook/preview"` |
| `const meta = { } satisfies Meta<typeof C>` | `const meta = preview.meta({ })`             |
| `export default meta`                       | No default export needed                     |
| `type Story = StoryObj<typeof meta>`        | Types inferred automatically                 |
| `export const Story: Story = { }`           | `export const Story = meta.story({ })`       |

## Story Configuration Conventions

### Title Field

Always use **human-readable, space-separated** words in the `title` field — matching the component's display name:

```typescript
// ❌ BAD - CamelCase (unreadable in Storybook sidebar)
title: "Components/CountrySelect";
title: "Components/InfoTooltip";
title: "Components/SettingsTabs";

// ✅ GOOD - Spaced words (clean sidebar display)
title: "Components/Country Select";
title: "Components/Info Tooltip";
title: "Components/Settings Tabs";
```

The title path segments use the same spacing as the `name` field in the story config.

---

## Story Naming Conventions

**Stories** represent component states - use descriptive, specific names:

### Single Story Components

If a component has only ONE story, use the `ComponentNameStory` format with a `name` field — this
avoids namespace collision with the imported component binding:

- `LoginFormStory` + `name: "Login Form"` — for the LoginForm component
- `UserCardStory` + `name: "User Card"` — for the UserCard component
- `SearchInputStory` + `name: "Search Input"` — for the SearchInput component

### Multiple Story Components

If component has multiple stories, use **descriptive state names**:

- `EmptyForm` / `FilledForm` - Empty vs populated states
- `LoadingButton` / `IdleButton` - Loading vs idle states
- `ErrorState` / `SuccessState` - Different result states
- `DisabledInput` / `EnabledInput` - Disabled vs enabled states

### Visual Variant Stories

For visual documentation (styles, themes):

- `Primary` / `Secondary` / `Destructive` - Button variants
- `Small` / `Medium` / `Large` - Size variants
- `Light` / `Dark` - Theme variants

**❌ Avoid:** Generic names like `Default`, `Basic`, `Example` **✅ Prefer:** Specific names that describe the component
or state

---

**Tests** describe specific behaviors (use `.test()` method):

- `"Renders heading and description"` - What renders
- `"Shows validation error on empty submit"` - Validation behavior
- `"Clicking button triggers callback"` - Interaction behavior
- `"Keyboard navigation works with arrow keys"` - Accessibility behavior

### Examples

#### Single Story Component

```typescript
// Component: UserCard
// Story: Named after component with Story suffix to avoid namespace conflict
export const UserCardStory = meta.story({ name: "User Card" });

// Tests: Specific behaviors
UserCardStory.test("Renders user name and avatar", async ({ canvas }) => { ... });
UserCardStory.test("Clicking card triggers onSelect", async ({ canvas }) => { ... });
UserCardStory.test("Shows verified badge for verified users", async ({ canvas }) => { ... });
```

#### Multiple Story Component

```typescript
// Component: LoginForm
// Story 1: Empty form state
export const EmptyForm = meta.story({});

EmptyForm.test("Renders email and password fields", async ({ canvas }) => { ... });
EmptyForm.test("Shows validation on empty submit", async ({ canvas }) => { ... });

// Story 2: Pre-filled form state
export const FilledForm = meta.story({
  args: { defaultValues: { email: "user@example.com" } }
});

FilledForm.test("Displays pre-filled email", async ({ canvas }) => { ... });
FilledForm.test("Can modify pre-filled values", async ({ canvas }) => { ... });
```

## Play Function Parameters

- `canvas` - Testing Library queries scoped to component
- `canvasElement` - Raw DOM element (for portal queries)
- `userEvent` - Pre-configured interaction methods
- `args` - Story args (props)
- `step` - Group assertions into named steps

## Using Test Builders

**Always prefer builders over inline mock data:**

```typescript
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { userBuilder } from "~/features/*/test/builders";

import { UserCard } from "./user-card";

const meta = preview.meta({
  component: UserCard,
  args: {
    onSubmit: fn(),
  },
});

// Story suffix avoids namespace conflict with imported UserCard component
export const UserCardStory = meta.story({
  name: "User Card",
  args: {
    user: userBuilder.one(),
  },
});

// Multiple tests for that story
UserCardStory.test("Renders user name correctly", async ({ canvas, args }) => {
  const name = canvas.getByText(args.user.name);
  await expect(name).toBeVisible();
});

UserCardStory.test("Displays user avatar", async ({ canvas }) => {
  const avatar = canvas.getByRole("img", { name: /avatar/i });
  await expect(avatar).toBeVisible();
});

UserCardStory.test(
  "Clicking card triggers callback",
  async ({ canvas, userEvent, args }) => {
    const card = canvas.getByRole("article");
    await userEvent.click(card);
    await expect(args.onSubmit).toHaveBeenCalled();
  },
);
```

If builder doesn't exist, invoke `/builder-factory` skill first.

## Running Tests

```bash
npm run test:storybook  # Run component tests
npm run storybook:dev   # View in Storybook UI
```

## Mocking in Storybook

| Mock Type            | Tool                                | Use Case                              |
| -------------------- | ----------------------------------- | ------------------------------------- |
| **Callback props**   | `fn()`                              | onClick, onSubmit, event handlers     |
| **External modules** | `sb.mock()` in preview.ts           | uuid, session, analytics              |
| **REST/GraphQL**     | MSW `http.*` / `graphql.*`          | fetch, axios, API calls               |
| **Next.js hooks**    | `@storybook/nextjs/navigation.mock` | useRouter, useParams, redirect        |
| **React Context**    | Decorators                          | AuthContext, ThemeProvider            |
| **Mock data**        | Builders (`/builder-factory`)       | User objects, complex data structures |

> **See [mocking.md](./mocking.md) for complete examples, patterns, and best practices.**

## Common Mistakes to Avoid

1. **Importing `userEvent`** — Always destructure from test parameters, never import from `storybook/test`
2. **Using CSF 3.0 patterns** — Use `preview.meta()` / `meta.story()`, not `satisfies Meta<>` / `export default meta`
3. **Separate stories per test** — Use `.test()` on one story instead of multiple `play` stories
4. **Generic story names** — Use descriptive names (`EmptyForm`, `FilledForm`), not `Default` or `Basic`
5. **Using `canvas` for portal content** — Use `screen` from `storybook/test` for modals, dropdowns, tooltips

> **See [best-practices.md](./best-practices.md) for detailed examples and fixes for each anti-pattern.**

## Questions to Ask

Before writing tests, consider:

### Interactions & Behavior

- What user interactions should be tested?
- Are there specific edge cases to cover?
- What validation rules should be tested?
- What keyboard navigation should work?

### Mocking Requirements

- **Functions:** Do callbacks need to be mocked with `fn()`?
- **Modules:** Are there external dependencies (uuid, analytics) to mock with `sb.mock()`?
- **APIs:** Does the component fetch data that needs MSW mocking?
- **Next.js:** Does it use `useRouter`, `useParams`, or `useSearchParams`?
- **Context:** Does it consume React Context that needs mocking?
- **Data:** Should I use test builders or inline mock data?

### Test Coverage

- What are the critical user paths?
- What error states should be tested?
- Are there loading states to verify?
- What accessibility requirements must be met?
