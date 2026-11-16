---
title: Mark server modules with import "server-only" and never import server/ from client code
summary: Services, db, api and permissions modules fail the build if a "use client" file reaches them, directly or not.
impact: critical
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/server-and-client-components, https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Start every module in `features/{domain}/server/` that is not a `"use server"` action file (services, db, api, `permissions.ts`) with `import "server-only"`. Never import anything from `server/` in a `"use client"` file or in a module a client file imports; client code takes types from `types/` and actions as props.

## Why

A server module reached from client code ships its queries, internal rules and whatever it reads to the browser bundle, and without the `server-only` marker the build succeeds, so the leak is found only by someone reading the shipped JavaScript.

## Incorrect

```ts
"use client";
import { InvoiceStatus } from "~/features/invoices/server/db/schema";
import { formatTotal } from "~/features/invoices/server/services/invoice.service";
```

## Correct

```ts
// features/invoices/server/services/invoice.service.ts
import "server-only";

// features/invoices/components/invoice-row.tsx ("use client")
import { InvoiceStatus, type ClientInvoiceListItem } from "~/features/invoices/types";
```
