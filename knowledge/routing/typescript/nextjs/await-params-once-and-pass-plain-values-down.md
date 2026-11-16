---
title: Await params and searchParams once at the top and pass plain values down
summary: The page or layout awaits the route promises itself; loadData and components receive strings, never a promise.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/page, https://nextjs.org/docs/app/guides/upgrading/version-16]
---

## Rule

Await `params` (and `searchParams` where the page reads it) once, at the top of the page or layout, and pass the resulting plain values to `loadData` and to components.

## Why

Since Next.js 16 `params` and `searchParams` are only promises; code that reads them synchronously, or passes the promise along to be awaited in several places, breaks on upgrade and hides which values a function really needs.

## Incorrect

```tsx
export default async function InvoicePage(props: PageProps<"/invoices/[id]">) {
  const { invoice } = await loadData(props.params);
  return <InvoiceView invoice={invoice} params={props.params} />;
}
```

## Correct

```tsx
export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const { invoice } = await loadData(id);
  return <InvoiceView invoice={invoice} />;
}
```

## Exceptions

A page that validates search params hands the awaited object to `loadData` whole, since `loadData` parses it (see validate-search-params-in-load-data).
