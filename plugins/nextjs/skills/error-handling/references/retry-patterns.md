# Retry and Resilience Patterns

## When to Retry vs When NOT to Retry

### Retryable Errors (Transient)

These errors are temporary and may succeed on a subsequent attempt:

| Error Type             | ServiceError Property | Example                                       |
| ---------------------- | --------------------- | --------------------------------------------- |
| Network failure        | `isRetryable: true`   | Connection reset, DNS resolution failure      |
| Timeout                | `isRetryable: true`   | `deadline-exceeded`, request took too long    |
| Rate limit (429)       | `isRetryable: true`   | Too many requests to API or database          |
| Service unavailable    | `isRetryable: true`   | Connection refused, third-party API down, HTTP 503 |
| Temporary server error | `isRetryable: true`   | 502/503/504 from upstream services            |

### Non-Retryable Errors (Permanent)

These errors will fail every time regardless of retries:

| Error Type             | ServiceError Property      | Why Not Retry                           |
| ---------------------- | -------------------------- | --------------------------------------- |
| Validation failure     | `code: "validation"`       | Input is invalid, retrying won't fix it |
| Not found              | `isNotFound: true`         | Resource doesn't exist                  |
| Permission denied      | `isPermissionDenied: true` | User lacks authorization                |
| Already exists         | `isAlreadyExists: true`    | Duplicate resource                      |
| Data corruption        | `code: "data-corruption"`  | Document data is structurally broken    |
| Authentication failure | N/A                        | Credentials are wrong or expired        |

## Simple Retry with Exponential Backoff

```typescript
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "retry" });

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  jitter: true,
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, jitter } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

      // Add jitter to prevent thundering herd
      const delay = jitter
        ? cappedDelay * (0.5 + Math.random() * 0.5)
        : cappedDelay;

      logger
        .withMetadata({
          attempt: attempt + 1,
          maxRetries,
          delayMs: Math.round(delay),
          error,
        })
        .warn("Retrying after transient error");

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Retry Helper Using ServiceError.isRetryable

Use this pattern in the service layer to retry only transient errors while immediately returning permanent failures. It works the same whether the wrapped operation hits a database or a remote API:

```typescript
import { categorizeServiceError, ServiceError } from "~/lib/services/errors";
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "budget-service" });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function withServiceRetry<T>(
  operation: () => Promise<[null, T] | [ServiceError, null]>,
  context: { resource: string; action: string; userId?: string },
): Promise<[null, T] | [ServiceError, null]> {
  let lastError: ServiceError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const [error, data] = await operation();

    // Success - return immediately
    if (!error) {
      if (attempt > 0) {
        logger.withMetadata({ ...context, attempt: attempt + 1 }).info("Succeeded after retry");
      }
      return [null, data];
    }

    // Non-retryable error - return immediately, don't waste time retrying
    if (!error.isRetryable) {
      return [error, null];
    }

    lastError = error;

    // Don't delay after the last attempt
    if (attempt < MAX_RETRIES) {
      const delay =
        BASE_DELAY_MS * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);

      logger
        .withMetadata({
          ...context,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          errorCode: error.code,
          delayMs: Math.round(delay),
        })
        .warn("Retrying transient service error");

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger
    .withMetadata({
      ...context,
      errorCode: lastError?.code,
      totalAttempts: MAX_RETRIES + 1,
    })
    .error("All retry attempts exhausted");

  return [lastError!, null];
}

// Usage in the service layer (budgetSource = ORM, DB driver, or fetch() wrapper)
export async function getBudgetById(
  userId: string,
  budgetId: string,
): Promise<[null, Budget] | [ServiceError, null]> {
  if (!userId?.trim() || !budgetId?.trim()) {
    return [ServiceError.validation("Invalid userId or budgetId"), null];
  }

  return withServiceRetry(
    async () => {
      try {
        const budget = await budgetSource.findById(budgetId);

        if (!budget) {
          return [ServiceError.notFound("Budget"), null];
        }

        if (budget.userId !== userId) {
          return [ServiceError.permissionDenied("Budget"), null];
        }

        return [null, budget];
      } catch (error) {
        const serviceError = categorizeServiceError(error, "Budget");
        return [serviceError, null];
      }
    },
    { resource: "Budget", action: "getById", userId },
  );
}
```

## Circuit Breaker Pattern

The circuit breaker prevents cascading failures by short-circuiting calls to a failing service. It operates as a state machine with three states:

```
┌──────────┐   failure threshold    ┌──────────┐   timeout elapsed   ┌───────────┐
│  CLOSED  │ ────────────────────>  │   OPEN   │ ─────────────────>  │ HALF-OPEN │
│ (normal) │                        │ (reject) │                     │  (probe)  │
└──────────┘                        └──────────┘                     └───────────┘
     ^                                   ^                                │
     │              failure              │         success                │
     └───────────────────────────────────┴────────────────────────────────┘
