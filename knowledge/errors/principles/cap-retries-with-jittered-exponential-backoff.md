---
title: Cap retries and wait a jittered, exponentially growing delay between them
summary: A fixed small number of attempts, delay doubling up to a ceiling, randomised so clients do not retry in lockstep.
impact: high
applies: []
sources: [https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/, https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/, https://www.rfc-editor.org/rfc/rfc9110#name-retry-after]
---

## Rule

Allow a fixed maximum number of attempts (three is the default), wait `base × 2^attempt` capped at a ceiling before each retry, and randomise that wait. When the server sends `Retry-After`, wait that long instead, within the same ceiling. After the last attempt, return the final error.

## Why

Unbounded or immediate retries turn one struggling dependency into an outage: every client hammers it in synchronised waves, and a request that can never succeed holds its caller forever.
