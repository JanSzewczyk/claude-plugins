---
title: Call redirect, notFound, forbidden and unauthorized outside try, or rethrow them
summary: These interrupts work by throwing; a surrounding catch swallows them and the navigation never happens.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/functions/redirect, https://nextjs.org/docs/app/api-reference/functions/unstable_rethrow, https://nextjs.org/docs/app/api-reference/functions/forbidden, https://nextjs.org/docs/app/api-reference/functions/unauthorized]
---

## Rule

Call `redirect()`, `notFound()`, `forbidden()` and `unauthorized()` after the `try/catch`, not inside it. When the call must sit inside one, make `unstable_rethrow(error)` the first line of the `catch`. These interrupts are the only thing a server action throws.

## Why

Each interrupt throws a special error; a `catch` that wraps it logs a bogus failure and returns an error result, so the user stays on the form instead of being redirected.

## Incorrect

```ts
try {
  await saveStep(input);
  redirect("/onboarding/step-2"); // caught below
} catch (error) {
  return { success: false, error: "Could not save" };
}
```

## Correct

```ts
const [error] = await saveStep(input);
if (error) return { success: false, error: "Could not save" };
redirect("/onboarding/step-2");
```
