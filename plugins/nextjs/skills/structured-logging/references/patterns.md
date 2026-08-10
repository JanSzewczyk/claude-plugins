# Logging Patterns

## Child Loggers

Create module-specific loggers with persistent context via `createLogger`, which wraps
`logger.child().withContext(context)`:

```typescript
// features/budget/server/db/budgets.ts
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "budget-db" });

logger.withMetadata({ budgetId }).info("Budget created");
// Output: { module: "budget-db", budgetId: "123", msg: "Budget created" }
```

`.withContext()` sets persistent fields (present on every subsequent call from that logger instance);
`.withMetadata()` attaches fields to the next log call only. Use context for things that don't change for
the logger's lifetime (module name, request ID, userId); use metadata for per-call details. Nest further
with `moduleLogger.child().withContext({ orderId })` when an operation needs its own extra persistent field.

## Request Context

### Add Request ID (proxy / middleware)

Attach a request ID and log start/end of every request from `proxy.ts` (Next.js middleware), not from
individual routes — this guarantees every request is logged exactly once regardless of which handler runs.

```typescript
// proxy.ts
import { type NextRequest, NextResponse } from "next/server";
import logger from "~/lib/logger";

export function proxy(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  const requestLogger = logger.child().withContext({
    method: request.method,
    requestId,
    url: request.url,
  });

  requestLogger.info("Incoming request");

  const response = NextResponse.next();
  response.headers.set("X-Request-ID", requestId);

  const duration = Date.now() - startTime;
  requestLogger.withMetadata({ duration, status: response.status }).info("Request completed");

  return response;
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)", "/(api|trpc)(.*)"],
};
```

Inside a route handler that needs to correlate its own logs with the request, read the ID back off the
header:

```typescript
const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
const logger = createLogger({ module: "api", requestId });
```

## Error Logging

Pass the raw `Error` under `error` in `.withMetadata()` — the logger's configured `errorSerializer`
(`serializeError`) expands it to a full stack trace automatically; don't manually pluck `.message`. Include
`errorCode` and `isRetryable` when the error comes from a categorized service error.

```typescript
import { categorizeServiceError, ServiceError } from "~/lib/firebase/errors";
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "user-db" });

export async function getUserById(id: string): Promise<[ServiceError | null, User | null]> {
  try {
    const doc = await db.collection("users").doc(id).get();

    if (!doc.exists) {
      logger.withMetadata({ userId: id }).warn("User not found");
      return [ServiceError.notFound("User"), null];
    }

    return [null, transformUser(doc)];
  } catch (error) {
    const serviceError = categorizeServiceError(error, "User");

    logger
      .withMetadata({ userId: id, errorCode: serviceError.code, isRetryable: serviceError.isRetryable, error })
      .error("Database error");

    return [serviceError, null];
  }
}
```

## Redaction and Masking

Never pass a secret through `.withMetadata()`, even redacted client-side — log a derived, safe form instead:

```typescript
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

export function maskId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : "***";
}
```

For defence in depth against accidental logging of a whole object containing secrets, add a Pino `redact`
config (paths like `"password"`, `"*.token"`) to the transport in `lib/logger.ts` so those keys are stripped
even if a call site forgets.

## Structured Context Standards

Keep field names consistent across the codebase so logs stay queryable — `userId` everywhere, never a mix of
`userId`/`uid`/`user_id`.

| Field         | Type    | When to Use             |
| ------------- | ------- | ------------------------ |
| `userId`      | string  | User-initiated actions   |
| `requestId`   | string  | HTTP requests             |
| `operation`   | string  | Named operations          |
| `durationMs`  | number  | Timed operations          |
| `errorCode`   | string  | Error responses           |
| `isRetryable` | boolean | Error categorization      |
| `statusCode`  | number  | HTTP responses            |
| `path`        | string  | API endpoints             |
| `method`      | string  | HTTP methods              |
