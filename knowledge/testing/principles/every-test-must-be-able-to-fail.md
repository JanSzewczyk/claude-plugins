---
title: Make every test able to fail when the behaviour it names breaks
summary: A test with no assertion, or one that holds whatever the code does, passes forever and proves nothing.
impact: critical
---

## Rule

End every test with an assertion that would fail if the behaviour in its name broke. Before you
trust a new test, check that it can fail: break the condition it checks, or assert the opposite,
and see it go red.

## Why

A test that only renders and clicks, or asserts something that is always true, stays green while
the feature is broken, so the suite reports coverage that does not exist.
