---
title: Never put a secret in a NEXT_PUBLIC_ variable or in the client schema
summary: NEXT_PUBLIC_ values are inlined into the browser bundle; only publishable keys, public URLs and analytics ids go there.
impact: critical
applies: [typescript, nextjs, t3-env]
sources: [https://nextjs.org/docs/app/guides/environment-variables, https://env.t3.gg/docs/nextjs]
---

## Rule

Declare a `NEXT_PUBLIC_` variable only in the `client` schema of `data/env/client.ts`, and only for a value meant to be public: a publishable key, a public URL, an analytics id. A secret key, token, private key or connection string goes in the `server` schema without the prefix and is read only in server code.

## Why

Next.js inlines every `NEXT_PUBLIC_` value into the JavaScript sent to the browser at build time, so a secret given the prefix is published to every visitor and must be rotated.

## Incorrect

```ts
// data/env/client.ts
client: {
  NEXT_PUBLIC_STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
},
```

## Correct

```ts
// data/env/server.ts
server: { STRIPE_SECRET_KEY: z.string().startsWith("sk_") },

// data/env/client.ts
client: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_") },
```
