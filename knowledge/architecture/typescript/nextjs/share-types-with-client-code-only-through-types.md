---
title: Share types with client code only through the feature's types/ folder
summary: DTOs, view, filter and closed-set types live in types/; persistence row types stay in server/db/schema.ts.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/server-and-client-components]
---

## Rule

Put every type that reaches a component or crosses from server to client in `features/{domain}/types/`: closed-set const objects, DTO and view types a service returns, filter and option types. Keep row and relation types inferred from the data model in `server/db/schema.ts`; a service maps rows to a `types/` DTO before returning them. `types/` imports nothing from `server/`; every layer may import `types/`.

## Why

A component typed with a row type imports the schema module, pulling the data layer toward the client and tying the UI to column names, so a database migration breaks components that never touch the database.

## Incorrect

```ts
import type { InvoiceRow } from "~/features/invoices/server/db/schema";

type InvoiceRowProps = { invoice: InvoiceRow }; // every column, incl. internal ones
```

## Correct

```ts
// features/invoices/types/invoice.ts
export type ClientInvoiceListItem = { id: string; number: string; total: number; status: InvoiceStatus };

import type { ClientInvoiceListItem } from "~/features/invoices/types";
type InvoiceRowProps = { invoice: ClientInvoiceListItem };
```

## Exceptions

A service may re-export the `types/` types it returns (`export type { ClientInvoiceListItem } from …`) so its callers have one import point; the type itself still lives in `types/`.
