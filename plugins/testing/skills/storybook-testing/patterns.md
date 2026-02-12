# Storybook Testing Patterns (CSF Next)

Reference patterns for different testing scenarios using CSF Next format with `.test()` method.

> **KEY PRINCIPLE:** Use `.test()` method to add multiple tests to a single story instead of creating separate test
> stories.

## Basic Story Structure

```typescript
import { expect, fn, waitFor, within } from "storybook/test";

import preview from "~/.storybook/preview";

import { MyComponent } from "./my-component";

const meta = preview.meta({
  title: "Features/MyFeature/MyComponent",
  component: MyComponent,
  args: {
    onSubmit: fn(),
  },
});

// ONE story for default state
export const Default = meta.story({});

// MULTIPLE tests using .test() method
Default.test("Test name 1", async ({ canvas }) => {
  /* ... */
});
Default.test("Test name 2", async ({ canvas, userEvent }) => {
  /* ... */
});
Default.test("Test name 3", async ({ canvas, args }) => {
  /* ... */
});
```

## Pattern 1: Initial State Testing

✅ **Use `.test()` for multiple independent checks:**

```typescript
export const Default = meta.story({});

Default.test("Renders email input field", async ({ canvas }) => {
  const input = canvas.getByLabelText(/email/i);
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("");
});

Default.test("Submit button is enabled by default", async ({ canvas }) => {
  const button = canvas.getByRole("button", { name: /submit/i });
  await expect(button).toBeEnabled();
});

Default.test("Shows form with all required fields", async ({ canvas }) => {
  await expect(canvas.getByLabelText(/email/i)).toBeVisible();
  await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
});
```

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

Prefilled.test("Displays pre-filled email", async ({ canvas, args }) => {
  const emailInput = canvas.getByLabelText(/email/i);
  await expect(emailInput).toHaveValue(args.defaultValues?.email);
});

Prefilled.test("Displays pre-filled name", async ({ canvas, args }) => {
  const nameInput = canvas.getByLabelText(/name/i);
  await expect(nameInput).toHaveValue(args.defaultValues?.name);
});

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

✅ **Group validation tests under Default story:**

```typescript
export const Default = meta.story({
  args: { onSubmit: fn() },
});

Default.test("Shows error on empty email", async ({ canvas, userEvent }) => {
  const submitButton = canvas.getByRole("button", { name: /submit/i });
  await userEvent.click(submitButton);

  await waitFor(async () => {
    const errorMessage = canvas.getByText(/email is required/i);
    await expect(errorMessage).toBeInTheDocument();
  });
});

Default.test(
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

Default.test(
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
export const Default = meta.story({
  args: { onSubmit: fn() },
});

Default.test(
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

Default.test("Can clear input fields", async ({ canvas, userEvent }) => {
  const emailInput = canvas.getByLabelText(/email/i);
  await userEvent.type(emailInput, "test@example.com");
  await userEvent.clear(emailInput);
  await expect(emailInput).toHaveValue("");
});

Default.test(
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

export const Default = meta.story({});

Default.test(
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

Default.test(
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
export const Default = meta.story({});

Default.test("Shows tooltip on hover", async ({ canvas, userEvent }) => {
  const trigger = canvas.getByRole("button", { name: /info/i });
  await userEvent.hover(trigger);

  const tooltip = await screen.findByRole("tooltip");
  await expect(tooltip).toHaveTextContent(/helpful information/i);
});

Default.test("Hides tooltip on unhover", async ({ canvas, userEvent }) => {
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
export const Default = meta.story({
  args: {
    onBack: fn(),
    onNext: fn(),
  },
});

Default.test(
  "Back button calls onBack",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /back/i }));
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
);

Default.test(
  "Next button calls onNext",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /next/i }));
    await expect(args.onNext).toHaveBeenCalledOnce();
  },
);

Default.test(
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
export const Default = meta.story({});

Default.test("Tab navigates between fields", async ({ canvas, userEvent }) => {
  const firstInput = canvas.getByLabelText(/first name/i);
  firstInput.focus();

  await userEvent.tab();
  await expect(canvas.getByLabelText(/last name/i)).toHaveFocus();

  await userEvent.tab();
  await expect(canvas.getByLabelText(/email/i)).toHaveFocus();
});

Default.test("Enter key submits form", async ({ canvas, userEvent, args }) => {
  await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
  await userEvent.keyboard("{Enter}");

  await expect(args.onSubmit).toHaveBeenCalled();
});

Default.test("Escape key closes modal", async ({ canvas, userEvent, args }) => {
  await userEvent.keyboard("{Escape}");
  await expect(args.onClose).toHaveBeenCalled();
});
```

