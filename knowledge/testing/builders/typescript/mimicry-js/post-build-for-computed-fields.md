---
title: Compute fields that derive from other fields in postBuild
summary: Totals, counts and display names built from sibling fields go in postBuild, so overrides stay consistent.
impact: medium
applies: [typescript, mimicry-js]
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

When a field is computed from other fields of the same object (a total from line items, a full name
from first and last), compute it in the builder's `postBuild`, not in a field generator and not in
each test.

## Why

A generated derived field ignores overrides of the fields it derives from, so an object built with
custom line items still carries a random total and the test asserts on an impossible object.

## Incorrect

```ts
fields: { items: () => itemBuilder.many(2), total: () => faker.number.int() }
```

## Correct

```ts
fields: { items: () => itemBuilder.many(2), total: 0 },
postBuild: (order) => ({ ...order, total: order.items.reduce((sum, i) => sum + i.price, 0) }),
```
