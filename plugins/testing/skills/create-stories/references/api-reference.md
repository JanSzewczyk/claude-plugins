# Storybook Testing API Reference (CSF Next)

Lookup only: the `.test()` / `play` context, the role and portal behaviour of common elements, and
the import paths. Standard Testing Library queries, jest-dom matchers and `userEvent` methods work
unchanged and are not repeated here.

## Contents

- [Test / play context](#test--play-context) — what the test function receives
- [Common element patterns](#common-element-patterns) — role, query and portal per element; dialog, toast and loading-button facts
- [Imports summary](#imports-summary) — what comes from `storybook/test`, the preview, and the Next.js mocks

## Test / play context

```typescript
Story.test(name: string, fn: (context) => Promise<void>): void

interface TestContext {
  canvas: Canvas; // Testing Library queries scoped to the story root
  canvasElement: HTMLElement; // raw DOM element of the story root
  userEvent: UserEvent; // pre-bound user interactions
  args: StoryArgs; // story args, including fn() spies
  step: StepFunction; // named phases in the test output
}
// play gets the same context plus globals, parameters, viewMode
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
// From storybook/test
import { expect, fn, mocked, screen, waitFor } from "storybook/test";

// Module mocks (only in .storybook/preview.ts)
import { sb } from "storybook/test";

// Next.js navigation mocks
import { getRouter, redirect } from "@storybook/nextjs-vite/navigation.mock";

// Preview object — use the project's path (setup.md)
import preview from "~/.storybook/preview";
```
