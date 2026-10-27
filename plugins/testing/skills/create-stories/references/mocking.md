# Mocking in Storybook

How to fake what a component depends on. Pick the mechanism by **what** is being faked. Code is
shown only for the Storybook-specific APIs; the rest is plain Vitest / Storybook usage.

| What is faked                        | Mechanism                                           | Details                                     |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------- |
| Callback props (onClick, onSubmit)   | `fn()` in `meta.args`                               | [Rules](#rules)                             |
| Modules the component imports        | `sb.mock()` in `.storybook/preview.ts` + `mocked()` | [sb.mock()](#modules--sbmock)               |
| HTTP requests (fetch, REST, GraphQL) | MSW handlers in `parameters.msw`                    | [MSW](#network--msw)                        |
| `next/navigation` hooks, `redirect`  | `parameters.nextjs` + `navigation.mock`             | [Next.js](#nextjs-navigation)               |
| React Context, providers             | decorators                                          | [Rules](#rules)                             |
| Typed data objects                   | `mimicry-js` builders                               | `stories.md`, "Data — builders over inline objects" |

## Rules

- **Callback props → `fn()`** from `storybook/test`, declared in `meta.args` so every test shares
  one spy. Assert with `toHaveBeenCalled` / `toHaveBeenCalledWith` / `toHaveBeenCalledTimes`.
- **A callback whose result the component uses** (an async loader, a server action passed as a
  prop) → give the spy a result: `fn().mockResolvedValue(data)` in `meta.args`, or
  `fn(async () => ({ success: false, error: "…" }))` for a story's error state. Cast typed
  server-action props: `fn(() => ({ success: true }) as unknown as RedirectAction)`.
- **HTTP the component makes → MSW**, not `fn()`. `fn()` fakes a prop the component calls; MSW fakes
  a request it sends. Handlers go per story in `parameters.msw.handlers`.
- **Modules the component imports → `sb.mock(import(...))` in `.storybook/preview.ts`**, never in a
  story file — module mocks must be registered before stories load. Prefer `{ spy: true }`, then set
  per-story behaviour with `mocked()` in `beforeEach`.
- **`next/navigation` → the framework's mock module** (`@storybook/nextjs-vite/navigation.mock`)
  plus `parameters.nextjs`.
- **React Context / providers → decorators**, never props. App-wide providers (theme, query client,
  auth) go in `decorators` of `.storybook/preview.tsx`; a story that needs a different value wraps
  `<Story />` in its own `<XContext.Provider value={...}>` decorator — one story per provider value.
- **`beforeEach`** configures and resets mocks so no state leaks between tests. Meta-level runs
  before every story in the file; a story-level one overrides it. It receives the context, so
  `beforeEach: async ({ args }) => { args.onSubmit.mockResolvedValue(...) }` works too.

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
