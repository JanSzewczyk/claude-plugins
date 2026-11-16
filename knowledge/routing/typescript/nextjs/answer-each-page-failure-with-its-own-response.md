---
title: Throw an unexpected loadData failure to error.tsx; keep notFound() for missing or hidden
summary: In a page's loadData only a missing or hidden resource is a 404; an outage throws so the error boundary shows it.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/functions/not-found, https://nextjs.org/docs/app/api-reference/file-conventions/error]
---

## Rule

In a page's `loadData`, call `notFound()` only when the read reports the resource missing or hidden from this user. Throw every other failed read (wrapped with the service error as `cause`) so `error.tsx` renders it.

## Why

A page that answers every failed read with `notFound()` shows a database outage as a missing page: users see a 404, nothing reaches the error boundary or the error logs, and nobody investigates.

## Incorrect

```tsx
const [error, invoice] = await getInvoice(userId, invoiceId);
if (error) notFound(); // a database outage becomes a 404
```

## Correct

```tsx
const [error, invoice] = await getInvoice(userId, invoiceId);
if (error?.isNotFound || error?.isPermissionDenied) notFound();
if (error) throw new Error("Failed to load the invoice", { cause: error }); // to error.tsx
```
