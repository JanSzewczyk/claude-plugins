---
title: Log the exception once at the boundary; layers in between only wrap it
summary: Intermediate layers add context with raise ... from err; the HTTP handler, worker or main logs it.
impact: medium
applies: [python]
implements: logging/principles/log-an-error-once-where-it-is-handled
sources: [https://docs.python.org/3/library/exceptions.html#exception-context]
---

## Rule

Log an exception in the layer that finally handles it (request handler, worker loop, `main`). Layers in between add context with `raise ... from err` and do not log.

## Why

Logging and re-raising at every layer prints the same traceback several times and multiplies every error count and alert.

## Incorrect

```python
def load(job):
    try:
        run(job)
    except JobError:
        logger.exception("load failed")
        raise
```

## Correct

```python
def load(job):
    try:
        run(job)
    except JobError as err:
        raise LoadError(job.id) from err

# worker loop
try:
    load(job)
except LoadError:
    logger.exception("Job %s failed", job.id)
```
