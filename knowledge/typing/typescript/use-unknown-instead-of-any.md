---
title: Type a value of unknown shape as unknown and narrow it, never as any
summary: any switches off type checking for everything it touches; unknown forces a check before the value is used.
impact: high
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown, https://www.typescriptlang.org/docs/handbook/2/narrowing.html]
---

## Rule

Type data whose shape is not known yet (parsed JSON, a caught error, a third-party payload) as `unknown` and narrow it with a type guard or a schema parse before using it. Never write `any`, neither as an annotation nor as `as any`.

## Why

`any` turns off checking for the value and everything derived from it, so a missing field or a wrong type compiles and fails only at runtime; `unknown` makes the compiler reject every use until the code has checked the shape.

## Incorrect

```ts
function readTitle(payload: any): string {
  return payload.title.trim();
}
```

## Correct

```ts
function readTitle(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "title" in payload && typeof payload.title === "string") {
    return payload.title.trim();
  }
  return null;
}
```
