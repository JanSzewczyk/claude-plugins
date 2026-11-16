---
title: Set SKIP_ENV_VALIDATION only for lint, tests and Docker image builds
summary: Skipped validation returns raw process.env with no defaults or transforms; never set it where the app runs.
impact: high
applies: [typescript, nextjs, t3-env]
sources: [https://env.t3.gg/docs/nextjs, https://env.t3.gg/docs/customization, https://github.com/t3-oss/t3-env/blob/main/packages/core/src/index.ts]
---

## Rule

Wire `skipValidation: !!process.env.SKIP_ENV_VALIDATION` into both env files and set the variable only where the real environment is absent on purpose: lint and type-check, unit tests, and the build stage of a Docker image whose variables arrive when the container starts. Never set it in a running deployment or in a CI build that ships.

## Why

With validation skipped, `createEnv` returns the raw environment: a missing variable is `undefined`, no default applies and no transform runs, so `ANALYZE="false"` stays a truthy string and the app runs on wrong values instead of refusing to start.

## Incorrect

```dockerfile
FROM node:22-alpine AS runner
ENV NODE_ENV=production SKIP_ENV_VALIDATION=true
CMD ["node", "server.js"]
```

## Correct

```dockerfile
FROM deps AS build
# The server environment is read when the container starts, not at build.
ENV SKIP_ENV_VALIDATION=true
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

## Exceptions

Skipping at the image build suits server variables only: Next.js inlines `NEXT_PUBLIC_` values during `next build`, so public variables must be present then (for example as build arguments), not first set when the container starts.
