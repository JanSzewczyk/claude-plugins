---
title: Convert numbers and booleans in the env schema, never with z.coerce.boolean
summary: z.coerce.number() for numbers, z.stringbool() for flags; code reads typed values.
impact: high
applies: [typescript, nextjs, t3-env, zod]
sources: [https://zod.dev/api, https://env.t3.gg/docs/nextjs]
---

## Rule

Turn every non-string variable into its type in the schema: `z.coerce.number()` with its bounds for numbers, `z.stringbool()` (Zod 4) for flags, a `.transform` on a string for lists. Never use `z.coerce.boolean()` and never parse an env value at the call site.

## Why

`z.coerce.boolean()` turns every non-empty string into `true`, so `FEATURE_EXPORT=false` switches the feature on; parsing at the call site repeats the conversion and skips validation.

## Incorrect

```ts
server: {
  FEATURE_EXPORT: z.coerce.boolean(),
  RATE_LIMIT_MAX: z.string(),
},
// call site
const max = parseInt(env.RATE_LIMIT_MAX, 10);
```

## Correct

```ts
server: {
  FEATURE_EXPORT: z.stringbool().default(false),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
},
// call site
const max = env.RATE_LIMIT_MAX;
```
