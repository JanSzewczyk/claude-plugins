---
title: Fill nested typed objects from their own builder
summary: A nested type gets its own builder, used as () => otherBuilder.one(); overrides deep-merge into it.
impact: medium
applies: [typescript, mimicry-js]
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

Give each nested type its own builder and use it as `field: () => otherBuilder.one()`. Override a single
nested key through the parent's `overrides`, which deep-merge, instead of rebuilding the nested object.

## Why

A nested object written inline in the parent duplicates the child builder's defaults, and the two
drift until the same type looks different depending on which builder made it.

## Incorrect

```ts
const orderBuilder = build<Order>({
  fields: { customer: { id: "c1", name: "Ada", email: "ada@example.com" } },
});
```

## Correct

```ts
const orderBuilder = build<Order>({ fields: { customer: () => customerBuilder.one() } });
orderBuilder.one({ overrides: { customer: { name: "Ada Lovelace" } } });
```
