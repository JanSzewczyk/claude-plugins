---
title: Parse and validate search params in loadData, never in components
summary: loadData turns raw query strings into typed, defaulted values; components only receive the parsed result.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/page]
---

## Rule

Pass the awaited `searchParams` to `loadData`, parse it there with the feature's schema (defaults for missing values, a fallback for invalid ones), and hand components the typed result. No component reads raw search params.

## Why

Search params are user input: `?page=abc` or `?status[]=x` reaches every component that reads them raw, each one coerces it differently, and an invalid value turns into a crash or a query with `NaN`.

## Incorrect

```tsx
export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const { page } = await searchParams;
  return <InvoiceList page={Number(page)} />;
}
```

## Correct

```tsx
async function loadData(rawSearchParams: Record<string, string | Array<string> | undefined>) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) unauthorized();
  const { page, status } = invoiceListParamsSchema.parse(rawSearchParams); // defaults + catch
  const [error, invoices] = await listInvoices(userId, status, page);
  if (error) throw new Error("Failed to list invoices", { cause: error });
  return { invoices, page, status };
}
```
