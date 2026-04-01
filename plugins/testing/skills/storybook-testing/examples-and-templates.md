# Storybook Testing - Examples & Templates

> **All examples and templates use `.test()` method for multiple tests per story**

---

## Example 1: Basic Button Component Test

**Component:**

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
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2",
        size === "lg" && "px-6 py-3 text-lg",
        variant === "primary" &&
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        variant === "secondary" &&
          "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
        variant === "destructive" &&
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
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

**Story File with `.test()` method:**

```tsx
// components/Button.stories.tsx
import preview from "~/.storybook/preview";
import { expect, fn } from "storybook/test";
import { Button } from "./Button";

const meta = preview.meta({
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(), // Mock function for tracking clicks
  },
});

// Visual documentation stories (for Storybook UI)
export const Primary = meta.story({
  args: {
    variant: "primary",
    children: "Primary Button",
  },
});

export const Secondary = meta.story({
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
});

export const Destructive = meta.story({
  args: {
    variant: "destructive",
    children: "Delete",
  },
});

// Interactive story with MULTIPLE tests
export const IdleButton = meta.story({
  name: "Button",
  args: {
    children: "Button",
  },
});

// Rendering test — group all static content assertions into one
IdleButton.test("Renders all expected content", async ({ canvas, args }) => {
  const button = canvas.getByRole("button");
  await expect(button).toBeInTheDocument();
  await expect(button).toHaveTextContent(args.children);
  await expect(button).toHaveClass("bg-blue-600"); // primary variant default
  await expect(button).toHaveClass("px-4", "py-2"); // md size default
});

// Interaction tests
IdleButton.test(
  "Calls onClick when clicked",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
);

IdleButton.test(
  "Can be clicked multiple times",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
);

// Keyboard accessibility tests
IdleButton.test(
  "Can be activated with Enter key",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    button.focus();
    await expect(button).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
);

IdleButton.test(
  "Can be activated with Space key",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    button.focus();

    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
);

// State tests - Disabled
export const Disabled = meta.story({
  args: {
    children: "Disabled Button",
    disabled: true,
  },
});

Disabled.test("Shows disabled state visually", async ({ canvas }) => {
  const button = canvas.getByRole("button");
  await expect(button).toBeDisabled();
  await expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
});

Disabled.test(
  "Does not trigger onClick when clicked",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
);

// State tests - Loading
export const Loading = meta.story({
  args: {
    children: "Loading...",
    isLoading: true,
  },
});

Loading.test("Renders loading state", async ({ canvas }) => {
  const button = canvas.getByRole("button");
  await expect(button).toHaveTextContent("⏳");
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
});

Loading.test(
  "Does not trigger onClick when clicked",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
);
```

**Results:**

- ❌ Old: 10 stories (7 visual + 3 test stories)
- ✅ New: 5 stories (3 visual + 2 with tests)
- **Reduction:** 50% fewer stories, same comprehensive coverage, tests grouped by behavior

---

## Example 2: Form Component with Validation

**Component:**

```tsx
// components/LoginForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./Button";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void | Promise<void>;
  isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          className="w-full rounded border px-3 py-2"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          className="w-full rounded border px-3 py-2"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        Log In
      </Button>
    </form>
  );
}
```

**Story File:**

