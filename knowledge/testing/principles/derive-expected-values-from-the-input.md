---
title: Derive the expected value from the test's own input, not a repeated literal
summary: Assert against the data the test passed in (items.length, the prefilled value), never a hard-coded copy of it.
impact: medium
---

## Rule

When the expected value follows from the test's input, compute it from that input: the row count
from the list the test rendered, a field's value from the value the test prefilled. Write a literal
only for a value the test introduces in the assertion itself.

## Why

A hard-coded copy of the input goes stale the moment the input changes, so the test fails for a
reason unrelated to the code, or keeps passing against the wrong number.
