---
title: Emit one JSON object per line in production and a readable console in development
summary: Fixed fields (UTC timestamp, level, logger, event) parse in any aggregator; JSON also escapes control characters.
impact: medium
applies: [python, structlog]
sources: [https://www.structlog.org/en/stable/logging-best-practices.html, https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html]
---

## Rule

Choose the renderer by environment: `JSONRenderer` in production, one object per line with a UTC ISO 8601 `timestamp`, `level`, `logger` and `event`; `ConsoleRenderer` in development.

## Why

Free text cannot be parsed reliably by an aggregator, and JSON encoding escapes a newline inside a logged value, so user input cannot forge a second log line; a plain text formatter does not.

## Incorrect

```python
renderer = structlog.dev.ConsoleRenderer()   # in every environment
```

## Correct

```python
renderer = (
    structlog.processors.JSONRenderer()
    if json_logs
    else structlog.dev.ConsoleRenderer()
)
```
