---
title: Keep test setup inline until repetition hides what differs between tests
summary: A helper takes overrides and returns what the test needs, with no branch per case; a test shows what matters to it.
impact: medium
sources: [https://kentcdodds.com/blog/aha-testing]
---

## Rule

Write a test's data and setup inline first. Extract a helper once repetition hides what differs between
tests; it takes overrides and returns what the test needs, with no branch per case, so a reader sees the
difference between two similar tests at once.

## Why

A shared helper with an `if` for every case makes the reader step through it to learn what one test does,
and copied setups bury the one line that differs.
