---
title: Use semantic HTML instead of adding ARIA so that a query works
summary: The right element and input type give the implicit role; add role or aria-* only for what HTML cannot express.
impact: medium
sources: [https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Use the semantic element and give inputs a `type`, so the implicit role is correct. Add `role` or
`aria-*` only for what HTML cannot express, and never just to make a test's query find an element.

## Why

A `role="button"` on a `div` makes the query pass while the element still has no keyboard behaviour, so
the test reports an accessible control that users do not have. On a `button` the same attribute is noise.
