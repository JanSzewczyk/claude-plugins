---
title: Wrap function-typed fields in fixed() so the builder does not call them
summary: A plain function as a field value is called on every build; fixed(fn) keeps it as the value.
impact: high
applies: [typescript, mimicry-js]
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

For a field whose value is itself a function (`onClick`, `onSubmit`, a formatter), wrap the
function in `fixed(fn)`. Leave a bare arrow function only where you want a fresh value on each build.

## Why

mimicry-js calls any function it finds as a field value, so a bare callback is replaced by its return
value and the built object has `undefined` where a handler should be.

## Incorrect

```ts
const buttonPropsBuilder = build<ButtonProps>({ fields: { label: "Save", onClick: () => {} } });
```

## Correct

```ts
const buttonPropsBuilder = build<ButtonProps>({ fields: { label: "Save", onClick: fixed(() => {}) } });
```
