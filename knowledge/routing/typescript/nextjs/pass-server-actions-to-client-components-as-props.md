---
title: Wire server actions into client components from the page, as props
summary: The page or layout imports the action and passes it down; a client component never imports from server/actions.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/updating-data, https://react.dev/reference/rsc/use-server]
---

## Rule

Import a server action in the page or layout (or a Server Component under it) and pass it to the client component as a prop named `on…Action`. A client component types the prop and never imports the action module itself.

## Why

A client component that imports its action reaches into `server/`, which no client file may do, and is tied to one action: a story or test cannot hand it a fake, and the page cannot reuse it with another action.

## Incorrect

```tsx
"use client";
import { archiveInvoiceAction } from "~/features/invoices/server/actions/archive-invoice.action";

export function InvoiceMenu({ invoiceId }: InvoiceMenuProps) {
  return <button onClick={() => archiveInvoiceAction(invoiceId)}>Archive</button>;
}
```

## Correct

```tsx
// page.tsx
<InvoiceMenu invoiceId={invoice.id} onArchiveAction={archiveInvoiceAction} />

// invoice-menu.tsx ("use client")
type InvoiceMenuProps = { invoiceId: string; onArchiveAction(id: string): ActionResponse<null> };
```
