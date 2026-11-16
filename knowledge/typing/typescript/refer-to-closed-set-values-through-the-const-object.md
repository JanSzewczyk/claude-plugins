---
title: Refer to a closed-set value through its const object, never as a raw string literal
summary: A raw literal in an Extract silently becomes never when a value is renamed; OrderStatus.PAID fails to compile instead.
impact: medium
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union]
---

## Rule

Wherever a value of a const-object set is used (comparisons, record keys, defaults, narrowed types), write it through the object's property: `OrderStatus.PAID`, `[OrderStatus.PAID]`, `Extract<OrderStatus, typeof OrderStatus.PAID>`. Type a lookup table as `Record<OrderStatus, T>`.

## Why

A misspelled or renamed literal in `Extract<OrderStatus, "shiped">` produces `never` without any error, and an untyped `{ pending: ..., paid: ... }` map compiles with an entry missing; going through the object makes a rename one edit and a missed entry a compile error.

## Incorrect

```ts
type NextStatus = Extract<OrderStatus, "shiped" | "cancelled">;
const STATUS_LABELS = { pending: "Awaiting payment", paid: "Paid" };
if (order.status === "paid") notify(order);
```

## Correct

```ts
type NextStatus = Extract<OrderStatus, typeof OrderStatus.SHIPPED | typeof OrderStatus.CANCELLED>;
const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Awaiting payment",
  [OrderStatus.PAID]: "Paid",
  [OrderStatus.SHIPPED]: "On its way",
  [OrderStatus.CANCELLED]: "Cancelled",
};
if (order.status === OrderStatus.PAID) notify(order);
```
