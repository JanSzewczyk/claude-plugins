---
title: Put each domain's code in one features/{domain} folder, layered inside
summary: features/{domain}/ holds components, schemas, types, server and test builders; app/ routes only import from it.
impact: high
applies: [typescript, nextjs]
implements: architecture/principles/split-by-domain-before-by-layer
sources: [https://nextjs.org/docs/app/getting-started/project-structure]
---

## Rule

Give each business domain a `features/{domain}/` folder with `components/`, `schemas/`, `types/`, `server/` (`actions/`, `services/`, `db/`, `permissions.ts`) and `test/builders/`. Add `constants/`, `utils/`, `context/`, `hooks/` and `server/api/` only when the feature needs them. Keep `app/` to routes that import from features.

## Why

Grouping code by kind (`app/actions/`, `lib/types/`, `components/`) spreads one feature over the whole tree, so every change edits five folders and nobody can tell which files a feature owns or delete it cleanly.

## Incorrect

```text
app/invoices/page.tsx
app/invoices/invoice-table.tsx
lib/actions/invoices.ts
lib/db/invoices.ts
types/invoice.ts
```

## Correct

```text
app/invoices/page.tsx                  imports from features/invoices
features/invoices/components/invoice-table.tsx
features/invoices/server/actions/archive-invoice.action.ts
features/invoices/server/db/queries.ts
features/invoices/types/invoice.ts
```
