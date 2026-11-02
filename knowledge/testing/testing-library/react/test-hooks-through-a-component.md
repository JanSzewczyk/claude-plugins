---
title: Test a custom hook through a component that uses it before reaching for renderHook
summary: A one-component hook goes through that component, a reusable hook through an example; renderHook is the fallback.
impact: medium
applies: [typescript, react, testing-library]
implements: testing/strategy/principles/test-only-what-the-two-users-touch
sources: [https://kentcdodds.com/blog/how-to-test-custom-react-hooks]
---

## Rule

Cover a hook used by one component through that component's tests, and a reusable hook through a small
example component. Use `renderHook` when that component would be too complex or the cases too many, and
never mock `useState` or `useEffect` to call a hook as a plain function.

## Why

A hook tested alone, or with React's own hooks mocked, passes while the component that uses it is broken,
because nothing has run it the way the app does.

## Incorrect

```tsx
vi.spyOn(React, "useState").mockReturnValue([0, setCount]);
useCounter().increment();
expect(setCount).toHaveBeenCalledWith(1);
```

## Correct

```tsx
function Example() {
  const { count, increment } = useCounter();
  return <button onClick={increment}>{count}</button>;
}

render(<Example />);
await user.click(screen.getByRole("button", { name: "0" }));
expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
```
