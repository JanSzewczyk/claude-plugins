# Storybook Testing Best Practices (CSF Next)

## ⭐ Story Organization Best Practices

### 1. Use `.test()` Method for Multiple Tests ✅

**CRITICAL:** Use `.test()` method instead of creating separate test stories.

```typescript
// ❌ BAD - Multiple test stories (old pattern)
export const ClickTest = meta.story({
  play: async ({ canvas, userEvent, args }) => {
    /* test 1 */
  },
});

export const HoverTest = meta.story({
  play: async ({ canvas, userEvent }) => {
    /* test 2 */
  },
});

export const ValidationTest = meta.story({
  play: async ({ canvas }) => {
    /* test 3 */
  },
});

// ✅ GOOD - One story with multiple .test() calls (new pattern)
export const LoginFormStory = meta.story({ name: "Login Form" });

LoginFormStory.test(
  "Calls onSubmit when button clicked",
  async ({ canvas, userEvent, args }) => {
    /* test 1 */
  },
);

LoginFormStory.test("Shows tooltip on hover", async ({ canvas, userEvent }) => {
  /* test 2 */
});

LoginFormStory.test(
  "Shows validation error on empty submit",
  async ({ canvas }) => {
    /* test 3 */
  },
);
```

**Benefits:** 80% fewer stories, better isolation, clearer intent, less boilerplate

### 2. Use Specific Story Names ✅

```typescript
// ❌ BAD - Generic names
export const Default = meta.story({});
export const Story2 = meta.story({});
export const Test1 = meta.story({});

// ✅ GOOD - Single story: Use ComponentNameStory to avoid namespace collision
export const UserCardStory = meta.story({ name: "User Card" });
export const SearchInputStory = meta.story({ name: "Search Input" });

// ✅ GOOD - Multiple stories: Use plain descriptive state names (no suffix needed)
export const EmptyForm = meta.story({});
export const FilledForm = meta.story({});
export const LoadingButton = meta.story({ args: { isLoading: true } });
```

**Rules:**

- Single story (only one story for the component) → use `ComponentNameStory` + `name: "Component Name"` to avoid namespace collision with the imported component
- Multiple stories → plain descriptive state names without suffix (`EmptyForm` / `FilledForm`, `IdleButton` / `LoadingButton`)
- Avoid generic: ~~`Default`~~, ~~`Basic`~~, ~~`Example`~~

### 3. When to Use `.test()` vs `play` ✅

```typescript
// ✅ Use .test() for ALL test assertions (90% of cases)
export const ContactForm = meta.story({});

ContactForm.test("Shows validation error on empty email", async ({ canvas }) => { ... });
ContactForm.test("Submits successfully with valid data", async ({ canvas, args }) => { ... });
ContactForm.test("Keyboard navigation works", async ({ canvas, userEvent }) => { ... });

// ✅ Use play for DEMOS — presenting component interaction in Storybook UI (no assertions)
export const FilledForm = meta.story({
  name: "Form with data",
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    // No assertions — this is a visual demo, not a test
  },
});

// ⚠️ Use play for DEPENDENT FLOWS only (rare — 10% of cases)
export const CheckoutJourney = meta.story({
  name: "Complete Checkout Flow",
  play: async ({ canvas, step, userEvent }) => {
    await step("Add items to cart", async () => { ... });
    await step("Enter shipping info", async () => { ... });
    await step("Complete payment", async () => { ... });
  }
});
```

**Decision Criteria:**

- Independent test assertions? → Use `.test()`
- Presenting component interaction in Storybook docs? → Use `play` **without assertions**
- One cohesive multi-step dependent flow? → Use `play` with `step()`

## CSF Next Format Best Practices

### 1. Always Import Preview

```typescript
// GOOD - Import preview for type-safe factory functions
import preview from "~/.storybook/preview";

const meta = preview.meta({
  component: MyComponent,
});

export const MyComponentStory = meta.story({ name: "My Component" });
```

### 2. No Default Export Needed

```typescript
// CSF 3.0 (old)

// CSF Next (new) - No default export required
const meta = preview.meta({ ... });
```

