---
title: Split the codebase by domain first and by layer inside each domain
summary: Top-level packages are business areas such as orders and users; layers live inside them.
impact: high
expects: [python]
sources: [https://martinfowler.com/bliki/PresentationDomainDataLayering.html, https://github.com/zhanymkanov/fastapi-best-practices]
---

## Rule

Make the top-level packages business areas (`orders`, `users`, `billing`) and put the layers (handlers, services, models) inside each one. Group by file type at the top only in a small service or a prototype.

## Why

Grouping by file type scatters one feature over several folders, so every change edits all of them and the project tangles as it grows. Fowler advises the same for larger systems: divide the top level into domain modules first, and apply the layers inside each module.

## Exceptions

A service with a handful of endpoints may stay flat; split it by domain when finding the code of one feature takes more than a moment.
