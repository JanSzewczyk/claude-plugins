---
title: Log through one createLogger({ module }) logger per file, never through console
summary: Each server file creates const log = createLogger({ module: "<domain>-<layer>" }); no console.* and no bare root logger.
impact: high
applies: [typescript, loglayer]
sources: [https://loglayer.dev/logging-api/child-loggers, https://loglayer.dev/logging-api/context]
---

## Rule

At the top of each server file, create one module logger with `createLogger({ module: "<domain>-<layer>" })` (for example `budgets-db`, `budgets-actions`, `templates-service`) and log only through it. Feature code never calls `console.*` and never imports the root logger from `~/lib/logger`.

## Why

A line written through `console.log` or the root logger carries no `module` field, so it cannot be filtered or traced back to its code, and `console.*` also bypasses the level and redaction configured in `lib/logger.ts`.

## Incorrect

```ts
import logger from "~/lib/logger";

export async function getBudget(id: string) {
  console.log("loading budget", id);
  logger.info("Budget loaded");
}
```

## Correct

```ts
import { createLogger } from "~/lib/logger";

const log = createLogger({ module: "budgets-db" });

export async function getBudget(id: string) {
  log.withMetadata({ budgetId: id }).debug("Budget loaded");
}
```

## Exceptions

Client error boundaries (`error.tsx`, `global-error.tsx`) run in the browser, where the server logger does not exist; they may call `console.error`.
