---
title: Find elements the way a user or a screen reader does
summary: Query by role and accessible name, then label, then visible text; a test id is the last resort, never a CSS selector.
impact: high
sources: [https://testing-library.com/docs/queries/about/#priority]
---

## Rule

Locate elements by their role and accessible name first, then by their label, then by visible
text. Reach for a test id only when the element has no accessible identity at all, and fix the
component when that is because its semantics are wrong.

## Why

A test that finds a button by its role and name keeps passing through any refactor that keeps the
button usable, and fails when a user could no longer find it. A test that finds it by class name or
test id breaks on harmless markup changes and stays green when the accessible name disappears.

## Exceptions

A test id is fine for an element with correct semantics that still has nothing stable to query by, such
as dynamic text and no role. It beats a CSS class, because it makes the link between test and code explicit.
