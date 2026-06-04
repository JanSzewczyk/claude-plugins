# Storybook Testing API Reference (CSF Next)

## CSF Next Factory Functions

CSF Next uses a chain of factory functions for full type safety:

```typescript
definePreview → preview.meta → meta.story
```

### definePreview (in .storybook/preview.tsx)

```typescript
import { definePreview } from "@storybook/nextjs-vite";
import addonA11y from "@storybook/addon-a11y";

export default definePreview({
  parameters: {
    /* global parameters */
  },
  decorators: [
    /* global decorators */
  ],
  addons: [addonA11y()],
});
```

### preview.meta (in story files)

```typescript
import preview from "~/.storybook/preview";
import { ComponentName } from "./component-name";

const meta = preview.meta({
  title: "Features/My Feature/Component Name",
  component: ComponentName,
  args: {
    /* default args */
  },
  parameters: {
    /* story-level parameters */
  },
});
```

### meta.story (individual stories)

```typescript
export const StoryName = meta.story({
  name: "Custom Display Name", // Optional display name
  args: {
    /* story args */
  },
  parameters: {
    /* story parameters */
  },
  play: async (context) => {
    /* optional: for complex multi-step flows */
  },
});
```

**Story Naming Convention:**

- Single story: Use component name (`UserCard`, `SearchInput`)
- Multiple stories: Use descriptive states (`EmptyForm`, `FilledForm`)
- Avoid generic names: ~~`Default`~~, ~~`Basic`~~, ~~`Example`~~

## Story.test() Method ⭐

**RECOMMENDED:** Attach multiple independent tests to a single story.

### Syntax

```typescript
StoryName.test(testName: string, testFunction: TestFunction): void
```

### Example

```typescript
export const LoginForm = meta.story({});

// Attach as many independent tests as you need to the one story
LoginForm.test(
  "Shows validation error on empty submit",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(canvas.getByText(/email is required/i)).toBeVisible();
  },
);
```

For full worked story files (forms, dialogs, portals, lists, tabs), see [examples.md](./examples.md).

### Parameters

- **testName** (string): Descriptive test name in sentence case
  - ✅ Good: `"Shows validation error on empty submit"`
  - ❌ Bad: `"Test 1"`, `"Validation"`, `"Works"`

- **testFunction** (TestFunction): Async function with same context as `play` function

### Context Object

Same context as `play` function:

```typescript
interface TestContext {
  canvas: Canvas; // Testing Library queries scoped to component
  canvasElement: HTMLElement; // Raw DOM element for portal queries
  userEvent: UserEvent; // Pre-configured user interaction methods
  args: StoryArgs; // Story arguments (including mock functions)
  step: StepFunction; // Group assertions into named steps for structured reporting
}
```

### When to Use `.test()` vs `play`

- **`.test()`** (90% of cases) — All independent test assertions, multiple tests per story
- **`play`** (10%) — Demos without assertions, or complex dependent multi-step flows

> **See [SKILL.md](../SKILL.md) for the full decision matrix and component-type guidelines.**

## Query Methods

Use semantic queries from Testing Library:

```typescript
// Preferred queries (by user-visible content)
canvas.getByRole("button", { name: /submit/i })
canvas.getByLabelText(/email/i)
canvas.getByText(/welcome/i)
canvas.getByPlaceholderText(/enter name/i)

// Query variants
canvas.getBy*      // Throws if not found (use for assertions)
canvas.queryBy*    // Returns null if not found (use for negative assertions)
canvas.findBy*     // Async, waits for element (use for dynamic content)
canvas.getAllBy*   // Returns array of matches
```

## Assertions

```typescript
// Visibility
await expect(element).toBeVisible();
await expect(element).toBeInTheDocument();
await expect(element).not.toBeInTheDocument();

// State
await expect(checkbox).toBeChecked();
await expect(button).toBeDisabled();
await expect(button).toBeEnabled();
await expect(element).toHaveFocus();

// Content
await expect(element).toHaveTextContent("text");
await expect(element).toHaveValue("value");
await expect(element).toHaveAttribute("data-state", "loading");
await expect(element).toHaveClass(/w-full/);

// Counts
await expect(elements.length).toBe(3);
await expect(elements.length).toBeGreaterThanOrEqual(1);

// Function calls
await expect(args.onSubmit).toHaveBeenCalled();
await expect(args.onSubmit).toHaveBeenCalledOnce();
await expect(args.onSubmit).toHaveBeenCalledWith({ data: "value" });
await expect(args.onSubmit).not.toHaveBeenCalled();

// String matching
await expect(element).toHaveAttribute(
  "rel",
  expect.stringContaining("noreferrer"),
);
```

## User Interactions

```typescript
// Click
await userEvent.click(button);
await userEvent.dblClick(element);

// Typing
await userEvent.type(input, "text to type");
await userEvent.clear(input);

// Keyboard
await userEvent.tab();
await userEvent.keyboard("{Enter}");
await userEvent.keyboard("{Escape}");
await userEvent.keyboard("{Shift}");

// Hover
await userEvent.hover(element);
await userEvent.unhover(element);

// Select
await userEvent.selectOptions(select, "optionValue");
await userEvent.selectOptions(select, ["1", "2"]);
await userEvent.deselectOptions(select, "1");
```

## Waiting for Changes

