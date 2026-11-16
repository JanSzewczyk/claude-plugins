---
title: Write every component as a Server Component unless it needs the browser
summary: No directive by default; a component becomes a Client Component only for state, effects, event handlers or browser APIs.
impact: high
applies: [typescript, react, nextjs]
sources: [https://react.dev/reference/rsc/server-components, https://nextjs.org/docs/app/getting-started/server-and-client-components]
---

## Rule

Write components as Server Components: no directive, `async` when they load data. Make a component a Client Component only when it uses state, effects, event handlers, browser APIs or a hook that does.

## Why

A component marked `'use client'` without needing it ships its code and every import to the browser and loses direct data access, so pages grow heavier and need extra client fetches for content that could have been rendered once on the server.

## Incorrect

```tsx
"use client";

export function InvoiceSummary({ invoice }: InvoiceSummaryProps) {
  return (
    <dl>
      <dt>Total</dt>
      <dd>{formatMoney(invoice.total)}</dd>
    </dl>
  );
}
```

## Correct

```tsx
export function InvoiceSummary({ invoice }: InvoiceSummaryProps) {
  return (
    <dl>
      <dt>Total</dt>
      <dd>{formatMoney(invoice.total)}</dd>
    </dl>
  );
}
```
