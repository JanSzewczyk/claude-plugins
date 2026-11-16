---
title: Keep page.tsx and layout.tsx Server Components, never "use client"
summary: Routes stay on the server so they can guard and load data; interactivity moves into a client leaf they render.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/server-and-client-components]
---

## Rule

Write every `page.tsx` and `layout.tsx` as a Server Component: `async` when it awaits `loadData` or `params`, never marked `"use client"`. Move state and event handlers into a client component the route renders.

## Why

A page marked `"use client"` cannot run its guard or its reads on the server, so data moves into client-side fetches behind a public endpoint and the whole subtree ships to the browser.

## Incorrect

```tsx
"use client";

export default function InvoicesPage() {
  const [filter, setFilter] = React.useState("all");
  return <InvoiceList filter={filter} onFilterChange={setFilter} />;
}
```

## Correct

```tsx
export default async function InvoicesPage() {
  const { invoices } = await loadData();
  return <FilterableInvoiceList invoices={invoices} />; // "use client" lives here
}
```
