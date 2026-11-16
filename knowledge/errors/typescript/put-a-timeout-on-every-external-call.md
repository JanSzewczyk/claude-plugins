---
title: Pass an abort signal with a timeout to every external call
summary: Give each fetch or SDK call AbortSignal.timeout(ms) so a stalled dependency fails as a retryable timeout.
impact: high
applies: [typescript]
sources: [https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static, https://developer.mozilla.org/en-US/docs/Web/API/AbortController]
---

## Rule

Give every `fetch` and every SDK call that accepts a `signal` an `AbortSignal.timeout(ms)` sized to what the caller can wait. Map the resulting `TimeoutError` or `AbortError` to the `timeout` ServiceError code.

## Why

`fetch` has no default deadline, so one upstream that stops answering holds the request, its server action and the user's pending form until the platform kills the function.

## Incorrect

```ts
const response = await fetch(`${env.RATES_API_URL}/rates`);
```

## Correct

```ts
const response = await fetch(`${env.RATES_API_URL}/rates`, { signal: AbortSignal.timeout(5_000) });
```

## Exceptions

When the call must also stop on another signal (the user navigated away), combine them with `AbortSignal.any([request.signal, AbortSignal.timeout(5_000)])`.
