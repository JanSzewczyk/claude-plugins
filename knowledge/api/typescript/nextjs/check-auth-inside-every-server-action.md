---
title: Check the session and the right to the resource inside every server action
summary: An action is a public POST endpoint; a page or proxy.ts guard does not protect it.
impact: critical
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/authentication, https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Start every server action by reading the session on the server and calling `unauthorized()` when there is none, then run the feature's `canX` check from `permissions.ts` and call `forbidden()` when it fails. Do this in the action itself, even when the page already checked. The service runs the same check in its own guard chain, because routes and jobs call it too.

## Why

Anyone can call an exported action directly with a crafted POST, so an action that relies on the page's guard lets a signed-out user, or another user, change data they do not own.

## Incorrect

```ts
export async function deleteBudget(budgetId: string): ActionResponse<null> {
  const [error] = await removeBudget(budgetId); // the page checked the session
  return error ? { success: false, error: "Could not delete" } : { success: true, data: null };
}
```

## Correct

```ts
export async function deleteBudget(budgetId: string): ActionResponse<null> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) unauthorized();
  const [permissionError] = await canEditBudget(userId, budgetId);
  if (permissionError) forbidden();
  const [error] = await removeBudget({ userId, budgetId });
  return error ? { success: false, error: "Could not delete" } : { success: true, data: null };
}
```

## Exceptions

Without `experimental.authInterrupts`, redirect to sign-in instead of `unauthorized()` and call `notFound()` instead of `forbidden()`.
