---
title: Add structure to one module at a time, when it hurts
summary: Start with a service and models; add a port, a fake and a rich model only where a concrete pain shows.
impact: high
expects: [python]
sources: [https://www.cosmicpython.com/book/chapter_02_repository.html, https://martinfowler.com/bliki/MonolithFirst.html]
---

## Rule

Begin every module with a handler, a service and models. Add a port, a fake and a richer domain model to a module only when a concrete pain shows: the same rule copied in several places, a rule test that needs a database, or business terms missing from the code. Make the step in that one module, not across the application.

## Why

Hexagonal layers and aggregates on a module that is mostly CRUD add files and indirection that repay nothing; the Cosmic Python authors say a thin wrapper over a database probably does not need a domain model or a repository. Fowler advises learning the boundaries inside a well-modularised monolith before splitting further, so the step is taken per module, on evidence.
