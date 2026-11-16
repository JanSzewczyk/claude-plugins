---
title: Compose a page from feature components, with no PageContent wrapper
summary: Page JSX only arranges components from features/{domain}/components; no business logic, no route-local components.
impact: medium
applies: [typescript, nextjs]
implements: architecture/principles/keep-handlers-thin
sources: [https://nextjs.org/docs/app/getting-started/project-structure]
---

## Rule

Let a page await its params, call `loadData` and arrange components imported from `~/features/{domain}/components`. Put no business logic in its JSX, no `*PageContent` wrapper around it, and no new component in the route folder.

## Why

A page that computes totals or filters in its JSX hides a rule where no other page or test can reach it, and a `PageContent` wrapper only moves the same JSX one file away while the route folder fills with components nothing else can import.

## Incorrect

```tsx
export default async function InvoicesPage() {
  const { invoices } = await loadData();
  return <InvoicesPageContent invoices={invoices.filter((invoice) => invoice.status !== "VOID")} />;
}
```

## Correct

```tsx
export default async function InvoicesPage() {
  const { invoices } = await loadData(); // the service already excludes void invoices
  return (
    <PageShell title="Invoices">
      <InvoiceSummary invoices={invoices} />
      <InvoiceTable invoices={invoices} />
    </PageShell>
  );
}
```