```

- **CLOSED**: Requests flow normally. Failures are counted. When failures exceed a threshold, transition to OPEN.
- **OPEN**: All requests are immediately rejected without calling the service. After a timeout period, transition to HALF-OPEN.
- **HALF-OPEN**: A single probe request is allowed. If it succeeds, transition to CLOSED. If it fails, transition back to OPEN.

```typescript
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "circuit-breaker" });

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  name: string;
}

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      // Check if timeout has elapsed to allow a probe
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        logger.withMetadata({ circuit: this.options.name }).info("Circuit half-open, allowing probe request");
      } else {
        logger
          .withMetadata({ circuit: this.options.name, state: this.state })
          .warn("Circuit open, rejecting request");
        throw new Error(`Circuit breaker open for ${this.options.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      logger.withMetadata({ circuit: this.options.name }).info("Circuit closed after successful probe");
    }
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.options.failureThreshold ||
      this.state === "HALF_OPEN"
    ) {
      this.state = "OPEN";
      logger
        .withMetadata({
          circuit: this.options.name,
          failureCount: this.failureCount,
          resetTimeoutMs: this.options.resetTimeoutMs,
        })
        .error("Circuit opened due to failures");
    }
  }
}

// Usage
const externalApiBreaker = new CircuitBreaker({
  name: "payment-api",
  failureThreshold: 5,
  resetTimeoutMs: 30_000, // 30 seconds
});

async function chargePayment(amount: number): Promise<PaymentResult> {
  return externalApiBreaker.execute(async () => {
    const response = await fetch("https://api.payment.com/charge", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      throw new Error(`Payment API returned ${response.status}`);
    }

    return response.json();
  });
}
```

## Timeout Handling with AbortController

Use `AbortController` to enforce timeouts on long-running operations and prevent requests from hanging indefinitely:

```typescript
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "api-client" });

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 10_000, ...fetchOptions } = options;
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      logger.withMetadata({ url, timeoutMs }).error("Request timed out");
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage in a server action
export async function syncExternalData(
  resourceId: string,
): ActionResponse<void> {
  const userId = await getCurrentUserId(); // your auth helper
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const data = await fetchWithTimeout<ExternalData>(
      `https://api.external.com/resources/${resourceId}`,
      { timeoutMs: 5_000 },
    );

    const [error] = await saveExternalData(userId, data);
    if (error) {
      await setToastCookie("Failed to save synced data", "error");
      return { success: false, error: "Sync failed" };
    }

    await setToastCookie("Data synced successfully!", "success");
    return { success: true, data: undefined };
  } catch (error) {
    logger.withMetadata({ userId, resourceId, error }).error("External sync failed");
    await setToastCookie("External service unavailable", "error");
    return { success: false, error: "Unable to sync data" };
  }
}
```

## Graceful Degradation

When a service fails, fall back to cached or reduced-functionality responses instead of showing errors:

```typescript
import { categorizeServiceError, ServiceError } from "~/lib/services/errors";
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "dashboard-loader" });

// Fallback data when live data is unavailable
const FALLBACK_SUMMARY: DashboardSummary = {
  totalBudgets: 0,
  totalSpent: 0,
  lastUpdated: null,
  isStale: true,
};

export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  // 1. Try live database query
  try {
    const summary = await fetchLiveSummary(userId);
    // Cache the successful response
    await cacheSummary(userId, summary);
    return { ...summary, isStale: false };
  } catch (error) {
    logger.withMetadata({ userId, error }).warn("Live summary unavailable, trying cache");
  }

  // 2. Fall back to cached data
  try {
    const cached = await getCachedSummary(userId);
    if (cached) {
      logger.withMetadata({ userId }).info("Serving cached summary");
      return { ...cached, isStale: true };
    }
  } catch (cacheError) {
    logger.withMetadata({ userId }).warn("Cache also unavailable");
  }

  // 3. Fall back to empty state
  logger.withMetadata({ userId }).warn("Serving fallback summary");
  return FALLBACK_SUMMARY;
}

// Server component that renders degraded state
export default async function DashboardPage() {
  const userId = await getCurrentUserId(); // your auth helper
  if (!userId) redirect("/sign-in");

  const summary = await getDashboardSummary(userId);

  return (
    <div>
      {summary.isStale && (
        <div className="bg-warning/10 text-warning p-3 rounded-md mb-4">
          Showing cached data. Live data is temporarily unavailable.
        </div>
      )}
      <DashboardSummaryCard summary={summary} />
    </div>
  );
}
```

## Rate Limit Handling

Handle HTTP 429 responses by respecting the `Retry-After` header:

```typescript
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "rate-limit" });

