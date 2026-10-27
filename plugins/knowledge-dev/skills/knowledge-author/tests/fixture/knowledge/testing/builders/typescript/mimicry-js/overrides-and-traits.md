---
title: Build with .one() and .many() and pass overrides or traits for asserted values
summary: userBuilder.one({ overrides }) for one object, .many(n) for lists, traits for named states.
impact: high
applies: [typescript, mimicry-js]
implements: testing/builders/principles/set-asserted-values-explicitly
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

Call `.one({ overrides })` for a single object and `.many(count, { overrides })` for a list.
Define recurring states as `traits` in the builder and apply them with `.one({ traits: "admin" })`.
The builder methods are `.one()` and `.many()`, not `.build()` or `.buildMany()`.

## Why

Hand-written objects drift from the type, and `Array.from()` loops skip traits and overrides.
Calling methods that do not exist on a mimicry-js builder is the drift this note was written to
stop.

## Incorrect

```ts
const user = userBuilder.build();
const users = Array.from({ length: 3 }, () => userBuilder.build());
await expect(canvas.getByText(user.name)).toBeVisible();
```

## Correct

```ts
const user = userBuilder.one({ overrides: { name: "Ada Lovelace" } });
const admins = userBuilder.many(3, { traits: "admin" });
await expect(canvas.getByText("Ada Lovelace")).toBeVisible();
```
