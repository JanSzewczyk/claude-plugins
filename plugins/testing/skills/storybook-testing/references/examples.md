# Storybook Testing — Examples & Templates

Worked `.stories.tsx` files and copy-paste templates. These are **examples only** — the rules they
follow live in [SKILL.md](../SKILL.md). Every story uses CSF Next + the `.test()` method.

- [Worked examples](#worked-examples): Button · LoginForm · ConfirmDialog · Select (portal)
- [Templates](#templates) for other component types: List/Table · Input · Card · Tabs
- [Additional pattern snippets](#additional-pattern-snippets): prefilled, tooltip, error retention, double-submit, `play`

---

# Worked Examples

## Button — states, interaction, keyboard

_Shows: shared `fn()` in `meta.args`, grouped content test, click + keyboard activation, separate stories per state._

```tsx
// components/Button.tsx
import { cn } from "~/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        "rounded font-medium transition-colors",
        "focus:ring-2 focus:ring-offset-2 focus:outline-none",
        size === "md" && "px-4 py-2",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {isLoading && <span className="mr-2">⏳</span>}
      {children}
    </button>
  );
}
```

```tsx
// components/Button.stories.tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { Button } from "./Button";

const meta = preview.meta({
  title: "Components/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    onClick: fn(), // shared mock — tracks clicks across all tests
  },
});

// Visual documentation stories (for the Storybook UI)
export const Primary = meta.story({ args: { variant: "primary", children: "Primary Button" } });
export const Secondary = meta.story({ args: { variant: "secondary", children: "Secondary Button" } });
export const Destructive = meta.story({ args: { variant: "destructive", children: "Delete" } });

// Test story
export const IdleButton = meta.story({ name: "Button", args: { children: "Button" } });

IdleButton.test("Renders all expected content", async ({ canvas, args }) => {
  const button = canvas.getByRole("button");
  await expect(button).toBeInTheDocument();
  await expect(button).toHaveTextContent(args.children);
  await expect(button).toHaveClass("bg-blue-600"); // primary default
  await expect(button).toHaveClass("px-4", "py-2"); // md default
});

IdleButton.test("Calls onClick when clicked", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button"));
  await expect(args.onClick).toHaveBeenCalledTimes(1);
});

IdleButton.test("Can be activated with the keyboard", async ({ canvas, userEvent, args }) => {
  const button = canvas.getByRole("button");
  button.focus();
  await expect(button).toHaveFocus();
  await userEvent.keyboard("{Enter}"); // Space (" ") activates a button the same way
  await expect(args.onClick).toHaveBeenCalledTimes(1);
});

// Separate stories per state (different args = different story)
export const Disabled = meta.story({ args: { children: "Disabled Button", disabled: true } });

Disabled.test("Shows disabled state and ignores clicks", async ({ canvas, userEvent, args }) => {
  const button = canvas.getByRole("button");
  await expect(button).toBeDisabled();
  await expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
  await userEvent.click(button);
  await expect(args.onClick).not.toHaveBeenCalled();
});

export const Loading = meta.story({ args: { children: "Loading...", isLoading: true } });

Loading.test("Renders loading state and ignores clicks", async ({ canvas, userEvent, args }) => {
  const button = canvas.getByRole("button");
  await expect(button).toHaveTextContent("⏳");
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await userEvent.click(button);
  await expect(args.onClick).not.toHaveBeenCalled();
});
```

## LoginForm — validation, `step()`, async errors

_Shows: `decorators` for layout, `findByText` for async validation messages, `step()` for multi-phase flows,
asserting a callback is NOT called on invalid input._

```tsx
// components/LoginForm.stories.tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { LoginForm } from "./LoginForm"; // Zod + react-hook-form; emits onSubmit({ email, password })

const meta = preview.meta({
  title: "Components/Login Form",
  component: LoginForm,
  parameters: { layout: "centered" },
  args: { onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
});

export const EmptyForm = meta.story({});

EmptyForm.test("Renders email and password fields", async ({ canvas }) => {
  await expect(canvas.getByLabelText(/email/i)).toBeVisible();
  await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  await expect(canvas.getByRole("button", { name: /log in/i })).toBeVisible();
});

EmptyForm.test("Submits with valid credentials", async ({ canvas, userEvent, args, step }) => {
  await step("Fill in valid credentials", async () => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
  });
  await step("Submit", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /log in/i }));
  });
  await step("onSubmit called with form data", async () => {
    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });
});

EmptyForm.test("Shows error for invalid email and blocks submit", async ({ canvas, userEvent, args }) => {
  await userEvent.type(canvas.getByLabelText(/email/i), "invalid-email");
  await userEvent.type(canvas.getByLabelText(/password/i), "password123");
  await userEvent.click(canvas.getByRole("button", { name: /log in/i }));

  await expect(await canvas.findByText(/invalid email address/i)).toBeInTheDocument();
  await expect(args.onSubmit).not.toHaveBeenCalled();
});

EmptyForm.test("Shows errors for empty fields", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /log in/i }));
  await expect(await canvas.findByText(/invalid email address/i)).toBeInTheDocument();
  await expect(await canvas.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  await expect(args.onSubmit).not.toHaveBeenCalled();
});

export const Loading = meta.story({ args: { isLoading: true } });

Loading.test("Disables submit while loading", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /log in/i })).toBeDisabled();
});
```

## ConfirmDialog — dialog content, keyboard, Escape, ARIA

_Shows: `queryByRole` for the closed (negative) case, tab/Enter keyboard flow, Escape handling, ARIA attributes,
a destructive variant story._

```tsx
// components/ConfirmDialog.stories.tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { ConfirmDialog } from "./ConfirmDialog"; // role="dialog" aria-modal aria-labelledby; renders null when !isOpen

const meta = preview.meta({
  title: "Components/Confirm Dialog",
  component: ConfirmDialog,
  parameters: { layout: "fullscreen" },
  args: { isOpen: true, onConfirm: fn(), onCancel: fn() },
});

export const OpenDialog = meta.story({
  args: { title: "Confirm Action", message: "Are you sure you want to proceed?" },
});

OpenDialog.test("Renders all expected content", async ({ canvas }) => {
  await expect(canvas.getByRole("dialog")).toBeInTheDocument();
  await expect(canvas.getByText("Confirm Action")).toBeInTheDocument();
  await expect(canvas.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
});

OpenDialog.test("Has correct ARIA attributes", async ({ canvas }) => {
  const dialog = canvas.getByRole("dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveAttribute("aria-labelledby");
});

OpenDialog.test("Confirm and cancel call the right callback", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /confirm/i }));
  await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  await expect(args.onCancel).not.toHaveBeenCalled();
});

OpenDialog.test("Keyboard: tab to confirm and activate with Enter", async ({ canvas, userEvent, args }) => {
  await userEvent.tab(); // Cancel
  await expect(canvas.getByRole("button", { name: /cancel/i })).toHaveFocus();
  await userEvent.tab(); // Confirm
  await expect(canvas.getByRole("button", { name: /confirm/i })).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect(args.onConfirm).toHaveBeenCalled();
});

OpenDialog.test("Pressing Escape triggers onCancel", async ({ userEvent, args }) => {
  await userEvent.keyboard("{Escape}");
  await expect(args.onCancel).toHaveBeenCalled();
});

export const Destructive = meta.story({
  args: { title: "Delete Item", message: "This cannot be undone.", confirmLabel: "Delete", variant: "destructive" },
});

Destructive.test("Renders destructive variant", async ({ canvas }) => {
  await expect(canvas.getByText("Delete Item")).toBeInTheDocument();
  await expect(canvas.getByRole("button", { name: /delete/i })).toHaveClass("bg-red-600");
});

export const Closed = meta.story({ args: { isOpen: false, title: "Hidden", message: "Closed" } });

Closed.test("Renders nothing when closed", async ({ canvas }) => {
  await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
});
```

## Select — portal options via `screen`

_Shows: the portal pattern — trigger the combobox in `canvas`, query the option list (rendered to `document.body`) via
`screen.findByRole`._

```tsx
// components/Select.stories.tsx
import { expect, fn, screen } from "storybook/test";

import preview from "~/.storybook/preview";

import { Select } from "./Select";

const meta = preview.meta({
  component: Select,
  args: {
    onChange: fn(),
    options: [
      { value: "1", label: "Option 1" },
      { value: "2", label: "Option 2" },
      { value: "3", label: "Option 3" },
    ],
  },
});

export const SelectStory = meta.story({ name: "Select", args: { label: "Choose an option" } });

SelectStory.test("Selects an option and triggers onChange", async ({ canvas, userEvent, args, step }) => {
  await step("Open dropdown (trigger lives in canvas)", async () => {
    await userEvent.click(canvas.getByRole("combobox"));
  });
  await step("Pick option from the portal (use screen)", async () => {
    const option = await screen.findByRole("option", { name: /option 2/i });
    await userEvent.click(option);
  });
  await step("Verify callback", async () => {
    await expect(args.onChange).toHaveBeenCalledWith("2");
  });
});
```

> Native `<select>` (non-portal) is simpler: query `canvas.getByRole("combobox")` and use
> `userEvent.selectOptions(select, "option2")`, then assert `toHaveValue("option2")`.

---

# Templates

Skeletons for component types not shown above. Copy, rename, and fill in.

## List / Table

_Shows: empty state, builder-generated rows (`itemBuilder.many`), `getAllByRole("row")` counting, row-click callback._

```tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { itemBuilder } from "~/features/item/test/builders";
import { ItemList } from "./item-list";

const meta = preview.meta({
  title: "Components/Item List",
  component: ItemList,
  args: { onItemClick: fn() },
});

export const EmptyList = meta.story({ args: { items: [] } });

EmptyList.test("Shows empty state message", async ({ canvas }) => {
  await expect(canvas.getByText(/no items found/i)).toBeVisible();
});

export const PopulatedList = meta.story({
  args: { items: itemBuilder.many(5) },
});

PopulatedList.test("Renders all items as rows", async ({ canvas, args }) => {
  const rows = canvas.getAllByRole("row");
  await expect(rows.length).toBe(args.items.length + 1); // +1 header
});

PopulatedList.test("Clicking a row triggers callback", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getAllByRole("row")[1]);
  await expect(args.onItemClick).toHaveBeenCalledWith(args.items[0]);
});

export const LoadingList = meta.story({ args: { isLoading: true } });

LoadingList.test("Shows loading skeleton", async ({ canvas }) => {
  await expect(canvas.getByRole("progressbar")).toBeVisible();
});
```

## Input / TextField

_Shows: label + placeholder, typing updates value, `onChange`, error state with `aria-invalid`, disabled._

```tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { EmailInput } from "./email-input";

const meta = preview.meta({
  title: "Components/Email Input",
  component: EmailInput,
  args: { onChange: fn() },
});

export const EmptyInput = meta.story({ args: { label: "Email", placeholder: "Enter your email" } });

EmptyInput.test("Renders label and field", async ({ canvas, args }) => {
  await expect(canvas.getByLabelText(args.label)).toBeVisible();
  await expect(canvas.getByPlaceholderText(args.placeholder)).toBeVisible();
});

EmptyInput.test("Typing updates value and fires onChange", async ({ canvas, userEvent, args }) => {
  const input = canvas.getByRole("textbox");
  await userEvent.type(input, "test@example.com");
  await expect(input).toHaveValue("test@example.com");
  await expect(args.onChange).toHaveBeenCalled();
});

export const ErrorInput = meta.story({ args: { label: "Email", value: "invalid", error: "Invalid email address" } });

ErrorInput.test("Renders error state", async ({ canvas, args }) => {
  await expect(canvas.getByText(args.error)).toBeVisible();
  await expect(canvas.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
});

export const DisabledInput = meta.story({ args: { label: "Email", disabled: true } });

DisabledInput.test("Input is disabled", async ({ canvas }) => {
  await expect(canvas.getByRole("textbox")).toBeDisabled();
});
```

## Card

_Shows: visual-only stories (no tests needed for purely presentational variants)._

```tsx
import { fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { Card } from "./Card";

const meta = preview.meta({ component: Card });

export const WithTitle = meta.story({ args: { title: "Card Title", children: "Card content goes here" } });
export const WithFooter = meta.story({ args: { title: "Card Title", children: "Card content", footer: <button>Action</button> } });
export const Interactive = meta.story({ args: { title: "Card Title", onClick: fn() } });
export const Loading = meta.story({ args: { isLoading: true } });
```

## Tabs

_Shows: default selection via `aria-selected`, switching tabs updates content._

```tsx
import { expect } from "storybook/test";

import preview from "~/.storybook/preview";

import { Tabs } from "./Tabs";

const meta = preview.meta({
  component: Tabs,
  args: {
    tabs: [
      { id: "tab1", label: "Tab 1", content: "Content 1" },
      { id: "tab2", label: "Tab 2", content: "Content 2" },
    ],
  },
});

export const TabNavigation = meta.story({});

TabNavigation.test("First tab is selected by default", async ({ canvas }) => {
  await expect(canvas.getByRole("tab", { name: /tab 1/i })).toHaveAttribute("aria-selected", "true");
});

TabNavigation.test("Clicking a tab switches content", async ({ canvas, userEvent, step }) => {
  await step("Click the second tab", async () => {
    const secondTab = canvas.getByRole("tab", { name: /tab 2/i });
    await userEvent.click(secondTab);
    await expect(secondTab).toHaveAttribute("aria-selected", "true");
  });
  await step("Content updates", async () => {
    await expect(canvas.getByText("Content 2")).toBeInTheDocument();
  });
});
```

---

# Additional Pattern Snippets

Short patterns not already shown in the worked examples above.

## Prefilled values — read and modify

```tsx
export const Prefilled = meta.story({
  args: { defaultValues: { email: "user@example.com", name: "John Doe" } },
});

Prefilled.test("Displays pre-filled values", async ({ canvas, args }) => {
  await expect(canvas.getByLabelText(/email/i)).toHaveValue(args.defaultValues?.email);
  await expect(canvas.getByLabelText(/name/i)).toHaveValue(args.defaultValues?.name);
});

Prefilled.test("Can modify a pre-filled value", async ({ canvas, userEvent }) => {
  const email = canvas.getByLabelText(/email/i);
  await userEvent.clear(email);
  await userEvent.type(email, "new@example.com");
  await expect(email).toHaveValue("new@example.com");
});
```

## Tooltip — show on hover, hide on unhover (portal)

```tsx
import { screen } from "storybook/test";

IdleTooltip.test("Shows tooltip on hover", async ({ canvas, userEvent }) => {
  await userEvent.hover(canvas.getByRole("button", { name: /info/i }));
  const tooltip = await screen.findByRole("tooltip");
  await expect(tooltip).toHaveTextContent(/helpful information/i);
});

IdleTooltip.test("Hides tooltip on unhover", async ({ canvas, userEvent }) => {
  const trigger = canvas.getByRole("button", { name: /info/i });
  await userEvent.hover(trigger);
  const tooltip = await screen.findByRole("tooltip");
  await userEvent.unhover(trigger);
  await waitFor(async () => {
    await expect(tooltip).not.toBeInTheDocument();
  });
});
```

## Error state — message shown and form data retained

```tsx
export const ErrorState = meta.story({
  args: { onSubmit: fn(async () => ({ success: false as const, error: "Failed to save. Please try again." })) },
});

ErrorState.test("Shows error and keeps entered data", async ({ canvas, userEvent }) => {
  const email = canvas.getByLabelText(/email/i);
  await userEvent.type(email, "user@example.com");
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));

  await waitFor(async () => {
    await expect(canvas.getByText(/failed to save/i)).toBeVisible();
  });
  await expect(email).toHaveValue("user@example.com"); // data retained after error
});
```

## Prevent double submission

```tsx
ButtonPanel.test("Prevents double submission", async ({ canvas, userEvent, args }) => {
  const submit = canvas.getByRole("button", { name: /submit/i });
  await userEvent.click(submit);
  await userEvent.click(submit);
  await userEvent.click(submit);
  await expect(args.onSubmit).toHaveBeenCalledTimes(1); // debounced / disabled after first
});
```

## `play` — the two valid uses

`play` is for demos (no assertions) or ONE cohesive dependent flow. Never for independent assertions (use `.test()`).

```tsx
// (a) Demo — present a filled state in Storybook docs, no assertions
export const FilledForm = meta.story({
  name: "Form with data",
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
  },
});

// (b) Dependent flow — one narrative whose steps build on each other
export const CompleteSignUpFlow = meta.story({
  name: "Complete Sign-up Journey",
  args: { onSubmit: fn() },
  play: async ({ canvas, userEvent, args, step }) => {
    await step("User sees welcome message", async () => {
      await expect(canvas.getByText("Welcome")).toBeInTheDocument();
    });
    await step("User fills registration form", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(canvas.getByLabelText(/password/i), "securePass123");
      await userEvent.click(canvas.getByRole("checkbox", { name: /accept terms/i }));
    });
    await step("User submits", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /sign up/i }));
    });
    await step("Verify submission", async () => {
      await waitFor(async () => {
        await expect(args.onSubmit).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "securePass123",
          acceptedTerms: true,
        });
      });
    });
  },
});
```
