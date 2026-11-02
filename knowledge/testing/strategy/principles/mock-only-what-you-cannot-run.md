---
title: Mock only what a test cannot run or could only run with great difficulty
summary: Every mock trades confidence for convenience; UI tests fake network, animations, costly services; E2E almost nothing.
impact: high
sources: [https://kentcdodds.com/blog/the-merits-of-mocking]
---

## Rule

Mock something only when the test could not be written without the mock or would be very awkward with
the real thing. In UI tests that means the network, animations, and services with a real cost or effect
such as payments and e-mail. In E2E tests it means almost nothing.

## Why

Every mock cuts the link between the tested code and what it replaced, so the suite stays green when
that link breaks in production.
