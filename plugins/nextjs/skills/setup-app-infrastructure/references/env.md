# Env validation (T3 Env)

Rules: `nextjs-rules` (env notes). Paths are relative to the source root (`src/` when `~/*` maps to `./src/*`).

```bash
npm install @t3-oss/env-nextjs zod
```

## `data/env/server.ts`

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    // Flag: enum plus transform, never z.coerce.boolean()
    ANALYZE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    // Number: z.coerce.number() with bounds
    // RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    // Secret: STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  },
  experimental__runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

## `data/env/client.ts`

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  },
  // Each client variable is mapped by name: Next.js inlines it only where process.env.NEXT_PUBLIC_X is written out
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

On Zod 3 use `z.string().url()`. Import `env` from `~/data/env/server` in server code and from
`~/data/env/client` in `"use client"` files.

## Path alias

The templates import with `~/`. In `tsconfig.json`:

```json
{ "compilerOptions": { "paths": { "~/*": ["./src/*"] } } }
```

Without a `src/` folder map it to `["./*"]`. Keep an alias the project already has when `~/` would duplicate it.

## Validate at build and dev start

```ts
// next.config.ts (relative paths: the alias does not apply here)
import "./src/data/env/server";
import "./src/data/env/client";
```

## Add a variable

1. Schema: server variable in `data/env/server.ts`; public one in `data/env/client.ts` with the `NEXT_PUBLIC_` prefix, in the `client` schema and in `experimental__runtimeEnv`.
2. Add a line with a placeholder to `.env.example`; put the real value in `.env.local` (git-ignored).
3. Add it to the setup file below when most tests need it.
4. Add it to the CI workflow and Dockerfile build args only where the build needs it (public variables always).
5. Read it as `env.NAME` everywhere.

## `.env.example`

```bash
# LOG_LEVEL: fatal, error, warn, info, debug or trace
LOG_LEVEL=debug
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Tests (Vitest)

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { setupFiles: ["./tests/unit/vitest.setup.ts"] },
});
```

```ts
// tests/unit/vitest.setup.ts
import { afterEach, vi } from "vitest";

function stubBaseEnv() {
  vi.stubEnv("SKIP_ENV_VALIDATION", "true");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("LOG_LEVEL", "error");
  // vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mock");
}

stubBaseEnv();
// vi.unstubAllEnvs() would drop the base values too
afterEach(() => {
  vi.unstubAllEnvs();
  stubBaseEnv();
});
```

With validation skipped `env` holds raw strings: a test needing a converted flag or number mocks
`~/data/env/server` with `vi.mock`. Playwright: set `webServer.env` in `playwright.config.ts`
(`NODE_ENV: "test"`, `LOG_LEVEL: "error"`, the real variables), without `SKIP_ENV_VALIDATION`.

## CI and Docker

```yaml
# .github/workflows/ci.yml: lint, type-check and unit tests have no real env
jobs:
  check:
    env:
      SKIP_ENV_VALIDATION: true
    steps:
      - run: npm ci
      - run: npm run lint && npm run type-check && npm test
```

A CI build that ships gets the real variables from secrets and no `SKIP_ENV_VALIDATION`.

```dockerfile
FROM deps AS build
ARG NEXT_PUBLIC_APP_URL
ENV SKIP_ENV_VALIDATION=true NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
```
