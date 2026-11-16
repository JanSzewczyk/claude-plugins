---
title: Read environment variables only through the T3 Env object, never through process.env
summary: Every variable is declared in createEnv and read as env.NAME; process.env appears only inside data/env/*.ts.
impact: high
applies: [typescript, nextjs, t3-env]
sources: [https://env.t3.gg/docs/nextjs, https://nextjs.org/docs/app/guides/environment-variables]
---

## Rule

Declare every environment variable in the `createEnv` schema of `data/env/server.ts` or `data/env/client.ts` and read it as `env.NAME`. `process.env` appears only inside those two files.

## Why

A raw `process.env.X` read is unvalidated and typed `string | undefined`, so a missing or misspelled variable passes the build and surfaces as `undefined` in production; it also skips the server/client split that keeps server values out of client code.

## Incorrect

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

## Correct

```ts
import { env } from "~/data/env/server";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
```

## Exceptions

Tool configuration that runs outside the app (`vitest.config.ts`, `playwright.config.ts`) may read `process.env`, for example `process.env.CI`.
