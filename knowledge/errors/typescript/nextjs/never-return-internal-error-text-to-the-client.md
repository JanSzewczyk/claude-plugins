---
title: Return a fixed user-safe message to the client, never the internal error text
summary: Log the real cause on the server; an action, route handler or toast carries only a message written for the user.
impact: critical
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/data-security, https://nextjs.org/docs/app/getting-started/error-handling, https://owasp.org/Top10/A05_2021-Security_Misconfiguration/]
---

## Rule

Put only a message you wrote for the user in an action's `error`, a route handler's JSON body or a toast. Log the caught error on the server with `log.withError(error)` and its ids; never send `error.message`, a stack, an error code from a driver, or record ids and roles in the message.

## Why

A raw message leaks table names, SQL fragments, internal hostnames or another user's data to whoever submits the form, and the toast cookie is readable by any script on the page.

## Incorrect

```ts
if (error) {
  return { success: false, error: error.message }; // 'duplicate key value violates "budgets_name_key"'
}
```

## Correct

```ts
if (error) {
  log.withError(error).withMetadata({ userId, operation: "createBudget" }).error("Budget creation failed");
  return { success: false, error: "Could not create the budget" };
}
```

## Exceptions

A `ServiceError` built by your own code for a validation or business rule (`ServiceError.validation("You can have at most 20 budgets")`) carries a message written for the user and may be returned as is.
