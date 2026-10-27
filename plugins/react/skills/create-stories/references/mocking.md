# Mocking in Storybook

How to fake what a component depends on. Which mechanism fits which dependency is the rule
"Choose the mock by what is faked" in `rules.md`; this file holds the recipes. Code is shown only for
the Storybook-specific APIs; the rest is plain Vitest / Storybook usage.

| What is faked                        | Recipe                                              |
| ------------------------------------ | --------------------------------------------------- |
| Callback props (onClick, onSubmit)   | [Callbacks](#callbacks--fn)                         |
| Modules the component imports        | [sb.mock()](#modules--sbmock)                       |
| HTTP requests (fetch, REST, GraphQL) | [MSW](#network--msw)                                |
| `next/navigation` hooks, `redirect`  | [Next.js](#nextjs-navigation)                       |
| React Context, providers             | [Providers](#providers--decorators)                 |
| Typed data objects                   | `stories.md`, "Data — builders over inline objects" |

## Callbacks — `fn()`

- Import `fn` from `storybook/test` and declare it in `meta.args`, so every test shares one spy.
  Assert with `toHaveBeenCalled` / `toHaveBeenCalledWith` / `toHaveBeenCalledTimes`.
- A callback whose result the component uses (an async loader, a server action passed as a prop)
  needs a result: `fn().mockResolvedValue(data)` in `meta.args`, or
  `fn(async () => ({ success: false, error: "…" }))` for a story's error state. Cast typed
  server-action props: `fn(() => ({ success: true }) as unknown as RedirectAction)`.
- `beforeEach` configures and resets mocks so no state leaks between tests. Meta-level runs before
  every story in the file; a story-level one overrides it. It receives the context, so
  `beforeEach: async ({ args }) => { args.onSubmit.mockResolvedValue(...) }` works too.

## Providers — decorators

App-wide providers (theme, query client, auth) go in `decorators` of `.storybook/preview.tsx`. A
story that needs a different value wraps `<Story />` in its own `<XContext.Provider value={...}>`
decorator, one story per provider value.

## Modules — `sb.mock()`

Registration, in `.storybook/preview.ts`:

```typescript
import { definePreview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test";

sb.mock(import("~/lib/session"), { spy: true }); // real implementation, calls recorded — the default
sb.mock(import("uuid")); // without spy: fully automocked, every export returns undefined

export default definePreview({
  /* ... */
});
```

A richer fake: a hand-written module in a `__mocks__` directory next to the original
(`lib/__mocks__/session.ts`), or at the project root for packages from `node_modules`.

Per-story behaviour, in the story file — imports resolve to the registered mocks:

```typescript
import { expect, mocked } from "storybook/test";
import { getUserFromSession } from "~/lib/session";

export const LoggedIn = meta.story({
  beforeEach: async () => {
    mocked(getUserFromSession).mockResolvedValue({ id: "user-123", name: "John Doe" });
  },
});

export const SessionError = meta.story({
  beforeEach: async () => {
    mocked(getUserFromSession).mockRejectedValue(new Error("Session expired"));
  },
});
```

## Network — MSW

Requires `msw` and `msw-storybook-addon`, registered once in `.storybook/preview.ts`:

```typescript
import { initialize, mswLoader } from "msw-storybook-addon";

initialize();

export default definePreview({ loaders: [mswLoader] });
```

One story per response, handlers in `parameters.msw.handlers`:

```typescript
import { http, HttpResponse, delay } from "msw";

export const LoadedUsers = meta.story({
  parameters: {
    msw: {
      handlers: [http.get("/api/users", () => HttpResponse.json(userBuilder.many(2)))],
    },
  },
});
```

- **Error state** → the handler returns `new HttpResponse(null, { status: 500 })`.
- **Loading state** → `await delay("infinite")` before returning, which holds the component in loading.
- **GraphQL** → `graphql.query("OperationName", () => HttpResponse.json({ data }))`, with the client
  provider added as a decorator.
- Assert on what renders after the response with `findBy*`, not on the request.

## Next.js navigation

Requires `parameters.nextjs.appDirectory: true` in the preview for App Router projects
(`setup.md`).

Router calls and `redirect` are spies exported by the mock module:

```typescript
import { redirect, getRouter } from "@storybook/nextjs-vite/navigation.mock";

Unauthenticated.test("Redirects to login", async () => {
  await expect(redirect).toHaveBeenCalledWith("/login", "replace");
});

Unauthenticated.test("Back button navigates back", async ({ canvas, userEvent }) => {
  await userEvent.click(await canvas.findByText("Go back"));
  await expect(getRouter().back).toHaveBeenCalled();
});
```

Hook values come from `parameters.nextjs.navigation`:

```typescript
// useParams() → { category: "electronics", productId: "prod-123" }
navigation: { segments: [["category", "electronics"], ["productId", "prod-123"]] },

// useSelectedLayoutSegment() → "dashboard"; useSelectedLayoutSegments() → ["dashboard", "analytics"]
navigation: { segments: ["dashboard", "analytics"] },

// useSearchParams() → q=storybook&sort=date
navigation: { query: { q: "storybook", sort: "date" } },
```
