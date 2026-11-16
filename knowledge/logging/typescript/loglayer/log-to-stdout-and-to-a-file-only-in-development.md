---
title: Log to stdout through Pino everywhere and add the tmp/app.log file only in development
summary: PinoTransport writes to stdout everywhere; LogFileRotationTransport is added only when NODE_ENV is development.
impact: medium
applies: [typescript, loglayer, pino]
implements: logging/principles/write-logs-to-a-stream-not-a-file
sources: [https://loglayer.dev/transports/pino, https://loglayer.dev/transports/log-file-rotation, https://12factor.net/logs]
---

## Rule

Give the root `LogLayer` a `PinoTransport` that writes to stdout in every environment (JSON in production, `pino-pretty` in development), and add a `LogFileRotationTransport` writing `tmp/app.log` only when `env.NODE_ENV === "development"`. The file exists so a dev session can be reviewed afterwards, for example by the `devlogs` skill.

## Why

A log file written in production fills the container's disk and disappears with it, while the platform collector, which reads stdout, gets nothing extra from it.

## Incorrect

```ts
const logger = new LogLayer({
  errorSerializer: serializeError,
  transport: [
    new PinoTransport({ logger: pinoLogger }),
    new LogFileRotationTransport({ filename: "tmp/app.log", auditFile: "tmp/audit.json" }),
  ],
});
```

## Correct

```ts
const transports: Array<LogLayerTransport> = [new PinoTransport({ logger: pinoLogger })];

if (env.NODE_ENV === "development") {
  transports.push(new LogFileRotationTransport({ filename: "tmp/app.log", auditFile: "tmp/audit.json" }));
}

const logger = new LogLayer({ errorSerializer: serializeError, transport: transports });
```
