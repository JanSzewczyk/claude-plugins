---
title: Assert what the user sees or can do, never internal state or markup
summary: Check visibility, text, values, focus, ARIA state and callback calls; never state, class names or snapshots.
impact: medium
---

## Rule

Assert on what a user or assistive technology perceives: visible text, values, enabled or disabled
state, focus, ARIA attributes, and the calls a callback received. Leave internal state, class names
that carry no meaning for the user, and markup snapshots out of assertions.

## Why

Tests that read internals break on every refactor that changes nothing for the user, and still pass
when the user-facing behaviour is broken, so the suite stops being trusted.
