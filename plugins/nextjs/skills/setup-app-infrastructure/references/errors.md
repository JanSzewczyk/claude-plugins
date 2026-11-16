# Errors: ServiceError, retry helper, error boundary

Rules: `nextjs-rules` (error, retry and logging notes). Needs the logging module (`with-retry.ts` logs
through `createLogger`). Paths are relative to the source root.

## Files

| Copy | To | Holds |
| --- | --- | --- |
| `assets/service-error.ts` | `lib/service-error.ts` | `ServiceError` class, factories, `categorizeServiceError` skeleton |
| `assets/with-retry.ts` | `lib/with-retry.ts` | `withRetry` for tuple-returning calls: 3 attempts, 500 ms base, 10 s cap, jitter |

Both import with `~/` (`~/lib/logger`, `~/lib/service-error`); change those lines if the files go elsewhere.

## `ServiceError`

| Member | Meaning |
| --- | --- |
| `code` | One of: `validation`, `not-found`, `already-exists`, `permission-denied`, `data-corruption`, `unavailable`, `timeout`, `rate-limited`, `external-api`, `internal` |
| `message` | Text written for the user; build it only in the factories and constructor |
| `isRetryable` | `true` for `unavailable`, `timeout`, `rate-limited`, `external-api` |
| `isNotFound`, `isAlreadyExists`, `isPermissionDenied` | Derived from `code` |
| `cause`, `retryAfterMs` | Raw error for `log.withError`; upstream `Retry-After` in milliseconds |

Factories: `validation(message)`, `notFound(resource)`, `alreadyExists(resource)`, `permissionDenied(resource?)`,
`dataCorruption(resource)`, `internal(resource, cause?)`. Anything else:
`new ServiceError("external-api", "Payment service unavailable", true, { cause })`.

## Fill `categorizeServiceError`

The skeleton maps in this order: abort/timeout, a string `code` on the error, an HTTP `status`, then
`internal`. Replace the `code` and `status` checks with the ones of the source being wrapped (database
driver, REST client). Keep the closed set of codes; never add a code.

## Service function shape

```ts
import "server-only";

import { categorizeServiceError, ServiceError } from "~/lib/service-error";

export async function getBudget(id: string): Promise<[ServiceError, null] | [null, Budget]> {
  try {
    const budget = await db.budget.findUnique({ where: { id } });
    return budget ? [null, budget] : [ServiceError.notFound("Budget"), null];
  } catch (error) {
    return [categorizeServiceError(error, "Budget"), null];
  }
}
```

External `fetch` calls carry a deadline: `fetch(url, { signal: AbortSignal.timeout(5_000) })`.

## Retry

```ts
import { withRetry } from "~/lib/with-retry";

const idempotencyKey = crypto.randomUUID(); // generated once, outside the retried function
const [error, order] = await withRetry(() => createOrder(input, idempotencyKey), { operation: "createOrder" });
```

Override per call: `withRetry(fn, ctx, { maxAttempts: 5, baseDelayMs: 200 })`.

## Root error boundary: `app/error.tsx`

```tsx
"use client";

import * as React from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  React.useEffect(() => {
    // Runs in the browser, where the server logger does not exist
    console.error("Unhandled render error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main>
      <h1>Something went wrong</h1>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
```

The prop is `retry` from Next.js 16.3, `unstable_retry` in 16.2, `reset` before; use the name the installed
version types. Style it with the project's design system. An error in the root layout itself needs
`app/global-error.tsx`, which renders its own `<html>` and `<body>`.

## Verify

Type-check. Search for `catch` blocks in service and db files that return `[error as Error, null]` or throw,
and for retry loops written by hand; report them.
