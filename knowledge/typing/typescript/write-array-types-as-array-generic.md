---
title: Write array types as Array<T>, never T[]
summary: T[] binds tighter than |, so string | number[] means a string or an array of numbers, not an array of either.
impact: medium
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#arrays]
---

## Rule

Write every array type in the generic form `Array<T>`: in props, parameters, return types, variables and nested types. Use `ReadonlyArray<T>` for a read-only array.

## Why

`string | number[]` reads as an array of strings or numbers but means a string or an array of numbers, because `[]` binds tighter than `|`; the generic form puts the element type inside the brackets, so the union cannot leak out.

## Incorrect

```ts
type Props = {
  steps: ProjectStep[];
  values: string | number[];
  rows: { id: string; name: string }[];
};
```

## Correct

```ts
type Props = {
  steps: Array<ProjectStep>;
  values: Array<string | number>;
  rows: Array<{ id: string; name: string }>;
};
```
