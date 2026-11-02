---
title: Fail the test on any request no handler matches
summary: By default MSW only warns and lets the request through, so a wrong URL reaches the network instead of failing.
impact: high
applies: [typescript, msw@>=3]
sources: [https://github.com/mswjs/msw/blob/main/src/core/shared-options.ts]
---

## Rule

Start the test server with the `error` strategy for unhandled traffic, so a request no handler matches
fails the test.

## Why

The default strategy prints a warning and lets the request pass through, so a call with a wrong URL hits the
real network, and the test can stay green with only a log line to show for it.

## Incorrect

```ts
beforeAll(() => server.listen());
```

## Correct

```ts
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
```
