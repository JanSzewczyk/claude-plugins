---
title: Return an [error, data] tuple from every service and data-layer function
summary: The service layer never throws across its boundary; callers destructure [error, data] and must handle the error.
impact: high
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions]
---

## Rule

Type every exported service or data-layer function as `Promise<[ServiceError, null] | [null, T]>`. Catch inside the function and return `[error, null]` on failure and `[null, data]` on success; never let an exception cross the function's boundary.

## Why

A service that throws lets a caller forget the `try/catch`, so a database or network failure surfaces as an unhandled error page instead of a message the caller chose; the tuple puts the error in the caller's hands at every call site.

## Incorrect

```ts
export async function getBudget(id: string): Promise<Budget> {
  const budget = await db.budget.findUnique({ where: { id } }); // throws on failure
  if (!budget) throw new Error("Not found");
  return budget;
}
```

## Correct

```ts
export async function getBudget(id: string): Promise<[ServiceError, null] | [null, Budget]> {
  try {
    const budget = await db.budget.findUnique({ where: { id } });
    return budget ? [null, budget] : [ServiceError.notFound("Budget"), null];
  } catch (error) {
    return [categorizeServiceError(error, "Budget"), null];
  }
}
```
