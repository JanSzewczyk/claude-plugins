---
title: Set the logger's level from LOG_LEVEL in the server env, chosen per environment
summary: LOG_LEVEL is a validated enum in data/env/server.ts (debug locally, info in production) that lib/logger.ts reads.
impact: medium
applies: [typescript, loglayer, pino, t3-env]
sources: [https://getpino.io/#/docs/api?id=level-string, https://env.t3.gg/docs/nextjs]
---

## Rule

Declare `LOG_LEVEL` in `data/env/server.ts` as `z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")` and have `lib/logger.ts` pass `env.LOG_LEVEL` to Pino. Set `debug` in `.env.local`, `info` in production and `error` in tests.

## Why

A level read from `process.env` escapes validation, so a typo such as `LOG_LEVEL=verbose` crashes the logger when it loads instead of failing the build with the variable's name.

## Incorrect

```ts
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const pinoLogger = pino({ level: LOG_LEVEL });
```

## Correct

```ts
import { env } from "~/data/env/server";

/** env is raw under SKIP_ENV_VALIDATION, so the schema default does not apply. */
const pinoLogger = pino({ level: env.LOG_LEVEL ?? "info" });
```

## Exceptions

`lib/logger.ts` is imported by unit tests and by a build with `SKIP_ENV_VALIDATION`, where `env` is the raw environment and `LOG_LEVEL` may be `undefined`; Pino throws on an `undefined` level, so this one call site keeps the `?? "info"` fallback.
