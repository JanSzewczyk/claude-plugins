---
title: Write a callback argument as an inline arrow function
summary: Arrow functions belong only where a callback is passed; there they keep the outer this and stay short.
impact: low
applies: [typescript]
sources: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions]
---

## Rule

Where a function is passed as an argument (`map`, `filter`, `sort`, a promise handler, an event handler prop), write it inline as an arrow function. This is the only place an arrow function appears; a callback reused elsewhere becomes a named `function` declaration instead.

## Why

An inline `function () {}` expression rebinds `this` (a compile error under `noImplicitThis`, a runtime bug without it) and doubles the length of a callback that is one expression.

## Incorrect

```ts
const sorted = steps.sort(function (a, b) {
  return a.orderIndex - b.orderIndex;
});
const ids = steps.map(function (step) {
  return step.id;
});
```

## Correct

```ts
const sorted = steps.sort((a, b) => a.orderIndex - b.orderIndex);
const ids = steps.map((step) => step.id);
```
