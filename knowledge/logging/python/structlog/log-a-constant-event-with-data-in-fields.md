---
title: With structlog log a constant event name and put the data in snake_case fields
summary: log.info("order_processed", order_id=..., duration_ms=...) can be grouped and filtered; interpolated text cannot.
impact: medium
applies: [python, structlog]
sources: [https://www.structlog.org/en/stable/logging-best-practices.html]
---

## Rule

This is a team convention. Call `log.info("order_processed", order_id=order_id, duration_ms=elapsed_ms)`: the event is constant text, the data goes in `snake_case` fields, and a unit belongs in the field name.

## Why

When values sit inside the message, an aggregator sees a different string for every record and cannot count or filter events.

## Incorrect

```python
log.info(f"order {order_id} processed in {elapsed_ms} ms")
```

## Correct

```python
log.info("order_processed", order_id=order_id, duration_ms=elapsed_ms)
```