```tsx
// components/LoginForm.stories.tsx
import preview from "~/.storybook/preview";
import { expect, fn } from "storybook/test";
import { LoginForm } from "./LoginForm";

const meta = preview.meta({
  title: "Components/Login Form",
  component: LoginForm,
  parameters: {
    layout: "centered",
  },
  args: {
    onSubmit: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
});

// Empty form state — all interaction tests attached directly
export const EmptyForm = meta.story({});

EmptyForm.test("Renders email and password fields", async ({ canvas }) => {
  await expect(canvas.getByLabelText(/email/i)).toBeVisible();
  await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  await expect(canvas.getByRole("button", { name: /log in/i })).toBeVisible();
});

EmptyForm.test(
  "Submits form with valid credentials",
  async ({ canvas, userEvent, args, step }) => {
    await step("Fill in valid credentials", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    });

    await step("Submit form", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /log in/i }));
    });

    await step("Verify onSubmit was called with correct data", async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  },
);

EmptyForm.test(
  "Shows error for invalid email",
  async ({ canvas, userEvent, args, step }) => {
    await step("Fill in invalid email", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "invalid-email");
      await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    });

    await step("Submit form", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /log in/i }));
    });

    await step("Verify error message is shown", async () => {
      const errorMessage = await canvas.findByText(/invalid email address/i);
      await expect(errorMessage).toBeInTheDocument();
    });

    await step("Verify onSubmit was NOT called", async () => {
      await expect(args.onSubmit).not.toHaveBeenCalled();
    });
  },
);

EmptyForm.test(
  "Shows error for short password",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "short");
    await userEvent.click(canvas.getByRole("button", { name: /log in/i }));

    const errorMessage = await canvas.findByText(
      /password must be at least 8 characters/i,
    );
    await expect(errorMessage).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
);

EmptyForm.test(
  "Shows errors for empty fields",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /log in/i }));

    const emailError = await canvas.findByText(/invalid email address/i);
    await expect(emailError).toBeInTheDocument();

    const passwordError = await canvas.findByText(
      /password must be at least 8 characters/i,
    );
    await expect(passwordError).toBeInTheDocument();

    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
);

export const Loading = meta.story({
  args: {
    isLoading: true,
  },
});

Loading.test("Renders loading state", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /log in/i })).toBeDisabled();
});
```

---

## Example 3: Modal Dialog Component

**Component:**

```tsx
// components/ConfirmDialog.tsx
"use client";

import { Button } from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-lg bg-white p-6"
      >
        <h2 id="dialog-title" className="mb-2 text-xl font-bold">
          {title}
        </h2>
        <p className="mb-6 text-gray-600">{message}</p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Story File:**

```tsx
// components/ConfirmDialog.stories.tsx
import preview from "~/.storybook/preview";
import { expect, fn } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

const meta = preview.meta({
  title: "Components/Confirm Dialog",
  component: ConfirmDialog,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    isOpen: true,
    onConfirm: fn(),
    onCancel: fn(),
  },
});

export const OpenDialog = meta.story({
  args: {
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  },
});

OpenDialog.test("Renders dialog with title and message", async ({ canvas }) => {
  const dialog = canvas.getByRole("dialog");
  await expect(dialog).toBeInTheDocument();
  await expect(canvas.getByText("Confirm Action")).toBeInTheDocument();
  await expect(
    canvas.getByText("Are you sure you want to proceed?"),
  ).toBeInTheDocument();
});

