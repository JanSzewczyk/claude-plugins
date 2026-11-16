---
title: Map every failure onto one of the neutral ServiceError codes
summary: Database, HTTP and validation failures all become a ServiceError with a fixed code and kind flags, never a raw error.
impact: high
applies: [typescript]
sources: [https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status]
---

## Rule

Return failures from the service layer only as a `ServiceError` whose `code` comes from the closed set below, with `isRetryable`, `isNotFound`, `isAlreadyExists` and `isPermissionDenied` derived from it. Each adapter (database driver, HTTP client, validator) maps its own codes and statuses onto this set in `categorizeServiceError(error, resource)`; nothing else invents codes.

## Why

When each source returns its own error shape, every caller has to know Postgres codes, Firestore codes and HTTP statuses, and a new data source silently breaks the branches that expected the old one.

## Incorrect

```ts
} catch (error) {
  return [error as Error, null]; // caller sees "23505", "ECONNREFUSED" or a 503 body
}
```

## Correct

```ts
// code              isRetryable  typical source
// validation        no           Zod parse, business rule, HTTP 400/422
// not-found         no           missing row or document, HTTP 404
// already-exists    no           unique-constraint violation, HTTP 409
// permission-denied no           HTTP 401/403, store permission error
// data-corruption   no           stored record fails its schema
// unavailable       yes          connection refused, HTTP 502/503
// timeout           yes          deadline exceeded, AbortError, HTTP 504
// rate-limited      yes          HTTP 429
// external-api      no           other upstream failure (a permanent 4xx; a 5xx is `unavailable`)
// internal          no           anything unrecognised
} catch (error) {
  return [categorizeServiceError(error, "Budget"), null];
}
```
