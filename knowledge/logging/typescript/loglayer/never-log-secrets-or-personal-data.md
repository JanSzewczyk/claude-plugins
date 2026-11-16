---
title: Never log a secret or personal data; log an id, a masked value or a derived flag
summary: No passwords, tokens, keys, cookies or PII in a log call; log userId, maskEmail(email) or hasAuthHeader instead.
impact: critical
applies: [typescript, loglayer]
sources: [https://loglayer.dev/logging-api/metadata, https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html]
---

## Rule

Never pass a secret (password, token, API key, session id, cookie, `Authorization` header) or personal data (email, phone number, address, date of birth, card or bank number, health data) to a log call, nor a whole object that may contain one, such as a request, its headers or a provider response. Log the identifier (`userId`), a masked form (`maskEmail(email)`) or a derived signal (`hasAuthHeader: true`).

## Why

A secret written to a log is copied into every log store, backup and aggregator that receives it and must be treated as leaked; personal data there breaks data-protection duties and outlives deletion requests.

## Incorrect

```ts
log.withMetadata({ email, password, headers: request.headers }).info("Sign-in attempt");
```

## Correct

```ts
log
  .withMetadata({ email: maskEmail(email), hasAuthHeader: request.headers.has("authorization") })
  .info("Sign-in attempt");
```
