# Unit Testing - Examples

Test utilities are global (`globals: true` in `vitest.config.ts`); only project modules are
imported below. Examples use the `~/` alias for project modules — substitute whatever alias or
relative path the project resolves.

## Contents

1. [Testing a Zod Schema](#example-1-testing-a-zod-schema) — validation success, failure, and error shape
2. [Testing a Server Action with Mocked Database](#example-2-testing-a-server-action-with-mocked-database) — `vi.mock` on the DB, auth guard, returned result contract
3. [Testing a Transform Function](#example-3-testing-a-transform-function) — mapping and reshaping data, no mocks needed
4. [Testing with Parameterized Data (`test.each`)](#example-4-testing-with-parameterized-data-testeach) — one table, many cases
5. [Testing Async Functions with Error Handling](#example-5-testing-async-functions-with-error-handling) — `rejects.toThrow`, mocked `fetch`, fake timers
6. [Testing Hooks with `@testing-library/react`](#example-6-testing-hooks-with-testing-libraryreact) — `renderHook` + `act` under a jsdom environment

---

## Example 1: Testing a Zod Schema

**Source:**

```typescript
// src/features/budgets/schemas/budget-schema.ts
import { z } from "zod";

export const createBudgetSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  limit: z
    .number()
    .positive("Limit must be a positive number")
    .max(1_000_000, "Limit cannot exceed 1,000,000"),
  category: z.enum([
    "food",
    "transport",
    "entertainment",
    "utilities",
    "other",
  ]),
  description: z.string().max(500).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
```

**Test:**

```typescript
// src/features/budgets/schemas/budget-schema.test.ts

import { createBudgetSchema } from "./budget-schema";

describe("createBudgetSchema", () => {
  const validInput = {
    name: "Groceries",
    limit: 500,
    category: "food" as const,
  };

  test("accepts valid input", () => {
    const result = createBudgetSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validInput);
    }
  });

  test("accepts valid input with optional description", () => {
    const result = createBudgetSchema.safeParse({
      ...validInput,
      description: "Monthly grocery budget",
    });

    expect(result.success).toBe(true);
  });

  describe("name validation", () => {
    test("rejects empty name", () => {
      const result = createBudgetSchema.safeParse({ ...validInput, name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name is required");
      }
    });

    test("rejects name exceeding 100 characters", () => {
      const result = createBudgetSchema.safeParse({
        ...validInput,
        name: "a".repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Name must be 100 characters or less",
        );
      }
    });
  });

  describe("limit validation", () => {
    test("rejects zero limit", () => {
      const result = createBudgetSchema.safeParse({ ...validInput, limit: 0 });

      expect(result.success).toBe(false);
    });

    test("rejects negative limit", () => {
      const result = createBudgetSchema.safeParse({
        ...validInput,
        limit: -100,
      });

      expect(result.success).toBe(false);
    });

    test("rejects limit exceeding maximum", () => {
      const result = createBudgetSchema.safeParse({
        ...validInput,
        limit: 1_000_001,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("category validation", () => {
    test("rejects invalid category", () => {
      const result = createBudgetSchema.safeParse({
        ...validInput,
        category: "invalid",
      });

      expect(result.success).toBe(false);
    });

    test.each([
      "food",
      "transport",
      "entertainment",
      "utilities",
      "other",
    ] as const)("accepts '%s' as a valid category", (category) => {
      const result = createBudgetSchema.safeParse({ ...validInput, category });

      expect(result.success).toBe(true);
    });
  });
});
```

---

## Example 2: Testing a Server Action with Mocked Database

**Source:**

```typescript
// src/features/budgets/actions/create-budget.ts
"use server";

import { db } from "~/lib/database";
import { getCurrentUser } from "~/lib/auth";
import { createBudgetSchema } from "../schemas/budget-schema";
import type { ActionResponse } from "~/types/action-response";

export async function createBudget(
  input: unknown,
): Promise<ActionResponse<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const budget = await db.insert("budgets", {
    ...parsed.data,
    userId: user.id,
    createdAt: new Date(),
  });

  return { success: true, data: { id: budget.id } };
}
```

**Test:**

```typescript
// src/features/budgets/actions/create-budget.test.ts

vi.mock("~/lib/database", () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("~/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { db } from "~/lib/database";
import { getCurrentUser } from "~/lib/auth";
import { createBudget } from "./create-budget";

describe("createBudget", () => {
  const validInput = {
    name: "Groceries",
    limit: 500,
    category: "food",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a budget for an authenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", role: "user" });
    vi.mocked(db.insert).mockResolvedValue({ id: "budget-1" });

    const result = await createBudget(validInput);

    expect(result).toEqual({ success: true, data: { id: "budget-1" } });
    expect(db.insert).toHaveBeenCalledWith(
      "budgets",
      expect.objectContaining({
        name: "Groceries",
        limit: 500,
        category: "food",
        userId: "user-1",
      }),
    );
  });

  test("returns error when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createBudget(validInput);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  test("returns validation errors for invalid input", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", role: "user" });

    const result = await createBudget({
      name: "",
      limit: -1,
      category: "invalid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(result.fieldErrors).toBeDefined();
    }
    expect(db.insert).not.toHaveBeenCalled();
  });

  test("propagates database errors", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1", role: "user" });
    vi.mocked(db.insert).mockRejectedValue(
      new Error("Database connection failed"),
    );

    await expect(createBudget(validInput)).rejects.toThrow(
      "Database connection failed",
    );
  });
});
```

---

## Example 3: Testing a Transform Function

**Source:**

```typescript
// src/utils/transform-api-response.ts
export interface ApiUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

export function transformUser(apiUser: ApiUser): User {
  return {
    id: apiUser.user_id,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    fullName: `${apiUser.first_name} ${apiUser.last_name}`,
    email: apiUser.email_address,
    isActive: apiUser.is_active,
    createdAt: new Date(apiUser.created_at),
  };
}

export function transformUsers(apiUsers: ApiUser[]): User[] {
  return apiUsers.map(transformUser);
}
```

**Test:**

```typescript
// src/utils/transform-api-response.test.ts

import {
  transformUser,
  transformUsers,
  type ApiUser,
} from "./transform-api-response";

describe("transformUser", () => {
  const apiUser: ApiUser = {
    user_id: "usr-123",
    first_name: "Jane",
    last_name: "Doe",
    email_address: "jane@example.com",
    is_active: true,
    created_at: "2025-06-15T10:00:00Z",
  };

  test("maps snake_case fields to camelCase", () => {
    const result = transformUser(apiUser);

    expect(result.id).toBe("usr-123");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.email).toBe("jane@example.com");
    expect(result.isActive).toBe(true);
  });

  test("computes fullName from first and last name", () => {
    const result = transformUser(apiUser);

    expect(result.fullName).toBe("Jane Doe");
  });

  test("converts created_at string to Date object", () => {
    const result = transformUser(apiUser);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe("2025-06-15T10:00:00.000Z");
  });
});

describe("transformUsers", () => {
  test("transforms an array of API users", () => {
    const apiUsers: ApiUser[] = [
      {
        user_id: "1",
        first_name: "Alice",
        last_name: "Smith",
        email_address: "alice@example.com",
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        user_id: "2",
        first_name: "Bob",
        last_name: "Jones",
        email_address: "bob@example.com",
        is_active: false,
        created_at: "2025-02-01T00:00:00Z",
      },
    ];

    const result = transformUsers(apiUsers);

    expect(result).toHaveLength(2);
    expect(result[0].fullName).toBe("Alice Smith");
    expect(result[1].fullName).toBe("Bob Jones");
    expect(result[1].isActive).toBe(false);
  });

  test("returns empty array for empty input", () => {
    expect(transformUsers([])).toEqual([]);
  });
});
```

---

## Example 4: Testing with Parameterized Data (test.each)

**Source:**

```typescript
// src/utils/get-status-label.ts
export type Status = "draft" | "pending" | "active" | "archived" | "deleted";

export function getStatusLabel(status: Status): string {
  const labels: Record<Status, string> = {
    draft: "Draft",
    pending: "Pending Review",
    active: "Active",
    archived: "Archived",
    deleted: "Deleted",
  };
  return labels[status];
}

export function getStatusColor(status: Status): string {
  const colors: Record<Status, string> = {
    draft: "gray",
    pending: "yellow",
    active: "green",
    archived: "blue",
    deleted: "red",
  };
  return colors[status];
}

export function isEditable(status: Status): boolean {
  return status === "draft" || status === "pending";
}
```

**Test:**

```typescript
// src/utils/get-status-label.test.ts

import {
  getStatusLabel,
  getStatusColor,
  isEditable,
  type Status,
} from "./get-status-label";

describe("getStatusLabel", () => {
  test.each<{ status: Status; expected: string }>([
    { status: "draft", expected: "Draft" },
    { status: "pending", expected: "Pending Review" },
    { status: "active", expected: "Active" },
    { status: "archived", expected: "Archived" },
    { status: "deleted", expected: "Deleted" },
  ])("returns '$expected' for status '$status'", ({ status, expected }) => {
    expect(getStatusLabel(status)).toBe(expected);
  });
});

describe("getStatusColor", () => {
  test.each`
    status        | expected
    ${"draft"}    | ${"gray"}
    ${"pending"}  | ${"yellow"}
    ${"active"}   | ${"green"}
    ${"archived"} | ${"blue"}
    ${"deleted"}  | ${"red"}
  `(
    "returns '$expected' for status '$status'",
    ({ status, expected }: { status: Status; expected: string }) => {
      expect(getStatusColor(status)).toBe(expected);
    },
  );
});

describe("isEditable", () => {
  test.each<{ status: Status; expected: boolean }>([
    { status: "draft", expected: true },
    { status: "pending", expected: true },
    { status: "active", expected: false },
    { status: "archived", expected: false },
    { status: "deleted", expected: false },
  ])("returns $expected for status '$status'", ({ status, expected }) => {
    expect(isEditable(status)).toBe(expected);
  });
});
```

---

## Example 5: Testing Async Functions with Error Handling

**Source:**

```typescript
// src/lib/api-client.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(
      response.status,
      body || `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}
```

**Test:**

```typescript
// src/lib/api-client.test.ts

import { fetchJson, ApiError } from "./api-client";

describe("fetchJson", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "Test" }),
    });

    const result = await fetchJson<{ id: number; name: string }>("/api/test");

    expect(result).toEqual({ id: 1, name: "Test" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  test("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(fetchJson("/api/missing")).rejects.toThrow(ApiError);
    await expect(fetchJson("/api/missing")).rejects.toMatchObject({
      statusCode: 404,
      message: "Not Found",
    });
  });

  test("includes default message when body is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(""),
    });

    await expect(fetchJson("/api/error")).rejects.toThrow(
      "Request failed with status 500",
    );
  });

  test("merges custom headers with defaults", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchJson("/api/test", {
      headers: { Authorization: "Bearer token-123" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  test("propagates network errors", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchJson("/api/test")).rejects.toThrow("Failed to fetch");
  });
});
```

---

## Example 6: Testing Hooks with @testing-library/react

Requires `@testing-library/react` as a devDependency and a jsdom environment for this file — add
`// @vitest-environment jsdom` at the top of the test file when the project default is `node`.

**Source:**

```typescript
// src/hooks/use-debounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Test:**

```typescript
// src/hooks/use-debounce.test.ts
import { renderHook, act } from "@testing-library/react";

import { useDebounce } from "./use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));

    expect(result.current).toBe("hello");
  });

  test("does not update value before delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } },
    );

    rerender({ value: "world", delay: 500 });

    // Advance time but not past the delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("hello");
  });

  test("updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } },
    );

    rerender({ value: "world", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("world");
  });

  test("resets timer on rapid value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } },
    );

    // Rapid changes
    rerender({ value: "ab", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "abc", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "abcd", delay: 500 });

    // Not enough time since last change
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("a"); // still original value

    // Now enough time has passed since last change
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("abcd");
  });

  test("cleans up timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = renderHook(() => useDebounce("hello", 500));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
```
