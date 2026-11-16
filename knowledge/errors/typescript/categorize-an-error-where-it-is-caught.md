---
title: Categorize an error in the function that caught it, then return it without logging
summary: The catch around the external call turns it into a ServiceError; the caller that handles it finally logs it once.
impact: medium
applies: [typescript]
implements: logging/principles/log-an-error-once-where-it-is-handled
---

## Rule

Call `categorizeServiceError` in the `catch` of the function that made the external call, and return the result in the tuple without logging. The caller that decides what the user sees (the server action, route handler or page) logs it once, with the error and its ids.

## Why

Categorizing later means the raw error has already escaped the service, and logging in both the service and the action writes every failure twice, doubling error counts and alerts.

## Incorrect

```ts
} catch (error) {
  log.withError(error).error("Failed to create budget"); // logged here…
  return [categorizeServiceError(error, "Budget"), null]; // …and again by the action
}
```

## Correct

```ts
} catch (error) {
  return [categorizeServiceError(error, "Budget"), null];
}
```
