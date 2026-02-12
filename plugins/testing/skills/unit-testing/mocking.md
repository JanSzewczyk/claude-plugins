# Mocking in Vitest

Comprehensive guide to mocking modules, functions, and dependencies in Vitest unit tests.

## Table of Contents

1. [Mock Functions with `vi.fn()`](#mock-functions-with-vifn)
2. [Mock Modules with `vi.mock()`](#mock-modules-with-vimock)
3. [Spy on Methods with `vi.spyOn()`](#spy-on-methods-with-vispyon)
4. [Hoisting with `vi.hoisted()`](#hoisting-with-vihoisted)
5. [Partial Module Mocking](#partial-module-mocking)
6. [Dynamic Mocking with `vi.doMock()`](#dynamic-mocking-with-vidomock)
7. [Mocking Async Functions](#mocking-async-functions)
8. [Mocking External Dependencies](#mocking-external-dependencies)
9. [Best Practices](#best-practices)

---

## Mock Functions with `vi.fn()`

**Use Case:** Create standalone mock functions to spy on calls, control return values, and test callbacks.

### Basic Mock Functions

```typescript
test("tracks function calls", () => {
  const mockCallback = vi.fn();

  mockCallback("hello", 123);
  mockCallback("world", 456);

  expect(mockCallback).toHaveBeenCalledTimes(2);
  expect(mockCallback).toHaveBeenCalledWith("hello", 123);
  expect(mockCallback).toHaveBeenLastCalledWith("world", 456);
  expect(mockCallback.mock.calls[0]).toEqual(["hello", 123]);
});
```

### Mock with Return Values

```typescript
test("returns mocked values", () => {
  const mockFn = vi.fn();

  // Return static value
  mockFn.mockReturnValue(42);
  expect(mockFn()).toBe(42);

  // Return once, then default
  mockFn.mockReturnValueOnce(100);
  expect(mockFn()).toBe(100);
  expect(mockFn()).toBe(42);

  // Chain multiple returns
  mockFn.mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValue(3);

  expect(mockFn()).toBe(1);
  expect(mockFn()).toBe(2);
  expect(mockFn()).toBe(3);
  expect(mockFn()).toBe(3);
});
```

### Mock with Custom Implementation

```typescript
test("uses custom implementation", () => {
  const mockAdd = vi.fn((a: number, b: number) => a + b);

  expect(mockAdd(2, 3)).toBe(5);
  expect(mockAdd).toHaveBeenCalledWith(2, 3);

  // Change implementation
  mockAdd.mockImplementation((a, b) => a * b);
  expect(mockAdd(2, 3)).toBe(6);

  // One-time implementation
  mockAdd.mockImplementationOnce((a, b) => a - b);
  expect(mockAdd(5, 2)).toBe(3);
  expect(mockAdd(2, 3)).toBe(6); // Back to multiply
});
```

### Check Mock Results

```typescript
test("inspects mock results", () => {
  const mockFn = vi.fn(() => "result");

  mockFn();
  mockFn();

  expect(mockFn.mock.results[0]).toEqual({
    type: "return",
    value: "result",
  });

  expect(mockFn.mock.results).toHaveLength(2);
});
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

## Best Practices

### 1. ✅ Clear Mocks Between Tests

```typescript
describe("User Service", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset call history and return values
  });

  test("test 1", () => {
    // Fresh mocks
  });

  test("test 2", () => {
    // Independent from test 1
  });
});
```

**Why:** Prevents test pollution and ensures isolation.

### 2. ✅ Use `vi.mocked()` for Type Safety

```typescript
import { getCurrentUser } from "~/lib/auth";

// ❌ BAD - No type checking
getCurrentUser.mockResolvedValue({ wrong: "type" });

// ✅ GOOD - TypeScript enforces correct types
vi.mocked(getCurrentUser).mockResolvedValue({
  id: "123",
  name: "John",
  email: "john@example.com",
});
```

### 3. ✅ Mock at Module Boundaries

```typescript
// ✅ GOOD - Mock external dependencies
vi.mock("~/lib/database");
vi.mock("~/lib/auth");
vi.mock("uuid");

// ❌ BAD - Don't mock internal utilities
// Let them run with real implementations
```

**Why:** Tests should verify your logic, not third-party libraries.

### 4. ✅ Use `vi.hoisted()` for Shared Mocks

```typescript
// ✅ GOOD - Accessible in factory and tests
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("~/lib/users", () => ({
  getUser: mocks.getUser,
}));

// ❌ BAD - Won't work, variable not hoisted
const mockGetUser = vi.fn();
vi.mock("~/lib/users", () => ({
  getUser: mockGetUser, // undefined!
}));
```

### 5. ✅ Prefer `vi.mock()` Over `vi.spyOn()` for Modules

```typescript
// ✅ GOOD - Mock entire module
vi.mock("~/lib/database", () => ({
  db: { query: vi.fn() },
}));

// ⚠️ OK but less ideal - Spy on exports
import * as db from "~/lib/database";
vi.spyOn(db, "query");
```

**Why:** `vi.mock()` is more reliable and works in all environments (including browser mode).

### 6. ✅ Restore Mocks in `afterEach`

```typescript
describe("Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // Restore original implementations
  });

  test("with spy", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    // ...
  });
});
```

### 7. ✅ Use Partial Mocking for Large Modules

```typescript
// ✅ GOOD - Keep original implementations
vi.mock(import("~/lib/utils"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatDate: vi.fn(), // Mock only this one
  };
});

// ❌ BAD - Replaces entire module
vi.mock("~/lib/utils", () => ({
  formatDate: vi.fn(),
  // Oops, lost all other exports!
}));
```

### 8. ✅ Mock Async Functions with Proper Types

```typescript
// ✅ GOOD - Type-safe async mock
vi.mocked(fetchUser).mockResolvedValue({
  id: "123",
  name: "John",
});

// ❌ BAD - Wrong return type
vi.mocked(fetchUser).mockReturnValue({
  id: "123",
  name: "John",
});
```

### 9. ✅ Test Both Success and Error Paths

```typescript
describe("createUser", () => {
  test("succeeds with valid data", async () => {
    vi.mocked(db.insert).mockResolvedValue({ id: "new-id" });
    // Test success path
  });

  test("fails with duplicate email", async () => {
    vi.mocked(db.insert).mockRejectedValue(new Error("Duplicate email"));
    // Test error path
  });

  test("fails when database is down", async () => {
    vi.mocked(db.insert).mockRejectedValue(new Error("Connection failed"));
    // Test error path
  });
});
```

### 10. ✅ Use `vi.resetModules()` for Dynamic Imports

```typescript
describe("Config tests", () => {
  beforeEach(() => {
    vi.resetModules(); // Clear module cache
  });

  test("test A", async () => {
    vi.doMock("./config", () => ({ MODE: "A" }));
    const { MODE } = await import("./config");
    expect(MODE).toBe("A");
  });

  test("test B", async () => {
    vi.doMock("./config", () => ({ MODE: "B" }));
    const { MODE } = await import("./config");
    expect(MODE).toBe("B");
  });
});
```

---

## Quick Reference

| Mock Type               | Tool                         | Use Case                              |
| ----------------------- | ---------------------------- | ------------------------------------- |
| **Standalone function** | `vi.fn()`                    | Callbacks, spies, controlled behavior |
| **Entire module**       | `vi.mock()`                  | External dependencies, libraries      |
| **Existing method**     | `vi.spyOn()`                 | Object methods, console, globals      |
| **Shared mock state**   | `vi.hoisted()`               | Access variables in factory functions |
| **Partial module**      | `vi.mock() + importOriginal` | Keep some original exports            |
| **Dynamic per-test**    | `vi.doMock()`                | Test-specific configurations          |
| **Async success**       | `mockResolvedValue()`        | Promises, async functions             |
| **Async error**         | `mockRejectedValue()`        | Promise rejections, errors            |
| **Timers**              | `vi.useFakeTimers()`         | Date, setTimeout, setInterval         |

---

## Common Patterns

### Pattern: Mock Database with All CRUD Operations

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

### Pattern: Mock Auth with User States

```typescript
const mockAuth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("~/lib/auth", () => ({
  getCurrentUser: mockAuth.getCurrentUser,
}));

// In tests:
test("authenticated", () => {
  mockAuth.getCurrentUser.mockResolvedValue({ id: "123" });
});

test("unauthenticated", () => {
  mockAuth.getCurrentUser.mockResolvedValue(null);
});
```

### Pattern: Mock with Chained Methods

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

---

For more examples, see:

- [examples.md](./examples.md) - Practical code examples
- [patterns.md](./patterns.md) - Testing patterns and best practices
