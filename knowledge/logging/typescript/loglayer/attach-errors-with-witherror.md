---
title: Attach a caught error with withError, never in withMetadata or the message
summary: log.withError(err) runs the configured errorSerializer and keeps the stack; { error } or err.message loses it.
impact: high
applies: [typescript, loglayer]
sources: [https://loglayer.dev/logging-api/error-handling, https://loglayer.dev/cheatsheet]
---

## Rule

Attach a caught value with `.withError(error)` and keep the message constant. Do not put it in `.withMetadata({ error })` and do not copy `error.message` into the message.

## Why

An error passed through `.withMetadata` skips the `errorSerializer` (`serializeError`) set on the root `LogLayer`, so the stack trace is lost: an `Error`'s fields are not enumerable and serialize as `{}`.

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