### 3. Let Types Be Inferred

```typescript
// BAD - Unnecessary type annotations
import preview from "~/.storybook/preview";
export const Default: Story = {};

// GOOD - Types inferred automatically
const meta = preview.meta({ component: MyComponent });
export const MyComponentStory = meta.story({ name: "My Component" });
```

## ⭐ CRITICAL: userEvent from Function Parameters (Not Imports)

**ALWAYS use `userEvent` from the test function parameter, NEVER import it.**

```typescript
// ❌ WRONG - Do NOT import userEvent
import { expect, fn, userEvent } from "storybook/test";

Story.test("Example", async ({ canvas }) => {
  await userEvent.click(button); // ❌ Won't work
});

// ✅ CORRECT - Destructure userEvent from parameter
import { expect, fn } from "storybook/test";

Story.test("Example", async ({ canvas, userEvent }) => {
  await userEvent.click(button); // ✅ Works correctly
});
```

**Why?** The test framework provides `userEvent` as a function parameter with proper Storybook integration. Importing directly from `storybook/test` bypasses this integration and may cause timing issues.

**Rule:** Your imports should only include `expect`, `fn`, `waitFor`, `screen` if needed. Never import `userEvent`, `within`, or `canvas` - always destructure them from the function parameter.

## Testing Best Practices

### 1. Use Semantic Queries

```typescript
// GOOD - Accessible queries
canvas.getByRole("button", { name: /submit/i });
canvas.getByLabelText(/email/i);

// AVOID - Implementation-dependent queries
canvas.getByTestId("submit-btn");
canvas.querySelector(".btn-primary");
```

### 2. Await Async Operations

```typescript
// BAD
userEvent.click(button);
expect(args.onSubmit).toHaveBeenCalled();

// GOOD
await userEvent.click(button);
await expect(args.onSubmit).toHaveBeenCalled();
```

### 3. Use waitFor for Dynamic Content

```typescript
// BAD
const message = canvas.getByText(/success/i);

// GOOD
await waitFor(async () => {
  const message = canvas.getByText(/success/i);
  await expect(message).toBeVisible();
});

// ALSO GOOD - findBy* waits automatically
const message = await canvas.findByText(/success/i);
```

### 4. Test User-Visible Behavior

```typescript
// BAD - Testing implementation details
await expect(component.state.isLoading).toBe(true);

// GOOD - Testing visible outcomes
await expect(canvas.getByRole("button")).toBeDisabled();
await expect(canvas.getByText(/loading/i)).toBeVisible();
```

### 5. Mock Functions with fn()

```typescript
// BAD - Not trackable
args: {
  onSubmit: async () => {};
}

// GOOD - Trackable with fn()
args: {
  onSubmit: fn(async () => ({ success: true }));
}
```

### 6. Use `step()` for Test Organization (Both `play` and `.test()`)

Use `step()` instead of comments to organize test logic. `step()` provides structured, labeled reporting
in Storybook UI — comments are invisible in test output.

```typescript
// ✅ GOOD — step() in .test() for content assertions
Story.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Form fields are visible", async () => {
    await expect(canvas.getByLabelText(/email/i)).toBeVisible();
    await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  });
  await step("Action buttons are visible", async () => {
    await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
  });
});

// ✅ GOOD — step() in .test() for multi-step interactions
Story.test(
  "Submits form with valid data",
  async ({ canvas, userEvent, args, step }) => {
    await step("Fill in credentials", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(canvas.getByLabelText(/password/i), "secret");
    });
    await step("Submit and verify", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
      await expect(args.onSubmit).toHaveBeenCalled();
    });
  },
);

// ✅ GOOD — step() in play for cohesive user flow
play: async ({ canvas, userEvent, step }) => {
  await step("Fill in credentials", async () => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "secret");
  });
  await step("Submit and verify", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(canvas.getByText(/success/i)).toBeVisible();
  });
};

// ❌ BAD — comments instead of step()
Story.test("Submits form", async ({ canvas, userEvent, args }) => {
  // Fill in credentials
  await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
  // Submit
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
  // Verify
  await expect(args.onSubmit).toHaveBeenCalled();
});
```

