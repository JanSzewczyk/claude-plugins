---
title: Keep the log message constant and put every value in withMetadata
summary: log.withMetadata({ budgetId }).info("Budget created"); a value interpolated into the message cannot be filtered.
impact: high
applies: [typescript, loglayer]
sources: [https://loglayer.dev/logging-api/metadata, https://loglayer.dev/logging-api/context]
---

## Rule

Pass a short, constant, human-readable message to the level method and put every variable value in `.withMetadata({ ... })`. Fields that hold for the logger's lifetime (`module`, `requestId`) go in `createLogger` or `.withContext()`; per-call values go in `.withMetadata()`.

## Why

A message such as `` `Budget ${id} created` `` differs on every call, so entries cannot be grouped or counted by message and the id cannot be queried as a field.

## Incorrect

```ts
log.info(`Budget ${budget.id} created by ${userId}`);
```

## Correct

```ts
log.withMetadata({ budgetId: budget.id, userId }).info("Budget created");
```