OpenDialog.test(
  "Calls onConfirm when confirm button clicked",
  async ({ canvas, userEvent, args }) => {
    const confirmButton = canvas.getByRole("button", { name: /confirm/i });
    await userEvent.click(confirmButton);

    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
);

OpenDialog.test(
  "Calls onCancel when cancel button clicked",
  async ({ canvas, userEvent, args }) => {
    const cancelButton = canvas.getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelButton);

    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
);

OpenDialog.test(
  "Supports keyboard navigation and Enter to confirm",
  async ({ canvas, userEvent, args }) => {
    // Tab to first button (Cancel)
    await userEvent.tab();
    const cancelButton = canvas.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toHaveFocus();

    // Tab to second button (Confirm)
    await userEvent.tab();
    const confirmButton = canvas.getByRole("button", { name: /confirm/i });
    await expect(confirmButton).toHaveFocus();

    // Press Enter on confirm
    await userEvent.keyboard("{Enter}");
    await expect(args.onConfirm).toHaveBeenCalled();
  },
);

export const Destructive = meta.story({
  args: {
    title: "Delete Item",
    message: "This action cannot be undone. Are you sure?",
    confirmLabel: "Delete",
    cancelLabel: "Keep",
    variant: "destructive",
  },
});

Destructive.test("Renders destructive variant", async ({ canvas }) => {
  await expect(canvas.getByText("Delete Item")).toBeInTheDocument();
  const deleteButton = canvas.getByRole("button", { name: /delete/i });
  await expect(deleteButton).toHaveClass("bg-red-600");
});

export const Closed = meta.story({
  args: {
    isOpen: false,
    title: "This won't be visible",
    message: "Dialog is closed",
  },
});

Closed.test("Renders nothing when closed", async ({ canvas }) => {
  const dialog = canvas.queryByRole("dialog");
  await expect(dialog).not.toBeInTheDocument();
});
```

---

## Example 4: Select/Dropdown Component

**Story File:**

```tsx
// components/Select.stories.tsx
import preview from "~/.storybook/preview";
import { expect, fn } from "storybook/test";

const meta = preview.meta({
  title: "Components/Select",
  render: (args) => (
    <select
      className="px-3 py-2 border rounded"
      onChange={(e) => args.onChange(e.target.value)}
      defaultValue={args.defaultValue}
    >
      <option value="">Select an option</option>
      <option value="option1">Option 1</option>
      <option value="option2">Option 2</option>
      <option value="option3">Option 3</option>
    </select>
  ),
  args: {
    onChange: fn(),
    defaultValue: "",
  },
});

// Visual documentation story
export const EmptySelect = meta.story({});

export const WithDefaultValue = meta.story({
  args: {
    defaultValue: "option2",
  },
});

// Test story
export const SelectOption = meta.story({});

SelectOption.test(
  "Selects and triggers onChange",
  async ({ canvas, userEvent, args, step }) => {
    const select = canvas.getByRole("combobox");

    await step("Select option", async () => {
      await userEvent.selectOptions(select, "option2");
    });

    await step("Verify onChange was called", async () => {
      await expect(args.onChange).toHaveBeenCalledWith("option2");
    });

    await step("Verify selected value", async () => {
      await expect(select).toHaveValue("option2");
    });
  },
);
```

---

# Templates

Reusable templates for common component types. Copy, customize, and extend for your components.

## Template: Form Component

```typescript
import { expect, fn, waitFor } from "storybook/test";
import preview from "~/.storybook/preview";
import { ContactForm } from "./contact-form";

const meta = preview.meta({
  title: "Components/Contact Form",
  component: ContactForm,
  args: {
    onSubmit: fn(),
  },
});

// Story 1: Empty form (main test story)
export const EmptyForm = meta.story({
  args: { defaultValues: {} },
});

EmptyForm.test("Renders all form fields", async ({ canvas }) => {
  await expect(canvas.getByLabelText(/name/i)).toBeVisible();
  await expect(canvas.getByLabelText(/email/i)).toBeVisible();
  await expect(canvas.getByLabelText(/message/i)).toBeVisible();
  await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
});

EmptyForm.test(
  "Shows validation error on empty submit",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await waitFor(async () => {
      await expect(canvas.getByText(/email is required/i)).toBeInTheDocument();
    });
  },
);

EmptyForm.test(
  "Submits form successfully with valid data",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText(/name/i), "John Doe");
    await userEvent.type(canvas.getByLabelText(/email/i), "john@example.com");
    await userEvent.type(canvas.getByLabelText(/message/i), "Hello!");
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      message: "Hello!",
    });
  },
);

// Story 2: Pre-filled form
export const FilledForm = meta.story({
  args: {
    defaultValues: {
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Pre-filled message",
    },
  },
});

FilledForm.test("Displays pre-filled values", async ({ canvas, args }) => {
  await expect(canvas.getByLabelText(/name/i)).toHaveValue(
    args.defaultValues.name,
  );
  await expect(canvas.getByLabelText(/email/i)).toHaveValue(
    args.defaultValues.email,
  );
});

