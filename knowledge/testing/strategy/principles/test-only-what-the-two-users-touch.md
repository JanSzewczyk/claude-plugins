---
title: Test only what the end user or the developer using the code can touch
summary: Rendered output for the end user, props and providers for the developer; a behaviour-keeping refactor changes no test.
impact: high
sources: [https://kentcdodds.com/blog/testing-implementation-details, https://kentcdodds.com/blog/avoid-the-test-user]
---

## Rule

Write tests against what the code's two users have: the rendered output an end user sees and clicks,
and the props and providers a developer passes in. When a refactor that keeps the behaviour forces a
test to change, rewrite that test so it stops depending on the implementation.

## Why

A test that knows state, handler names or component structure fails on a harmless refactor and passes
when the feature is broken, and the code ends up serving a third user that nobody needs.
