---
title: Name loggers with a constant, never with a runtime value
summary: Loggers are never released; put the varying value in the record instead.
impact: medium
applies: [python]
sources: [https://docs.python.org/3/library/logging.html#logging.getLogger]
---

## Rule

Create loggers with `getLogger(__name__)` or another constant, and pass user ids and similar values as log arguments or fields.

## Why

`getLogger` caches one logger object per name and CPython never frees it, so `getLogger(user_id)` grows without bound, one object per user.

## Incorrect

```python
logger = logging.getLogger(user_id)
```

## Correct

```python
logger = logging.getLogger(__name__)
logger.info("Login by %s", user_id)
```
