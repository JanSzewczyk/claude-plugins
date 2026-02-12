---
name: unit-testing
version: 1.0.0
lastUpdated: 2026-02-11
description: Write unit tests with Vitest for TypeScript projects — mocking, async testing, parameterized tests, server action testing, and coverage. Use when writing unit tests for utilities, server-side logic, schemas, or pure functions.
tags: [testing, vitest, unit-testing, mocking, typescript]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
context: fork
agent: general-purpose
user-invocable: true
examples:
  - Write unit tests for the formatCurrency utility
  - Test the createBudget server action
  - Add unit tests for my Zod validation schema
  - Create tests for the transformApiResponse function
  - Test the useDebounce hook
---

# Unit Testing Skill (Vitest)

Write comprehensive unit tests using Vitest for TypeScript projects. Covers utilities, server actions, schemas, hooks, and pure logic.

> **Reference Files:**
>
> - [mocking.md](./mocking.md) - **NEW:** Comprehensive mocking guide (vi.fn, vi.mock, vi.spyOn, patterns)
> - [examples.md](./examples.md) - Practical code examples for common scenarios
> - [patterns.md](./patterns.md) - Best practices, anti-patterns, and guidelines

## Context

This skill uses **Vitest** as the test runner for unit tests. Vitest provides:

- Native TypeScript and ESM support
- Jest-compatible API (`describe`, `test`, `expect`)
- Built-in mocking (`vi.mock`, `vi.fn`, `vi.spyOn`)
- Watch mode with instant feedback
- Coverage reporting via `@vitest/coverage-v8`
- Parameterized tests with `test.each`

Unit tests target **isolated logic** - functions, utilities, schemas, server actions (with mocked dependencies), and hooks. They do NOT render full components in a browser (use Storybook testing for that).

## Global Test Utilities

This project has **global test utilities enabled**, so you don't need to import them:

```typescript
// ❌ NOT NEEDED - Don't import these
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// ✅ AUTOMATIC - Just use them directly
describe("myFunction", () => {
  test("does something", () => {
    expect(result).toBe(expected);
  });
});
```

**Available globally:**

- `describe`, `test` (same as `it`), `expect`
- `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- `vi` (mock utilities)

**Setup:** This is configured in `vitest.config.ts` with `globals: true` and `tsconfig.json` with `"types": ["vitest/globals"]`.

## Workflow

1. **Analyze the code** - Read the source file, understand inputs, outputs, side effects, and dependencies
2. **Identify test cases** - Happy path, edge cases, error paths, boundary values
3. **Write tests** - Follow AAA pattern (Arrange, Act, Assert), mock external dependencies at module boundaries
4. **Run tests** - `npm run test:unit` to verify all pass, check coverage

## Quick Start

```typescript
// src/utils/format-currency.ts
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );
}
```

```typescript
// src/utils/format-currency.test.ts
import { describe, it, expect } from "vitest";

import { formatCurrency } from "./format-currency";

describe("formatCurrency", () => {
  test("formats USD by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  test("formats with specified currency", () => {
    expect(formatCurrency(1000, "EUR")).toBe("\u20AC1,000.00");
  });

  test("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  test("handles negative amounts", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});
```

## Test File Structure and Naming

### File Naming

Test files live **next to the source file** they test:

```
src/
  utils/
    format-currency.ts
    format-currency.test.ts      # <-- test file
  features/
    budgets/
      actions/
        create-budget.ts
        create-budget.test.ts    # <-- test file
      schemas/
        budget-schema.ts
        budget-schema.test.ts    # <-- test file
```

**Convention:** `<source-filename>.test.ts` (or `.test.tsx` for files that import React/JSX).

### Test File Structure

```typescript
// Import the module under test
import { myFunction } from "./my-module";

// Mock dependencies (hoisted automatically by Vitest)
vi.mock("~/lib/database", () => ({
  db: {
    query: vi.fn(),
  },
}));

describe("myFunction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("happy path", () => {
    test("returns expected result for valid input", () => {
      // Arrange
      const input = { name: "Test" };

      // Act
      const result = myFunction(input);

      // Assert
      expect(result).toEqual({ name: "Test", id: expect.any(String) });
    });
  });

  describe("error handling", () => {
    test("throws on invalid input", () => {
      expect(() => myFunction(null)).toThrow("Input is required");
    });
  });
});
```

## Key Patterns

### describe / test / expect

```typescript
describe("ModuleName", () => {
  describe("functionName", () => {
    test("does something specific", () => {
      expect(result).toBe(expected);
    });
  });
});
```

Use nested `describe` blocks to group related tests. Use `test` for individual test cases.

### beforeEach / afterEach

```typescript
describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("creates a user", () => {
    // service is fresh for each test
  });
});
```

- `beforeEach` - Reset state before each test (clear mocks, create fresh instances)
- `afterEach` - Clean up (restore mocks, close connections)
- `vi.clearAllMocks()` - Resets call history and return values
- `vi.restoreAllMocks()` - Restores original implementations

### Mocking with vi.mock

Mock entire modules at the top of the test file:

```typescript
// Mock a module — factory function returns the mock shape
vi.mock("~/lib/database", () => ({
  db: {
    insert: vi.fn().mockResolvedValue({ id: "123" }),
    select: vi.fn().mockResolvedValue([]),
  },
}));

