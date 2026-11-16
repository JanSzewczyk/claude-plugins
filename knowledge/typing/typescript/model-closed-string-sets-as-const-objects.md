---
title: Model a closed set of strings as an as const object plus a same-named type
summary: Never a TypeScript enum or a hand-written literal union; one const object is both the value and the type.
impact: medium
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums, https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly]
---

## Rule

Model a closed set of string values as a `const` object with `as const`, keys in `UPPER_SNAKE_CASE` and the runtime strings as values, and export a type of the same name derived from its values. Do not use a TypeScript `enum` or a hand-written string-literal union.

## Why

A string `enum` emits runtime code, is rejected under `erasableSyntaxOnly` and Node's type stripping, and refuses a plain `"paid"` arriving from JSON, an env var or an API; a hand-written union has no runtime values to iterate or reference, so the set gets spelled out again wherever code needs it.

## Incorrect

```ts
enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
}
type PaymentState = "pending" | "paid";
```

## Correct

```ts
export const OrderStatus = {
  PENDING: "pending",
  PAID: "paid",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```
