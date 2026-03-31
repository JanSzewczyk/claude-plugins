# Storybook `.test()` Method Optimization Guide

## Overview

**CSF Next** introduces the `.test()` method that allows **multiple tests per story**, dramatically reducing story count
while maintaining granular test coverage. This is enabled via `experimentalTestSyntax: true` (already configured in this
project).

## Key Benefits of `.test()` Method

1. **Fewer Stories** - Replace 10+ test stories with 1-2 stories + multiple tests
2. **Better Isolation** - Each test is independent; one failure doesn't block others
3. **Clearer Intent** - Test names describe what's being tested
4. **Traditional Feel** - Similar to Jest/Vitest test suites
5. **Better Reporting** - Individual test results in Storybook UI

## Content Assertion Grouping

The biggest source of unnecessary test proliferation is over-splitting content checks.
Every static text element visible in a story state does NOT need its own test.

**Rule:** When you need to verify static content (text, headings, labels, icons), group ALL
such assertions for the same story state into ONE test. Do NOT add a content test at all
if behavior tests already implicitly verify the relevant elements.

**Add a content test only when:**

- There are static elements (text, headings, labels) that are NOT already verified by
  any interaction or behavior test in that story
- The content is meaningful and worth explicitly documenting

**Skip the content test when:**

- Interaction tests already assert on the same elements (e.g., clicking a button whose
  label is verified by `getByRole("button", { name: /submit/i })`)
- The story's behavior tests cover all meaningful elements implicitly

**Naming convention (when a content test IS added):**
`"Renders all expected content"` or `"Renders [State] content"`.

**Anti-pattern — mandatory content test causing duplication:**

```typescript
// ❌ WRONG: content test duplicates assertions already in behavior test
EmptyForm.test("Renders all expected content", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible(); // duplicated below
});
EmptyForm.test("Submits form on button click", async ({ canvas, args }) => {
  await canvas.getByRole("button", { name: /submit/i }).click(); // already finds the button
  await expect(args.onSubmit).toHaveBeenCalledOnce();
});

// ✅ CORRECT: content test only for elements not covered elsewhere
EmptyForm.test(
  "Renders section heading and description",
  async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: /title/i })).toBeVisible();
    await expect(canvas.getByText(/descriptive text/i)).toBeVisible();
    // (submit button is verified implicitly by the interaction test)
  },
);
EmptyForm.test("Submits form on button click", async ({ canvas, args }) => {
  await canvas.getByRole("button", { name: /submit/i }).click();
  await expect(args.onSubmit).toHaveBeenCalledOnce();
});
```

---

## Current vs Optimized Pattern

### ❌ Current Pattern (skills-section.stories.tsx)

```typescript
// 1 story with 1 test
export const SkillsSection = meta.story({});
SkillsSection.test("Renders all skills and categories correctly", async ({ canvas, step }) => {
  // 6 steps checking various elements
});

// 9 separate stories with play functions
export const SkillCardHoverInteraction = meta.story({
  play: async ({ canvas, step, userEvent }) => {
    await step("Hover over a non-featured skill card", async () => { ... });
    await step("Unhover to hide tooltip", async () => { ... });
  }
});

export const MarqueeInteraction = meta.story({
  play: async ({ canvas, step, userEvent }) => {
    await step("Verify marquee tech logos are visible", async () => { ... });
    await step("Hover over tech logo to pause marquee", async () => { ... });
    await step("Unhover to resume marquee", async () => { ... });
  }
});

export const MobileTabNavigation = meta.story({ /* ... */ });
export const DesktopBentoGridLayout = meta.story({ /* ... */ });
export const KeyboardAccessibility = meta.story({ /* ... */ });
export const SectionHeadingStructure = meta.story({ /* ... */ });
export const ResponsiveLayout = meta.story({ /* ... */ });
export const FeaturedSkillDescriptions = meta.story({ /* ... */ });
export const TechLogoHoverAnimation = meta.story({ /* ... */ });
```

