---
title: Configure Pino redact for sensitive keys as defence in depth
summary: Pino redact paths for password, token, apiKey, secret, authorization and cookies catch what a call site forgets.
impact: high
applies: [typescript, loglayer, pino]
sources: [https://getpino.io/#/docs/redaction, https://loglayer.dev/transports/pino]
---

## Rule

Give the Pino instance in `lib/logger.ts` a `redact` config with `remove: true` covering `password`, `token`, `apiKey`, `secret` and `authorization` at the top level and one level down (`*.token`), plus `req.headers.authorization` and `req.headers.cookie`. It backs up the rule against logging secrets; it does not replace it.

## Why

Without redaction, one call that logs a whole object (a request, a provider response) writes every token in it to the log, and nothing stops it until someone reads the log.

## Incorrect

```ts
const pinoLogger = pino({ level: env.LOG_LEVEL });
```

## Correct

```ts
const pinoLogger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["password", "*.password", "token", "*.token", "apiKey", "*.apiKey", "secret", "*.secret",
      "authorization", "*.authorization", "req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
});
```

## Exceptions

Redaction matches key paths, not values: a secret under an unlisted key, nested deeper than one level, or inside a message still leaks.
