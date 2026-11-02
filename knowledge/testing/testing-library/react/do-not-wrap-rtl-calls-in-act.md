---
title: Answer an act warning by waiting for the effect, not by wrapping calls in act
summary: render and user-event already use act; the warning usually means work finished after the test, so wait for it.
impact: medium
applies: [typescript, react, testing-library]
implements: testing/principles/wait-for-a-condition-not-a-fixed-time
sources: [https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning, https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Call `render` and user-event without `act`, since they already wrap their work in it. When the warning
appears, wait for the visible effect with `findBy*`, `waitFor` or `waitForElementToBeRemoved`.

## Why

The warning usually means something happens after the test completes, so wrapping a call silences it and
leaves that state update unchecked.

## Incorrect

```tsx
await act(async () => {
  render(<SaveButton />);
});
await user.click(screen.getByRole("button", { name: /save/i }));
```

## Correct

```tsx
render(<SaveButton />);
await user.click(screen.getByRole("button", { name: /save/i }));
await waitForElementToBeRemoved(() => screen.queryByText(/saving/i));
```

## Exceptions

Call `act` directly for what happens outside the React call stack and outside Testing Library's utilities:
advancing fake timers, methods from `useImperativeHandle`, direct calls to a hook's functions, and async
work with no visible effect.