// Story 3: Loading state
export const SubmittingForm = meta.story({
  args: { isSubmitting: true },
});

SubmittingForm.test(
  "Renders submitting state correctly",
  async ({ canvas, step }) => {
    await step("Submit button is disabled", async () => {
      await expect(
        canvas.getByRole("button", { name: /submit/i }),
      ).toBeDisabled();
    });
    await step("Loading indicator is visible", async () => {
      await expect(canvas.getByRole("progressbar")).toBeVisible();
    });
  },
);
```

## Template: List/Table Component

```typescript
import { expect, fn } from "storybook/test";
import preview from "~/.storybook/preview";
import { itemBuilder } from "~/features/item/test/builders";
import { ItemList } from "./item-list";

const meta = preview.meta({
  title: "Components/Item List",
  component: ItemList,
  args: {
    onItemClick: fn(),
  },
});

export const EmptyList = meta.story({
  args: { items: [] },
});

EmptyList.test("Shows empty state message", async ({ canvas }) => {
  await expect(canvas.getByText(/no items found/i)).toBeVisible();
});

export const PopulatedList = meta.story({
  args: { items: Array.from({ length: 5 }, () => itemBuilder.one()) },
});

PopulatedList.test("Renders all items in table", async ({ canvas, args }) => {
  const rows = canvas.getAllByRole("row");
  await expect(rows.length).toBe(args.items.length + 1); // +1 for header
});

PopulatedList.test(
  "Clicking item triggers callback",
  async ({ canvas, userEvent, args }) => {
    const firstRow = canvas.getAllByRole("row")[1];
    await userEvent.click(firstRow);
    await expect(args.onItemClick).toHaveBeenCalledWith(args.items[0]);
  },
);

export const LoadingList = meta.story({
  args: { isLoading: true },
});

LoadingList.test("Shows loading skeleton", async ({ canvas }) => {
  await expect(canvas.getByRole("progressbar")).toBeVisible();
});
```

## Template: Modal/Dialog Component

```typescript
import { expect, fn, screen } from "storybook/test";
import preview from "~/.storybook/preview";
import { ConfirmDialog } from "./confirm-dialog";

const meta = preview.meta({
  title: "Components/Confirm Dialog",
  component: ConfirmDialog,
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
});

export const OpenDialog = meta.story({
  args: {
    isOpen: true,
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  },
});

OpenDialog.test(
  "Renders all expected content",
  async ({ canvas, args, step }) => {
    await step("Dialog is visible with title and message", async () => {
      const dialog = canvas.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(canvas.getByText(args.title)).toBeVisible();
    });
    await step("Confirm and cancel buttons are visible", async () => {
      await expect(
        canvas.getByRole("button", { name: /confirm/i }),
      ).toBeVisible();
      await expect(
        canvas.getByRole("button", { name: /cancel/i }),
      ).toBeVisible();
    });
  },
);

OpenDialog.test(
  "Clicking confirm triggers onConfirm",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /confirm/i }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
);

OpenDialog.test(
  "Pressing Escape triggers onCancel",
  async ({ userEvent, args }) => {
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalled();
  },
);

OpenDialog.test("Has correct ARIA attributes", async ({ canvas }) => {
  const dialog = canvas.getByRole("dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveAttribute("aria-labelledby");
});
```

## Template: Input/TextField Component

```typescript
import { expect, fn } from "storybook/test";
import preview from "~/.storybook/preview";
import { EmailInput } from "./email-input";

const meta = preview.meta({
  title: "Components/Email Input",
  component: EmailInput,
  args: {
    onChange: fn(),
  },
});

export const EmptyInput = meta.story({
  args: { label: "Email", placeholder: "Enter your email" },
});

EmptyInput.test("Renders label and input field", async ({ canvas, args }) => {
  await expect(canvas.getByLabelText(args.label)).toBeVisible();
  await expect(canvas.getByPlaceholderText(args.placeholder)).toBeVisible();
});

EmptyInput.test("Typing updates input value", async ({ canvas, userEvent }) => {
  const input = canvas.getByRole("textbox");
  await userEvent.type(input, "test@example.com");
  await expect(input).toHaveValue("test@example.com");
});

EmptyInput.test(
  "Triggers onChange on input",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByRole("textbox"), "test@example.com");
    await expect(args.onChange).toHaveBeenCalled();
  },
);