class RateLimitError extends Error {
  constructor(
    public retryAfterMs: number,
    message?: string,
  ) {
    super(message ?? `Rate limited, retry after ${retryAfterMs}ms`);
    this.name = "RateLimitError";
  }
}

async function fetchWithRateLimitRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      if (attempt === maxRetries) {
        logger.withMetadata({ url, totalAttempts: maxRetries + 1 }).error("Rate limit retries exhausted");
        throw new RateLimitError(0, "Rate limit retries exhausted");
      }

      // Parse Retry-After header (seconds or HTTP date)
      const retryAfter = response.headers.get("Retry-After");
      let delayMs: number;

      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        delayMs = isNaN(seconds)
          ? Math.max(0, new Date(retryAfter).getTime() - Date.now())
          : seconds * 1000;
      } else {
        // Default backoff if no Retry-After header
        delayMs = 1000 * Math.pow(2, attempt);
      }

      // Cap the delay at 60 seconds
      delayMs = Math.min(delayMs, 60_000);

      logger
        .withMetadata({
          url,
          attempt: attempt + 1,
          retryAfterHeader: retryAfter,
          delayMs,
        })
        .warn("Rate limited, waiting before retry");

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  throw new Error("Unexpected: exceeded retry loop");
}
```

## Best Practices

### Always Set a Maximum Retry Count

```typescript
// Good - bounded retries
const MAX_RETRIES = 3;
for (let i = 0; i <= MAX_RETRIES; i++) {
  /* ... */
}

// Bad - unbounded loop
while (true) {
  try {
    await operation();
    break;
  } catch {
    /* keeps going forever */
  }
}
```

### Add Jitter to Prevent Thundering Herd

When many clients retry at the same time (e.g., after an outage), synchronized retries can overwhelm the recovering service. Jitter spreads retries across time:

```typescript
// Without jitter: all clients retry at 500ms, 1000ms, 2000ms simultaneously
const delay = baseDelayMs * Math.pow(2, attempt);

// With jitter: clients retry at random intervals within the window
const delay = baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
```

### Log Every Retry Attempt

```typescript
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  const [error, data] = await operation();

  if (!error) {
    if (attempt > 0) {
      logger.withMetadata({ attempt: attempt + 1, action }).info("Succeeded after retry");
    }
    return [null, data];
  }

  if (error.isRetryable && attempt < MAX_RETRIES) {
    logger
      .withMetadata({ attempt: attempt + 1, maxRetries: MAX_RETRIES, errorCode: error.code })
      .warn("Retrying transient error");
  }
}
```

## Anti-Patterns

### Don't Retry Non-Idempotent Operations Blindly

```typescript
// Bad - retrying a create operation may produce duplicates
async function createOrderWithRetry(data: OrderData) {
  return withRetry(() => createOrder(data)); // May create multiple orders!
}

// Good - use an idempotency key to prevent duplicates
async function createOrderWithRetry(data: OrderData) {
  const idempotencyKey = crypto.randomUUID();
  return withRetry(() => createOrder(data, idempotencyKey));
}

// Good - only retry the read portion, not the write
async function getOrCreateOrder(data: OrderData) {
  const [error, existing] = await withServiceRetry(
    () => getOrderByExternalId(data.externalId),
    { resource: "Order", action: "getByExternalId" },
  );

  if (!error && existing) return [null, existing];

  // Don't retry the create - it's not idempotent
  return createOrder(data);
}
```

### Don't Use Infinite Retries

```typescript
// Bad - will loop forever if the error persists
while (true) {
  const [error, data] = await fetchData();
  if (!error) return data;
  await sleep(1000);
}

// Good - bounded with clear failure path
const [error, data] = await withServiceRetry(() => fetchData(), {
  resource: "Data",
  action: "fetch",
});

if (error) {
  logger.withMetadata({ errorCode: error.code }).error("All retries exhausted");
  await setToastCookie("Service temporarily unavailable", "error");
  return { success: false, error: "Please try again later" };
}
```

### Don't Swallow Errors During Retries

```typescript
// Bad - silently swallows errors, no visibility into failures
async function fetchWithSilentRetry<T>(
  fn: () => Promise<T>,
): Promise<T | null> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch {
      // Swallowed! No logging, no context
    }
  }
  return null;
}

// Good - log each attempt, surface the final failure
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger
        .withMetadata({
          ...context,
          attempt: attempt + 1,
          error,
        })
        .warn("Attempt failed");
    }
  }

  logger.withMetadata({ ...context, error: lastError }).error("All retry attempts failed");
  throw lastError;
}
```
