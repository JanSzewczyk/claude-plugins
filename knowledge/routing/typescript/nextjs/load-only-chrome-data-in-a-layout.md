---
title: Load only chrome data in a layout's loadData; page data stays in the page
summary: A layout reads what its navigation, header and sidebar show; anything one page needs is read by that page.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/layout]
---

## Rule

Let a layout's `loadData` read only what the chrome it renders needs (navigation, header badges, sidebar state), after its session check. Read data that one page shows in that page's own `loadData`, even when the layout could fetch it.

## Why

A layout cannot pass data to its pages, and it does not re-render when the user moves between them, so page data loaded there is either fetched twice or shown stale after navigation.

## Incorrect

```tsx
async function loadData(workspaceId: string) {
  const { userId } = await requireUser(); // unauthorized() when signed out
  const [, workspace] = await getWorkspace(userId, workspaceId);
  const [, invoices] = await listInvoices(userId, workspaceId); // only the invoices page shows these
  return { workspace, invoices };
}
```

## Correct

```tsx
async function loadData(workspaceId: string) {
  const { userId } = await requireUser(); // unauthorized() when signed out
  const [error, workspace] = await getWorkspace(userId, workspaceId);
  if (error?.isNotFound || error?.isPermissionDenied) notFound();
  if (error) throw new Error("Failed to load the workspace", { cause: error });
  return { workspace };
}
```
