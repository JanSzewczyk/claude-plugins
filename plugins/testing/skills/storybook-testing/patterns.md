# Storybook Testing Patterns (CSF Next)

Reference patterns for different testing scenarios using CSF Next format with `.test()` method.

> **KEY PRINCIPLE:** Use `.test()` method to add multiple tests to a single story instead of creating separate test
> stories.

## Basic Story Structure

```typescript
import { expect, fn, waitFor } from "storybook/test";

import preview from "~/.storybook/preview";

import { MyComponent } from "./my-component";

const meta = preview.meta({
  title: "Features/My Feature/My Component",
  component: MyComponent,
  args: {
    onSubmit: fn(),
  },
});

// ONE story for the component state
export const ComponentStory = meta.story({ name: "My Component" });

// MULTIPLE tests using .test() method
ComponentStory.test("Test name 1", async ({ canvas }) => {
  /* ... */
});
ComponentStory.test("Test name 2", async ({ canvas, userEvent }) => {
  /* ... */
});
ComponentStory.test("Test name 3", async ({ canvas, args }) => {
  /* ... */
});
```

## Pattern 1: Grouped Content Assertions with `step()`

✅ **Group all static content checks into ONE test with `step()` for structured reporting:**

```typescript
export const EmptyForm = meta.story({});

// ONE test for ALL content, organized with step()
// ❌ Anti-pattern: separate .test() per text element or flat assertions with comments
EmptyForm.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Heading and description are visible", async () => {
    await expect(
      canvas.getByRole("heading", { name: /section title/i, level: 2 }),
    ).toBeVisible();
    await expect(
      canvas.getByText(/descriptive text about the section/i),
    ).toBeVisible();
  });

  await step("Form fields are visible", async () => {
    await expect(canvas.getByLabelText(/email/i)).toBeVisible();
    await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  });

  await step("Submit button is visible", async () => {
    await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
  });
});

// SEPARATE tests for each distinct behavior
EmptyForm.test(
  "Submits form on button click",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
);
```

> **Rule:** Static content (text, headings, labels, icons) for the same story state → always
> group into `"Renders all expected content"` with `step()`. Skip the content test if behavior
> tests already verify those elements implicitly.

## Pattern 2: Prefilled Values Testing

✅ **Separate story for different state, multiple tests for that state:**

```typescript
export const Prefilled = meta.story({
  args: {
    defaultValues: {
      email: "user@example.com",
      name: "John Doe",
    },
  },
});

Prefilled.test(
  "Displays all pre-filled values",
  async ({ canvas, args, step }) => {
    await step("Email is pre-filled", async () => {
      await expect(canvas.getByLabelText(/email/i)).toHaveValue(
        args.defaultValues?.email,
      );
    });
    await step("Name is pre-filled", async () => {
      await expect(canvas.getByLabelText(/name/i)).toHaveValue(
        args.defaultValues?.name,
      );
    });
  },
);

Prefilled.test(
  "Can modify pre-filled values",
  async ({ canvas, userEvent }) => {
    const emailInput = canvas.getByLabelText(/email/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "new@example.com");
    await expect(emailInput).toHaveValue("new@example.com");
  },
);
```

## Pattern 3: Validation Testing

✅ **Group validation tests under EmptyForm story:**

```typescript
export const EmptyForm = meta.story({
  args: { onSubmit: fn() },
});

EmptyForm.test("Shows error on empty email", async ({ canvas, userEvent }) => {
  const submitButton = canvas.getByRole("button", { name: /submit/i });
  await userEvent.click(submitButton);

  await waitFor(async () => {
    const errorMessage = canvas.getByText(/email is required/i);
    await expect(errorMessage).toBeInTheDocument();
  });
});

EmptyForm.test(
  "Shows error on invalid email format",
  async ({ canvas, userEvent }) => {
    const emailInput = canvas.getByLabelText(/email/i);
    await userEvent.type(emailInput, "invalid-email");

    const submitButton = canvas.getByRole("button", { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(async () => {
      const errorMessage = canvas.getByText(/invalid email/i);
      await expect(errorMessage).toBeInTheDocument();
    });
  },
);

EmptyForm.test(
  "Does not submit with validation errors",
  async ({ canvas, userEvent, args }) => {
    const submitButton = canvas.getByRole("button", { name: /submit/i });
    await userEvent.click(submitButton);

    await waitFor(async () => {
      await expect(canvas.getByText(/required/i)).toBeInTheDocument();
    });

    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
);
```

