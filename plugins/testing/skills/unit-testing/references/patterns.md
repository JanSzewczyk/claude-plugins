# Unit Testing - Best Practices and Patterns

Guidelines for writing maintainable, reliable unit tests with Vitest.

## AAA Pattern (Arrange, Act, Assert)

Every test should follow three distinct phases:

```typescript
it("creates a budget with valid input", async () => {
  // Arrange - Set up test data and mocks
  const input = { name: "Groceries", limit: 500 };
  vi.mocked(db.insert).mockResolvedValue({ id: "1", ...input });

  // Act - Execute the code under test
  const result = await createBudget(input);

  // Assert - Verify the outcome
  expect(result).toEqual({ success: true, data: { id: "1" } });
});
```

**Rules:**

- Keep each phase clearly separated (blank line between phases for readability)
- One logical action per test in the "Act" phase
- Assert on the outcome, not the implementation

---

## Test Isolation

Each test must be independent. No test should depend on another test's state or execution order.

```typescript
// BAD - Shared mutable state leaks between tests
let counter = 0;

it("increments counter", () => {
  counter++;
  expect(counter).toBe(1);
});

it("checks counter", () => {
  expect(counter).toBe(0); // FAILS - counter is 1 from previous test
});
```

```typescript
// GOOD - Fresh state per test
describe("counter", () => {
  let counter: number;

  beforeEach(() => {
    counter = 0;
  });

  it("increments counter", () => {
    counter++;
    expect(counter).toBe(1);
  });

  it("starts at zero", () => {
    expect(counter).toBe(0); // PASSES - reset by beforeEach
  });
});
```

**Rules:**

- Use `beforeEach` to set up fresh state
- Call `vi.clearAllMocks()` in `beforeEach` to reset mock call history
- Never rely on test execution order
- Avoid global variables in tests

---

## Mock Boundaries

Mock at module boundaries (imports), not at internal function calls. The goal is to replace external dependencies while keeping the unit's internal logic intact.

```typescript
// GOOD - Mock at the module boundary
vi.mock("~/lib/database", () => ({
  db: { insert: vi.fn(), select: vi.fn() },
}));

vi.mock("~/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

// The server action's INTERNAL logic is tested as-is.
// Only external I/O (database, auth) is mocked.
```

```typescript
// BAD - Mocking internal helpers of the module under test
vi.mock("./create-budget", async () => {
  const actual = await vi.importActual("./create-budget");
  return {
    ...actual,
    validateInput: vi.fn(), // Don't mock internal functions
  };
});
```

**Rules:**

- Mock external modules: database, auth, third-party APIs, file system
- Do NOT mock the module you are testing
- Do NOT mock private/internal helper functions of the module under test
- Keep mocks as simple as possible - return the minimum data needed

---

## When to Use vi.mock vs vi.fn vs vi.spyOn

### vi.mock - Module-level replacement

Use when you need to replace an entire imported module.

```typescript
// Replaces the entire ~/lib/database module
vi.mock("~/lib/database", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));
```

**When:** The module under test imports something you cannot or should not call in tests (database, network, file system).

### vi.fn - Standalone mock function

Use for callback props, event handlers, or any function you pass as an argument.

```typescript
const onSubmit = vi.fn();
const onChange = vi.fn().mockReturnValue(true);

// Pass as a callback
await processForm(data, onSubmit);
expect(onSubmit).toHaveBeenCalledWith(data);
```

**When:** You need a function to track calls, or to pass a fake callback into the code under test.

### vi.spyOn - Watch an existing method

Use when you want to observe or temporarily override a method on an existing object without replacing the entire module.

```typescript
const spy = vi.spyOn(console, "error").mockImplementation(() => {});

doSomethingThatLogs();

expect(spy).toHaveBeenCalledWith("Expected error message");
spy.mockRestore();
```

**When:** You want to verify a method was called, or temporarily replace one method while keeping the rest of the module intact.

### Decision Table

| Scenario                                  | Tool                          |
| ----------------------------------------- | ----------------------------- |
| Replace an entire imported module         | `vi.mock`                     |
| Create a mock callback/handler            | `vi.fn`                       |
| Watch or override one method on an object | `vi.spyOn`                    |
| Mock a global (fetch, Date, setTimeout)   | `vi.stubGlobal` or `vi.spyOn` |
| Replace only some exports of a module     | `vi.mock` + `vi.importActual` |

---

## Testing Error Paths

Every function that can fail should have tests for its failure modes.

```typescript
describe("error handling", () => {
  it("throws on null input", () => {
    expect(() => processData(null)).toThrow("Input is required");
  });

  it("rejects with ApiError on 404", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => "Not found",
    });

    await expect(fetchUser("unknown")).rejects.toThrow(ApiError);
    await expect(fetchUser("unknown")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns error response for unauthorized access", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createBudget(validInput);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("handles database connection failure", async () => {
    vi.mocked(db.insert).mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(createBudget(validInput)).rejects.toThrow("ECONNREFUSED");
  });
});
```

**Rules:**

- Test both thrown errors and returned error states
- Verify error messages and error types, not just that an error occurred
- Test boundary values (empty string, 0, null, undefined)
- Test what happens when dependencies fail (database down, network error)

---

## Avoid Testing Implementation Details

Test observable behavior (inputs and outputs), not internal mechanics.

