---
title: Reproduce a bug with a failing test before fixing it
summary: Write the test first and see it fail; decide whether a bug earns a test by what the breakage costs users.
impact: high
sources: [https://kentcdodds.com/blog/when-i-follow-tdd, https://kentcdodds.com/blog/should-i-write-a-test-or-fix-a-bug]
---

## Rule

When a bug earns a test, write the test that reproduces it before touching the code, and see it fail.
Decide whether it earns one the way you prioritise any other work, by what the breakage costs users.

## Why

A regression test written after the fix may never have failed, so it can pass without covering the bug,
and the bug comes back with the test still green.

## Exceptions

A bug that costs users little, in a place that is expensive to test, can get a fix with no test.
