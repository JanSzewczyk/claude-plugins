---
title: Branch on a ServiceError's kind flags, never on its message
summary: Decide what to do from isNotFound, isAlreadyExists, isPermissionDenied and isRetryable; messages are for people.
impact: high
applies: [typescript]
sources: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message]
---

## Rule

Choose the response to a `ServiceError` from its boolean flags (or its `code`), most specific first, and fall through to one generic branch for everything else.

## Why

A branch on message text breaks silently when someone rewords the message, and one generic branch for every error shows "Something went wrong" for a duplicate name the user could have fixed.

## Incorrect

```ts
if (error) {
  if (error.message.includes("temporarily")) return { success: false, error: "Try again" };
  return { success: false, error: "Something went wrong" };
}
```

## Correct

```ts
if (error) {
  if (error.isAlreadyExists) return { success: false, error: "A budget with this name exists" };
  if (error.isRetryable) return { success: false, error: "Please try again in a moment" };
  log.withError(error).withMetadata({ userId }).error("Budget creation failed");
  return { success: false, error: "Could not create the budget" };
}
```
