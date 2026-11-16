---
title: Write every warranted comment as a JSDoc block, not a // line
summary: A /** */ comment above a function, type or statement shows in editor hovers; a // comment shows nowhere else.
impact: low
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html]
---

## Rule

When a comment is warranted, write it in JSDoc form (`/** ... */`), also for a single line above a function, type, constant or non-obvious statement. Use `//` only for tool directives such as `// @ts-expect-error` or a linter suppression.

## Why

A `//` comment above a function or type is invisible at every call site, so the constraint it records is missed by whoever uses the symbol; a JSDoc block is attached to the symbol and shown in editor hovers and completions.

## Incorrect

```ts
// Firestore rejects batches above 500 writes.
const MAX_BATCH_SIZE = 500;
```

## Correct

```ts
/** Firestore rejects batches above 500 writes. */
const MAX_BATCH_SIZE = 500;
```
