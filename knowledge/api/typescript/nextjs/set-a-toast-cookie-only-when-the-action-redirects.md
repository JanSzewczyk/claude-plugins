---
title: Set the toast cookie only when the action redirects; otherwise toast from the result
summary: A redirect discards the result, so the cookie carries the message; a returned result is toasted on the client.
impact: high
applies: [typescript, nextjs, sonner]
sources: [https://nextjs.org/docs/app/api-reference/functions/cookies, https://nextjs.org/docs/app/api-reference/functions/redirect, https://sonner.emilkowal.ski/toast]
---

## Rule

Call `setToastCookie(message, type)` immediately before `redirect()` and nowhere else. When the action returns a result, the calling component shows it with sonner: `toast.success(result.message)` or `toast.error(result.error)`.

## Why

A cookie set on a branch that returns is read only on the next navigation, so the toast appears late on another page, or is overwritten by the next action's cookie; a cookie set after `redirect()` never runs.

## Incorrect

```ts
if (error) {
  await setToastCookie("Failed to update the budget", "error"); // no redirect follows
  return { success: false, error: "Failed to update the budget" };
}
```

## Correct

```ts
if (error) return { success: false, error: "Failed to update the budget" }; // client toasts it
await setToastCookie("Budget deleted", "success");
redirect("/budgets");
```
