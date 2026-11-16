---
title: Render chrome inline in page.tsx when it depends on the page's own data
summary: Skip layout.tsx for a lone route or chrome built from the page's resource; the page renders header and footer itself.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/layout]
---

## Rule

Skip `layout.tsx` and render the header and footer inside `page.tsx` when the group has a single route, when the chrome is built from the resource the page loads, or when it sets CSS variables from that data.

## Why

A layout cannot read the page's data, so per-resource chrome in a layout loads the resource a second time, and a layout for one route adds a file that shares nothing.

## Incorrect

```tsx
// app/share/[token]/layout.tsx loads the resource only to colour the header
export default async function ShareLayout({ children, params }: LayoutProps<"/share/[token]">) {
  const { token } = await params;
  const { resource } = await loadData(token);
  return <BrandedShell brandColor={resource.brandColor}>{children}</BrandedShell>;
}
```

## Correct

```tsx
export default async function SharePage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const { resource } = await loadData(token);
  return (
    <BrandedShell brandColor={resource.brandColor}>
      <SharedResource resource={resource} />
    </BrandedShell>
  );
}
```