## Pattern 11: Complete User Flow (Use `play` function)

⚠️ **Use `play` function for complex multi-step flows:**

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

> **Note:** Use `play` function with `step()` for complete user journeys that should be viewed as ONE cohesive flow. For
> individual test scenarios, use `.test()` method.

## Pattern 12: Mocking API Requests (MSW)

✅ **Use MSW to mock network requests per story:**

```typescript
import { http, HttpResponse, delay } from "msw";

// Success state
export const LoadedUsers = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", () => {
          return HttpResponse.json([
            { id: 1, name: "John Doe" },
            { id: 2, name: "Jane Smith" },
          ]);
        }),
      ],
    },
  },
});

LoadedUsers.test("Displays list of users", async ({ canvas }) => {
  const john = await canvas.findByText("John Doe");
  await expect(john).toBeVisible();
});

// Error state
export const ErrorState = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", async () => {
          await delay(500);
          return new HttpResponse(null, { status: 500 });
        }),
      ],
    },
  },
});

ErrorState.test("Shows error message", async ({ canvas }) => {
  const error = await canvas.findByText(/failed to load/i);
  await expect(error).toBeVisible();
});

// Loading state
export const LoadingState = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", async () => {
          await delay("infinite");
          return HttpResponse.json([]);
        }),
      ],
    },
  },
});

LoadingState.test("Shows loading indicator", async ({ canvas }) => {
  const spinner = canvas.getByRole("status");
  await expect(spinner).toBeVisible();
});
```

> **See [mocking.md](./mocking.md) for complete MSW documentation including GraphQL mocking.**

## Pattern 13: Mocking External Modules

✅ **Mock external dependencies with `sb.mock()` and configure with `beforeEach`:**

```typescript
import { expect, mocked } from "storybook/test";

import preview from "~/.storybook/preview";

// These modules are mocked via sb.mock() in .storybook/preview.ts
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser } from "~/lib/session";

import { UserProfile } from "./user-profile";

const meta = preview.meta({
  component: UserProfile,
  // Configure mocks before each story
  beforeEach: async () => {
    mocked(uuidv4).mockReturnValue("fixed-uuid-123");
    mocked(getCurrentUser).mockResolvedValue({
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    });
  },
});

export const LoggedInUser = meta.story({});

LoggedInUser.test("Displays current user info", async ({ canvas }) => {
  const userName = await canvas.findByText("John Doe");
  await expect(userName).toBeVisible();

  const userEmail = await canvas.findByText("john@example.com");
  await expect(userEmail).toBeVisible();
});

LoggedInUser.test("Uses UUID for tracking", async () => {
  await expect(uuidv4).toHaveBeenCalled();
});

// Override mock for specific story
export const GuestUser = meta.story({
  beforeEach: async () => {
    mocked(getCurrentUser).mockResolvedValue(null);
  },
});

GuestUser.test("Shows guest message", async ({ canvas }) => {
  const guestMessage = await canvas.findByText(/welcome guest/i);
  await expect(guestMessage).toBeVisible();
});
```

> **See [mocking.md](./mocking.md) for module mocking setup in `.storybook/preview.ts`.**

## Pattern 14: Mocking Callback Props

✅ **Use `fn()` to mock and spy on callbacks:**

```typescript
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { SearchForm } from "./search-form";

const meta = preview.meta({
  component: SearchForm,
  args: {
    onSearch: fn(),
    onClear: fn(),
  },
});

export const SearchForm = meta.story({});

SearchForm.test(
  "Calls onSearch with query value",
  async ({ canvas, userEvent, args }) => {
    const searchInput = canvas.getByRole("textbox");
    await userEvent.type(searchInput, "storybook");

    const searchButton = canvas.getByRole("button", { name: /search/i });
    await userEvent.click(searchButton);

    await expect(args.onSearch).toHaveBeenCalledWith("storybook");
    await expect(args.onSearch).toHaveBeenCalledTimes(1);
  },
);

SearchForm.test(
  "Calls onClear when clear button clicked",
  async ({ canvas, userEvent, args }) => {
    const clearButton = canvas.getByRole("button", { name: /clear/i });
    await userEvent.click(clearButton);

    await expect(args.onClear).toHaveBeenCalled();
    await expect(args.onSearch).not.toHaveBeenCalled();
  },
);
```

