---
title: Let an empty or missing optional variable fall back to a default declared in the schema
summary: emptyStringAsUndefined: true in both env files and .default() on optional variables; never env.X || "...".
impact: medium
applies: [typescript, nextjs, t3-env, zod]
sources: [https://env.t3.gg/docs/customization, https://zod.dev/api]
---

## Rule

Set `emptyStringAsUndefined: true` in both `createEnv` calls and give every optional variable its fallback with `.default(value)` in the schema. Leave a variable `.optional()` without a default only when its absence is meaningful (a feature that is off without it), and never fall back at the call site.

## Why

Without `emptyStringAsUndefined`, a line such as `API_URL=` in `.env` passes `""` to Zod, so a required `z.string()` accepts the empty value and a `.default()` never applies.

## Incorrect

```ts
export const env = createEnv({
  server: { API_URL: z.string(), REGION: z.string().optional() },
  experimental__runtimeEnv: process.env,
});
const region = env.REGION || "eu-west-1";
```

## Correct

```ts
export const env = createEnv({
  server: { API_URL: z.url(), REGION: z.string().default("eu-west-1") },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
const region = env.REGION;
```

## Exceptions

Code that also runs with `SKIP_ENV_VALIDATION` (such as `lib/logger.ts`, which tests import) sees the raw environment without defaults and may repeat the default with `??` where `undefined` would crash it.