## Pattern 4: User Interaction Testing

✅ **Test complete interactions with `.test()`:**

```typescript
export const EmptyForm = meta.story({
  args: { onSubmit: fn() },
});

EmptyForm.test(
  "Submits form with valid data",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));

    await waitFor(async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  },
);

EmptyForm.test("Can clear input fields", async ({ canvas, userEvent }) => {
  const emailInput = canvas.getByLabelText(/email/i);
  await userEvent.type(emailInput, "test@example.com");
  await userEvent.clear(emailInput);
  await expect(emailInput).toHaveValue("");
});

EmptyForm.test(
  "Form submit on Enter key",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    await userEvent.keyboard("{Enter}");

    await waitFor(async () => {
      await expect(args.onSubmit).toHaveBeenCalled();
    });
  },
);
```

## Pattern 5: Loading State Testing

✅ **Separate story for loading state:**

```typescript
export const Loading = meta.story({
  args: {
    onSubmit: async () => new Promise((resolve) => setTimeout(resolve, 2000)),
  },
});

Loading.test(
  "Disables button during submission",
  async ({ canvas, userEvent }) => {
    const submitButton = canvas.getByRole("button", { name: /submit/i });
    await userEvent.click(submitButton);

    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveAttribute("data-state", "loading");
  },
);

Loading.test("Shows loading indicator", async ({ canvas, userEvent }) => {
  const submitButton = canvas.getByRole("button", { name: /submit/i });
  await userEvent.click(submitButton);

  await expect(canvas.getByRole("progressbar")).toBeVisible();
});
```

## Pattern 6: Portal/Dropdown Testing

✅ **Use `screen` for portal content:**

```typescript
import { screen } from "storybook/test";

export const ClosedDropdown = meta.story({});

ClosedDropdown.test(
  "Opens dropdown on trigger click",
  async ({ canvas, userEvent }) => {
    const trigger = canvas.getByLabelText("Select option");
    await userEvent.click(trigger);

    // For portal content (modals, dropdowns, tooltips), use screen
    // Portals typically render to document.body
    await waitFor(async () => {
      const option = screen.getByRole("option", { name: /option 1/i });
      await expect(option).toBeVisible();
    });
  },
);

ClosedDropdown.test(
  "Selects option and updates trigger",
  async ({ canvas, userEvent }) => {
    const trigger = canvas.getByLabelText("Select option");
    await userEvent.click(trigger);

    const option = await screen.findByRole("option", { name: /option 1/i });
    await userEvent.click(option);

    await expect(trigger).toHaveTextContent("Option 1");
  },
);
```

## Pattern 7: Tooltip Testing

✅ **Separate tests for show/hide:**

```typescript
export const IdleTooltip = meta.story({});

IdleTooltip.test("Shows tooltip on hover", async ({ canvas, userEvent }) => {
  const trigger = canvas.getByRole("button", { name: /info/i });
  await userEvent.hover(trigger);

  const tooltip = await screen.findByRole("tooltip");
  await expect(tooltip).toHaveTextContent(/helpful information/i);
});

IdleTooltip.test("Hides tooltip on unhover", async ({ canvas, userEvent }) => {
  const trigger = canvas.getByRole("button", { name: /info/i });
  await userEvent.hover(trigger);

  const tooltip = await screen.findByRole("tooltip");
  await expect(tooltip).toBeVisible();

  await userEvent.unhover(trigger);
  await waitFor(async () => {
    await expect(tooltip).not.toBeInTheDocument();
  });
});
```

## Pattern 8: Callback Testing

✅ **Test callback invocations:**