```typescript
import { waitFor } from "storybook/test";

// Wait for condition
await waitFor(async () => {
  const element = canvas.getByText(/success/i);
  await expect(element).toBeVisible();
});

// Wait for element to appear
const element = await canvas.findByText(/success/i);

// Wait with custom timeout
await waitFor(
  async () => {
    await expect(condition).toBe(true);
  },
  { timeout: 5000 },
);
```

## Mocking Functions

```typescript
import { fn } from "storybook/test";

const meta = preview.meta({
  component: MyComponent,
  args: {
    // Simple mock
    onSubmit: fn(),

    // Mock with return value
    onSubmit: fn(async () => ({ success: true })),

    // Mock with typed return (for server actions)
    onSubmit: fn(() => ({ success: true }) as unknown as RedirectAction),

    // Mock that throws
    onError: fn(() => {
      throw new Error("Test error");
    }),
  },
});
```

## Play Function Context

`play` receives the same context object as `.test()` (`canvas`, `canvasElement`, `userEvent`,
`args`, `step`) plus `globals`, `parameters`, and `viewMode`. See the `.test()` Context Object above.

## canvas vs screen

```typescript
import { screen } from "storybook/test";

// 1. canvas - Testing Library queries scoped to story root (PREFERRED)
//    Use for all elements within the story canvas
const button = canvas.getByRole("button");
const input = canvas.getByLabelText(/email/i);

// 2. screen - Queries entire document (USE for portals)
//    Use for modals, dropdowns, tooltips that render outside story root
const dialog = screen.getByRole("dialog");
const tooltip = await screen.findByRole("tooltip");
const option = screen.getByRole("option", { name: /option 1/i });

// 3. canvasElement - Raw DOM element (rarely needed)
//    Use when you need direct DOM access
const element = canvasElement.querySelector(".some-class");
```

### When to use each:

| Query Method                    | Use When                              | Example                            |
| ------------------------------- | ------------------------------------- | ---------------------------------- |
| `canvas.getByRole()`            | Element is inside story canvas        | Buttons, inputs, text in component |
| `screen.getByRole()`            | Element is in portal (outside canvas) | Modals, tooltips, dropdown options |
| `canvasElement.querySelector()` | Need raw DOM access                   | Direct DOM manipulation (rare)     |

Portal pattern: trigger inside `canvas`, query the portal content via `screen`:

```typescript
await userEvent.click(canvas.getByRole("button", { name: /open/i }));
const dialog = await screen.findByRole("dialog"); // renders to document.body
await userEvent.click(screen.getByRole("button", { name: /close/i }));
```

## Common Element Patterns

Role, query, and portal behaviour for common UI elements. Component libraries built on Radix UI,
Headless UI, or Floating UI render overlay content (dialogs, tooltips, menus, dropdown option lists)
in **portals** to `document.body` — query those with `screen`, everything else with `canvas`.

| Element        | Role                | Query                            | Portal?                      |
| -------------- | ------------------- | -------------------------------- | ---------------------------- |
| Button         | `button`            | `canvas.getByRole("button")`     | No                           |
| Text input     | `textbox`           | `canvas.getByRole("textbox")`    | No                           |
| Checkbox       | `checkbox`          | `canvas.getByRole("checkbox")`   | No                           |
| Radio          | `radio`             | `canvas.getByRole("radio")`      | No                           |
| Tabs           | `tab` / `tabpanel`  | `canvas.getByRole("tab")`        | No                           |
| Select         | `combobox` / `option` | trigger: `canvas`; options: `screen` | Options: Yes            |
| Dialog / Modal | `dialog`            | `screen.getByRole("dialog")`     | Yes                          |
| Tooltip        | `tooltip`           | `screen.getByRole("tooltip")`    | Yes                          |
| Alert / Toast  | `status` / `alert`  | `canvas` or `screen`             | Depends on the library       |

Element-specific facts worth asserting:

- **Animated / portaled content** — it appears after a transition, so query it with `findBy*` /
  `waitFor`, never `getBy*` (which throws immediately, before the animation settles).
- **Dialog ARIA** — assert `aria-modal="true"`, `aria-labelledby`, and (when there's body copy)
  `aria-describedby`.
- **Dialog focus** — focus is trapped inside the open dialog and returns to the trigger on close;
  assert with `toHaveFocus()` after closing.
- **Auto-dismissing elements (toasts)** — they disappear on a timer; assert their removal with an
  extended timeout, e.g. `waitFor(..., { timeout: 6000 })`.
- **Loading buttons** — assert `aria-busy="true"` plus a visible `progressbar` (and `toBeDisabled()`).

```typescript
// Toast that auto-dismisses
await waitFor(
  async () => {
    await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
  },
  { timeout: 6000 },
);

// Dialog focus returns to the trigger after Escape
await userEvent.keyboard("{Escape}");
await waitFor(async () => {
  await expect(trigger).toHaveFocus();
});
```

## Step Function

Group related assertions for better test organization. Use `step()` in both `.test()` and `play`:

```typescript
// ✅ step() in .test() — content tests and multi-step interactions
export const FormStory = meta.story({});

FormStory.test(
  "Submits form with valid data",
  async ({ canvas, userEvent, step }) => {
    await step("Fill form fields", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(canvas.getByLabelText(/password/i), "secret");
    });

    await step("Submit and verify", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
      await expect(canvas.getByText(/success/i)).toBeVisible();
    });
  },
);
```

## Imports Summary

```typescript
// From storybook/test (most common)
import { expect, fn, waitFor } from "storybook/test";

// Preview import
import preview from "~/.storybook/preview";
```
