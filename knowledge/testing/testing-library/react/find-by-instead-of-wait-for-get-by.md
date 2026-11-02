---
title: Await findBy* instead of wrapping getBy* in waitFor
summary: findBy* already retries until the element appears, and its failure output is simpler than waitFor around getBy*.
impact: high
applies: [typescript, react, testing-library]
implements: testing/principles/wait-for-a-condition-not-a-fixed-time
sources: [https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Wait for an element to appear with `await screen.findBy*`, not with `waitFor` around `getBy*`.

## Why

`waitFor` around `getBy*` is a longer way to write the same wait, and its callback invites extra
assertions and side effects that make the test flaky.

## Incorrect

```tsx
const alert = await waitFor(() => screen.getByRole("alert"));
```

## Correct

```tsx
const alert = await screen.findByRole("alert");
```
