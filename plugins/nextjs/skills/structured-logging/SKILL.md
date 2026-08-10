---
name: structured-logging
description: Structured logging patterns with LogLayer + Pino for Next.js applications. Covers log levels, context enrichment, child loggers, and production best practices.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
---

# Structured Logging Skill

Structured logging with **LogLayer** wrapping **Pino** for Next.js. LogLayer is the fluent transport-agnostic
API (`.withMetadata()`, `.withContext()`, `.child()`); Pino is the underlying transport that does the actual
writing.

> - [references/setup.md](./references/setup.md) - Logger setup, required libraries, install steps — read this if asked to add or update the logging mechanism itself
> - [references/patterns.md](./references/patterns.md) - Child loggers, request-ID wiring, error logging, redaction

```typescript
import logger, { createLogger } from "~/lib/logger";

logger.withMetadata({ port: 3000 }).info("Server started");

const log = createLogger({ module: "user-service" }); // every line carries { module: "user-service" }
log.withMetadata({ userId: "123" }).info("User created");
```

## Core Rules

- **Metadata via `.withMetadata()`, message as the level-method argument** —
  `logger.withMetadata({ userId, action }).info("User authenticated")`. Never interpolate values into the
  message string — it breaks structured search. Skip `.withMetadata()` when there's no extra context.
- **Use a module child logger** (`createLogger({ module })`) so every line is attributable. Context set via
  `createLogger`/`.withContext()` persists on every subsequent call; `.withMetadata()` applies once.
- **Log before returning an error** — include `errorCode`, `isRetryable`, and the operation/ids. Pass `Error`
  objects via `.withMetadata({ error })`; the configured `errorSerializer` expands them to a full stack trace.
- **Log identifiers, not values** — see *Sensitive Data* below.

## Log Levels

| Level   | When to Use                | Example                  |
| ------- | -------------------------- | ------------------------ |
| `fatal` | App crash, unrecoverable   | Database connection lost |
| `error` | Operation failed           | User creation failed     |
| `warn`  | Unexpected but recoverable | Rate limit approaching   |
| `info`  | Normal operations          | User logged in           |
| `debug` | Development details        | Request payload          |
| `trace` | Fine-grained debugging     | Function entry/exit      |

Configure with `LOG_LEVEL` per environment (`debug` in dev, `info` in prod). Don't log expected outcomes
(e.g. "not found" on a lookup) at `error` — reserve it for things that need investigation.

## Sensitive Data Protection

**Never log secrets, credentials, or PII.** Log an identifier or a derived signal instead of the value:
`email: maskEmail(email)` not `email`; `hasAuthHeader: !!req.headers.authorization` not the header.

| Category      | Fields to NEVER log                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| **Auth**      | password, token, apiKey, secret, refreshToken, sessionId, cookie, authorization header  |
| **PII**       | SSN, date of birth, full address, phone number (log last 4 digits max)                  |
| **Financial** | credit card number, bank account, CVV, routing number                                   |
| **Health**    | medical records, diagnoses, insurance IDs                                               |

Masking helpers and a Pino `redact` config for defence in depth are in
[references/patterns.md](./references/patterns.md).

## File Locations

| Purpose                   | Location                        |
| ------------------------- | -------------------------------- |
| Logger setup              | `lib/logger.ts`                 |
| Feature loggers           | Create in feature modules       |
| Log level config          | `data/env/server.ts`            |
| Request-ID / access logs  | `proxy.ts` (Next.js middleware) |

## Related Skills

- `firebase-firestore` — database logging patterns
- `server-actions` — action logging patterns
- `t3-env-validation` — `LOG_LEVEL` configuration