**Rule:** Use `step()` when the test has 3+ phases or assertion groups. Skip for 1-2 line tests.

### 7. Handle Portals Correctly

```typescript
import { screen } from "storybook/test";

// BAD - Won't find portal content (portals render outside canvas)
const option = canvas.getByRole("option");

// GOOD - Use screen for portals
const option = await screen.findByRole("option");
```

**Portal query strategy:**

- **Use `screen`** for portal content (modals, tooltips, dropdowns)
- Portals render to document.body, so `screen` is the natural choice
- Simpler and more readable than `within(canvasElement.parentElement)`

### 8. Use queryBy\* for Negative Assertions

```typescript
// BAD - Throws error if not found
const error = canvas.getByText(/error/i);
await expect(error).toBeNull();

// GOOD - Returns null if not found
const error = canvas.queryByText(/error/i);
await expect(error).toBeNull();
```

### 9. Keep Stories Focused

```typescript
// ❌ BAD — Too many concerns in one story with play function
export const EverythingTest = meta.story({
  play: async ({ canvas }) => {
    // Tests initial state, validation, submission, error handling all in one...
  }
});

// ✅ GOOD — Separate stories for different states, tests attached to each
export const EmptyForm = meta.story({});
EmptyForm.test("Renders all expected content", async ({ canvas }) => { ... });
EmptyForm.test("Shows validation error on empty submit", async ({ canvas, userEvent }) => { ... });

export const FilledForm = meta.story({ args: { defaultValues: { email: "user@example.com" } } });
FilledForm.test("Displays pre-filled values", async ({ canvas, args }) => { ... });
FilledForm.test("Submits with pre-filled data", async ({ canvas, userEvent, args }) => { ... });

export const ErrorState = meta.story({ args: { onSubmit: fn(async () => ({ success: false, error: "Server error" })) } });
ErrorState.test("Shows error message on failure", async ({ canvas, userEvent }) => { ... });
```

## Common Pitfalls

### 1. Not Awaiting userEvent

```typescript
// BAD - Race condition
userEvent.click(button);
expect(args.onClick).toHaveBeenCalled();

// GOOD
await userEvent.click(button);
await expect(args.onClick).toHaveBeenCalled();
```

### 2. Using getBy\* for Elements That May Not Exist

```typescript
// BAD - Throws immediately if not found
const error = canvas.getByText(/error/i);

// GOOD - Returns null, doesn't throw
const error = canvas.queryByText(/error/i);
await expect(error).toBeNull();
```

### 3. Not Handling Async State Changes

```typescript
// BAD - May fail due to timing
await userEvent.click(submitButton);
const success = canvas.getByText(/success/i);

// GOOD - Wait for state change
await userEvent.click(submitButton);
await waitFor(async () => {
  const success = canvas.getByText(/success/i);
  await expect(success).toBeVisible();
});
```

### 4. Forgetting Portal Queries

```typescript
import { screen } from "storybook/test";

// BAD - Portal content not in canvas
const tooltip = canvas.getByRole("tooltip");

// GOOD - Use screen for portals
const tooltip = await screen.findByRole("tooltip");
```

**Why use `screen` for portals:**

- Portals (modals, tooltips, dropdowns) render outside the story canvas (usually to document.body)
- `canvas` won't find them (they're not children of the story)
- `screen` is the standard Testing Library pattern for querying document
- Simpler and more readable than `within(canvasElement.parentElement)`

**When to use `within(canvasElement.parentElement)` instead:**

- Only if you experience test isolation issues in your specific setup
- If you need more explicit scoping for complex scenarios

### 5. Hardcoding Test Data

```typescript
// BAD - Inline mock data
args: {
  user: { id: "1", name: "John", email: "john@example.com" }
}

// GOOD - Use test builders
import { userBuilder } from "~/features/users/test/builders";

args: {
  user: userBuilder.one()
}
```

## 🎭 Mocking Best Practices

