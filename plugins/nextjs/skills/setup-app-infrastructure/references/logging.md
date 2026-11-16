# Logging (LogLayer + Pino)

Rules: `nextjs-rules` (logging notes). Needs the env module (`LOG_LEVEL`, `NODE_ENV` from `~/data/env/server`).
Paths are relative to the source root.

| Package | Role |
| --- | --- |
| `loglayer` | The fluent API app code calls: `withMetadata`, `withError`, `withContext`, `child` |
| `pino`, `@loglayer/transport-pino` | The writer: JSON to stdout, `pino-pretty` in development |
| `pino-pretty` | Development output |
| `@loglayer/transport-log-file-rotation` | `tmp/app.log` in development only |
| `serialize-error` | The root `errorSerializer` that keeps stack traces |

```bash
npm install loglayer pino @loglayer/transport-pino @loglayer/transport-log-file-rotation serialize-error
npm install -D pino-pretty
```

Add `tmp/` to `.gitignore`.

## `LOG_LEVEL`

Declare it in `data/env/server.ts` (see `references/env.md`):
`LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")`.
Values: `debug` in `.env.local`, `info` in production, `error` in tests.

## `lib/logger.ts`

```ts
import path from "node:path";
import { LogFileRotationTransport } from "@loglayer/transport-log-file-rotation";
import { PinoTransport } from "@loglayer/transport-pino";
import { LogLayer, type LogLayerTransport } from "loglayer";
import pino from "pino";
import { serializeError } from "serialize-error";

import { env } from "~/data/env/server";

const isDev = env.NODE_ENV === "development";

const pinoLogger = pino({
  // Raw env under SKIP_ENV_VALIDATION has no schema default; Pino throws on an undefined level
  level: env.LOG_LEVEL ?? "info",
  formatters: { level: (label) => ({ level: label.toUpperCase() }) },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password", "*.password", "token", "*.token", "apiKey", "*.apiKey", "secret", "*.secret",
      "authorization", "*.authorization", "req.headers.authorization", "req.headers.cookie",
    ],
    remove: true,
  },
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname", translateTime: "SYS:standard" } }
    : undefined,
});

const transports: Array<LogLayerTransport> = [new PinoTransport({ logger: pinoLogger })];

if (isDev) {
  transports.push(
    new LogFileRotationTransport({
      filename: path.join(process.cwd(), "tmp", "app.log"),
      auditFile: path.join(process.cwd(), "tmp", "audit.json"),
    }),
  );
}

const logger = new LogLayer({ errorSerializer: serializeError, transport: transports });

/** One logger per file: every line carries `module`. child() keeps one module's context out of another's. */
export function createLogger(context: { module: string } & Record<string, unknown>) {
  return logger.child().withContext(context);
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export function maskId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : "***";
}
```

Call sites:

```ts
const log = createLogger({ module: "budgets-service" });

log.withMetadata({ budgetId }).info("Budget created");
log.withError(error).withMetadata({ budgetId, errorCode: serviceError.code }).error("Budget creation failed");
log.withMetadata({ email: maskEmail(email) }).info("Invite sent");
```

## `proxy.ts`

Next.js 16 names the file `proxy.ts` and exports `proxy`; on 15 and earlier it is `middleware.ts`
exporting `middleware`, and its Edge runtime cannot load Pino, so create the id there and log from route
handlers instead. If the project already has a proxy or middleware, merge the id into it.

```ts
import { type NextRequest, NextResponse } from "next/server";

import { createLogger } from "~/lib/logger";

export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);

  createLogger({ module: "proxy", requestId, method: request.method, path: request.nextUrl.pathname }).info(
    "Incoming request",
  );

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

Server actions and route handlers read the id; they never mint one:

```ts
import { headers } from "next/headers";

const requestId = (await headers()).get("x-request-id") ?? undefined;
const log = createLogger({ module: "budgets-actions", requestId });
```

## Verify

Start the dev server, request a page, and check that stdout shows the `Incoming request` line with a
`requestId` and `tmp/app.log` exists. Search the project for `console.` and `process.env.` outside the env
files; report hits, do not rewrite them unasked.
