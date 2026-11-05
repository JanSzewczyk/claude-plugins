---
title: Pass values to log calls as arguments, never through f-strings
summary: logger.info("Processed %s", order_id) formats only when the record is emitted and keeps one message template.
impact: medium
applies: [python]
sources: [https://docs.python.org/3/howto/logging.html#optimization, https://docs.astral.sh/ruff/rules/logging-f-string/, https://docs.astral.sh/ruff/rules/logging-percent-format/]
---

## Rule

Write `logger.info("Processed order %s", order_id)` and never build the message with an f-string, `.format()`, `%` or `+`.

## Why

An f-string is formatted even when the level is disabled, while arguments are formatted only when a handler emits the record.

## Incorrect

```python
logger.info(f"Processed order {order_id}")
```

## Correct

```python
logger.info("Processed order %s", order_id)
```

## Exceptions

With structlog the message is a constant event name and the data goes in fields; there is nothing to interpolate.
