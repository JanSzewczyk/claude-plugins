---
title: Wrap service reads in React cache and give them primitive arguments
summary: loadData, generateMetadata and layouts then share one read per request; an object argument misses the cache.
impact: medium
applies: [typescript, nextjs]
sources: [https://react.dev/reference/react/cache, https://nextjs.org/docs/app/getting-started/metadata-and-og-images]
---

## Rule

Export every service read wrapped in `React.cache`, taking primitive arguments (ids and strings), so every caller in one request shares one read. Never wrap a mutation.

## Why

`cache` compares arguments with `Object.is`, so a read that takes an object built at each call site misses on every call: the page, its metadata and its layout each query the database again, and nothing reports it.

## Incorrect

```ts
export const getInvoice = React.cache(async function getInvoice(input: { userId: string; invoiceId: string }) {
  return findInvoice(input);
});
```

## Correct

```ts
export const getInvoice = React.cache(async function getInvoice(userId: string, invoiceId: string) {
  return findInvoice({ ownerId: userId, invoiceId });
});
```

## Exceptions

A read-heavy wrapper in `server/api/` is cached the same way when its result may be shared within one request.
