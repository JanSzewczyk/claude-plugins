---
title: Log a caught exception with logger.exception, not with its text in the message
summary: logger.exception writes ERROR with the traceback; str(err) in the message loses the stack.
impact: high
applies: [python]
sources: [https://docs.python.org/3/library/logging.html#logging.Logger.exception, https://docs.astral.sh/ruff/rules/error-instead-of-exception/, https://docs.astral.sh/ruff/rules/verbose-log-message/]
---

## Rule

In the `except` block that finally handles the error, log with `logger.exception("Job %s failed", job.id)`. Do not use `logger.error(..., exc_info=True)` and do not append the exception to the message.

## Why

A message such as `"failed: %s", err` records only the exception text, so the log says what failed but not where.

## Incorrect

```python
except JobError as err:
    logger.error("Job %s failed: %s", job.id, err)
```

## Correct

```python
except JobError:
    logger.exception("Job %s failed", job.id)   # the layer that handles it
```
