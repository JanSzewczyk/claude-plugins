---
title: Return a fallback title from generateMetadata instead of throwing or redirecting
summary: loadData owns the guard and every failure response; generateMetadata only reads, through the same cached call.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/functions/generate-metadata, https://nextjs.org/docs/app/getting-started/metadata-and-og-images, https://react.dev/reference/react/cache]
---

## Rule

In `generateMetadata`, call the same cached read as the page's `loadData`, with the same arguments, ignore its error and return a fallback title. Never call `notFound()`, `redirect()` or `unauthorized()` there, and never throw.

## Why

With streaming metadata the page shell is already sent with status 200 when an interrupt from `generateMetadata` arrives, so the failure response comes late and differs from the one `loadData` chose; a read with other arguments than the page's also skips the page's scoping and can put a hidden resource's name in the tab title.

## Incorrect

```tsx
export async function generateMetadata({ params }: PageProps<"/invoices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [error, invoice] = await getInvoiceById(id); // unscoped, other cache entry
  if (error) notFound();
  return { title: invoice.number };
}
```

## Correct

```tsx
export async function generateMetadata({ params }: PageProps<"/invoices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { userId } = await auth();
  const [, invoice] = await getInvoice(userId, id); // same call as loadData
  return { title: invoice?.number ?? "Invoice" };
}
```
