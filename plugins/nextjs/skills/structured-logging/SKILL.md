---
name: structured-logging
description: Structured logging patterns with Pino for Next.js applications. Covers log levels, context enrichment, child loggers, and production best practices.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
---

# Structured Logging Skill

Structured logging with **Pino** for Next.js. This file holds the rules; setup and worked code are in
the references.

> - [references/log-levels.md](./references/log-levels.md) - When to use each level
> - [references/patterns.md](./references/patterns.md) - Common logging patterns (DB ops, server actions, error logging)
> - [references/examples.md](./references/examples.md) - Practical examples and the full `lib/logger.ts` setup

## Setup

The logger is configured once in `lib/logger.ts` (Pino + `pino-pretty` in dev, JSON in prod) and
exposes `createLogger(context)` for per-module child loggers. Full config in
[references/examples.md](./references/examples.md).

```typescript
import logger, { createLogger } from "~/lib/logger";

logger.info({ port: 3000 }, "Server started");

const log = createLogger({ module: "user-service" }); // every line carries { module: "user-service" }
log.info({ userId: "123" }, "User created");
```

## Core Rules

- **Context object first, message second** — `logger.info({ userId, action }, "User authenticated")`.
  Never interpolate values into the message string (`` `User ${id}...` ``) — it breaks structured search.
- **Use a module child logger** (`createLogger({ module })`) so every line is attributable.
- **Log before returning an error** — include `errorCode`, `isRetryable`, and the operation/ids.
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

Configure with `LOG_LEVEL` per environment (`debug` in dev, `info` in prod). DB-operation and
server-action logging patterns are in [references/patterns.md](./references/patterns.md).

## Sensitive Data Protection

**Never log secrets, credentials, or PII.** Log an identifier or a derived signal instead of the value:

- `email: maskEmail(email)` not `email`; `cardLast4: card.number.slice(-4)` not the card number.
- `hasAuthHeader: !!req.headers.authorization` not the header; `bodySize: JSON.stringify(body).length`
  not the body.

Never log these:

| Category      | Fields to NEVER log                                                                    |
| ------------- | -------------------------------------------------------------------------------------- |
| **Auth**      | password, token, apiKey, secret, refreshToken, sessionId, cookie, authorization header |
| **PII**       | SSN, date of birth, full address, phone number (log last 4 digits max)                 |
| **Financial** | credit card number, bank account, CVV, routing number                                  |
| **Health**    | medical records, diagnoses, insurance IDs                                              |

For defence in depth, add a Pino `redact` config to strip these automatically (masking helpers and the
full `redact` paths are in [references/patterns.md](./references/patterns.md)).

## File Locations

| Purpose          | Location                  |
| ---------------- | ------------------------- |
| Logger setup     | `lib/logger.ts`           |
| Feature loggers  | Create in feature modules |
| Log level config | `data/env/server.ts`      |

## Related Skills

- `firebase-firestore` — database logging patterns
- `server-actions` — action logging patterns
- `t3-env-validation` — `LOG_LEVEL` configuration
