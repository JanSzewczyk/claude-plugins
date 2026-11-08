---
title: Replace a dependency the test cannot run with a fake that passes the real contract tests
summary: Prefer a working in-memory fake to per-test stubs and call expectations, and run one contract suite against both.
impact: high
expects: [python]
sources: [https://abseil.io/resources/swe-book/html/ch13.html]
---

## Rule

When the real implementation is too slow, costly or unavailable for a test, replace it with a fake:
a small working implementation that keeps its state in memory, not a stub per call or a set of call
expectations. Run one contract suite against both the fake and the real implementation, so the fake
behaves like the real one wherever tests rely on it. Whether to replace a dependency at all is
`testing/strategy/principles/mock-only-what-you-cannot-run`.

## Why

A fake that nobody checks against the real implementation drifts from it, so tests pass against
behaviour production does not have, and stubs repeated in every test leak the implementation and
break on each refactor.

## Exceptions

Use a stub to force a single return value or error the fake cannot easily produce, such as a
timeout. A third-party service with no runnable implementation (payments, e-mail) checks its fake
against the provider's sandbox or recorded responses, or the test says the gap is unchecked.
