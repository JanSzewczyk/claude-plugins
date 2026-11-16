---
title: Retry a service call only when the ServiceError is flagged isRetryable
summary: The retry helper stops at the first error with isRetryable false and never wraps a create without an idempotency key.
impact: high
applies: [typescript]
implements: errors/principles/retry-only-idempotent-transient-failures
sources: [https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/]
---

## Rule

Wrap only reads and keyed writes in the retry helper, and make the helper return immediately when `error.isRetryable` is false. A create or charge is retried only with an idempotency key generated once, outside the retried function.

## Why

A helper that retries on any error re-runs a not-found or validation failure three times, and one that retries a create without a key inserts the same record several times when the first response was lost.

## Incorrect

```ts
const [error, order] = await withRetry(() => createOrder(input)); // retries every error, duplicates orders
```

## Correct

```ts
const idempotencyKey = crypto.randomUUID();
const [error, order] = await withRetry(() => createOrder(input, idempotencyKey));

// inside withRetry, after each attempt:
if (!error || !error.isRetryable || attempt === MAX_ATTEMPTS) return [error, data];
```
