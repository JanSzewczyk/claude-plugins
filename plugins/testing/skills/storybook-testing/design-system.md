# Testing @szum-tech/design-system Components

Quick reference for DS-specific testing patterns. For general Storybook testing patterns, see
[patterns.md](./patterns.md), [api-reference.md](./api-reference.md), and [best-practices.md](./best-practices.md).

> **Key rule:** DS components built on Radix UI often render content in **portals** (to `document.body`). Use `screen`
> for portal content and `canvas` for inline content. See [api-reference.md → Canvas vs Screen](./api-reference.md) for
> full explanation.

## DS Component → Role → Portal Mapping

| DS Component | Role              | Query Example                  | Portal?                   |
| ------------ | ----------------- | ------------------------------ | ------------------------- |
| Button       | `button`          | `canvas.getByRole("button")`   | No                        |
| Input        | `textbox`         | `canvas.getByRole("textbox")`  | No                        |
| Select       | `combobox`        | `canvas.getByRole("combobox")` | Trigger: No, Options: Yes |
| Dialog       | `dialog`          | `screen.getByRole("dialog")`   | Yes                       |
| Checkbox     | `checkbox`        | `canvas.getByRole("checkbox")` | No                        |
| Radio        | `radio`           | `canvas.getByRole("radio")`    | No                        |
| Tabs         | `tab`, `tabpanel` | `canvas.getByRole("tab")`      | No                        |
| Tooltip      | `tooltip`         | `screen.getByRole("tooltip")`  | Yes                       |
| Alert/Toast  | `status`, `alert` | `canvas.getByRole("status")`   | Depends                   |

## DS-Specific Gotchas

### 1. Portal Components — Always Use `screen`

Dialog, Tooltip, and Select options render in portals. `canvas` won't find them:

```typescript
// ✅ Portal content — use screen
await userEvent.click(canvas.getByRole("combobox"));
const option = await screen.findByRole("option", { name: /poland/i });

// ✅ Dialog — use screen
const dialog = await screen.findByRole("dialog");

// ✅ Tooltip — use screen
await userEvent.hover(canvas.getByRole("button", { name: /info/i }));
const tooltip = await screen.findByRole("tooltip");
```

### 2. Animation Timing

DS components use Tailwind animations. Always use `findBy*` (waits) instead of `getBy*` (throws immediately) for
elements that appear after user interaction:

```typescript
// ✅ Waits for animation to complete
const dialog = await screen.findByRole("dialog");

// ✅ Waits for element to disappear
await waitFor(async () => {
  await expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

### 3. Toast Auto-Dismiss Timing

DS toasts auto-dismiss after ~5 seconds. Use extended timeout when testing auto-dismiss:

```typescript
await waitFor(
  async () => {
    await expect(canvas.queryByRole("status")).not.toBeInTheDocument();
  },
  { timeout: 6000 },
);
```

### 4. Dialog Focus Management

DS dialogs trap focus and return it to trigger on close:

```typescript
// Focus trap — focus stays within dialog
const dialog = screen.getByRole("dialog");
const focusableElements = dialog.querySelectorAll("button");
focusableElements[0].focus();
await userEvent.tab();
await expect(dialog).toContainElement(document.activeElement);

// Focus return — after closing, focus returns to trigger
await userEvent.keyboard("{Escape}");
await waitFor(async () => {
  await expect(trigger).toHaveFocus();
});
```

### 5. Dialog ARIA Attributes

DS dialogs have strict ARIA attributes to verify:

```typescript
const dialog = screen.getByRole("dialog");
await expect(dialog).toHaveAttribute("aria-modal", "true");
await expect(dialog).toHaveAttribute("aria-labelledby");
await expect(dialog).toHaveAttribute("aria-describedby");
```

### 6. Button Loading State

DS buttons use `aria-busy` and show a `progressbar` when loading:

```typescript
// Loading button
await expect(button).toBeDisabled();
await expect(button).toHaveAttribute("aria-busy", "true");
await expect(canvas.getByRole("progressbar")).toBeVisible();
```

## Design System Documentation

For complete DS component APIs and patterns, see the
[design system documentation](https://szum-tech-design-system.vercel.app/?path=/docs/components--docs).
