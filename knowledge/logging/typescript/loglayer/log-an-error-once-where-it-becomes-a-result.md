---
title: Log an error once, in the function that catches it and returns it as a result
summary: The catch site logs with errorCode, isRetryable and ids, then returns [error, null]; callers do not log it again.
impact: medium
applies: [typescript, loglayer]
implements: logging/principles/log-an-error-once-where-it-is-handled
sources: [https://loglayer.dev/logging-api/error-handling]
---

## Rule

The function that catches a thrown error and returns it as `[error, null]` logs it once, before returning, with `withError`, `errorCode`, `isRetryable` and the ids of the operation. A service or action that receives the returned error passes it on or maps it to a response without logging it again.

## Why

When the db function, the service and the action each log the same failure, one failure becomes three error entries and every error count and alert triples.

## Incorrect

```ts
// db/budgets.ts
} catch (error) {
  log.withError(error).error("Get budget failed");
  return [categorizeServiceError(error), null];
}

// services/budgets.ts
const [error, budget] = await getBudget(id);
if (error) {
  serviceLog.withMetadata({ budgetId: id }).error("Could not load budget");
  return [error, null];
}
```

## Correct

```ts
// db/budgets.ts
} catch (error) {
  const serviceError = categorizeServiceError(error);
  log
    .withError(error)
    .withMetadata({ budgetId: id, errorCode: serviceError.code, isRetryable: serviceError.isRetryable })
    .error("Get budget failed");
  return [serviceError, null];
}

// services/budgets.ts
const [error, budget] = await getBudget(id);
if (error) return [error, null];
```
