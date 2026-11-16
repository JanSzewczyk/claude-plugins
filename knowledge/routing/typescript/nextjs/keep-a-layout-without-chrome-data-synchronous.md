---
title: Keep a layout that reads no data synchronous, with no loadData
summary: A layout only wraps children unless its chrome needs data; auth for its pages is checked in each page, not here.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/layout, https://nextjs.org/docs/app/guides/authentication]
---

## Rule

Write a layout whose chrome needs no data as a plain synchronous function with no `loadData`. Do not add a `loadData` that only checks the session: the pages under it check it themselves.

## Why

A guard-only layout looks like it protects the group, but it does not re-run on client navigation or stop child segments from rendering, so it gives false confidence and an extra await on every request.

## Incorrect

```tsx
async function loadData() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) unauthorized();
}

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  await loadData();
  return <AppShell>{children}</AppShell>;
}
```

## Correct

```tsx
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
```
