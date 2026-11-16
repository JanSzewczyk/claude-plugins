---
title: Import feature code from its sub-path, never from a feature-root barrel
summary: No features/{domain}/index.ts and no server/index.ts; only components/, types/ and server/db/ have an index.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/server-and-client-components]
---

## Rule

Import from the folder or file that owns the code: `~/features/{domain}/components`, `~/features/{domain}/types`, `~/features/{domain}/server/services/{domain}.service`. Write no `index.ts` at the feature root or in `server/`. The only barrels are `components/index.tsx` (components only), `types/index.ts` (every type file) and `server/db/index.ts` (queries and mutations, never `schema.ts`).

## Why

A barrel that re-exports server and client code together drags the service module into every client component that imports a badge from it, which fails the build behind `server-only` or ships server code without it, and invites import cycles.

## Incorrect

```ts
// features/invoices/index.ts
export * from "./components";
export * from "./server/services/invoice.service";

import { InvoiceBadge } from "~/features/invoices";
```

## Correct

```ts
import { InvoiceBadge } from "~/features/invoices/components";
import { getInvoice } from "~/features/invoices/server/services/invoice.service";
```
