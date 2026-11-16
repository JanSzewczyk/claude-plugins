---
title: Choose the log level by what the event means; log an expected not-found at warn
summary: error for a failure to investigate, warn for an expected outcome such as not-found, info for normal events.
impact: medium
applies: [typescript, loglayer]
sources: [https://getpino.io/#/docs/api?id=level-string, https://loglayer.dev/logging-api/basic-logging]
---

## Rule

Use `fatal` when the app cannot continue, `error` for a failed operation someone must investigate, `warn` for an expected or recoverable outcome (a lookup that finds nothing, a refused request, a rate limit approaching), `info` for normal business events, and `debug`/`trace` for detail only development needs.

## Why

Expected outcomes logged at `error` bury real failures in noise and fire alerts nobody acts on.

## Incorrect

```ts
// action: the service returned a not-found error
if (error?.isNotFound) {
  log.withMetadata({ userId: id }).error("User not found");
  notFound();
}
```

## Correct

```ts
// action: the service returned a not-found error
if (error?.isNotFound) {
  log.withMetadata({ userId: id }).warn("User not found");
  notFound();
}
```
