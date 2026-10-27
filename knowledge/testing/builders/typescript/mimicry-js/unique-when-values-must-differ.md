---
title: Use unique() for values that must differ across built objects
summary: oneOf() can repeat a value within one .many() call; unique() hands each value out once.
impact: medium
applies: [typescript, mimicry-js]
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

When every built object needs a distinct value from a fixed set (emails, slugs, keys in a list), use
`unique([...])` instead of `oneOf(...)`. Give it at least as many values as the test builds, and reset
the builder between tests that rely on the order.

## Why

`oneOf()` picks at random, so a `.many()` call can return two objects with the same key, and the test
fails only on the runs where the duplicate happens.

## Incorrect

```ts
const tagBuilder = build<Tag>({ fields: { slug: oneOf("news", "blog", "docs") } });
```

## Correct

```ts
const tagBuilder = build<Tag>({ fields: { slug: unique(["news", "blog", "docs"]) } });
```
