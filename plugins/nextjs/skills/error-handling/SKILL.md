---
name: error-handling
description: >
  Comprehensive error handling for Next.js applications — use whenever adding or
  fixing error handling, building database or service layer operations, writing
  server actions, or making an app production-ready. Covers ServiceError (typed
  error contract for any external service: DB, API, network), tuple return pattern
  [error, data], ActionResponse for server actions, React error boundaries, toast
  notifications, retry with exponential backoff, and circuit breaker patterns.
  Trigger on: "add error handling", "handle database errors", "handle service
  errors", "retry failed requests", "error boundary", "handle action errors",
  "toast on error", "log errors", "circuit breaker", "graceful degradation",
  "categorizeServiceError", "ServiceError".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Error Handling Skill

Comprehensive, layered error handling for Next.js applications. This file holds the architecture and
contract; copy-paste code is in the references.

> - [references/patterns.md](./references/patterns.md) — error-handling patterns by layer.
> - [references/examples.md](./references/examples.md) — full worked examples (complete CRUD with errors).
> - [references/retry-patterns.md](./references/retry-patterns.md) — retry, circuit breaker, resilience.
> - [references/validation-vs-runtime.md](./references/validation-vs-runtime.md) — validation vs runtime errors.

## Philosophy

1. **Never expose internal errors to users** — log details server-side, show friendly messages client-side.
2. **Use typed errors** — `ServiceError` for any service layer, `ActionResponse` for server actions.
3. **Fail gracefully** — error boundaries, fallback UI, retry mechanisms.
4. **Log everything** — structured logging with context before returning an error.
5. **Provide feedback** — toast notifications for user-facing errors.

## The Four Layers

```
Client       → Error Boundaries (React) · Toast notifications · inline form-field errors
   ↑
Server Action → ActionResponse<T> / RedirectAction · Zod validation with fieldErrors · toast cookies
   ↑
Service      → ServiceError class · tuple pattern [error, data] · categorizeServiceError()
   ↑
Logging      → structured logs · error context (errorCode, isRetryable, userId), logged before return
```

The **service layer is source-agnostic**: the same `ServiceError` contract wraps failures from a
database query, a REST/`fetch()` API call, or a validation/business-rule check. Nothing below is
tied to a particular data store.

Rules per layer (code in [references/examples.md](./references/examples.md)):

- **Service layer** — always return the tuple `[error, data]`: `[ServiceError, null]` on failure,
  `[null, data]` on success. Wrap external calls in `try/catch`, run results through
  `categorizeServiceError(error, resourceName)`, and log before returning.
- **Server action** — return `ActionResponse`. Validation failures return `fieldErrors` (from
  `zod.flatten()`) for inline display; service failures set a toast cookie and return a **generic**
  user message (never the raw error).
- **Client** — `app/error.tsx` error boundary logs the error and offers `reset()`; toasts surface
  action feedback; field errors render inline.

## ServiceError Contract

`ServiceError` is the typed error every service-layer operation returns, **regardless of where the
failure came from** — a database driver/ORM, a `fetch()`/REST call to another service, or a
validation/business-rule check. It's a plain TypeScript class with no dependency on any data store.
`categorizeServiceError(error, resourceName)` maps a raw error from any source onto it.

| Property             | Type    | Meaning                                                     |
| -------------------- | ------- | ----------------------------------------------------------- |
| `code`               | string  | Error code from the neutral vocabulary below                |
| `message`            | string  | User-friendly message                                       |
| `isRetryable`        | boolean | Transient error (network, timeout, service unavailable)     |
| `isNotFound`         | boolean | Resource doesn't exist                                      |
| `isAlreadyExists`    | boolean | Creating a resource that already exists                     |
| `isPermissionDenied` | boolean | Auth/permission issue                                       |

### Neutral error-code vocabulary

`code` is one of these source-independent values. Each concrete adapter (DB driver, HTTP client,
validator) maps its own raw error codes/HTTP statuses onto this set:

| `code`            | `isRetryable` | Typical source                                          |
| ----------------- | ------------- | ------------------------------------------------------- |
| `validation`      | no            | Zod parse, business-rule check, HTTP 400/422            |
| `not-found`       | no            | Missing row/document, HTTP 404                          |
| `already-exists`  | no            | Unique-constraint violation, HTTP 409                   |
| `permission-denied` | no          | Auth/authorization failure, HTTP 401/403                |
| `data-corruption` | no            | Record exists but fails its shape/parse                 |
| `unavailable`     | **yes**       | Connection refused, service down, HTTP 502/503          |
| `timeout`         | **yes**       | Deadline exceeded, `AbortError`, HTTP 504               |
| `rate-limited`    | **yes**       | Too many requests, HTTP 429                             |
| `external-api`    | **yes**       | Non-specific upstream/third-party failure               |
| `internal`        | no            | Unknown/unexpected error                                |

### Factory methods and constructor

```typescript
ServiceError.notFound("User");            // resource not found
ServiceError.alreadyExists("Budget");     // resource already exists
ServiceError.validation("Invalid input"); // validation / business-rule failed
ServiceError.dataCorruption("Event");     // record exists but data invalid
ServiceError.permissionDenied("Budget");  // auth/permission issue (resource optional)
ServiceError.internal("Budget");          // unknown/unexpected failure

// Full constructor for any other code (e.g. a retryable upstream failure):
//   new ServiceError(code: string, message: string, isRetryable = false)
new ServiceError("external-api", "Payment service unavailable", true);
```

## Error Response Flow

`source error (DB / fetch / validation) → categorizeServiceError() → log with context →
return [error, null] → server action inspects error flags → set toast cookie → return ActionResponse
with a generic message → client shows toast`.

## Related Skills

- `firebase-firestore` — one concrete adapter that maps a specific data store's raw errors onto this contract.
- `server-actions` — `ActionResponse` types and patterns.
- `toast-notifications` — user feedback via toasts.
- `structured-logging` — structured logging patterns.
