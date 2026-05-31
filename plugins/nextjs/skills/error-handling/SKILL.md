---
name: error-handling
version: 1.0.0
lastUpdated: 2026-01-18
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
tags:
  [error-handling, ServiceError, error-boundary, toast, logging, server-actions]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
context: fork
agent: general-purpose
user-invocable: true
examples:
  - How to handle database errors
  - Error boundary patterns
  - Toast notifications for errors
  - Server action error handling
---

# Error Handling Skill

Comprehensive error handling patterns for Next.js applications.

> **Reference Files:**
>
> - [patterns.md](./patterns.md) - Error handling patterns by layer
> - [examples.md](./examples.md) - Practical code examples
> - [retry-patterns.md](./retry-patterns.md) - Retry, circuit breaker, and resilience patterns
> - [validation-vs-runtime.md](./validation-vs-runtime.md) - Validation errors vs runtime errors guide

## Error Handling Philosophy

**Principles:**

1. **Never expose internal errors to users** - Log details server-side, show friendly messages client-side
2. **Use typed errors** - ServiceError class for any service layer, ActionResponse for server actions
3. **Fail gracefully** - Error boundaries, fallback UI, retry mechanisms
4. **Log everything** - Structured logging with context for debugging
5. **Provide feedback** - Toast notifications for user-facing errors

## Error Handling Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  • Error Boundaries (React)                                  │
│  • Toast Notifications (user feedback)                       │
│  • Form field errors (inline validation)                     │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                  Server Action Layer                         │
│  • ActionResponse<T> / RedirectAction types                  │
│  • Zod validation with fieldErrors                           │
│  • Toast cookies for redirect feedback                       │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  • ServiceError class (typed errors)                         │
│  • Tuple pattern [error, data]                               │
│  • categorizeServiceError() helper                           │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                   Logging Layer                              │
│  • Pino structured logging                                   │
│  • Error context (errorCode, isRetryable, userId)            │
│  • Log before returning error                                │
└─────────────────────────────────────────────────────────────┘
```

## Quick Reference

### Service Layer (ServiceError)

```typescript
import { categorizeServiceError, ServiceError } from "~/lib/services/errors"; // path depends on your service layer (e.g. ~/lib/firebase/errors for Firestore)

// Tuple pattern - always return [error, data]
export async function getById(
  id: string,
): Promise<[null, Data] | [ServiceError, null]> {
  if (!id?.trim()) {
    return [ServiceError.validation("Invalid id"), null];
  }

  try {
    const doc = await db.collection("items").doc(id).get();
    if (!doc.exists) {
      return [ServiceError.notFound("Item"), null];
    }
    return [null, transform(doc)];
  } catch (error) {
    const serviceError = categorizeServiceError(error, "Item");
    logger.error({ errorCode: serviceError.code, id }, "Database error");
    return [serviceError, null];
  }
}
```

### Server Action Layer

```typescript
import { setToastCookie } from "~/lib/toast/server/toast.cookie";
import type { ActionResponse } from "~/lib/action-types";

export async function createItem(data: FormData): ActionResponse<Item> {
  const userId = await getCurrentUserId(); // your auth helper
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Validation errors - return fieldErrors for form display
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Database errors - toast + generic message
  const [error, item] = await createItemInDb(parsed.data);
  if (error) {
    await setToastCookie("Failed to create item", "error");
    return { success: false, error: "Unable to create item" };
  }

  return { success: true, data: item };
}
```

### Client Layer (Error Boundary)

```typescript
// app/error.tsx - Catches unhandled errors
"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service
    logError(error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

## ServiceError Contract

| Property             | Type    | Description                                                 |
| -------------------- | ------- | ----------------------------------------------------------- |
| `code`               | string  | Error code (validation, not-found, permission-denied, etc.) |
| `message`            | string  | User-friendly error message                                 |
| `isRetryable`        | boolean | True for transient errors (network, timeout)                |
| `isNotFound`         | boolean | True when resource doesn't exist                            |
| `isAlreadyExists`    | boolean | True when creating existing resource                        |
| `isPermissionDenied` | boolean | True for auth/permission issues                             |

## Static Factory Methods

```typescript
ServiceError.notFound("User"); // Resource not found
ServiceError.alreadyExists("Budget"); // Resource already exists
ServiceError.validation("Invalid input"); // Validation failed
ServiceError.dataCorruption("Event"); // Document exists but data invalid
ServiceError.permissionDenied(); // Auth/permission issue
```

## Error Response Flow

```
Database Error
    ↓
categorizeServiceError() → ServiceError with properties
    ↓
Log error with context (logger.error)
    ↓
Return tuple [error, null]
    ↓
Server Action checks error properties
    ↓
Set toast cookie for user feedback
    ↓
Return ActionResponse with generic message
    ↓
Client displays toast + handles state
```

## ServiceError Contract

The `ServiceError` contract defines what every service layer implementation must provide. **This is a TypeScript interface — the Firestore concrete implementation lives in the `firebase-firestore` skill.**

```typescript
// The contract every service layer must fulfill
interface ServiceErrorContract {
  // Boolean flags for type-safe error branching
  readonly isRetryable: boolean;
  readonly isNotFound: boolean;
  readonly isAlreadyExists: boolean;
  readonly isPermissionDenied: boolean;
  readonly code: string;
  readonly message: string;
}

// Static factory methods every service layer must expose
interface ServiceErrorStatic {
  notFound(resourceName: string): ServiceErrorContract;
  alreadyExists(resourceName: string): ServiceErrorContract;
  validation(message: string, resourceName?: string): ServiceErrorContract;
  dataCorruption(resourceName: string): ServiceErrorContract;
  permissionDenied(resourceName: string): ServiceErrorContract;
}
```

The `categorizeServiceError(error, resourceName)` function maps raw service errors to this contract.
**Firestore implementation:** See `firebase-firestore/errors.md`.

## Related Skills

- `firebase-firestore` — Firestore implementation of the ServiceError contract (`ServiceError` class + `categorizeServiceError`)
- `server-actions` — ActionResponse types and patterns
- `toast-notifications` — User feedback via toasts
- `structured-logging` — Pino logging patterns
