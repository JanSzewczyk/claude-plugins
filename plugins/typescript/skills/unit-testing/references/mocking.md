# Mocking in Vitest

Examples use the `~/` alias for project modules — substitute whatever alias or relative path the
project resolves. Test utilities are global (`globals: true`), so nothing is imported from `vitest`.

## Contents

1. [Mock Functions with `vi.fn()`](#mock-functions-with-vifn) — callbacks and injected dependencies
2. [Mock Modules with `vi.mock()`](#mock-modules-with-vimock) — replacing a whole module, factories, typing
3. [Spy on Methods with `vi.spyOn()`](#spy-on-methods-with-vispyon) — watching or overriding one method
4. [Hoisting with `vi.hoisted()`](#hoisting-with-vihoisted) — when a `vi.mock` factory needs a reference the test also uses
5. [Partial Module Mocking](#partial-module-mocking) — keep the real exports, replace one
6. [Dynamic Mocking with `vi.doMock()`](#dynamic-mocking-with-vidomock) — a different mock per test
7. [Mocking Async Functions](#mocking-async-functions) — resolved, rejected, sequential, database
8. [Mocking External Dependencies](#mocking-external-dependencies) — auth, env vars, third-party libraries, date/time
9. [Rules](#rules) — the three not covered by `patterns.md`
10. [Quick Reference](#quick-reference) — the async and timer shapes
11. [Mocking Chained Query Builders](#mocking-chained-query-builders) — fluent `.where().limit().execute()` APIs

---

## Mock Functions with `vi.fn()`

Standard Vitest API — `mockReturnValue` / `mockReturnValueOnce`, `mockImplementation`,
`mock.calls`, `mock.results`. Use `vi.fn()` for callbacks and injected dependencies; everything
module-level is below.

```typescript
const onSave = vi.fn().mockReturnValue(true);

expect(onSave).toHaveBeenCalledWith({ id: "1" });
expect(onSave).toHaveBeenCalledTimes(1);
```

---

## Mock Modules with `vi.mock()`

**Use Case:** Replace entire modules with mock implementations. Automatically hoisted to the top of the file.

### Complete Module Mock

```typescript
// Mock entire module (hoisted to top)
vi.mock("~/lib/database", () => ({
  db: {
    query: vi.fn().mockResolvedValue([{ id: 1, name: "John" }]),
    insert: vi.fn().mockResolvedValue({ id: "new-id" }),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import AFTER mocking
import { db } from "~/lib/database";

test("uses mocked database", async () => {
  const users = await db.query("SELECT * FROM users");

  expect(db.query).toHaveBeenCalled();
  expect(users).toEqual([{ id: 1, name: "John" }]);
});
```

### Mock with Factory Function

```typescript
vi.mock(import("./calculator"), () => {
  return {
    add: vi.fn((a: number, b: number) => a + b),
    subtract: vi.fn(),
    multiply: vi.fn(),
  };
});

import { add, subtract } from "./calculator";

test("uses mocked calculator", () => {
  expect(add(2, 3)).toBe(5);
  expect(add).toHaveBeenCalledWith(2, 3);
});
```

### Mock with TypeScript Type Safety

```typescript
vi.mock("~/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  verifyToken: vi.fn(),
}));

import { getCurrentUser } from "~/lib/auth";

test("typed mock", async () => {
  // Use vi.mocked for type-safe configuration
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
  });

  const user = await getCurrentUser();

  expect(user?.name).toBe("John Doe");
  expect(getCurrentUser).toHaveBeenCalled();
});
```

### Mock with Spy Option

```typescript
// Keeps original implementation but allows spying
vi.mock(import("./calculator"), { spy: true });

import { add } from "./calculator";

test("spy on original implementation", () => {
  const result = add(2, 3);

  expect(result).toBe(5); // Original implementation runs
  expect(add).toHaveBeenCalledWith(2, 3); // But we can spy on it
});
```

---

## Spy on Methods with `vi.spyOn()`

**Use Case:** Monitor existing methods without fully replacing the module. Useful for object methods.

### Basic Spy

```typescript
import * as mathUtils from "./math-utils";

test("spies on existing method", () => {
  const spy = vi.spyOn(mathUtils, "calculateTax");

  const result = mathUtils.calculateTax(100, 0.2);

  expect(spy).toHaveBeenCalledWith(100, 0.2);
  expect(result).toBe(20); // Original implementation runs

  spy.mockRestore(); // Restore original
});
```

### Mock Implementation with Spy

```typescript
test("replaces spy implementation", () => {
  const spy = vi.spyOn(console, "log");
  spy.mockImplementation(() => {}); // Silent

  console.log("This won't print");

  expect(spy).toHaveBeenCalledWith("This won't print");

  spy.mockRestore();
});
```

### Spy on Getters

```typescript
const obj = {
  get value() {
    return 42;
  },
};

test("spies on getter", () => {
  const spy = vi.spyOn(obj, "value", "get");
  spy.mockReturnValue(100);

  expect(obj.value).toBe(100);
  expect(spy).toHaveBeenCalled();
});
```

---

## Hoisting with `vi.hoisted()`

**Use Case:** Create variables accessible inside `vi.mock()` factory functions.

### Basic Hoisting

```typescript
// Define hoisted variables
const mocks = vi.hoisted(() => {
  return {
    getUser: vi.fn(),
    saveUser: vi.fn(),
  };
});

// Use in vi.mock factory
vi.mock("~/lib/users", () => {
  return {
    getUser: mocks.getUser,
    saveUser: mocks.saveUser,
  };
});

import { getUser } from "~/lib/users";

test("uses hoisted mocks", async () => {
  // Configure mock before test
  mocks.getUser.mockResolvedValue({ id: "123", name: "John" });

  const user = await getUser("123");

  expect(user.name).toBe("John");
  expect(mocks.getUser).toHaveBeenCalledWith("123");
});
```

### Hoisted Mock Data

```typescript
const mockData = vi.hoisted(() => ({
  users: [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ],
  posts: [
    { id: "p1", title: "Hello" },
    { id: "p2", title: "World" },
  ],
}));

vi.mock("~/lib/database", () => ({
  db: {
    users: {
      findMany: vi.fn(() => mockData.users),
    },
    posts: {
      findMany: vi.fn(() => mockData.posts),
    },
  },
}));
```

**Why use `vi.hoisted()`?**

- Variables outside `vi.mock()` aren't accessible in the factory due to hoisting
- `vi.hoisted()` creates variables that ARE accessible in factory functions
- Allows sharing mock instances between factory and test code

---

## Partial Module Mocking

**Use Case:** Mock some exports while keeping original implementations for others.

### Preserve Original Exports

```typescript
vi.mock(import("./utils"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual, // Keep all original exports
    formatDate: vi.fn().mockReturnValue("2024-01-01"), // Mock specific one
  };
});

import { formatDate, formatCurrency } from "./utils";

test("mocks only formatDate", () => {
  expect(formatDate(new Date())).toBe("2024-01-01"); // Mocked
  expect(formatCurrency(1234.56)).toBe("$1,234.56"); // Original
});
```

### Selective Mocking

```typescript
vi.mock(import("~/lib/api"), async (importOriginal) => {
  const original = await importOriginal();

  return {
    ...original,
    // Override only what you need
    fetchUsers: vi.fn().mockResolvedValue([]),
    // Keep original: fetchPosts, fetchComments, etc.
  };
});
```

---

## Dynamic Mocking with `vi.doMock()`

**Use Case:** Mock modules dynamically without hoisting. Useful for test-specific mocks.

### Basic Dynamic Mock

```typescript
test("uses different mocks per test", async () => {
  let mockValue = 100;

  vi.doMock("./counter", () => ({
    increment: () => ++mockValue,
  }));

  // Must use dynamic import
  const { increment } = await import("./counter");

  expect(increment()).toBe(101);
  expect(increment()).toBe(102);
});
```

### Test-Specific Behavior

```typescript
describe("dynamic mocking", () => {
  beforeEach(() => {
    vi.resetModules(); // Clear module cache
  });

  test("scenario A", async () => {
    vi.doMock("./config", () => ({
      API_URL: "https://api-test.example.com",
    }));

    const { API_URL } = await import("./config");
    expect(API_URL).toBe("https://api-test.example.com");
  });

  test("scenario B", async () => {
    vi.doMock("./config", () => ({
      API_URL: "https://api-prod.example.com",
    }));

    const { API_URL } = await import("./config");
    expect(API_URL).toBe("https://api-prod.example.com");
  });
});
```

**Note:** Static imports are hoisted, so `vi.doMock()` won't affect them. Must use `await import()`.

---

## Mocking Async Functions

**Use Case:** Mock promises, async/await, and asynchronous operations.

### Mock Resolved Values

```typescript
test("mocks async success", async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: "success" }),
  });

  const response = await mockFetch("/api/users");
  const data = await response.json();

  expect(mockFetch).toHaveBeenCalledWith("/api/users");
  expect(data).toEqual({ data: "success" });
});
```

### Mock Rejected Values

```typescript
test("mocks async error", async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

  await expect(mockFetch("/api/users")).rejects.toThrow("Network error");
  expect(mockFetch).toHaveBeenCalled();
});
```

### Mock Sequential Async Results

```typescript
test("mocks different results per call", async () => {
  const mockQuery = vi
    .fn()
    .mockResolvedValueOnce([{ id: 1 }]) // First call
    .mockResolvedValueOnce([{ id: 2 }]) // Second call
    .mockRejectedValue(new Error("Failed")); // Third call

  expect(await mockQuery()).toEqual([{ id: 1 }]);
  expect(await mockQuery()).toEqual([{ id: 2 }]);
  await expect(mockQuery()).rejects.toThrow("Failed");
});
```

### Database Mocking Pattern

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

import { db } from "~/lib/database";

describe("User Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("finds user by id", async () => {
    vi.mocked(db.users.findUnique).mockResolvedValue({
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    });

    const user = await db.users.findUnique({ where: { id: "user-123" } });

    expect(user?.name).toBe("John Doe");
    expect(db.users.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
    });
  });

  test("creates new user", async () => {
    vi.mocked(db.users.create).mockResolvedValue({
      id: "new-user-id",
      name: "Jane Smith",
      email: "jane@example.com",
    });

    const newUser = await db.users.create({
      data: { name: "Jane Smith", email: "jane@example.com" },
    });

    expect(newUser.id).toBe("new-user-id");
    expect(db.users.create).toHaveBeenCalledWith({
      data: { name: "Jane Smith", email: "jane@example.com" },
    });
  });
});
```

---

## Mocking External Dependencies

### Mock Authentication

```typescript
vi.mock("~/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  verifySession: vi.fn(),
  signOut: vi.fn(),
}));

import { getCurrentUser } from "~/lib/auth";

describe("Protected Action", () => {
  test("succeeds when authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-123",
      role: "admin",
    });

    const result = await protectedAction();

    expect(result.success).toBe(true);
    expect(getCurrentUser).toHaveBeenCalled();
  });

  test("fails when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await protectedAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });
});
```

### Mock Environment Variables

```typescript
describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("uses production config", async () => {
    process.env.NODE_ENV = "production";
    process.env.API_URL = "https://api.example.com";

    const { config } = await import("./config");

    expect(config.apiUrl).toBe("https://api.example.com");
  });

  test("uses development config", async () => {
    process.env.NODE_ENV = "development";
    process.env.API_URL = "http://localhost:3000";

    const { config } = await import("./config");

    expect(config.apiUrl).toBe("http://localhost:3000");
  });
});
```

### Mock Third-Party Libraries

```typescript
// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "fixed-uuid-for-testing"),
}));

