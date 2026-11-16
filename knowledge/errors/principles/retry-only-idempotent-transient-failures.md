---
title: Retry only transient failures of idempotent operations
summary: Retry a timeout, 429 or 503 on a call that is safe to repeat; never retry a permanent error or an unguarded write.
impact: high
applies: []
expects: [typescript]
sources: [https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/, https://www.rfc-editor.org/rfc/rfc9110#name-idempotent-methods]
---

## Rule

Retry a call only when its failure is transient (timeout, connection refused, rate limited, upstream unavailable) and the operation is idempotent: a read, or a write that carries an idempotency key. Return every other failure to the caller on the first attempt.

## Why

Retrying a non-idempotent write whose first attempt reached the server creates duplicates (two orders, two charges), and retrying a validation, not-found or permission error only repeats the same answer while the user waits.

## Exceptions

A write becomes safe to retry once the server deduplicates it by a key the client generates once per logical operation and sends on every attempt.
