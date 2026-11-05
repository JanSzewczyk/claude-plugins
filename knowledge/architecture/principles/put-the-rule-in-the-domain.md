---
title: Put a rule about what is allowed in the domain, not in a handler or service
summary: Invariants live in domain objects, so a service does not turn models into bags of fields.
impact: high
expects: [python]
sources: [https://martinfowler.com/bliki/AnemicDomainModel.html, https://www.cosmicpython.com/book/chapter_04_service_layer.html]
---

## Rule

Let the domain decide what is allowed: an invariant belongs in the domain object it protects. A service only loads the object, asks it, and saves it.

## Why

A rule written in a service over field-only models gives an anemic domain model, which Fowler calls an anti-pattern: all the costs of a domain model without any of its benefits.

## Exceptions

A module with no invariants needs no domain object; keep a plain model there.