> **See [mocking.md](./mocking.md) for comprehensive mocking documentation.**

### 1. Always Use `fn()` for Callback Props ✅

```typescript
import { fn } from "storybook/test";

// ❌ BAD - Can't spy on function calls
const meta = preview.meta({
  component: Button,
  args: {
    onClick: () => console.log("clicked"),
  },
});

// ✅ GOOD - Mockable and spyable
const meta = preview.meta({
  component: Button,
  args: {
    onClick: fn(),
  },
});
```

### 2. Destructure `userEvent` from Parameters ✅

```typescript
// ❌ BAD - Importing breaks Storybook timing
import { userEvent } from "storybook/test";

Story.test("Test", async ({ canvas }) => {
  await userEvent.click(button);
});

// ✅ GOOD - Get from parameters
Story.test("Test", async ({ canvas, userEvent }) => {
  await userEvent.click(button);
});
```

**Why:** The `userEvent` from parameters is properly integrated with Storybook's timing and rendering system.

### 3. Use MSW for Network Requests, Not `fn()` ✅

```typescript
import { http, HttpResponse } from "msw";

// ❌ BAD - fn() doesn't intercept real fetch/axios
const meta = preview.meta({
  args: {
    fetchUsers: fn().mockResolvedValue([...]),
  },
});

// ✅ GOOD - MSW intercepts network requests
export const Story = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", () => HttpResponse.json([...])),
      ],
    },
  },
});
```

**When to use each:**

- **`fn()`:** Mock callback props passed to your component
- **MSW:** Mock actual HTTP requests made by your component

### 4. Mock Modules in `.storybook/preview.ts`, Not Story Files ✅

```typescript
// ❌ BAD - Don't mock in story files
// component.stories.tsx
import { sb } from "storybook/test";
sb.mock(import("~/lib/session")); // Won't work here!

// ✅ GOOD - Mock in preview.ts
// .storybook/preview.ts
import { sb } from "storybook/test";

sb.mock(import("~/lib/session"));
sb.mock(import("uuid"));

export default definePreview({
  /* ... */
});
```

**Why:** Mocks must be registered globally before any stories load.

### 5. Use `beforeEach` for Mock Configuration ✅

```typescript
import { mocked } from "storybook/test";
import { getCurrentUser } from "~/lib/session";

// ✅ GOOD - Configure mocks in beforeEach
const meta = preview.meta({
  component: Dashboard,
  beforeEach: async () => {
    mocked(getCurrentUser).mockResolvedValue({ id: "123", name: "John" });
  },
});

// Override for specific story
export const AdminUser = meta.story({
  beforeEach: async () => {
    mocked(getCurrentUser).mockResolvedValue({ id: "456", role: "admin" });
  },
});
```

**Benefits:**

- Clean separation between mock setup and tests
- Easy to override per story
- Runs before each story render

### 6. Use Specific MSW Handlers Per Story ✅

```typescript
// ✅ GOOD - Each story controls its own responses
export const LoadedData = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/data", () => HttpResponse.json({ data: [...] })),
      ],
    },
  },
});

export const LoadingState = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/data", async () => {
          await delay("infinite");
          return HttpResponse.json([]);
        }),
      ],
    },
  },
});

export const ErrorState = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/data", () => new HttpResponse(null, { status: 500 })),
      ],
    },
  },
});
```

### 7. Mock Context with Decorators ✅

```typescript
// ✅ GOOD - Use decorators for context
export const AuthenticatedUser = meta.story({
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: mockUser }}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
});

// ❌ BAD - Trying to mock context via props
args: {
  authContext: mockUser // This won't work
}
```

### 8. Test Grouping Strategy ✅

**Group assertions that verify the same category of behavior:**

| Category          | Grouping Rule                     | Example test name                    |
| ----------------- | --------------------------------- | ------------------------------------ |
| **Content/Copy**  | ONE test per story state          | `"Renders all expected content"`     |
| **Accessibility** | ONE test covering all a11y checks | `"Meets accessibility requirements"` |
| **Interaction**   | ONE test per distinct user action | `"Submits form on button click"`     |
| **Validation**    | ONE test per validation rule      | `"Shows error on empty email"`       |
| **Callbacks**     | ONE test per callback             | `"Calls onSubmit with form data"`    |

