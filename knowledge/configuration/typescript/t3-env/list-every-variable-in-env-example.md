---
title: List every schema variable in a committed .env.example with a placeholder value
summary: Adding a variable to data/env/*.ts adds it to .env.example too; real values live in the git-ignored .env.local.
impact: medium
applies: [typescript, nextjs, t3-env]
sources: [https://nextjs.org/docs/app/guides/environment-variables, https://12factor.net/config]
---

## Rule

Every variable declared in `data/env/server.ts` or `data/env/client.ts` has a line in the committed `.env.example`, with a placeholder or safe local value and a comment where the format is not obvious. Real values go in `.env.local`, which is git-ignored.

## Why

A variable that exists only in the schema stops the next developer's `npm run dev` with a validation error and no hint of the value it expects; a real key pasted into `.env.example` is committed to history.

## Incorrect

```bash
# data/env/server.ts declares LOG_LEVEL, FORMLENS_API_URL and STRIPE_SECRET_KEY
# .env.example
LOG_LEVEL=debug
FORMLENS_API_URL=http://localhost:8000
```

## Correct

```bash
# .env.example
# LOG_LEVEL: fatal, error, warn, info, debug or trace
LOG_LEVEL=debug
FORMLENS_API_URL=http://localhost:8000
# Test-mode key from the Stripe dashboard
STRIPE_SECRET_KEY=sk_test_xxx
```