export const ErrorInput = meta.story({
  args: {
    label: "Email",
    value: "invalid",
    error: "Invalid email address",
  },
});

ErrorInput.test(
  "Renders error state correctly",
  async ({ canvas, args, step }) => {
    await step("Error message is displayed", async () => {
      await expect(canvas.getByText(args.error)).toBeVisible();
    });
    await step("Input has aria-invalid attribute", async () => {
      await expect(canvas.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  },
);

export const DisabledInput = meta.story({
  args: { label: "Email", disabled: true },
});

DisabledInput.test("Input is disabled", async ({ canvas }) => {
  await expect(canvas.getByRole("textbox")).toBeDisabled();
});
```

## Template: Select/Dropdown Component (with Portal)

```typescript
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

export const SelectStory = meta.story({
  args: { label: "Choose an option" },
});

SelectStory.test(
  "Selects option and triggers onChange",
  async ({ canvas, userEvent, args, step }) => {
    await step("Open dropdown", async () => {
      const select = canvas.getByRole("combobox");
      await userEvent.click(select);
    });

    await step("Select option from portal", async () => {
      // Portal content (renders to document.body) — use screen
      const option = await screen.findByRole("option", { name: /option 2/i });
      await userEvent.click(option);
    });

    await step("Verify onChange callback", async () => {
      await expect(args.onChange).toHaveBeenCalledWith("2");
    });
  },
);
```

## Template: Card Component

```typescript
import { fn } from "storybook/test";
import preview from "~/.storybook/preview";
import { Card } from "./Card";

const meta = preview.meta({
  component: Card,
});

export const WithTitle = meta.story({
  args: {
    title: "Card Title",
    children: "Card content goes here",
  },
});

export const WithFooter = meta.story({
  args: {
    title: "Card Title",
    children: "Card content",
    footer: <button>Action</button>,
  },
});

export const Interactive = meta.story({
  args: {
    title: "Card Title",
    onClick: fn(),
  },
});

export const Loading = meta.story({
  args: {
    isLoading: true,
  },
});
```

## Template: Tabs Component

```typescript
import { expect } from "storybook/test";
import preview from "~/.storybook/preview";
import { Tabs } from "./Tabs";

const meta = preview.meta({
  component: Tabs,
  args: {
    tabs: [
      { id: "tab1", label: "Tab 1", content: "Content 1" },
      { id: "tab2", label: "Tab 2", content: "Content 2" },
      { id: "tab3", label: "Tab 3", content: "Content 3" },
    ],
  },
});

export const FirstTab = meta.story({});

export const TabNavigation = meta.story({});

TabNavigation.test("First tab is selected by default", async ({ canvas }) => {
  const firstTab = canvas.getByRole("tab", { name: /tab 1/i });
  await expect(firstTab).toHaveAttribute("aria-selected", "true");
});

TabNavigation.test(
  "Clicking tab switches content",
  async ({ canvas, userEvent, step }) => {
    await step("Click second tab", async () => {
      const secondTab = canvas.getByRole("tab", { name: /tab 2/i });
      await userEvent.click(secondTab);
      await expect(secondTab).toHaveAttribute("aria-selected", "true");
    });
    await step("Content updates to selected tab", async () => {
      await expect(canvas.getByText("Content 2")).toBeInTheDocument();
    });
  },
);
```
