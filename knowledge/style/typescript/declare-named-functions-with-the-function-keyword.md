---
title: Declare every named function with the function keyword
summary: A const arrow is not hoisted and throws if called before its line has run; a declaration is hoisted.
impact: low
applies: [typescript]
sources: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz]
---

## Rule

Declare every function that has a name, at module level or inside another function, with the `function` keyword. Do not assign an arrow function or a function expression to a `const`.

## Why

A `const` arrow sits in the temporal dead zone until its line runs, so a helper called before that line has run throws `ReferenceError` at runtime; a declaration is hoisted, reads as a function at a glance, and the file mixes no two styles.

## Incorrect

```ts
const formatDate = (date: Date): string => date.toISOString();

const handleSubmit = async (data: FormData) => {
  await save(data);
};
```

## Correct

```ts
function formatDate(date: Date): string {
  return date.toISOString();
}

async function handleSubmit(data: FormData) {
  await save(data);
}
```
