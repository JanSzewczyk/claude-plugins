---
title: Render conditionally with a ternary that returns null, never with &&
summary: condition ? <X /> : null for elements, fragments and text; && renders a stray 0 when the left side is a number.
impact: high
applies: [typescript, react]
sources: [https://react.dev/learn/conditional-rendering]
---

## Rule

Write every conditional in JSX as `condition ? <Element /> : null`, including fragments and inline text. Do not use the `&&` short-circuit.

## Why

With `&&`, a numeric left side that is `0` (or `NaN`) is rendered as-is, so an empty list shows a stray "0" on the page; the ternary always renders exactly the element or nothing. Banning `&&` outright, even with a boolean left side, is a team style choice that keeps the rule mechanical to follow and to lint.

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