**Issues:**

- 10 total stories (1 + 9 test stories)
- Each test story creates a separate story entry
- Harder to see all tests at a glance
- More boilerplate with `meta.story()` calls

### ✅ Optimized Pattern (Using `.test()`)

```typescript
// ONE story with multiple tests
export const AllCategories = meta.story({});

// ONE content test with step() for structured reporting
AllCategories.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Section heading and description are visible", async () => {
    await expect(
      canvas.getByRole("heading", {
        name: /skills & technologies/i,
        level: 2,
      }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        /the tools and technologies I work with to bring ideas to life/i,
      ),
    ).toBeVisible();
  });

  await step("Tech logos are displayed in marquee", async () => {
    await expect(canvas.getByText("React")).toBeVisible();
    await expect(canvas.getByText("Next.js")).toBeVisible();
    await expect(canvas.getByText("TypeScript")).toBeVisible();
  });

  await step("All category badges are shown", async () => {
    await expect(canvas.getByText("Frontend")).toBeVisible();
    await expect(canvas.getByText("Mobile")).toBeVisible();
    await expect(canvas.getByText("DevOps & Tools")).toBeVisible();
    await expect(canvas.getByText("Other")).toBeVisible();
  });

  await step("Skill cards have correct headings", async () => {
    await expect(
      canvas.getByRole("heading", { name: "React", level: 3 }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "React Native", level: 3 }),
    ).toBeVisible();
  });
});

// Interaction Tests — separate .test() per distinct user action
AllCategories.test(
  "Skill card hover shows tooltip",
  async ({ canvas, userEvent }) => {
    const nextjsCard = canvas.getByRole("heading", {
      name: "Next.js",
      level: 3,
    });
    await userEvent.hover(nextjsCard);

    await waitFor(
      async () => {
        const tooltip = canvas.queryByText(/full-stack react framework/i);
        if (tooltip) {
          await expect(tooltip).toBeVisible();
        }
      },
      { timeout: 2000 },
    );
  },
);

AllCategories.test(
  "Marquee pauses on tech logo hover",
  async ({ canvas, userEvent }) => {
    const reactLogo = canvas.getByText("React");
    await userEvent.hover(reactLogo);
    await expect(reactLogo).toBeVisible();

    await userEvent.unhover(reactLogo);
    await expect(reactLogo).toBeVisible();
  },
);

AllCategories.test(
  "Mobile tab navigation switches content",
  async ({ canvas, userEvent }) => {
    const frontendTab = canvas.getByRole("tab", { name: /frontend/i });
    await expect(frontendTab).toHaveAttribute("data-state", "active");

    const mobileTab = canvas.getByRole("tab", { name: /mobile/i });
    await userEvent.click(mobileTab);

    await waitFor(
      async () => {
        await expect(mobileTab).toHaveAttribute("data-state", "active");
      },
      { timeout: 2000 },
    );

    const reactNativeSkill = canvas.getByRole("heading", {
      name: "React Native",
      level: 3,
    });
    await expect(reactNativeSkill).toBeVisible();
  },
);

// Accessibility Tests
AllCategories.test(
  "Keyboard navigation works with arrow keys",
  async ({ canvas, userEvent }) => {
    const frontendTab = canvas.getByRole("tab", { name: /frontend/i });
    frontendTab.focus();
    await expect(frontendTab).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");

    await waitFor(async () => {
      const mobileTab = canvas.getByRole("tab", { name: /mobile/i });
      await expect(mobileTab).toHaveFocus();
    });
  },
);

AllCategories.test(
  "Section maintains proper heading hierarchy",
  async ({ canvas }) => {
    const mainHeading = canvas.getByRole("heading", {
      name: /skills & technologies/i,
      level: 2,
    });
    await expect(mainHeading).toBeVisible();

    const skillHeadings = canvas.getAllByRole("heading", { level: 3 });
    await expect(skillHeadings.length).toBeGreaterThan(4);
  },
);

// Layout Tests
AllCategories.test(
  "Desktop Bento grid displays all categories simultaneously",
  async ({ canvas }) => {
    await expect(canvas.getByText("Frontend")).toBeVisible();
    await expect(canvas.getByText("Mobile")).toBeVisible();
    await expect(canvas.getByText("DevOps & Tools")).toBeVisible();
    await expect(canvas.getByText("Other")).toBeVisible();
  },
);

AllCategories.test(
  "Responsive container has proper structure",
  async ({ canvasElement }) => {
    const section = canvasElement.querySelector("#skills");
    await expect(section).toBeInTheDocument();

    const container = section?.querySelector(".container");
    await expect(container).toBeInTheDocument();
  },
);

// Optional: Keep one visual story for documentation
export const EmptyState = meta.story({
  name: "Visual Documentation",
  tags: ["autodocs"],
  // No tests - just for visual reference
});
```

