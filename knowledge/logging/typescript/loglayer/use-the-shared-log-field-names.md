---
title: Name log fields from the shared vocabulary, one name per concept
summary: userId, requestId, operation, durationMs, errorCode, isRetryable, statusCode, path, method; never uid or user_id.
impact: medium
applies: [typescript, loglayer]
sources: [https://loglayer.dev/logging-api/metadata]
---

## Rule

Name metadata and context fields in camelCase from this list: `userId`, `requestId`, `operation`, `durationMs`, `errorCode`, `isRetryable`, `statusCode`, `path`, `method`, and `<entity>Id` (`budgetId`) for a resource. Never give a concept a second name.

## Why

When one file logs `uid`, another `user_id` and a third `userId`, a query for one user's activity silently misses most of it.

## Incorrect

```ts
log.withMetadata({ uid: user.id, duration: ms, code: error.code }).warn("Export slow");
```

## Correct

```ts
log.withMetadata({ userId: user.id, durationMs: ms, errorCode: error.code }).warn("Export slow");
```
