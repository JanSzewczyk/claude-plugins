---
title: Open transactions in the service and pass the client into db functions
summary: Db functions take one object argument with an optional client; the service owns the transaction and the rollback.
impact: high
applies: [typescript, nextjs]
sources: [https://www.cosmicpython.com/book/chapter_06_uow.html]
---

## Rule

Give every db function a single object argument with an optional `tx` client that only picks the connection, so it runs alone or inside a transaction and always returns `[error, data]`. Open the transaction in the service; inside it, throw the error of any failed step to roll back, and outside it catch and return `[error, null]`.

## Why

A db function that opens its own transaction cannot join a larger one, so a two-step write commits the first step when the second fails, and a service that ignores a step's error tuple inside the transaction commits a partial write.

## Incorrect

```ts
export async function insertInvoiceLines({ invoiceId, lines }: InsertLinesInput) {
  return db.transaction(async function insertLines(tx) { /* own transaction */ });
}
```

## Correct

```ts
export async function insertInvoiceLines({ invoiceId, lines, tx = db }: InsertLinesInput) { /* returns a tuple */ }

// invoice.service.ts
try {
  const invoice = await db.transaction(async function createInvoice(tx) {
    const [invoiceError, created] = await insertInvoice({ invoice: input, tx });
    if (invoiceError) throw invoiceError;
    const [linesError] = await insertInvoiceLines({ invoiceId: created.id, lines, tx });
    if (linesError) throw linesError;
    return created;
  });
  return [null, invoice];
} catch (error) {
  return [categorizeServiceError(error, "Invoice"), null];
}
```