**Benefits:**

- ✅ **2 stories** instead of 10 (80% reduction)
- ✅ All tests visible in one place
- ✅ Each test is independent and clearly named
- ✅ Less boilerplate code
- ✅ Better test organization by type (rendering, interaction, a11y, layout)

## When to Use `.test()` vs `play`

### Decision Matrix

| Criteria                | `.test()` (Primary - 90%) | `play` (Secondary - 10%) |
| ----------------------- | ------------------------- | ------------------------ |
| **Independent tests**   | Perfect                   | Overkill                 |
| **Dependent steps**     | Wrong                     | Perfect                  |
| **Number of tests**     | Many (5-10)               | One (1 flow)             |
| **Each test isolation** | Yes                       | No                       |
| **Debugging**           | Easy                      | Hard                     |
| **Code reuse**          | Good                      | Difficult                |
| **UI presentation**     | List of tests             | Story steps              |

### Use `.test()` Method (PRIMARY - 90% of cases)

**For most test scenarios:**

- Unit-like tests checking specific behaviors
- Multiple independent test cases for the same component state
- When you want granular test reporting
- When tests don't depend on each other

```typescript
export const LoginForm = meta.story({});

LoginForm.test("Shows validation error on empty email", async ({ canvas }) => { ... });
LoginForm.test("Shows validation error on invalid email format", async ({ canvas }) => { ... });
LoginForm.test("Enables submit button when form is valid", async ({ canvas }) => { ... });
LoginForm.test("Calls onSubmit with form data", async ({ canvas }) => { ... });
```

### Use `play` Function (SECONDARY - 10% of cases)

`play` has two valid use cases. It should **never** be used for independent test assertions.

**1. Demos / Interaction Presentation** — show how a component looks after interaction in Storybook docs:

```typescript
// ✅ play for demo — no assertions, purely visual
export const FilledForm = meta.story({
  name: "Form with data",
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
  },
});
```

**2. Complex dependent flows** — steps must run in sequence as ONE cohesive journey:

```typescript
// ✅ play for dependent flow — steps depend on each other
export const CheckoutFlow = meta.story({
  name: "Complete Checkout Journey",
  play: async ({ canvas, step, userEvent }) => {
    await step("Add items to cart", async () => { ... });
    await step("Proceed to checkout", async () => { ... });
    await step("Fill shipping info", async () => { ... });
    await step("Complete payment", async () => { ... });
  }
});
```

### Guidelines by Component Type

| Component Type                          | Pattern                                      | Notes                                                |
| --------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| Simple (Button, Badge, Icon)            | `.test()` only                               | Keep minimal                                         |
| Forms and Inputs                        | `.test()` primary                            | Optional `play` for truly dependent multi-step flows |
| Complex Interactive (Wizards, Checkout) | `.test()` for features, `play` for workflows | Use hybrid approach                                  |

### Hybrid Approach (Recommended for Complex Components)

