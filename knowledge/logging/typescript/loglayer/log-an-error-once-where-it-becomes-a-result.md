---
title: Log a returned error once, in the action or route handler that decides what to do with it
summary: Db and service functions return [error, null] silently; the action or handler logs it once with errorCode and ids.
impact: medium
applies: [typescript, loglayer]
implements: logging/principles/log-an-error-once-where-it-is-handled
sources: [https://loglayer.dev/logging-api/error-handling]
---

## Rule

Db and service functions return `[error, null]` without logging it. The server action or route handler that receives the error and decides the response logs it once, with `withError`, `errorCode`, `isRetryable` and the ids of the operation.

## Why

When the db function, the service and the action each log the same failure, one failure becomes three error entries and every error count and alert triples.

## Incorrect

```ts
// services/budgets.ts
const [error, budget] = await getBudget(id);
if (error) {
  log.withMetadata({ budgetId: id }).error("Could not load budget"); // and db/ and the action log it too
  return [error, null];
}
```

## Correct

```ts
// services/budgets.ts
const [error, budget] = await getBudget(id);
if (error) return [error, null];

// actions/update-budget.ts
const [error] = await updateBudget(input);
if (error) {
  log
    .withMetadata({ budgetId: input.id, errorCode: error.code, isRetryable: error.isRetryable })
    .error("Update budget failed");
  return { success: false, error: "Could not save the budget" };
}
```

## Exceptions

The function that catches a thrown exception owns its cause: it passes the original with `.withError(cause)` where it handles it, or wraps it in the `ServiceError` it returns so the handler can log `withError`.
