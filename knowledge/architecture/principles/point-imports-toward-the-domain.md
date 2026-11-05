---
title: Let imports point toward the domain, never away from it
summary: Handlers import services, services import the domain, adapters import the domain; the domain imports none of them.
impact: high
expects: [python]
sources: [https://www.cosmicpython.com/book/chapter_02_repository.html, https://alistair.cockburn.us/hexagonal-architecture/]
---

## Rule

Let handlers depend on services, services on the domain and on the ports it declares, and adapters (ORM mappings, HTTP clients, queues) on the domain. The domain code imports no web framework, no ORM and no adapter. Only the composition root, the place that wires the application together, imports adapters.

## Why

When a business rule imports the ORM or the web framework, it cannot be tested or changed without the database or the HTTP stack, and replacing either rewrites the rules. Cosmic Python puts it as: the ORM imports the model, not the model the ORM.

## Exceptions

A module that only does CRUD has no domain code to protect: its service may use the ORM models and the session directly until the pain described in add-structure-to-one-module-when-it-hurts shows.
