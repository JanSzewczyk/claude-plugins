---
title: Keep waitFor to one concrete assertion, with every action before it
summary: The callback can run many times, so a click inside it fires repeatedly; an empty callback checks nothing.
impact: high
applies: [typescript, react, testing-library]
implements: testing/principles/wait-for-a-condition-not-a-fixed-time
sources: [https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Give `waitFor` one concrete assertion, run clicks and other actions before it, and take any snapshot after
it.

## Why

The callback reruns until it passes, so a click inside it can fire many times and make the test flaky,
while an empty callback waits for nothing in particular and hides what the test depends on.

## Incorrect

```tsx
await waitFor(() => {
  fireEvent.click(screen.getByRole("button", { name: /save/i }));
  expect(onSave).toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
});
```

## Correct

```tsx
await user.click(screen.getByRole("button", { name: /save/i }));
await waitFor(() => expect(onSave).toHaveBeenCalled());
expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
```