import { v4 as uuidv4 } from "uuid";

test("uses fixed UUID", () => {
  const id = uuidv4();

  expect(id).toBe("fixed-uuid-for-testing");
  expect(uuidv4).toHaveBeenCalled();
});
```

### Mock Date/Time

```typescript
describe("Time-sensitive tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("creates timestamp", () => {
    const timestamp = new Date().toISOString();

    expect(timestamp).toBe("2024-01-15T00:00:00.000Z");
  });

  test("advances time", () => {
    const startTime = Date.now();

    vi.advanceTimersByTime(1000); // +1 second

    const endTime = Date.now();

    expect(endTime - startTime).toBe(1000);
  });
});
```

---

## Rules

These three are stated nowhere else in the bundle. Cleanup, module boundaries and
success/error coverage are in `patterns.md`.

- **Clear mocks between tests** — `beforeEach(() => vi.clearAllMocks())`. Without it, call
  counts from one test leak into the next and assertions pass for the wrong reason.
- **Prefer `vi.mock()` over `vi.spyOn()` for modules** — `vi.mock` works in every environment,
  including browser mode, where an ES module export is not reliably writable.
- **Mock async functions with `mockResolvedValue`, never `mockReturnValue`** — the caller awaits
  the result, so the mock must return a promise or the test fails on a confusing `undefined`.

```typescript
vi.mocked(getUser).mockResolvedValue({ id: "1" }); // ✅ awaitable
vi.mocked(getUser).mockReturnValue({ id: "1" });   // ❌ not a promise
```

---

## Quick Reference

The `vi.fn` / `vi.mock` / `vi.spyOn` / partial-mock choice is the Decision Table in
`patterns.md`. This table only adds the shapes that table lacks.

| Mock Type               | Tool                         | Use Case                              |
| ----------------------- | ---------------------------- | ------------------------------------- |
| **Async success**       | `mockResolvedValue()`        | Promises, async functions             |
| **Async error**         | `mockRejectedValue()`        | Promise rejections, errors            |
| **Timers**              | `vi.useFakeTimers()`         | Date, setTimeout, setInterval         |

---

## Mocking Chained Query Builders

```typescript
vi.mock("~/lib/query-builder", () => ({
  query: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  }),
}));

// Usage:
const results = await query()
  .where({ active: true })
  .orderBy("createdAt")
  .limit(10)
  .execute();
```