Attach tests directly to state stories:

```typescript
// State story 1 with its tests
export const Empty = meta.story({});
Empty.test("Renders empty form", async ({ canvas }) => { ... });
Empty.test("Validates required fields", async ({ canvas, userEvent }) => { ... });
Empty.test("Submits successfully", async ({ canvas, userEvent, args }) => { ... });

// State story 2 with its tests
export const Prefilled = meta.story({
  args: { defaultValues: { email: "user@example.com" } },
});
Prefilled.test("Displays pre-filled values", async ({ canvas }) => { ... });
Prefilled.test("Can modify pre-filled values", async ({ canvas, userEvent }) => { ... });

// Optional: play ONLY for truly dependent flow
export const MultiStepFlow = meta.story({
  name: "Complete Signup Flow",
  play: async ({ canvas, userEvent, step }) => {
    await step("Fill email", async () => { ... });
    await step("Fill password", async () => { ... });
    await step("Submit form", async () => { ... });
  },
});
```

## Migration Strategy

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

### Step 4: Use `step()` Strategically in `.test()` Methods

When converting from `play` to `.test()`, keep `step()` when it adds clarity — especially for content tests
and multi-step interactions. Remove `step()` only when the test is already simple and self-explanatory.

**Remove step() — simple, focused test:**

```typescript
// ✅ Simple test — step() would be overhead
Story.test(
  "Clicking button shows success message",
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(canvas.getByText("Success")).toBeVisible();
  },
);
```

**Keep step() — content test with multiple assertion groups:**

```typescript
// ✅ Content test — step() provides structured reporting
Story.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Form fields are visible", async () => {
    await expect(canvas.getByLabelText(/email/i)).toBeVisible();
    await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  });

  await step("Action buttons are visible", async () => {
    await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
    await expect(canvas.getByRole("link", { name: /cancel/i })).toBeVisible();
  });
});
```

**Keep step() — multi-step interaction:**

```typescript
// ✅ Multi-step interaction — step() labels each phase
Story.test(
  "Submits form with valid data",
  async ({ canvas, userEvent, args, step }) => {
    await step("Fill in form fields", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(canvas.getByLabelText(/password/i), "password123");
    });

    await step("Submit the form", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    });

    await step("Verify submission", async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  },
);
```

**Rule of thumb:** Use `step()` when the test has 3+ distinct phases or assertion groups. Skip it for 1-2 line tests.

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

## Advanced Patterns

### Pattern 1: Shared Test Helpers

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

### Pattern 2: Multiple Stories with Different Props

When you need to test different component states:

```typescript
// Story 1: Default state
export const EmptyForm = meta.story({});

EmptyForm.test("Renders empty form", async ({ canvas }) => { ... });
EmptyForm.test("Shows validation on submit", async ({ canvas }) => { ... });

// Story 2: Pre-filled state
export const Prefilled = meta.story({
  args: { defaultValues: { email: "user@example.com" } }
});

Prefilled.test("Displays pre-filled values", async ({ canvas }) => {
  await expect(canvas.getByLabelText("Email")).toHaveValue("user@example.com");
});

Prefilled.test("Can modify pre-filled values", async ({ canvas, userEvent }) => {
  const emailInput = canvas.getByLabelText("Email");
  await userEvent.clear(emailInput);
  await userEvent.type(emailInput, "new@example.com");
  await expect(emailInput).toHaveValue("new@example.com");
});
```

### Pattern 3: Conditional Tests

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

## Type Safety

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

## Running Tests

```bash
# Run all Storybook tests
npm run test:storybook

# Run specific component tests
npm run test:storybook -- --grep "SkillsSection"

# Watch mode
npm run test:storybook -- --watch
```

## Best Practices

### 1. Keep Tests Focused

Each `.test()` should test ONE behavior or ONE category of assertions:

