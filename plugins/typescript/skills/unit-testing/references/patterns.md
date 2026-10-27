# Unit Testing - Best Practices and Patterns

## Contents

1. [Test Isolation](#test-isolation) — why shared state between tests makes assertions lie
2. [Mock Boundaries](#mock-boundaries) — what to mock, and the line you stop at
3. [When to Use vi.mock vs vi.fn vs vi.spyOn](#when-to-use-vimock-vs-vifn-vs-vispyon) — the decision table
4. [Testing Error Paths](#testing-error-paths) — thrown, rejected, and returned-as-value failures
5. [Avoid Testing Implementation Details](#avoid-testing-implementation-details) — assert on behavior instead
6. [Coverage Targets and What to Skip](#coverage-targets-and-what-to-skip) — the numbers, and the files not worth them
7. [Anti-Patterns](#anti-patterns) — five ways a passing suite still fails you

---

## Test Isolation

Each test must be independent. No test should depend on another test's state or execution order.

```typescript
// BAD - Shared mutable state leaks between tests
let counter = 0;

test("increments counter", () => {
  counter++;
  expect(counter).toBe(1);
});

test("checks counter", () => {
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

  test("increments counter", () => {
    counter++;
    expect(counter).toBe(1);
  });

  test("starts at zero", () => {
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
  test("throws on null input", () => {
    expect(() => processData(null)).toThrow("Input is required");
  });

  test("rejects with ApiError on 404", async () => {
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

  test("returns error response for unauthorized access", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createBudget(validInput);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  test("handles database connection failure", async () => {
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
test("calls internal validate function", () => {
  const spy = vi.spyOn(module, "_validate");
  module.process(data);
  expect(spy).toHaveBeenCalled(); // Who cares? Test the RESULT instead.
});

// BAD - Testing internal state
test("sets internal flag", () => {
  const instance = new Processor();
  instance.process(data);
  expect(instance._processed).toBe(true); // Internal state, not public API
});
```

```typescript
// GOOD - Testing observable behavior
test("returns processed data for valid input", () => {
  const result = module.process(validData);
  expect(result).toEqual(expectedOutput);
});

test("throws validation error for invalid input", () => {
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

Coverage needs `@vitest/coverage-v8` installed as a devDependency, matching
`provider: "v8"` in `vitest.config.ts`; without it Vitest aborts on the first `--coverage` run.

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

test("works", async () => {
  // All the real logic is mocked away. This test verifies... mocks?
  const result = await processData(input);
  expect(result).toBeDefined(); // Meaningless
});
```

```typescript
// GOOD - Mock only external boundaries, let internal logic run
vi.mock("~/lib/database");

test("processes and stores data", async () => {
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
test("returns user data", async () => {
  const user = await getUser("123");
  expect(user).toMatchSnapshot(); // Snapshot of an entire user object
  // What happens when a new field is added? Auto-update hides real issues.
});
```

```typescript
// GOOD - Explicit assertions on what matters
test("returns user data", async () => {
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

### 4. Multiple Unrelated Assertions in One Test

```typescript
// BAD - Testing multiple unrelated behaviors
test("processes user", async () => {
  const user = await createUser(input);
  expect(user.id).toBeDefined();
  expect(user.email).toBe("test@example.com");
  expect(sendEmail).toHaveBeenCalled(); // Unrelated side effect
  expect(auditLog).toHaveBeenCalled(); // Another unrelated side effect
});

// GOOD - Split into focused tests
test("creates user with generated ID", async () => {
  const user = await createUser(input);
  expect(user.id).toBeDefined();
  expect(user.email).toBe("test@example.com");
});

test("sends welcome email on user creation", async () => {
  await createUser(input);
  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: "test@example.com" }),
  );
});

test("logs user creation to audit log", async () => {
  await createUser(input);
  expect(auditLog).toHaveBeenCalledWith("user.created", expect.any(Object));
});
```

### 5. Not Cleaning Up Mocks

```typescript
// BAD - Mocks leak between tests
test("test A", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  // ...
  // Forgot to restore! Now Math.random returns 0.5 for ALL subsequent tests.
});

// GOOD - Always clean up
afterEach(() => {
  vi.restoreAllMocks();
});
```
