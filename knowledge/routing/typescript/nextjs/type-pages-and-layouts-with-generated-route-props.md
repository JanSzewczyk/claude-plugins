---
title: Type pages and layouts with the generated PageProps and LayoutProps helpers
summary: Route-generated helpers keep params, searchParams and slots in step with the folders; no hand-written prop types.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/page, https://nextjs.org/docs/app/api-reference/file-conventions/layout, https://nextjs.org/docs/app/api-reference/cli/next]
---

## Rule

Type a page as `PageProps<"/route/[param]">` and a layout as `LayoutProps<"/route">`, with the route string matching its folder. Destructure `children` in a layout, and `params` only when the route has a dynamic segment.

## Why

Hand-written prop types drift from the folders: renaming `[id]` to `[invoiceId]` still compiles, and `params.id` is `undefined` at runtime. The generated helpers fail the type check instead.

## Incorrect

```tsx
type Props = { params: Promise<{ id: string }> };

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
}
```

## Correct

```tsx
export default async function InvoicePage({ params }: PageProps<"/invoices/[invoiceId]">) {
  const { invoiceId } = await params;
}
```

## Exceptions

On Next.js before 15.5, which does not generate the helpers, type the props by hand: `{ params: Promise<{ id: string }> }`. The helpers come from `next dev`, `next build` or `next typegen`; run `next typegen` before a standalone `tsc` in CI.
