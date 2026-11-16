---
title: Write a feature's access checks as canDoX functions in a server-only permissions.ts
summary: permissions.ts holds every canDoX guard as a tuple; services and actions call it, nobody rewrites the rule.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Put each rule about who may do what in the feature as a `canDoX` function in `features/{domain}/server/permissions.ts`, which starts with `import "server-only"` and returns `[error, null]` or `[null, undefined]`. Services and server actions call these functions; no page, component or other caller re-implements the check inline.

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
