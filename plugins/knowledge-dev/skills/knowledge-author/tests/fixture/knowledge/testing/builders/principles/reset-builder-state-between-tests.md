---
title: Reset builder counters and random state between tests that depend on them
summary: Sequences and seeded randomness carry over between tests; reset them where a test depends on their values.
impact: medium
expects: [typescript, python]
---

## Rule

When a test depends on a generated sequence value or on seeded random output, reset the builder's
counters and seed before each such test. Tests that only use explicit overrides need no reset.

## Why

Counters and random state live as long as the builder module. A test that expects `id: 1` passes
alone and fails when another test ran first, which shows up as an order-dependent, flaky suite.
