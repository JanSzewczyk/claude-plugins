---
title: Write a feature's access checks as canDoX functions in a server-only permissions.ts
summary: features/{domain}/server/permissions.ts holds every canDoX guard, returns a tuple, and only services call it.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Put each rule about who may do what in the feature as a `canDoX` function in `features/{domain}/server/permissions.ts`, which starts with `import "server-only"` and returns `[error, null]` or `[null, undefined]`. Services call these functions; no action, page or component repeats the check inline.

## Why

An access rule written inline in each service or action drifts: one copy checks the plan limit and the next forgets it, and nobody can list who may do what without reading every caller.

## Incorrect

```ts
// invoice.service.ts
const count = await countInvoices({ ownerId });
if (count >= 50) return [limitExceededError(50), null];
```

## Correct

```ts
// features/invoices/server/permissions.ts
import "server-only";

export async function canCreateInvoice(ownerId: string): Promise<ServiceResult<void>> {
  const [error, count] = await countInvoices({ ownerId });
  if (error) return [error, null];
  return count >= INVOICE_LIMIT ? [limitExceededError(INVOICE_LIMIT), null] : [null, undefined];
}
```
