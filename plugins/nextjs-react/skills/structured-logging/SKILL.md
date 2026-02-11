---
name: structured-logging
version: 1.0.0
lastUpdated: 2026-01-18
description: Structured logging patterns with Pino for Next.js applications. Covers log levels, context enrichment, child loggers, and production best practices.
tags: [logging, pino, observability, debugging, monitoring]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
context: fork
agent: general-purpose
user-invocable: true
examples:
  - How to add logging to a server action
  - What log level should I use
  - Create a child logger with context
  - Log errors with stack traces
---

# Structured Logging Skill

Structured logging patterns with Pino for Next.js applications.

> **Reference Files:**
>
> - [pino-setup.md](./pino-setup.md) - Logger configuration
> - [log-levels.md](./log-levels.md) - When to use each level
> - [patterns.md](./patterns.md) - Common logging patterns
> - [examples.md](./examples.md) - Practical examples

## Project Configuration

The logger is configured in `lib/logger.ts`:

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
```

## Quick Start

### Basic Logging

```typescript
import logger from "~/lib/logger";

// Simple message
logger.info("Server started");

// With context object
logger.info({ port: 3000 }, "Server started");

// Error logging
logger.error({ error, userId }, "Failed to process request");
```

### Module-Specific Logger

```typescript
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "user-service" });

// All logs include { module: "user-service" }
logger.info({ userId: "123" }, "User created");
// Output: { module: "user-service", userId: "123", msg: "User created" }
```

## Log Levels

| Level   | When to Use                | Example                  |
| ------- | -------------------------- | ------------------------ |
| `fatal` | App crash, unrecoverable   | Database connection lost |
| `error` | Operation failed           | User creation failed     |
| `warn`  | Unexpected but recoverable | Rate limit approaching   |
| `info`  | Normal operations          | User logged in           |
| `debug` | Development details        | Request payload          |
| `trace` | Fine-grained debugging     | Function entry/exit      |

### Usage

```typescript
logger.fatal({ error }, "Database connection lost, shutting down");
logger.error({ userId, errorCode: error.code }, "Failed to update user");
logger.warn({ requestCount, limit }, "Rate limit 80% reached");
logger.info({ userId }, "User logged in successfully");
logger.debug({ payload }, "Processing request");
logger.trace({ functionName: "processData" }, "Entering function");
```

## Key Patterns

### Always Log Context Objects First

```typescript
// ✅ Good - context object first, then message
logger.info({ userId, action: "login" }, "User authenticated");

// ❌ Bad - no context
logger.info("User authenticated");

// ❌ Bad - string interpolation
logger.info(`User ${userId} authenticated`);
```

### Error Logging

```typescript
import { categorizeDbError, DbError } from "~/lib/firebase/errors";

try {
  await updateUser(userId, data);
} catch (error) {
  const dbError = categorizeDbError(error, "User");

  logger.error(
    {
      userId,
      errorCode: dbError.code,
      isRetryable: dbError.isRetryable,
      operation: "updateUser",
    },
    "Failed to update user",
  );

  return [dbError, null];
}
```

### Database Operations

```typescript
const logger = createLogger({ module: "user-db" });

export async function getUserById(id: string) {
  logger.debug({ userId: id }, "Fetching user");

  try {
    const user = await db.collection("users").doc(id).get();

    if (!user.exists) {
      logger.warn({ userId: id }, "User not found");
      return [DbError.notFound("User"), null];
    }

    logger.info({ userId: id }, "User fetched successfully");
    return [null, transformUser(user)];
  } catch (error) {
    const dbError = categorizeDbError(error, "User");
    logger.error(
      {
        userId: id,
        errorCode: dbError.code,
        isRetryable: dbError.isRetryable,
      },
      "Database error fetching user",
    );
    return [dbError, null];
  }
}
```

### Server Actions

```typescript
const logger = createLogger({ module: "user-actions" });

export async function updateProfile(data: ProfileData): ActionResponse {
  const { userId } = await auth();

  if (!userId) {
    logger.warn({ action: "updateProfile" }, "Unauthorized access attempt");
    return { success: false, error: "Unauthorized" };
  }

  logger.info({ userId, action: "updateProfile" }, "Starting profile update");

  const [error] = await updateUserProfile(userId, data);

  if (error) {
    logger.error(
      {
        userId,
        errorCode: error.code,
        action: "updateProfile",
      },
      "Profile update failed",
    );
    return { success: false, error: error.message };
  }

  logger.info(
    { userId, action: "updateProfile" },
    "Profile updated successfully",
  );
  return { success: true, data: null };
}
```

## Environment Configuration

```bash
# .env.local
LOG_LEVEL=debug  # Development: see all logs

# .env.production
LOG_LEVEL=info   # Production: info and above
```

## File Locations

| Purpose          | Location                  |
| ---------------- | ------------------------- |
| Logger setup     | `lib/logger.ts`           |
| Feature loggers  | Create in feature modules |
| Log level config | `data/env/server.ts`      |

## Sensitive Data Protection

**Never log secrets, credentials, or personally identifiable information (PII).**

### What NOT to Log

```typescript
// ❌ NEVER log these
logger.info({ password, token, apiKey }, "User login");
logger.info({ creditCard: card.number }, "Payment processed");
logger.info({ ssn, dateOfBirth, fullAddress }, "User profile loaded");
logger.debug({ cookie: req.headers.cookie }, "Request received");
logger.info({ authorization: req.headers.authorization }, "API call");
```

### Safe Logging Patterns

```typescript
// ✅ Log identifiers, not values
logger.info({ userId, email: maskEmail(email) }, "User login");
logger.info({ cardLast4: card.number.slice(-4) }, "Payment processed");
logger.debug({ hasAuthHeader: !!req.headers.authorization }, "API call");

// ✅ Log metadata, not content
logger.info({ bodySize: JSON.stringify(body).length }, "Request received");
logger.info({ fieldCount: Object.keys(formData).length }, "Form submitted");
```

### Sensitive Fields Checklist

| Category      | Fields to NEVER log                                                                    |
| ------------- | -------------------------------------------------------------------------------------- |
| **Auth**      | password, token, apiKey, secret, refreshToken, sessionId, cookie, authorization header |
| **PII**       | SSN, date of birth, full address, phone number (log last 4 digits max)                 |
| **Financial** | credit card number, bank account, CVV, routing number                                  |
| **Health**    | medical records, diagnoses, insurance IDs                                              |

### Masking Helper

```typescript
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

export function maskId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : "***";
}
```

### Framework-Level Protection

Consider adding a Pino redaction config to automatically strip sensitive fields:

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "password",
      "token",
      "apiKey",
      "*.password",
      "*.token",
      "*.apiKey",
      "authorization",
      "cookie",
      "creditCard",
      "ssn",
    ],
    censor: "[REDACTED]",
  },
});
```

## Related Skills

- `firebase-firestore` - Database logging patterns
- `server-actions` - Action logging patterns
- `t3-env-validation` - LOG_LEVEL configuration
