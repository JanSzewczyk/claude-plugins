---
title: Render conditionally with a ternary that returns null, never with &&
summary: condition ? <X /> : null for elements, fragments and text; && renders a stray 0 or "" when the left side is falsy.
impact: high
applies: [typescript, react]
sources: [https://react.dev/learn/conditional-rendering]
---

## Rule

Write every conditional in JSX as `condition ? <Element /> : null`, including fragments and inline text. Do not use the `&&` short-circuit.

## Why

With `&&`, a falsy non-boolean left side such as `0` or `""` is rendered as-is, so an empty list shows a stray "0" on the page; the ternary always renders exactly the element or nothing.

## Incorrect

```tsx
function OrderList({ orders, error }: OrderListProps) {
  return (
    <section>
      {orders.length && <List items={orders} />}
      {error && <p className="text-error">{error}</p>}
    </section>
  );
}
```

## Correct

```tsx
function OrderList({ orders, error }: OrderListProps) {
  return (
    <section>
      {orders.length > 0 ? <List items={orders} /> : null}
      {error ? <p className="text-error">{error}</p> : null}
    </section>
  );
}
```
