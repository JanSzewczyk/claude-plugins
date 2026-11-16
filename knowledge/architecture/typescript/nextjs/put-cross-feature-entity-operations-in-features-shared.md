---
title: Put a db operation that several features need in features/shared, not in each feature
summary: An entity with no single owner gets one set of operations in features/shared/server/db/{entity}/.
impact: medium
applies: [typescript, nextjs]
---

## Rule

When several features write an entity that has no single owning feature, put that db operation in `features/shared/server/db/{entity}/` and call it from each service; the operation takes ids, returns tuples and holds no permission logic. For an entity one feature owns, ask that feature's service by id instead. Never copy the query into the calling feature.

## Why

Two copies of the same write drift apart: one sets `updatedAt` or checks a soft-delete flag and the other does not, so the entity ends up in states only one feature expects.

## Incorrect

```ts
// features/invoices/server/db/mutations.ts
export async function touchCustomerLastInvoice({ customerId }: TouchCustomerInput) { /* copy of the customers query */ }
```

## Correct

```ts
// features/shared/server/db/customer/mutations.ts
export async function touchCustomerLastInvoice({ customerId, tx = db }: TouchCustomerInput) { /* … */ }
```