## Pattern 15: Mocking React Context

✅ **Use decorators to provide mock context values:**

```typescript
import { createContext } from "react";

import preview from "~/.storybook/preview";

import { Dashboard } from "./dashboard";

const AuthContext = createContext<{ user: User | null }>({ user: null });

const meta = preview.meta({
  component: Dashboard,
});

// Authenticated user story
export const AuthenticatedUser = meta.story({
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          user: {
            id: "user-123",
            name: "John Doe",
            role: "admin",
          },
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
});

AuthenticatedUser.test("Shows user dashboard", async ({ canvas }) => {
  const welcome = await canvas.findByText(/welcome, john doe/i);
  await expect(welcome).toBeVisible();

  const adminPanel = canvas.getByRole("link", { name: /admin panel/i });
  await expect(adminPanel).toBeVisible();
});

// Unauthenticated user story
export const UnauthenticatedUser = meta.story({
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: null }}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
});

UnauthenticatedUser.test("Shows login prompt", async ({ canvas }) => {
  const loginButton = canvas.getByRole("button", { name: /sign in/i });
  await expect(loginButton).toBeVisible();
});
```

## Pattern 16: Mocking Next.js Hooks

✅ **Mock Next.js navigation hooks in parameters:**

```typescript
import { expect } from "storybook/test";
import { redirect, getRouter } from "@storybook/nextjs/navigation.mock";

import preview from "~/.storybook/preview";

import { ProductPage } from "./product-page";

const meta = preview.meta({
  component: ProductPage,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        // Mock useParams()
        segments: [
          ["category", "electronics"],
          ["id", "prod-123"],
        ],
        // Mock useSearchParams()
        query: {
          sort: "price",
          filter: "inStock",
        },
      },
    },
  },
});

export const ProductPage = meta.story({});

ProductPage.test("Displays product from params", async ({ canvas }) => {
  // Component uses useParams(): { category: "electronics", id: "prod-123" }
  const productTitle = await canvas.findByText(/product prod-123/i);
  await expect(productTitle).toBeVisible();
});

ProductPage.test("Applies filters from search params", async ({ canvas }) => {
  // Component uses useSearchParams(): { sort: "price", filter: "inStock" }
  const sortLabel = canvas.getByText(/sorted by price/i);
  await expect(sortLabel).toBeVisible();
});

ProductPage.test("Back button navigates", async ({ canvas, userEvent }) => {
  const backButton = canvas.getByRole("button", { name: /back/i });
  await userEvent.click(backButton);

  await expect(getRouter().back).toHaveBeenCalled();
});
```

> **See [mocking.md](./mocking.md) for complete Next.js mocking documentation.**

---

## Summary: When to Use Each Pattern

| Pattern                   | Use Case                 | Method                        |
| ------------------------- | ------------------------ | ----------------------------- |
| **Initial State**         | Test default rendering   | `.test()` per check           |
| **Prefilled Values**      | Test with preset data    | Separate story + `.test()`    |
| **Validation**            | Form validation rules    | `.test()` per rule            |
| **User Interactions**     | Clicks, typing, changes  | `.test()` per interaction     |
| **Async Actions**         | Loading, success, errors | Separate stories + `.test()`  |
| **Conditional Rendering** | Show/hide based on state | Separate stories + `.test()`  |
| **Accessibility**         | Keyboard, ARIA, focus    | `.test()` per a11y check      |
| **Error States**          | Error handling           | Separate story + `.test()`    |
| **Keyboard Nav**          | Tab, Enter, Escape       | `.test()` per key combo       |
| **Complete Flow**         | Multi-step journey       | `play` function with `step()` |
| **API Mocking**           | Network requests         | MSW in `parameters`           |
| **Module Mocking**        | External dependencies    | `sb.mock()` + `beforeEach`    |
| **Callback Mocking**      | Event handlers           | `fn()` in args                |
| **Context Mocking**       | React Context            | Decorators                    |
| **Next.js Mocking**       | Routing, params          | `nextjs` parameters           |

**Golden Rule:** Use `.test()` for individual test cases. Use `play` for complete user journeys.