```typescript
export const ButtonPanel = meta.story({
  args: {
    onBack: fn(),
    onNext: fn(),
  },
});

ButtonPanel.test(
  "Back button calls onBack",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /back/i }));
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
);

ButtonPanel.test(
  "Next button calls onNext",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /next/i }));
    await expect(args.onNext).toHaveBeenCalledOnce();
  },
);

ButtonPanel.test(
  "Prevents double submission",
  async ({ canvas, userEvent, args }) => {
    const submitBtn = canvas.getByRole("button", { name: /submit/i });
    await userEvent.click(submitBtn);
    await userEvent.click(submitBtn);
    await userEvent.click(submitBtn);

    // Should be debounced/prevented
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
);
```

## Pattern 9: Error Handling Testing

✅ **Test error states:**

```typescript
export const ErrorState = meta.story({
  args: {
    onSubmit: fn(async () => ({
      success: false as const,
      error: "Failed to save. Please try again.",
    })),
  },
});

ErrorState.test(
  "Displays error message on failure",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));

    await waitFor(async () => {
      const error = canvas.getByText(/failed to save/i);
      await expect(error).toBeVisible();
    });
  },
);

ErrorState.test(
  "Retains form data after error",
  async ({ canvas, userEvent }) => {
    const emailInput = canvas.getByLabelText(/email/i);
    await userEvent.type(emailInput, "user@example.com");

    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));

    await waitFor(async () => {
      await expect(canvas.getByText(/failed to save/i)).toBeVisible();
    });

    // Form data should still be present
    await expect(emailInput).toHaveValue("user@example.com");
  },
);
```

## Pattern 10: Keyboard Navigation Testing

✅ **Test keyboard interactions:**

```typescript
export const FormFields = meta.story({});

FormFields.test(
  "Tab navigates between fields",
  async ({ canvas, userEvent }) => {
    const firstInput = canvas.getByLabelText(/first name/i);
    firstInput.focus();

    await userEvent.tab();
    await expect(canvas.getByLabelText(/last name/i)).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByLabelText(/email/i)).toHaveFocus();
  },
);

FormFields.test(
  "Enter key submits form",
  async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.keyboard("{Enter}");

    await expect(args.onSubmit).toHaveBeenCalled();
  },
);

FormFields.test(
  "Escape key closes modal",
  async ({ canvas, userEvent, args }) => {
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalled();
  },
);
```

## Pattern 11: Using `play` Function

`play` has two valid use cases. It should **never** be used for independent test assertions.

### 11a. Demo / Interaction Presentation (no assertions)

✅ **Use `play` to present component interaction in Storybook UI:**

```typescript
// play for demo — shows a filled form in Storybook docs
export const FilledForm = meta.story({
  name: "Form with data",
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    // No assertions — purely visual presentation
  },
});
```

### 11b. Complex Dependent Flow (rare)

⚠️ **Use `play` with `step()` only when steps depend on each other:**

```typescript
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
      await userEvent.click(
        canvas.getByRole("checkbox", { name: /accept terms/i }),
      );
    });

    await step("User submits form", async () => {
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

> **Note:** Use `play` for complete user journeys viewed as ONE cohesive flow, or for demos presenting component
> interaction. For individual test scenarios, always use `.test()` method.

## Mocking Patterns

For mocking patterns (API requests with MSW, external modules with `sb.mock()`, callback props with `fn()`, React Context with decorators, Next.js hooks), see [mocking.md](./mocking.md).

---

## Summary: When to Use Each Pattern

| Pattern               | Use Case                 | Method                         |
| --------------------- | ------------------------ | ------------------------------ |
| **Initial State**     | Test default rendering   | `.test()` per check            |
| **Prefilled Values**  | Test with preset data    | Separate story + `.test()`     |
| **Validation**        | Form validation rules    | `.test()` per rule             |
| **User Interactions** | Clicks, typing, changes  | `.test()` per interaction      |
| **Async Actions**     | Loading, success, errors | Separate stories + `.test()`   |
| **Accessibility**     | Keyboard, ARIA, focus    | `.test()` per a11y check       |
| **Error States**      | Error handling           | Separate story + `.test()`     |
| **Keyboard Nav**      | Tab, Enter, Escape       | `.test()` per key combo        |
| **Complete Flow**     | Multi-step journey       | `play` function with `step()`  |
| **Mocking**           | APIs, modules, context   | See [mocking.md](./mocking.md) |

**Golden Rule:** Use `.test()` for individual test cases. Use `play` for complete user journeys.