**Anti-pattern — over-splitting content assertions:**

```typescript
// ❌ WRONG: 4 separate tests for static content
Story.test("Shows heading", async ({ canvas }) => {
  await expect(canvas.getByRole("heading", { name: /title/i })).toBeVisible();
});
Story.test("Shows description", async ({ canvas }) => {
  await expect(canvas.getByText(/some description/i)).toBeVisible();
});
Story.test("Shows submit button", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
});
Story.test("Shows cancel link", async ({ canvas }) => {
  await expect(canvas.getByRole("link", { name: /cancel/i })).toBeVisible();
});

// ✅ CORRECT: 1 content test with step() + separate behavior tests
Story.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Heading and description are visible", async () => {
    await expect(canvas.getByRole("heading", { name: /title/i })).toBeVisible();
    await expect(canvas.getByText(/some description/i)).toBeVisible();
  });
  await step("Action elements are visible", async () => {
    await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
    await expect(canvas.getByRole("link", { name: /cancel/i })).toBeVisible();
  });
});
Story.test(
  "Submits form on button click",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
);
```

**Rule:** Static rendering assertions (text, headings, labels, icons, initial states) for the same story state → always group into one `"Renders all expected content"` test with `step()` for structured reporting.

### 9. Prefer Builders Over Inline Mock Data ✅

```typescript
// ❌ BAD - Duplicated inline data
export const Story1 = meta.story({
  args: {
    user: { id: "123", name: "John Doe", email: "john@example.com" },
  },
});

export const Story2 = meta.story({
  args: {
    user: { id: "456", name: "Jane Smith", email: "jane@example.com" },
  },
});

// ✅ GOOD - Reusable builder
import { userBuilder } from "~/features/users/test/builders";

export const Story1 = meta.story({
  args: {
    user: userBuilder.one(),
  },
});

export const Story2 = meta.story({
  args: {
    user: userBuilder.one({ name: "Jane Smith" }),
  },
});
```

**Invoke `/builder-factory` skill if builder doesn't exist.**

### 10. Reset Mocks Between Stories ✅

```typescript
// ✅ GOOD - beforeEach resets for each story
const meta = preview.meta({
  component: Form,
  beforeEach: async ({ args }) => {
    // Each story gets fresh mocks
    args.onSubmit.mockReset();
    args.onSubmit.mockResolvedValue({ success: true });
  },
});
```

**Why:** Prevents test pollution and ensures isolation.

---

## Story Categories Checklist

For each component, consider:

- [ ] Initial/Default State
- [ ] Prefilled State
- [ ] Loading State
- [ ] Error State (validation, server)
- [ ] Success State
- [ ] Edge Cases (empty, max values)
- [ ] User Interactions
- [ ] Complete User Flows
- [ ] Keyboard Navigation
- [ ] Accessibility (screen reader, focus)

---

## `.test()` vs `play` Decision Matrix

| Criteria                | `.test()` (Primary - 90%) | `play` (Secondary - 10%) |
| ----------------------- | ------------------------- | ------------------------ |
| **Independent tests**   | Perfect                   | Overkill                 |
| **Dependent steps**     | Wrong                     | Perfect                  |
| **Number of tests**     | Many (5-10)               | One (1 flow)             |
| **Each test isolation** | Yes                       | No                       |
| **Debugging**           | Easy                      | Hard                     |
| **Code reuse**          | Good                      | Difficult                |
| **UI presentation**     | List of tests             | Story steps              |

### Guidelines by Component Type

| Component Type                          | Pattern                                      | Notes                                                |
| --------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| Simple (Button, Badge, Icon)            | `.test()` only                               | Keep minimal                                         |
| Forms and Inputs                        | `.test()` primary                            | Optional `play` for truly dependent multi-step flows |
| Complex Interactive (Wizards, Checkout) | `.test()` for features, `play` for workflows | Use hybrid approach                                  |