// Access the mocked module in tests
import { db } from "~/lib/database";
```

> **See [mocking.md](./mocking.md) for comprehensive mocking guide with vi.mock, vi.fn, vi.spyOn, and best practices.**

### Mocking with vi.fn

Create standalone mock functions:

```typescript
const mockCallback = vi.fn();

// With return value
const mockFetch = vi.fn().mockResolvedValue({ data: [] });

// Assertions
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledWith("arg1", "arg2");
expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockFetch).toHaveBeenCalledOnce();
```

### Mocking with vi.spyOn

Spy on existing object methods without replacing the module:

```typescript
import * as mathUtils from "./math-utils";

const spy = vi.spyOn(mathUtils, "calculateTax");
spy.mockReturnValue(100);

// Later
expect(spy).toHaveBeenCalledWith(1000, 0.1);
spy.mockRestore(); // restore original
```

### Async Testing

```typescript
test("fetches user data", async () => {
  const user = await fetchUser("123");

  expect(user).toEqual({ id: "123", name: "Alice" });
});

test("rejects with error for missing user", async () => {
  await expect(fetchUser("unknown")).rejects.toThrow("User not found");
});

test("resolves with the created record", async () => {
  await expect(createRecord({ name: "Test" })).resolves.toMatchObject({
    id: expect.any(String),
    name: "Test",
  });
});
```

### Parameterized Tests with test.each

```typescript
test.each([
  { input: 0, expected: "zero" },
  { input: 1, expected: "one" },
  { input: 2, expected: "two" },
  { input: -1, expected: "negative" },
])("numberToWord($input) returns $expected", ({ input, expected }) => {
  expect(numberToWord(input)).toBe(expected);
});

// Table syntax
test.each`
  amount  | currency | expected
  ${1000} | ${"USD"} | ${"$1,000.00"}
  ${1000} | ${"EUR"} | ${"\u20AC1,000.00"}
  ${0}    | ${"USD"} | ${"$0.00"}
`(
  "formats $amount $currency as $expected",
  ({ amount, currency, expected }) => {
    expect(formatCurrency(amount, currency)).toBe(expected);
  },
);
```

## Testing Server-Side Code

### Server Actions with Mocked Database

```typescript
// Mock the database module
vi.mock("~/lib/database", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

// Mock auth
vi.mock("~/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { db } from "~/lib/database";
import { getCurrentUser } from "~/lib/auth";
import { createBudget } from "./create-budget";

describe("createBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a budget for authenticated user", async () => {
    // Arrange
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", role: "user" });
    vi.mocked(db.insert).mockResolvedValue({
      id: "budget-1",
      name: "Groceries",
    });

    // Act
    const result = await createBudget({ name: "Groceries", limit: 500 });

    // Assert
    expect(result).toEqual({
      success: true,
      data: { id: "budget-1", name: "Groceries" },
    });
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Groceries",
        limit: 500,
        userId: "user-1",
      }),
    );
  });

  test("returns error when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createBudget({ name: "Groceries", limit: 500 });

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(db.insert).not.toHaveBeenCalled();
  });
});
```

### Database Functions

```typescript
vi.mock("~/lib/drizzle", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  },
}));
```

## Testing Utility Functions and Pure Logic

Pure functions are the easiest to test - no mocking needed:

```typescript
import { slugify } from "./slugify";