```typescript
// ✅ Good — one behavior
FormStory.test("Shows error message on invalid email", async ({ canvas }) => {
  await expect(canvas.getByText("Invalid email format")).toBeVisible();
});

// ✅ Good — one category (content), organized with step()
FormStory.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Form fields are visible", async () => {
    await expect(canvas.getByLabelText(/email/i)).toBeVisible();
    await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  });
  await step("Submit button is visible", async () => {
    await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
  });
});

// ❌ Bad — mixing unrelated behaviors
FormStory.test(
  "Form validation and submission",
  async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Error")).toBeVisible(); // validation
    await userEvent.click(canvas.getByRole("button")); // submission
    await expect(args.onSubmit).toHaveBeenCalled(); // callback
  },
);
```

### 2. Use `step()` Instead of Comments

Use `step()` for organizing test logic instead of plain comments. `step()` provides structured reporting
in Storybook UI, while comments are invisible in test output.

```typescript
export const ContactForm = meta.story({});

// ONE content test with step() — NOT separate tests per element
ContactForm.test("Renders all expected content", async ({ canvas, step }) => {
  await step("Form fields are visible", async () => {
    await expect(canvas.getByLabelText(/name/i)).toBeVisible();
    await expect(canvas.getByLabelText(/email/i)).toBeVisible();
    await expect(canvas.getByLabelText(/message/i)).toBeVisible();
  });
  await step("Submit button is visible", async () => {
    await expect(canvas.getByRole("button", { name: /submit/i })).toBeVisible();
  });
});

// Separate .test() per distinct behavior
ContactForm.test("Shows error on empty email", async ({ canvas, userEvent }) => { ... });
ContactForm.test("Shows error on invalid email format", async ({ canvas, userEvent }) => { ... });

// Multi-step interactions use step() instead of comments
ContactForm.test(
  "Submits form successfully",
  async ({ canvas, userEvent, args, step }) => {
    await step("Fill in form fields", async () => {
      await userEvent.type(canvas.getByLabelText(/name/i), "John");
      await userEvent.type(canvas.getByLabelText(/email/i), "john@example.com");
    });
    await step("Submit the form", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    });
    await step("Verify callback was called", async () => {
      await expect(args.onSubmit).toHaveBeenCalled();
    });
  },
);
```

### 3. Use Descriptive Assertions

```typescript
// ✅ Good - clear what's expected
await expect(canvas.getByRole("button", { name: "Submit" })).toBeEnabled();
await expect(canvas.getByText("Thank you!")).toBeVisible();

// ❌ Bad - unclear what's being tested
await expect(button).toBeTruthy();
await expect(element).not.toBeNull();
```

### 4. Handle Async Properly

Always await async operations:

```typescript
// ✅ Good
await userEvent.click(button);
await waitFor(async () => {
  await expect(canvas.getByText("Success")).toBeVisible();
});

// ❌ Bad - missing await
userEvent.click(button); // ⚠️ Not awaited! (WRONG!)
expect(canvas.getByText("Success")).toBeVisible(); // ⚠️ Might fail (WRONG!)
```

## Summary

### Key Takeaways

1. **Use `.test()` for multiple independent tests** - Replaces multiple test stories
2. **Use `play` for cohesive user flows** - When steps must happen in sequence
3. **Reduce story count by 60-80%** - Fewer stories, same coverage
4. **Better test organization** - Group by category (rendering, interaction, a11y)
5. **Improved maintainability** - Less boilerplate, clearer intent

### Recommended Pattern

```typescript
// ONE story for documentation
export const ComponentStory = meta.story({
  tags: ["autodocs"]
});

// MULTIPLE tests for that story
ComponentStory.test("Test case 1", async ({ canvas }) => { ... });
ComponentStory.test("Test case 2", async ({ canvas }) => { ... });
ComponentStory.test("Test case 3", async ({ canvas, userEvent }) => { ... });
// ... etc
```

This approach provides the best balance of:

- Test clarity
- Code maintainability
- Story organization
- Performance
