---
title: Check the session first in the loadData of every protected page
summary: A layout guard or a proxy redirect does not protect the page; each protected page guards itself before any read.
impact: critical
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/authentication, https://nextjs.org/docs/app/api-reference/functions/unauthorized]
---

## Rule

Make the session check the first statement of the `loadData` of every protected page, and of any layout `loadData` that reads user data, before any read. Do not count a guard in a parent layout or in `proxy.ts` as the page's guard.

## Why

A page that relies on its layout's guard serves its data to a signed-out user: layouts do not re-render on client navigation and do not stop child segments from rendering, and a proxy check only reads the cookie optimistically. Next.js advises doing the check close to the data instead.

## Incorrect

```tsx
// app/(app)/layout.tsx guards the group, so the page skips it
async function loadData(invoiceId: string) {
  const [error, invoice] = await getInvoice(invoiceId);
  if (error?.isNotFound) notFound();
  if (error) throw new Error("Failed to load the invoice", { cause: error });
  return { invoice };
}
```

## Correct

```tsx
async function loadData(invoiceId: string) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) unauthorized();

  const [error, invoice] = await getInvoice(userId, invoiceId);
  if (error?.isNotFound || error?.isPermissionDenied) notFound();
  if (error) throw new Error("Failed to load the invoice", { cause: error });
  return { invoice };
}
```

## Exceptions

A public page (one `proxy.ts` lets through) has no guard unless the data it reads belongs to a user. Without `experimental.authInterrupts`, call `redirect("/sign-in")` instead of `unauthorized()`.
