---
title: Build lists with .many(count), not Array.from or map
summary: .many(n) applies overrides and traits to each item and keeps sequence and unique state right.
impact: medium
applies: [typescript, mimicry-js]
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

Build a list of test objects with `builder.many(count, options)`. Pass overrides or traits through its
options instead of mapping over `Array.from` or a spread array.

## Why

A hand-rolled loop skips the builder's list handling, so overrides and traits have to be repeated per
item and `unique()` values can collide across the list.

## Incorrect

```ts
const users = Array.from({ length: 3 }, () => userBuilder.one({ traits: "admin" }));
```

## Correct

```ts
const users = userBuilder.many(3, { traits: "admin" });
```
