---
title: Import feature layers in one direction: action, service, permissions, db or api
summary: Each server layer imports only the layers below it; types/ is importable everywhere and imports nothing.
impact: high
applies: [typescript, nextjs]
implements: architecture/principles/point-imports-toward-the-domain
sources: [https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Let actions import services, services import `permissions.ts`, `db/` and `api/`, and nothing import upward. Zod schemas from `schemas/` are imported by actions and services; `types/` is importable by every layer and imports no layer.

## Why

A db function or permission check that imports a service or an action creates an import cycle and drags request handling (session, revalidation) into persistence code, so it can no longer run from another service or a script.

## Incorrect

```ts
// features/invoices/server/db/mutations.ts
import { getCurrentUserId } from "../actions/session"; // db reaches up to the action layer

export async function archiveInvoice({ invoiceId }: { invoiceId: string }) { /* … */ }
```

## Correct

```ts
// features/invoices/server/db/mutations.ts — the caller passes everything in
export async function archiveInvoice({ invoiceId, archivedBy }: ArchiveInvoiceInput) { /* … */ }
```
