---
title: Build structured test data with a builder, not inline object literals
summary: Typed objects with three or more fields come from a shared builder; reuse an existing one before writing one.
impact: medium
expects: [typescript]
---

## Rule

Take typed test data with three or more fields, nested objects or lists from a builder. Look for an
existing builder first and create one only when none exists; never hand-roll a factory inside a test
or story file. Primitive values and objects with fewer than three fields may stay inline.

## Why

Hand-written literals copied across tests drift from the type and from each other: adding a required
field breaks every copy, and each test fills the fields it does not care about differently.
