---
title: Set every value the test asserts on explicitly when you build test data
summary: Let the builder randomise what the test ignores; pass an override for every value the test checks.
impact: high
expects: [typescript, python]
---

## Rule

Build test data from a builder or factory, and pass an explicit override for every field the test
asserts on or branches on. Leave random values only in fields the test never looks at. Use named
variants (traits) for whole states such as "admin" or "inactive" instead of repeating the same
overrides in many tests.

## Why

An assertion against a randomly generated value passes or fails depending on the seed, and a
reader cannot tell from the test which value matters. An explicit override documents the input the
test depends on and makes the failure reproducible.
