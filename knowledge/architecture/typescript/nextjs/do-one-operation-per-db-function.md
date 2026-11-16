---
title: Do one read or one write per db function and compose them in the service
summary: queries.ts and mutations.ts hold single operations that never call each other; multi-step work is a service's job.
impact: medium
applies: [typescript, nextjs]
sources: [https://www.cosmicpython.com/book/chapter_04_service_layer.html]
---

## Rule

Make each function in `server/db/queries.ts` and `server/db/mutations.ts` (and each file in `server/api/`) one read or one write that calls no other function of its layer. Compose several steps in a service function.

## Why

A db function that calls other db functions hides a multi-step write inside the persistence layer, where it cannot join the service's transaction or guard chain, so a half-finished write is left behind when a later step fails.

## Incorrect

```ts
export async function createInvoiceWithLines({ invoice, lines }: CreateInvoiceInput) {
  const [error, created] = await insertInvoice({ invoice });
  if (error) return [error, null];
  return insertInvoiceLines({ invoiceId: created.id, lines });
}
```

## Correct

```ts
// invoice.service.ts — mutations.ts exports insertInvoice and insertInvoiceLines, one statement each,
// and the service runs them in one transaction (see the transaction rule)
return db.transaction(async (tx) => {
  const [invoiceError, created] = await insertInvoice({ invoice, tx });
  if (invoiceError) throw invoiceError;
  const [linesError, saved] = await insertInvoiceLines({ invoiceId: created.id, lines, tx });
  if (linesError) throw linesError;
  return [null, saved];
});
```
