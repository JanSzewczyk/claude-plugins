---
title: Create the request id once in proxy.ts and forward it on the request headers
summary: proxy.ts mints requestId and forwards x-request-id on the request and response; handlers read it, never mint one.
impact: medium
applies: [typescript, nextjs, loglayer]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/proxy, https://loglayer.dev/logging-api/context]
---

## Rule

In `proxy.ts`, create one `requestId` per request, log the incoming request once with `createLogger({ module: "proxy", requestId, method, path })`, and forward the id as `x-request-id` through `NextResponse.next({ request: { headers } })`, echoing it on the response. Route handlers and server actions read `x-request-id` from the request headers into their logger context and never create their own.

## Why

A header set only on the response never reaches the route handler, so each handler mints a fresh id and its logs cannot be joined to the request. A "request completed" line with a duration from `proxy.ts` measures nothing, because proxy returns before the route runs.

## Incorrect

```ts
export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}
// route handler: always falls back to a new id
const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
```

## Correct

```ts
export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  createLogger({ module: "proxy", requestId, method: request.method, path: request.nextUrl.pathname })
    .info("Incoming request");
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}
```
