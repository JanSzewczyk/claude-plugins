# Storybook Testing API Reference (CSF Next)

Lookup only — signatures and element facts. The rules for using them live in
[testing.md](./testing.md) (`.test()`, queries, `canvas` vs `screen`, `step()`),
[csf-next.md](./csf-next.md) (file shape) and [mocking.md](./mocking.md).

## Test / play context

```typescript
Story.test(name: string, fn: (context) => Promise<void>): void

interface TestContext {
  canvas: Canvas; // Testing Library queries scoped to the story root
  canvasElement: HTMLElement; // raw DOM element of the story root
  userEvent: UserEvent; // pre-bound user interactions — never import it
  args: StoryArgs; // story args, including fn() spies
  step: StepFunction; // named phases in the test output
}
// play gets the same context plus globals, parameters, viewMode
```

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

## canvas vs screen

| Query                           | Scope                         | Use for                            |
| ------------------------------- | ----------------------------- | ---------------------------------- |
| `canvas.getByRole()`            | story root                    | buttons, inputs, inline text       |
| `screen.getByRole()`            | whole document                | dialogs, tooltips, menus, options  |
| `canvasElement`                 | raw DOM                       | rare direct DOM access             |

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

## Imports Summary

```typescript
// From storybook/test — never userEvent, within or canvas
import { expect, fn, mocked, screen, waitFor } from "storybook/test";

// Module mocks (only in .storybook/preview.ts)
import { sb } from "storybook/test";

// Next.js navigation mocks
import { getRouter, redirect } from "@storybook/nextjs-vite/navigation.mock";

// Preview object — use the project's path (setup.md)
import preview from "~/.storybook/preview";
```
