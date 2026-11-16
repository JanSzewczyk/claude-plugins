---
title: Write every warranted comment as a JSDoc block, not a // line
summary: A /** */ comment on a declaration shows in editor hovers; a // comment above it shows nowhere else.
impact: low
applies: [typescript]
sources: [https://tsdoc.org/]
---

## Rule

When a comment is warranted, write it in JSDoc form (`/** ... */`), also for a single line above a function, type, constant or member declaration. Inside a function body a `//` line is fine for a non-obvious step, and `//` is the form for tool directives such as `// @ts-expect-error` or a linter suppression.

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
