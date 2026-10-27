---
title: Call builder.reset() in beforeEach when a test depends on sequence values
summary: reset() restarts sequence() and unique() counters; seed() makes oneOf, int, float and bool reproducible.
impact: medium
applies: [typescript, mimicry-js]
implements: testing/builders/principles/reset-builder-state-between-tests
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

In a suite whose assertions depend on `sequence()` or `unique()` values, call `.reset()` on the
builder in `beforeEach`. Call `seed(value)` once when the test depends on the output of `oneOf`,
`int`, `float` or `bool`.

## Why

Counters keep counting across tests in the same module, so `id: 1` is only true for whichever test
runs first.

## Incorrect

```ts
test("first order gets id 1", () => {
  expect(orderBuilder.one().id).toBe(1);
});
```

## Correct

```ts
beforeEach(() => {
  orderBuilder.reset();
});

test("first order gets id 1", () => {
  expect(orderBuilder.one().id).toBe(1);
});
```
