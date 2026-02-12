# Mocking in Storybook

Comprehensive guide to mocking data, functions, modules, network requests, and dependencies in Storybook stories and tests.

## Table of Contents

1. [Mock Functions with `fn()`](#mock-functions-with-fn)
2. [Mock Modules with `sb.mock()`](#mock-modules-with-sbmock)
3. [Mock Network Requests with MSW](#mock-network-requests-with-msw)
4. [Mock Next.js Hooks](#mock-nextjs-hooks)
5. [Mock React Context & Providers](#mock-react-context--providers)
6. [Mock Data with Builders](#mock-data-with-builders)
7. [Setup with `beforeEach`](#setup-with-beforeeach)
8. [Best Practices](#best-practices)

---

## Mock Functions with `fn()`

**Use Case:** Mock callback props, event handlers, and spy on function calls in tests.

### Basic Usage

```typescript
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { Button } from "./button";

const meta = preview.meta({
  component: Button,
  args: {
    // Mock onClick handler to spy on calls
    onClick: fn(),
  },
});

export const Button = meta.story({});

Button.test(
  "Clicking button triggers onClick",
  async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button");
    await userEvent.click(button);

    // Assert that onClick was called
    await expect(args.onClick).toHaveBeenCalled();
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
);
```

### Advanced: Mock with Return Values

```typescript
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { UserSearch } from "./user-search";

const meta = preview.meta({
  component: UserSearch,
  args: {
    onSearch: fn(),
    // Mock async function with resolved value
    fetchUsers: fn().mockResolvedValue([
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Smith" },
    ]),
  },
});

export const UserSearch = meta.story({});

UserSearch.test(
  "Fetches users on search",
  async ({ canvas, userEvent, args }) => {
    const searchInput = canvas.getByRole("textbox");
    await userEvent.type(searchInput, "John");

    const searchButton = canvas.getByRole("button", { name: /search/i });
    await userEvent.click(searchButton);

    // Assert that fetchUsers was called with correct query
    await expect(args.fetchUsers).toHaveBeenCalledWith("John");

    // Verify users are displayed
    const userList = await canvas.findByText("John Doe");
    await expect(userList).toBeVisible();
  },
);
```

### Mock Function Implementations

```typescript
const meta = preview.meta({
  component: Calculator,
  args: {
    // Mock with custom implementation
    onCalculate: fn((a: number, b: number) => a + b),

    // Mock with different return values per call
    getRandomNumber: fn()
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(10)
      .mockReturnValue(15),
  },
});
```

---

## Mock Modules with `sb.mock()`

**Use Case:** Replace external dependencies, utility functions, or third-party packages with mocks.

### Setup in `.storybook/preview.ts`

```typescript
import { definePreview } from "@storybook/react-vite";
import { sb } from "storybook/test";

// Mock local modules
sb.mock(import("~/lib/session"));
sb.mock(import("~/lib/analytics"));

// Mock npm packages
sb.mock(import("uuid"));
sb.mock(import("@clerk/nextjs"));

export default definePreview({
  // ... other preview config
});
```

### Using Mocked Modules in Stories

```typescript
import { expect, mocked } from "storybook/test";

import preview from "~/.storybook/preview";

// These imports are automatically mocked by sb.mock()
import { v4 as uuidv4 } from "uuid";
import { getUserFromSession } from "~/lib/session";

import { AuthButton } from "./auth-button";

const meta = preview.meta({
  component: AuthButton,
  beforeEach: async () => {
    // Configure mock behavior for each story
    mocked(uuidv4).mockReturnValue("1234-5678-90ab-cdef");
    mocked(getUserFromSession).mockResolvedValue({
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    });
  },
});

export const LoggedIn = meta.story({});

LoggedIn.test(
  "Displays user name when logged in",
  async ({ canvas, userEvent }) => {
    // Click login button
    const loginButton = canvas.getByRole("button", { name: /sign in/i });
    await userEvent.click(loginButton);

    // Assert getUserFromSession was called
    await expect(getUserFromSession).toHaveBeenCalled();

    // Verify user name is displayed
    const userName = await canvas.findByText("John Doe");
    await expect(userName).toBeVisible();
  },
);
```

### Mock Different Behaviors Per Story

```typescript
export const LoggedIn = meta.story({
  beforeEach: async () => {
    mocked(getUserFromSession).mockResolvedValue({
      id: "user-123",
      name: "John Doe",
    });
  },
});

export const LoggedOut = meta.story({
  beforeEach: async () => {
    mocked(getUserFromSession).mockResolvedValue(null);
  },
});

export const SessionError = meta.story({
  beforeEach: async () => {
    mocked(getUserFromSession).mockRejectedValue(new Error("Session expired"));
  },
});
```

---

## Mock Network Requests with MSW

**Use Case:** Mock REST APIs, GraphQL queries, and external API calls without hitting real backends.

### Install MSW Addon

```bash
npm install -D msw msw-storybook-addon
```

### Setup MSW in `.storybook/preview.ts`

```typescript
import { definePreview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";

// Initialize MSW
initialize();

export default definePreview({
  loaders: [mswLoader],
  // ... other config
});
```

### Mock REST API Requests

```typescript
import { expect } from "storybook/test";
import { http, HttpResponse, delay } from "msw";

import preview from "~/.storybook/preview";

import { UserList } from "./user-list";

const meta = preview.meta({
  component: UserList,
});

// Mock successful API response
export const LoadedUsers = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", () => {
          return HttpResponse.json([
            { id: 1, name: "John Doe", email: "john@example.com" },
            { id: 2, name: "Jane Smith", email: "jane@example.com" },
          ]);
        }),
      ],
    },
  },
});

LoadedUsers.test("Displays list of users", async ({ canvas }) => {
  const johnUser = await canvas.findByText("John Doe");
  await expect(johnUser).toBeVisible();

  const janeUser = await canvas.findByText("Jane Smith");
  await expect(janeUser).toBeVisible();
});

// Mock API error with delay
export const ErrorState = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", async () => {
          await delay(800);
          return new HttpResponse(null, {
            status: 500,
            statusText: "Internal Server Error",
          });
        }),
      ],
    },
  },
});

ErrorState.test("Shows error message on API failure", async ({ canvas }) => {
  const errorMessage = await canvas.findByText(/failed to load users/i);
  await expect(errorMessage).toBeVisible();
});

// Mock loading state
export const LoadingState = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", async () => {
          // Delay indefinitely to keep loading state
          await delay("infinite");
          return HttpResponse.json([]);
        }),
      ],
    },
  },
});

LoadingState.test("Shows loading spinner", async ({ canvas }) => {
  const spinner = canvas.getByRole("status");
  await expect(spinner).toBeVisible();
});
```

### Mock GraphQL Queries

```typescript
import { graphql, HttpResponse, delay } from "msw";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";

import preview from "~/.storybook/preview";

import { DocumentScreen } from "./document-screen";

const mockedClient = new ApolloClient({
  uri: "https://api.example.com/graphql",
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "no-cache", errorPolicy: "all" },
    query: { fetchPolicy: "no-cache", errorPolicy: "all" },
  },
});

const meta = preview.meta({
  component: DocumentScreen,
  decorators: [
    (Story) => (
      <ApolloProvider client={mockedClient}>
        <Story />
      </ApolloProvider>
    ),
  ],
});

export const LoadedDocument = meta.story({
  parameters: {
    msw: {
      handlers: [
        graphql.query("GetDocument", () => {
          return HttpResponse.json({
            data: {
              document: {
                id: "doc-123",
                title: "Project Proposal",
                content: "Lorem ipsum dolor sit amet...",
                author: { name: "John Doe" },
              },
            },
          });
        }),
      ],
    },
  },
});

export const GraphQLError = meta.story({
  parameters: {
    msw: {
      handlers: [
        graphql.query("GetDocument", async () => {
          await delay(500);
          return HttpResponse.json({
            errors: [{ message: "Access denied" }],
          });
        }),
      ],
    },
  },
});
```

### Mock POST Requests with Request Matching

```typescript
export const SubmitForm = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.post("/api/users", async ({ request }) => {
          const body = await request.json();

          // Validate request body
          if (!body.email) {
            return new HttpResponse(null, {
              status: 400,
              statusText: "Email required",
            });
          }

          // Return success response
          return HttpResponse.json({
            id: "user-123",
            ...body,
          });
        }),
      ],
    },
  },
});
```

---

## Mock Next.js Hooks

**Use Case:** Mock Next.js navigation hooks like `useRouter`, `useParams`, `useSearchParams`, and `redirect`.

### Mock `useRouter` and Navigation

```typescript
import { expect } from "storybook/test";
import { redirect, getRouter } from "@storybook/nextjs/navigation.mock";

import preview from "~/.storybook/preview";

import { LoginForm } from "./login-form";

const meta = preview.meta({
  component: LoginForm,
  parameters: {
    nextjs: {
      appDirectory: true, // Required for next/navigation mocking
    },
  },
});

export const UnauthenticatedRedirect = meta.story({});

UnauthenticatedRedirect.test("Redirects to login on unauthorized", async () => {
  // Assert that redirect was called with correct path
  await expect(redirect).toHaveBeenCalledWith("/login", "replace");
});

export const NavigationTest = meta.story({});

NavigationTest.test(
  "Back button navigates back",
  async ({ canvas, userEvent }) => {
    const backButton = await canvas.findByText("Go back");
    await userEvent.click(backButton);

    // Assert that router.back() was called
    await expect(getRouter().back).toHaveBeenCalled();
  },
);
```

### Mock `useParams` and Route Parameters

```typescript
const meta = preview.meta({
  component: ProductPage,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        // Mock route params for useParams()
        segments: [
          ["category", "electronics"],
          ["productId", "prod-123"],
        ],
      },
    },
  },
});

export const ProductPage = meta.story({});

ProductPage.test("Displays product based on params", async ({ canvas }) => {
  // Component uses useParams() which returns:
  // { category: "electronics", productId: "prod-123" }
  const productTitle = await canvas.findByText(/product prod-123/i);
  await expect(productTitle).toBeVisible();
});
```

### Mock `useSelectedLayoutSegment`

```typescript
const meta = preview.meta({
  component: DashboardNav,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        // Mock segments for useSelectedLayoutSegment()
        segments: ["dashboard", "analytics"],
      },
    },
  },
});

// In component: useSelectedLayoutSegment() returns "dashboard"
// In component: useSelectedLayoutSegments() returns ["dashboard", "analytics"]
```

### Mock `useSearchParams`

```typescript
const meta = preview.meta({
  component: SearchResults,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        query: {
          q: "storybook",
          sort: "date",
        },
      },
    },
  },
});

// In component: useSearchParams() returns { q: "storybook", sort: "date" }
```

---

## Mock React Context & Providers

**Use Case:** Provide mock context values, theme providers, auth providers, or any React Context.

### Using Decorators to Mock Context

```typescript
import { createContext } from "react";

import preview from "~/.storybook/preview";

import { UserProfile } from "./user-profile";

// Your app's context
export const AuthContext = createContext<{
  user: { id: string; name: string } | null;
  isAuthenticated: boolean;
}>({
  user: null,
  isAuthenticated: false,
});

const meta = preview.meta({
  component: UserProfile,
});

// Story with authenticated user
export const AuthenticatedUser = meta.story({
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          user: { id: "user-123", name: "John Doe" },
          isAuthenticated: true,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
});

// Story with unauthenticated user
export const UnauthenticatedUser = meta.story({
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          user: null,
          isAuthenticated: false,
        }}
      >
        <Story />
      </AuthContext.Provider>
    ),
  ],
});
```

### Mock Theme Provider

```typescript
import { ThemeProvider } from "~/components/theme-provider";

const meta = preview.meta({
  component: ThemedButton,
});

export const LightTheme = meta.story({
  decorators: [
    (Story) => (
      <ThemeProvider theme="light">
        <Story />
      </ThemeProvider>
    ),
  ],
});

export const DarkTheme = meta.story({
  decorators: [
    (Story) => (
      <ThemeProvider theme="dark">
        <Story />
      </ThemeProvider>
    ),
  ],
});
```

### Global Decorators in `.storybook/preview.tsx`

```typescript
import { definePreview } from "@storybook/react-vite";
import { AuthProvider } from "~/components/auth-provider";

export default definePreview({
  decorators: [
    (Story) => (
      <AuthProvider>
        <Story />
      </AuthProvider>
    ),
  ],
});
```

---

## Mock Data with Builders

**Use Case:** Generate consistent, reusable mock data for stories and tests using test-data-bot builders.

### Using Builder Factories

```typescript
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { userBuilder } from "~/features/users/test/builders";

import { UserCard } from "./user-card";

const meta = preview.meta({
  component: UserCard,
  args: {
    onSelect: fn(),
  },
});

// Use builder to generate mock user data
export const UserCard = meta.story({
  args: {
    user: userBuilder.one(),
  },
});

UserCard.test("Renders user information", async ({ canvas, args }) => {
  const userName = canvas.getByText(args.user.name);
  await expect(userName).toBeVisible();

  const userEmail = canvas.getByText(args.user.email);
  await expect(userEmail).toBeVisible();
});

// Generate multiple users for list components
export const UserList = meta.story({
  args: {
    users: userBuilder.many(5),
  },
});
```

### Override Builder Defaults

```typescript
export const AdminUser = meta.story({
  args: {
    user: userBuilder.one({
      role: "admin",
      permissions: ["read", "write", "delete"],
    }),
  },
});

export const VerifiedUser = meta.story({
  args: {
    user: userBuilder.one({
      verified: true,
      verifiedAt: new Date("2024-01-15"),
    }),
  },
});
```

> **Note:** If builder doesn't exist, invoke `/builder-factory` skill to generate it from TypeScript types.

---

## Setup with `beforeEach`

**Use Case:** Run setup code before each story or test, ideal for configuring mocks, resetting state, or initializing data.

### Meta-Level `beforeEach` (Runs for All Stories)

```typescript
import { mocked } from "storybook/test";
import { getUserSession } from "~/lib/session";

import preview from "~/.storybook/preview";

import { Dashboard } from "./dashboard";

const meta = preview.meta({
  component: Dashboard,
  // Runs before EVERY story in this file
  beforeEach: async () => {
    mocked(getUserSession).mockResolvedValue({
      user: { id: "user-123", name: "John Doe" },
      expiresAt: new Date("2025-12-31"),
    });
  },
});
```

### Story-Level `beforeEach` (Override for Specific Story)

```typescript
export const AdminDashboard = meta.story({
  // Override meta beforeEach for this story only
  beforeEach: async () => {
    mocked(getUserSession).mockResolvedValue({
      user: { id: "admin-456", name: "Admin User", role: "admin" },
      expiresAt: new Date("2025-12-31"),
    });
  },
});
```

### `beforeEach` with Args Access

```typescript
const meta = preview.meta({
  component: Form,
  args: {
    onSubmit: fn(),
  },
  beforeEach: async ({ args }) => {
    // Access and configure story args
    args.onSubmit.mockResolvedValue({ success: true });
  },
});
```

### Combining `beforeEach` with `play` Function

```typescript
export const FormSubmission = meta.story({
  beforeEach: async ({ args }) => {
    // Setup mocks
    args.onSubmit.mockResolvedValue({ success: true });
  },
  play: async ({ canvas, userEvent, args }) => {
    // Run interactions after beforeEach completes
    const submitButton = canvas.getByRole("button", { name: /submit/i });
    await userEvent.click(submitButton);
    await expect(args.onSubmit).toHaveBeenCalled();
  },
});
```

---

## Best Practices

### 1. **Always Use `fn()` for Callback Props**

```typescript
// ✅ CORRECT
const meta = preview.meta({
  component: Button,
  args: {
    onClick: fn(),
    onHover: fn(),
  },
});

// ❌ WRONG - Can't spy on function calls
const meta = preview.meta({
  component: Button,
  args: {
    onClick: () => console.log("clicked"),
  },
});
```

### 2. **Destructure `userEvent` from Test Parameters**

```typescript
// ✅ CORRECT - userEvent from parameters
Story.test("Test", async ({ canvas, userEvent }) => {
  await userEvent.click(button);
});

// ❌ WRONG - Importing userEvent breaks timing
import { userEvent } from "storybook/test";
Story.test("Test", async ({ canvas }) => {
  await userEvent.click(button);
});
```

### 3. **Use MSW for Network Requests, Not `fn()`**

```typescript
// ✅ CORRECT - MSW for real API calls
export const Story = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", () => HttpResponse.json([...])),
      ],
    },
  },
});

// ❌ WRONG - fn() doesn't intercept fetch/axios
const meta = preview.meta({
  args: {
    fetchUsers: fn().mockResolvedValue([...]),
  },
});
```

### 4. **Mock Modules in `.storybook/preview.ts`, Not Story Files**

```typescript
// ✅ CORRECT - Mock in preview.ts
// .storybook/preview.ts
sb.mock(import("~/lib/session"));
sb.mock(import("uuid"));

// ❌ WRONG - Don't mock in story files
// component.stories.tsx
import { sb } from "storybook/test";
sb.mock(import("~/lib/session")); // Won't work here
```

### 5. **Use `beforeEach` for Mock Setup, Not Inline**

```typescript
// ✅ CORRECT - Configure mocks in beforeEach
const meta = preview.meta({
  component: Auth,
  beforeEach: async () => {
    mocked(getUser).mockResolvedValue({ id: "123" });
  },
});

// ❌ WRONG - Inline mock configuration is less flexible
const meta = preview.meta({
  component: Auth,
  args: {
    getUser: fn().mockResolvedValue({ id: "123" }),
  },
});
```

### 6. **Prefer Builders Over Inline Mock Data**

```typescript
// ✅ CORRECT - Reusable builder
export const Story = meta.story({
  args: {
    user: userBuilder.one(),
  },
});

// ❌ WRONG - Inline data duplicated across stories
export const Story = meta.story({
  args: {
    user: {
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      createdAt: new Date(),
    },
  },
});
```

### 7. **Test One Behavior Per `.test()` Method**

```typescript
// ✅ CORRECT - Separate tests for each behavior
Story.test("Renders user name", async ({ canvas, args }) => {
  const name = canvas.getByText(args.user.name);
  await expect(name).toBeVisible();
});

Story.test(
  "Clicking card triggers callback",
  async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("article"));
    await expect(args.onSelect).toHaveBeenCalled();
  },
);

// ❌ WRONG - Multiple behaviors in one test
Story.test("All functionality", async ({ canvas, userEvent, args }) => {
  // Test 1: Rendering
  await expect(canvas.getByText(args.user.name)).toBeVisible();

  // Test 2: Interaction
  await userEvent.click(canvas.getByRole("article"));
  await expect(args.onSelect).toHaveBeenCalled();

  // Test 3: Accessibility
  await expect(canvas.getByRole("article")).toHaveAccessibleName();
});
```

### 8. **Use Specific MSW Handlers Per Story**

```typescript
// ✅ CORRECT - Each story has its own handler
export const Success = meta.story({
  parameters: {
    msw: {
      handlers: [http.get("/api/users", () => HttpResponse.json([...]))],
    },
  },
});

export const Error = meta.story({
  parameters: {
    msw: {
      handlers: [http.get("/api/users", () => new HttpResponse(null, { status: 500 }))],
    },
  },
});

// ❌ WRONG - Global handler doesn't allow per-story control
```

### 9. **Always Await Async Assertions**

```typescript
// ✅ CORRECT - Await all async operations
Story.test("Test", async ({ canvas, userEvent }) => {
  await userEvent.click(button);
  await expect(canvas.getByText("Success")).toBeVisible();
});

// ❌ WRONG - Missing await causes flaky tests
Story.test("Test", async ({ canvas, userEvent }) => {
  userEvent.click(button); // Missing await
  expect(canvas.getByText("Success")).toBeVisible(); // Missing await (WRONG!)
});
```

### 10. **Reset Mocks Between Tests**

```typescript
// ✅ CORRECT - beforeEach resets mocks for each story
const meta = preview.meta({
  component: Component,
  beforeEach: async ({ args }) => {
    // Reset and reconfigure for each story
    args.onSubmit.mockReset();
    args.onSubmit.mockResolvedValue({ success: true });
  },
});
```

---

## Quick Reference

| Mock Type            | Tool                                | Use Case                                 |
| -------------------- | ----------------------------------- | ---------------------------------------- |
| **Callback props**   | `fn()`                              | onClick, onSubmit, event handlers        |
| **External modules** | `sb.mock()`                         | uuid, session, analytics                 |
| **REST APIs**        | MSW `http.*`                        | fetch, axios, API calls                  |
| **GraphQL**          | MSW `graphql.*`                     | Apollo, urql, GraphQL queries            |
| **Next.js hooks**    | `@storybook/nextjs/navigation.mock` | useRouter, useParams, redirect           |
| **React Context**    | Decorators                          | AuthContext, ThemeProvider               |
| **Mock data**        | Builders                            | User objects, complex data structures    |
| **Setup code**       | `beforeEach`                        | Mock configuration, state initialization |

---

## Common Patterns

### Pattern: Mock API with Loading State

```typescript
export const Loading = meta.story({
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
```

### Pattern: Mock API with Error After Delay

```typescript
export const Error = meta.story({
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users", async () => {
          await delay(1000);
          return new HttpResponse(null, { status: 500 });
        }),
      ],
    },
  },
});
```

### Pattern: Mock Authenticated User

```typescript
const meta = preview.meta({
  component: Dashboard,
  beforeEach: async () => {
    mocked(getCurrentUser).mockResolvedValue({
      id: "user-123",
      name: "John Doe",
      role: "admin",
    });
  },
});
```

### Pattern: Mock Third-Party Package

```typescript
// .storybook/preview.ts
sb.mock(import("uuid"));

// component.stories.tsx
import { mocked } from "storybook/test";
import { v4 as uuidv4 } from "uuid";

const meta = preview.meta({
  beforeEach: async () => {
    mocked(uuidv4).mockReturnValue("fixed-uuid-for-testing");
  },
});
```

---

For more examples, see:

- [examples.md](./examples.md) - Practical code examples
- [patterns.md](./patterns.md) - Testing patterns
- [best-practices.md](./best-practices.md) - Best practices and pitfalls
