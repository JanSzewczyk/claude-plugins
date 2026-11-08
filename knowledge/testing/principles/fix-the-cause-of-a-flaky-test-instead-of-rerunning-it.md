---
title: Fix the cause of a flaky test instead of rerunning it until it passes
summary: A test that fails without a code change hides a race, a leak or a clock; reruns hide it and teach people to ignore red.
impact: critical
sources: [https://abseil.io/resources/swe-book/html/ch11.html]
---

## Rule

Treat a test that fails without a code change as a defect: find its nondeterminism (clock, random data, scheduling, network, test order, shared state) and remove it.
A rerun (`--reruns`, `@flaky`, `retryTimes`, `retry`) is never the fix: a suite that reruns reports each test that passed only on a rerun as flaky, to be fixed.

## Why

A rerun turns the suite green while the race or leak behind the failure is still in the code, and
once red can mean "just flaky", people stop reading failures and miss the real ones.
