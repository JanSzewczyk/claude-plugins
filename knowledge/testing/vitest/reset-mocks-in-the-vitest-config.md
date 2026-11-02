---
title: Reset mocks between component tests in the Vitest config
summary: mockReset clears vi.fn state and restoreMocks undoes vi.spyOn; together they stop mocks carrying between tests.
impact: high
applies: [typescript, vitest]
implements: testing/principles/tests-pass-alone-in-any-order
sources: [https://vitest.dev/config/restoremocks, https://vitest.dev/api/mock#mockreset]
---

## Rule

Set both `mockReset: true` and `restoreMocks: true` in the Vitest config of a component test suite, so call
history, implementations and spies never carry over to the next test.

## Why

A mock left over from an earlier test makes a later one pass or fail depending on run order. `restoreMocks`
alone is not enough, because it only undoes `vi.spyOn` and leaves `vi.fn()` state in place.

## Incorrect

```ts
export default defineConfig({
  test: { restoreMocks: true },
});
```

## Correct

```ts
export default defineConfig({
  test: { mockReset: true, restoreMocks: true },
});
```
