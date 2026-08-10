# Logging Mechanism Setup

Canonical reference for how the logger itself is built and wired up. Other skills (`error-handling`,
`server-actions`, etc.) link here instead of repeating the config — if you're asked to add or update the
logging mechanism, this is the file to change.

## Stack

| Layer                 | Package                               | Role                                                              |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| Fluent API             | `loglayer`                             | `.withMetadata()`, `.withContext()`, `.child()` — the only surface app code calls |
| Console/JSON transport | `@loglayer/transport-pino` + `pino`    | Actual writer: pretty in dev, JSON in prod                        |
| Dev transport          | `@loglayer/transport-log-file-rotation` | Rotating file log under `tmp/`, dev only                          |
| Pretty-printing        | `pino-pretty`                          | Dev-only Pino transport target                                    |
| Error serialization    | `serialize-error`                      | Expands `Error`/non-standard throwables into full stack traces    |

LogLayer is transport-agnostic: it's the API application code depends on, while Pino (or any other backend)
does the actual writing. This keeps call sites (`logger.withMetadata(...).info(...)`) stable even if the
underlying transport changes later.

## Install

```bash
npm install loglayer pino @loglayer/transport-pino serialize-error
npm install -D pino-pretty
# Optional — only if you want rotating log files in dev
npm install @loglayer/transport-log-file-rotation
```

## `lib/logger.ts`

```typescript
import path from "node:path";
import { LogFileRotationTransport } from "@loglayer/transport-log-file-rotation";
import { PinoTransport } from "@loglayer/transport-pino";
import { LogLayer, type LogLayerTransport } from "loglayer";
import pino from "pino";
import { serializeError } from "serialize-error";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const IS_DEV = process.env.NODE_ENV === "development";

const LogDir = path.join(process.cwd(), "tmp");
const LogFilePath = path.join(LogDir, "app.log");
const AuditFilePath = path.join(LogDir, "audit.json");

const pinoLogger = pino({
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: IS_DEV
    ? {
        options: { colorize: true, ignore: "pid,hostname", translateTime: "SYS:standard" },
        target: "pino-pretty",
      }
    : undefined,
});

const transports: Array<LogLayerTransport> = [new PinoTransport({ logger: pinoLogger })];

if (IS_DEV) {
  transports.push(
    new LogFileRotationTransport({
      auditFile: AuditFilePath,
      filename: LogFilePath,
    }),
  );
}

const logger = new LogLayer({
  errorSerializer: serializeError,
  transport: transports,
});

export function createLogger(context: Record<string, unknown>) {
  return logger.child().withContext(context);
}

export default logger;
```

## Why this shape

- **`errorSerializer: serializeError`** on the root `LogLayer` instance, not per call site — every
  `.withMetadata({ error })` anywhere in the app gets a full stack trace for free, including for thrown
  values that aren't real `Error` instances.
- **File rotation is dev-only** — production log shipping is handled by the platform (stdout → log
  aggregator), so `LogFileRotationTransport` is gated behind `IS_DEV` to avoid writing to disk in prod.
- **`createLogger` returns `logger.child().withContext(context)`**, not `logger.withContext(context)`
  directly — `.child()` forks a new logger instance so context set by one module logger never leaks into
  another's.

## Environment

`LOG_LEVEL` is read directly from `process.env` in `lib/logger.ts`; validate/type it via
[t3-env-validation](../../t3-env-validation/SKILL.md) if the project uses `@t3-oss/env-nextjs`.

```bash
# .env.local
LOG_LEVEL=debug
```

## Request-ID wiring

Request-scoped logging (method, URL, request ID, duration) is attached once in `proxy.ts` (Next.js
middleware) rather than per-route — see
[patterns.md § Request Context](./patterns.md#request-context) for the full snippet.

## Calling convention (for reference from other skills)

```typescript
import logger, { createLogger } from "~/lib/logger";

// One-off log, no extra context
logger.info("Server started");

// One-off log with metadata
logger.withMetadata({ userId, action }).info("User authenticated");

// Module-scoped logger — context persists on every call
const log = createLogger({ module: "budget-service" });
log.withMetadata({ budgetId }).info("Budget created");

// Error — pass the raw Error under `error`, the configured errorSerializer expands it
try {
  await doWork();
} catch (error) {
  log.withMetadata({ error, errorCode: "WORK_FAILED" }).error("Work failed");
}
```
