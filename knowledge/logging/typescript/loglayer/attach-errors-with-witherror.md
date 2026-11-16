---
title: Attach a caught error with withError, never in withMetadata or the message
summary: log.withError(err) keeps the stack through the configured serializer; { error } or err.message loses it.
impact: high
applies: [typescript, loglayer]
sources: [https://loglayer.dev/logging-api/error-handling, https://loglayer.dev/cheatsheet]
---

## Rule

Attach a caught value with `.withError(error)` and keep the message constant. Do not put it in `.withMetadata({ error })` and do not copy `error.message` into the message.

## Why

`withError` is LogLayer's documented path for an `Error`, where the configured error serializer and the `err` field apply; an `Error` placed in metadata is serialized as a plain object, and its fields are not enumerable, so it comes out as `{}` and the stack is lost.

## Incorrect

```ts
} catch (error) {
  log.withMetadata({ error, budgetId }).error(`Save failed: ${(error as Error).message}`);
}
```

## Correct

```ts
} catch (error) {
  log.withError(error).withMetadata({ budgetId }).error("Save budget failed");
}
```
