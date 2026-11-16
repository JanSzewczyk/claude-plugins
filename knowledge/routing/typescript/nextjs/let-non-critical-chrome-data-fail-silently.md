---
title: Let non-critical chrome data fail silently, with the chrome degrading
summary: A badge or counter that fails to load is logged and left out; it never sends the whole route to an error page.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/layout]
---

## Rule

When a layout reads data the chrome can do without (a plan badge, an unread count), log that read's error once at `warn` and render the chrome without it. Throw or call `notFound()` only for data the layout cannot render without.

## Why

A failed badge read that throws or calls `notFound()` takes down every page under the layout, so an outage in a minor service locks users out of the whole app.

## Incorrect

```tsx
const [planError, plan] = await getUserPlan(userId);
if (planError) throw new Error("Failed to load the plan", { cause: planError });
return { plan };
```

## Correct

```tsx
const [planError, plan] = await getUserPlan(userId);
if (planError) log.withError(planError).withMetadata({ userId }).warn("Plan badge unavailable");
return { plan }; // null hides the badge
```