```typescript
// BAD - Testing implementation details
it("calls internal validate function", () => {
  const spy = vi.spyOn(module, "_validate");
  module.process(data);
  expect(spy).toHaveBeenCalled(); // Who cares? Test the RESULT instead.
});

// BAD - Testing internal state
it("sets internal flag", () => {
  const instance = new Processor();
  instance.process(data);
  expect(instance._processed).toBe(true); // Internal state, not public API
});
```

```typescript
// GOOD - Testing observable behavior
it("returns processed data for valid input", () => {
  const result = module.process(validData);
  expect(result).toEqual(expectedOutput);
});

it("throws validation error for invalid input", () => {
  expect(() => module.process(invalidData)).toThrow("Validation failed");
});
```

**Rules:**

- Test what the function returns, not how it computes it
- Test side effects through their observable outcomes (e.g., mock was called with correct args)
- If you refactor internals but the behavior is the same, tests should still pass
- Exception: Verifying that a dependency was called with correct arguments IS testing observable behavior

---

## Coverage Targets and What to Skip

### Reasonable Coverage Targets

| Code Type                       | Target  |
| ------------------------------- | ------- |
| Utility functions / pure logic  | 90-100% |
| Server actions / business logic | 80-90%  |
| Schema validations              | 90-100% |
| Hooks                           | 80-90%  |
| Type definitions, constants     | Skip    |

### What to Cover

- All public functions and their edge cases
- Error handling paths
- Validation logic
- Business rules and conditional logic
- Data transformations

### What to Skip

- Type-only files (interfaces, type aliases)
- Barrel/index files (re-exports)
- Constants and configuration objects
- Generated code
- Third-party library wrappers that add no logic
- UI components (use Storybook testing instead)

### Checking Coverage

```bash
npm run test:unit -- --coverage

# Focus on specific directories
npm run test:unit -- --coverage --coverage.include="src/features/budgets/**"
```

---

## Anti-Patterns

### 1. Testing Private Functions

```typescript
// BAD - Exporting private functions just for testing
export function _internalHelper() { ... }  // underscore = private

// GOOD - Test through the public API
// If _internalHelper is only used by processData, test processData instead
```

If you feel the need to test a private function directly, it is a signal that the function should be extracted into its own module with a public API.

### 2. Over-Mocking

```typescript
// BAD - Mocking everything, test proves nothing
vi.mock("./utils");
vi.mock("./helpers");
vi.mock("./validators");

it("works", async () => {
  // All the real logic is mocked away. This test verifies... mocks?
  const result = await processData(input);
  expect(result).toBeDefined(); // Meaningless
});
```

```typescript
// GOOD - Mock only external boundaries, let internal logic run
vi.mock("~/lib/database");

it("processes and stores data", async () => {
  vi.mocked(db.insert).mockResolvedValue({ id: "1" });

  const result = await processData(input);

  // Real validation, transformation, and business logic executed
  expect(result.success).toBe(true);
  expect(db.insert).toHaveBeenCalledWith(
    expect.objectContaining({ processed: true }),
  );
});
```

### 3. Snapshot Abuse

```typescript
// BAD - Snapshots for dynamic or complex objects
it("returns user data", async () => {
  const user = await getUser("123");
  expect(user).toMatchSnapshot(); // Snapshot of an entire user object
  // What happens when a new field is added? Auto-update hides real issues.
});
```

```typescript
// GOOD - Explicit assertions on what matters
it("returns user data", async () => {
  const user = await getUser("123");

  expect(user.id).toBe("123");
  expect(user.email).toBe("alice@example.com");
  expect(user.isActive).toBe(true);
});
```

Snapshots are acceptable for:

- Small, stable structures (error messages, config shapes)
- Inline snapshots with `toMatchInlineSnapshot()`

Snapshots are problematic for:

- Large objects that change often
- Objects with dates, IDs, or random values
- Anything where reviewers cannot easily verify correctness

### 4. Test Descriptions That Do Not Describe Behavior

```typescript
// BAD
it("test 1", () => { ... });
it("should work", () => { ... });
it("handles the case", () => { ... });

// GOOD
it("returns formatted currency string for positive amount", () => { ... });
it("throws validation error when email is empty", () => { ... });
it("retries request up to 3 times on network failure", () => { ... });
```

### 5. Multiple Unrelated Assertions in One Test

```typescript
// BAD - Testing multiple unrelated behaviors
it("processes user", async () => {
  const user = await createUser(input);
  expect(user.id).toBeDefined();
  expect(user.email).toBe("test@example.com");
  expect(sendEmail).toHaveBeenCalled(); // Unrelated side effect
  expect(auditLog).toHaveBeenCalled(); // Another unrelated side effect
});

// GOOD - Split into focused tests
it("creates user with generated ID", async () => {
  const user = await createUser(input);
  expect(user.id).toBeDefined();
  expect(user.email).toBe("test@example.com");
});

it("sends welcome email on user creation", async () => {
  await createUser(input);
  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: "test@example.com" }),
  );
});

it("logs user creation to audit log", async () => {
  await createUser(input);
  expect(auditLog).toHaveBeenCalledWith("user.created", expect.any(Object));
});
```

### 6. Not Cleaning Up Mocks

```typescript
// BAD - Mocks leak between tests
it("test A", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  // ...
  // Forgot to restore! Now Math.random returns 0.5 for ALL subsequent tests.
});

// GOOD - Always clean up
afterEach(() => {
  vi.restoreAllMocks();
});
```
