---
title: Refer to another module's objects by id, not by its model
summary: Each module owns its model; across a boundary pass identifiers and translate the data.
impact: medium
expects: [python]
sources: [https://martinfowler.com/bliki/BoundedContext.html, https://www.cosmicpython.com/book/chapter_07_aggregate.html]
---

## Rule

Let each module own its model. Where one module needs another's object, keep its identifier and ask the other module through its service, translating the data at the boundary.

## Why

A model shared by every module forces one meaning on a word that differs by context, so a change one module needs breaks the others. Fowler's Bounded Context: each context has its own model of common concepts, mapped at the boundary. Holding an identifier is the common way to refer across that boundary (Cosmic Python, aggregates).