describe("slugify", () => {
  test("converts spaces to hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  test("lowercases all characters", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("removes special characters", () => {
    expect(slugify("hello@world!")).toBe("helloworld");
  });

  test("trims leading and trailing whitespace", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  test("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});
```

## Vitest Config Reference

Typical `vitest.config.ts` for a Next.js project:

```typescript
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true, // Enable global test utilities (no imports needed)
    environment: "node", // or "jsdom" for React hooks
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/**/index.ts",
        "src/types/**",
      ],
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

**TypeScript Configuration** (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

This enables TypeScript to recognize global test utilities without imports.

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run in watch mode (re-runs on file changes)
npm run test:unit -- --watch

# Run a specific test file
npm run test:unit -- src/utils/format-currency.test.ts

# Run tests matching a pattern
npm run test:unit -- --grep "formatCurrency"

# Run with coverage report
npm run test:unit -- --coverage

# Run with verbose output
npm run test:unit -- --reporter=verbose
```

## 🎭 Mocking in Vitest

> **See [mocking.md](./mocking.md) for comprehensive mocking documentation.**

Vitest provides powerful mocking capabilities for isolating code under test.

### Quick Mocking Reference

**1. Mock Functions** - Use `vi.fn()` for standalone mocks:

```typescript
const mockCallback = vi.fn();

test("tracks calls", () => {
  mockCallback("hello", 123);

  expect(mockCallback).toHaveBeenCalledWith("hello", 123);
  expect(mockCallback).toHaveBeenCalledTimes(1);
});
```

**2. Mock Modules** - Use `vi.mock()` to replace entire modules:

```typescript
vi.mock("~/lib/database", () => ({
  db: {
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
    insert: vi.fn().mockResolvedValue({ id: "new-id" }),
  },
}));

import { db } from "~/lib/database";

test("uses mocked database", async () => {
  const result = await db.query("SELECT * FROM users");

  expect(db.query).toHaveBeenCalled();
  expect(result).toEqual([{ id: 1 }]);
});
```

**3. Spy on Methods** - Use `vi.spyOn()` for existing methods:

```typescript
import * as utils from "./utils";

test("spies on method", () => {
  const spy = vi.spyOn(utils, "calculateTax");

  utils.calculateTax(100, 0.2);

  expect(spy).toHaveBeenCalledWith(100, 0.2);
  spy.mockRestore();
});
```

**4. Hoisted Mocks** - Use `vi.hoisted()` for shared state:

```typescript
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("~/lib/users", () => ({
  getUser: mocks.getUser,
}));

test("configures hoisted mock", async () => {
  mocks.getUser.mockResolvedValue({ id: "123", name: "John" });

  const user = await getUser("123");

  expect(user.name).toBe("John");
});
```

**5. Async Mocking** - Mock promises and async functions:

```typescript
const mockFetch = vi.fn();

test("mocks async success", async () => {
  mockFetch.mockResolvedValue({ data: "success" });

  const result = await mockFetch();

  expect(result).toEqual({ data: "success" });
});

test("mocks async error", async () => {
  mockFetch.mockRejectedValue(new Error("Failed"));

  await expect(mockFetch()).rejects.toThrow("Failed");
});
```

**6. Partial Module Mocking** - Keep original exports:

```typescript
vi.mock(import("./utils"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual, // Keep all original exports
    formatDate: vi.fn().mockReturnValue("2024-01-01"), // Mock this one
  };
});
```

### Common Mocking Patterns

**Database Mocking:**

```typescript
vi.mock("~/lib/database", () => ({
  db: {
    users: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
```

**Authentication Mocking:**

```typescript
vi.mock("~/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  verifySession: vi.fn(),
}));
```

**Third-Party Libraries:**

```typescript
vi.mock("uuid", () => ({
  v4: vi.fn(() => "fixed-uuid-for-testing"),
}));
```

### Best Practices

1. ✅ **Clear mocks between tests** - Use `beforeEach(() => vi.clearAllMocks())`
2. ✅ **Use `vi.mocked()` for type safety** - `vi.mocked(fn).mockResolvedValue(...)`
3. ✅ **Mock at module boundaries** - Mock external dependencies, not internal utilities
4. ✅ **Use `vi.hoisted()` for shared mocks** - Access variables in factory functions
5. ✅ **Restore mocks in `afterEach`** - Use `vi.restoreAllMocks()`
6. ✅ **Test both success and error paths** - Mock different scenarios

> **See [mocking.md](./mocking.md) for complete examples, patterns, and advanced techniques.**

## Questions to Ask

Before writing tests, clarify:

- What are the function's inputs and expected outputs?
- What external dependencies need mocking (database, auth, APIs)?
- What error conditions should be handled?
- Are there edge cases (empty input, null, boundary values)?
- Is this a pure function or does it have side effects?
- Does the function need authentication/authorization checks?
- Should coverage targets be met for this module?