---

## Test Naming Conventions

Good test names are descriptive and actionable:

### ✅ Good Names

- `"Renders section heading and description"`
- `"Shows validation error on empty email"`
- `"Disabled button prevents form submission"`
- `"Mobile tab navigation switches content"`
- `"Keyboard navigation works with arrow keys"`

### ❌ Bad Names

- `"Test 1"` - Not descriptive
- `"Works correctly"` - Too vague
- `"Validation"` - Unclear what's being validated
- `"Button"` - Doesn't describe behavior

---

## Advanced Patterns

### Shared Test Helpers

```typescript
// Helper function for repeated setups
const fillContactForm = async (canvas: Canvas, userEvent: UserEvent) => {
  await userEvent.type(canvas.getByLabelText("Name"), "John Doe");
  await userEvent.type(canvas.getByLabelText("Email"), "john@example.com");
  await userEvent.type(canvas.getByLabelText("Message"), "Hello!");
};

export const ContactForm = meta.story({});

ContactForm.test(
  "Submits form with valid data",
  async ({ canvas, userEvent, args }) => {
    await fillContactForm(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Submit" }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
);

ContactForm.test(
  "Shows success message after submission",
  async ({ canvas, userEvent }) => {
    await fillContactForm(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Submit" }));
    await expect(canvas.getByText("Thank you!")).toBeVisible();
  },
);
```

### Conditional Tests (Responsive)

For responsive or conditional rendering:

```typescript
AllCategories.test(
  "Mobile tab navigation (if tabs present)",
  async ({ canvas, userEvent }) => {
    const mobileTab = canvas.queryByRole("tab", { name: /mobile/i });

    // Only test if tabs are rendered (mobile viewport)
    if (mobileTab) {
      await userEvent.click(mobileTab);
      await expect(mobileTab).toHaveAttribute("data-state", "active");
    } else {
      // Desktop viewport - all categories visible
      await expect(canvas.getByText("Frontend")).toBeVisible();
      await expect(canvas.getByText("Mobile")).toBeVisible();
    }
  },
);
```

### Type Safety

`.test()` method provides full type safety:

```typescript
import type { Canvas, UserEvent } from "storybook/test";

// Types are automatically inferred
Story.test("Test name", async ({ canvas, userEvent, args, step }) => {
  // canvas: Canvas
  // userEvent: UserEvent
  // args: StoryArgs<typeof ComponentName>
  // step: StepFunction
});
```

---

## Migration from `play` to `.test()`

### Step 1: Identify Test Stories

Find stories that have `play` functions which can be converted to `.test()` calls.

### Step 2: Group by Component State

Organize tests by what component state they're testing:

- Same args/props → Can share one story
- Different args → Need separate stories

### Step 3: Convert `play` to `.test()`

**Before:**

```typescript
export const TestName = meta.story({
  play: async ({ canvas, userEvent }) => {
    // test logic
  },
});
```

**After:**

```typescript
Story.test("Test name in sentence case", async ({ canvas, userEvent }) => {
  // same test logic
});
```

### Migration Checklist

When converting old `play` stories to `.test()`:

- [ ] Identify which tests are independent (not dependent on previous steps)
- [ ] Convert each independent test to a `.test()` call
- [ ] Remove the `play` function from the story
- [ ] Destructure `userEvent` from function parameter (don't import)
- [ ] Verify each test runs independently
- [ ] Check that a failed test doesn't block others

### Step 4: Use `step()` Strategically

When converting from `play` to `.test()`, keep `step()` when it adds clarity — especially for content tests
and multi-step interactions. Remove `step()` only when the test is already simple and self-explanatory.

**Rule of thumb:** Use `step()` when the test has 3+ distinct phases or assertion groups. Skip it for 1-2 line tests.

---

## Running Tests

```bash
# Run all Storybook tests
npm run test:storybook

# Run specific component tests
npm run test:storybook -- --grep "SkillsSection"

# Watch mode
npm run test:storybook -- --watch
```
