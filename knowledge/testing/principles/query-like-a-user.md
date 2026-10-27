---
title: Find elements the way a user or a screen reader does
summary: Query by role and accessible name, then label, then visible text; never by test id, CSS selector or internals.
impact: high
sources: [https://testing-library.com/docs/queries/about/#priority]
---

## Rule

Locate elements by their role and accessible name first, then by their label, then by visible
text. Reach for a test id or a selector only when the element has no accessible identity at all,
and treat that as a defect to fix in the component.

## Why

A test that finds a button by its role and name keeps passing through any refactor that keeps the
button usable, and fails when a user could no longer find it. A test that finds it by class name or
test id breaks on harmless markup changes and stays green when the accessible name disappears.
