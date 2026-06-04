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
Logging      → Pino structured logs · error context (errorCode, isRetryable, userId), logged before return
```

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

`ServiceError` is the typed error every service-layer implementation must provide. It's a TypeScript
contract — the **Firestore concrete implementation lives in the `firebase-firestore` skill**
(`errors.md`). `categorizeServiceError(error, resourceName)` maps a raw error onto it.

| Property             | Type    | Meaning                                                     |
| -------------------- | ------- | ----------------------------------------------------------- |
| `code`               | string  | Error code (validation, not-found, permission-denied, etc.) |
| `message`            | string  | User-friendly message                                       |
| `isRetryable`        | boolean | Transient error (network, timeout)                          |
| `isNotFound`         | boolean | Resource doesn't exist                                      |
| `isAlreadyExists`    | boolean | Creating a resource that already exists                     |
| `isPermissionDenied` | boolean | Auth/permission issue                                       |

Static factory methods every implementation exposes:

```typescript
ServiceError.notFound("User");          // resource not found
ServiceError.alreadyExists("Budget");   // resource already exists
ServiceError.validation("Invalid input"); // validation failed
ServiceError.dataCorruption("Event");   // document exists but data invalid
ServiceError.permissionDenied();        // auth/permission issue
```

## Error Response Flow

`db error → categorizeServiceError() → log with context → return [error, null] → server action inspects
error flags → set toast cookie → return ActionResponse with a generic message → client shows toast`.

## Related Skills

- `firebase-firestore` — Firestore implementation of the contract (`ServiceError` + `categorizeServiceError`).
- `server-actions` — `ActionResponse` types and patterns.
- `toast-notifications` — user feedback via toasts.
- `structured-logging` — Pino logging patterns.
