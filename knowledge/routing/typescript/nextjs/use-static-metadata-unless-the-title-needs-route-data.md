---
title: Export static metadata unless the title needs data from the route
summary: List and fixed pages export a metadata object; only detail pages under a [param] segment use generateMetadata.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/functions/generate-metadata]
---

## Rule

Export a `metadata` object from a page whose title is fixed, such as a list page. Write `generateMetadata` only when the title comes from the loaded resource, as on a detail page under a `[param]` segment.

## Why

A `generateMetadata` that returns a constant adds an async call per request and a second place to read for something that never changes, and a static object lets the title be resolved without running any code.

## Incorrect

```tsx
export async function generateMetadata(): Promise<Metadata> {
  return { title: "Invoices" };
}
```

## Correct

```tsx
export const metadata: Metadata = {
  title: "Invoices"
};
```
