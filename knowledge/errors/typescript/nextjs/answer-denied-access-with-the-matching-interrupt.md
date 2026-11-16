---
title: Deny access with notFound in pages, forbidden in actions, unauthorized when signed out
summary: A page hides that the resource exists; an action refuses with 403; a missing session gets unauthorized().
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/functions/not-found, https://nextjs.org/docs/app/api-reference/functions/forbidden, https://nextjs.org/docs/app/api-reference/functions/unauthorized, https://nextjs.org/docs/app/api-reference/config/next-config-js/authInterrupts]
---

## Rule

When a signed-in user may not see a resource, call `notFound()` in a page and `forbidden()` in a server action. When there is no session, call `unauthorized()` (or redirect to sign-in). Use these interrupts instead of returning an `ActionResponse` failure for access decisions.

## Why

A page that answers "forbidden" confirms to a stranger that the id exists, and an access denial returned as an ordinary form error lets the client render the form as if the user could retry.

## Incorrect

```ts
const [error, budget] = await getBudget(id);
if (error?.isPermissionDenied) redirect("/unauthorized"); // page reveals the budget exists
```

## Correct

```ts
const [error, budget] = await getBudget(id);
if (error?.isNotFound || error?.isPermissionDenied) notFound();
```

## Exceptions

`forbidden()` and `unauthorized()` need `experimental.authInterrupts: true` in `next.config.ts`. Without it, call `notFound()` for a denial and redirect to sign-in for a missing session.
