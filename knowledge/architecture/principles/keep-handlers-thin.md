---
title: Keep a handler to parsing, one service call and error mapping
summary: A handler translates HTTP and delegates; a service orchestrates one use case.
impact: high
expects: [python]
sources: [https://www.cosmicpython.com/book/chapter_04_service_layer.html]
---

## Rule

A handler parses the request, calls one service and maps the result and its errors to a response. A service fetches objects, calls the domain and saves, and knows nothing of HTTP.

## Why

A rule written in a handler is copied into the next handler and cannot be tested without HTTP. Cosmic Python's service layer keeps the orchestration out of the entrypoint so the same use case serves any caller.

## Exceptions

A module that only creates, reads, updates and deletes rows has no rules to place; there the service stays a few lines.
