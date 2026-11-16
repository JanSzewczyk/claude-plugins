---
title: Split env by side: data/env/server.ts for server code, data/env/client.ts for client code
summary: Server code imports ~/data/env/server, "use client" files ~/data/env/client; the client file maps each variable.
impact: high
applies: [typescript, nextjs, t3-env, zod]
sources: [https://env.t3.gg/docs/nextjs, https://nextjs.org/docs/app/guides/environment-variables]
---

## Rule

Declare server-only variables in `data/env/server.ts` (`server` schema, `experimental__runtimeEnv: process.env`) and public ones in `data/env/client.ts` (`client` schema, each variable mapped by name in `experimental__runtimeEnv`). Server Components, server actions and route handlers import `~/data/env/server`; `"use client"` files import only `~/data/env/client`.

## Why

One shared env file ships every server variable name to the browser, and a client component that reads a server variable from it throws at runtime. Next.js inlines a public variable only where `process.env.NEXT_PUBLIC_X` is written out, so the client file must map each one explicitly.

## Incorrect

```ts
// data/env.ts: one file for both sides
export const env = createEnv({
  server: { STRIPE_SECRET_KEY: z.string() },
  client: { NEXT_PUBLIC_GA_ID: z.string().optional() },
  experimental__runtimeEnv: { NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID },
});

// components/analytics.tsx ("use client")
import { env } from "~/data/env";
```

## Correct

```ts
// data/env/client.ts
export const env = createEnv({
  client: { NEXT_PUBLIC_GA_ID: z.string().optional() },
  experimental__runtimeEnv: { NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

// components/analytics.tsx ("use client")
import { env } from "~/data/env/client";
```
