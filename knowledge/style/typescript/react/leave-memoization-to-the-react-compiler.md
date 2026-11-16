---
title: Leave memoization to the React Compiler; memoize by hand only in four documented cases
summary: No useMemo, useCallback or memo by default; four exceptions, each with a JSDoc comment saying why.
impact: high
applies: [typescript, react, react-compiler]
sources: [https://react.dev/learn/react-compiler/introduction, https://react.dev/reference/react/useMemo, https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler]
---

## Rule

Write derived values, event handlers and components as plain code and let the React Compiler memoize them. Do not add `React.useMemo`, `React.useCallback` or `React.memo` unless the case is one of the four exceptions below, and then put a JSDoc comment on it that names the exception.

## Why

Hand-written memoization in compiled code is noise with dependency arrays that drift out of date, so a stale `useCallback` quietly keeps calling an old prop; the compiler already memoizes the same values with correct dependencies.

## Incorrect

```tsx
const ProductList = React.memo(function ProductList({ products, sortBy, onSelect }: ProductListProps) {
  const sorted = React.useMemo(() => [...products].sort(byField(sortBy)), [products, sortBy]);
  const handleSelect = React.useCallback((id: string) => onSelect(id), [onSelect]);
  return <List items={sorted} onSelect={handleSelect} />;
});
```

## Correct

```tsx
function ProductList({ products, sortBy, onSelect }: ProductListProps) {
  const sorted = [...products].sort(byField(sortBy));
  return <List items={sorted} onSelect={(id) => onSelect(id)} />;
}
```

## Exceptions

Memoize by hand, with a JSDoc comment stating which case applies, only for:

1. **A callback handed to code outside React** (a map, chart or editor library that keeps the reference): `/** Stable reference: the map library re-binds its click handler when this changes. */`
2. **A context provider value** that is an object or function, so consumers do not re-render on every provider render: `/** Context value: keeps every consumer from re-rendering when the provider does. */`
3. **A computation measured as expensive** in the React Profiler (a render over 16 ms, or a computation over 100 ms that runs often): `/** Measured: ~150 ms for 10k rows in the Profiler. */`
4. **A subscription handler** passed to an effect that subscribes to an external store or socket, so it does not resubscribe on every render: `/** Stable handler: prevents resubscribing to the channel on every render. */`
