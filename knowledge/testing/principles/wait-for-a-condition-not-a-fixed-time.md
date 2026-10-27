---
title: Wait for a condition the user would see, never for a fixed time
summary: Await the element, value or call you expect with a retrying query; never sleep for a guessed number of milliseconds.
impact: critical
---

## Rule

When the result of an action arrives later, wait for the condition itself: a query that retries
until the element appears, or a retrying assertion on the value or call you expect. Give a long
operation a longer timeout on that wait instead of a sleep before it.

## Why

A fixed sleep is too short on a slow CI machine and too long everywhere else, so the suite is both
flaky and slow, and its failures name the assertion after the sleep instead of what never happened.
