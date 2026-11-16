---
title: Call hooks only at the top level of a component or custom hook
summary: No hook inside a condition, loop, nested function or after an early return; React.use is the one exception.
impact: high
applies: [typescript, react]
sources: [https://react.dev/reference/rules/rules-of-hooks, https://react.dev/reference/react/use]
---

## Rule

Call every hook unconditionally at the top level of a function component or a custom hook, before any early return. Put the condition inside the hook's callback or below the hook call instead.

## Why

React matches hook state by call order, so a hook that runs only on some renders shifts every later hook onto the wrong state or crashes with "Rendered fewer hooks than expected"; the React Compiler also skips such a component and leaves it unoptimized.

## Incorrect

```tsx
function Profile({ userId }: ProfileProps) {
  if (!userId) {
    return null;
  }
  const [tab, setTab] = React.useState<Tab>("posts");
  return <Tabs value={tab} onChange={setTab} />;
}
```

## Correct

```tsx
function Profile({ userId }: ProfileProps) {
  const [tab, setTab] = React.useState<Tab>("posts");
  if (!userId) {
    return null;
  }
  return <Tabs value={tab} onChange={setTab} />;
}
```

## Exceptions

`React.use` may be called inside conditions and loops; it still must not be called inside a `try`/`catch` block.
