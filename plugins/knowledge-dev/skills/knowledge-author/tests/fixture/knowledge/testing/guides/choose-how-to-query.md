---
title: Choose how a test finds elements
summary: Query by role first, then label, then text; a test id is the last resort.
impact: high
applies: [typescript]
decides: [testing/principles/query-like-a-user, testing/testing-library/query-variants]
---

## Decision

Query the way a user finds the element: by role, then by label, then by text. Reach for a test id only when nothing visible identifies the element.

## Options

| Query | Use when |
| --- | --- |
| role | the element has an accessible role |
| label | a form field has a label |
| test id | nothing visible identifies it |

## Evolution

Move a test from a test id to a role query the moment the component gains an accessible name.
