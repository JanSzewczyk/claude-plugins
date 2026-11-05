---
title: Log through a module logger and configure logging once, in the application entry point
summary: logger = logging.getLogger(__name__) in every module; only the application calls dictConfig or basicConfig.
impact: medium
applies: [python]
sources: [https://docs.python.org/3/howto/logging.html#configuring-logging-for-a-library]
---

## Rule

Create `logger = logging.getLogger(__name__)` in each module and never use `print()` for logging. A library only emits records (at most it adds a `NullHandler` to its top-level logger); the application configures handlers and format once at startup, for example with `logging.config.dictConfig`.

## Why

Handlers set at import time by a library override the application's choices and duplicate output, and `print()` carries no level, logger name or destination to filter on.

## Incorrect

```python
# mylib/client.py
logging.basicConfig(level=logging.DEBUG)
print("connecting")
```

## Correct

```python
# mylib/client.py
logger = logging.getLogger(__name__)
logger.debug("connecting")

# app/main.py
logging.config.dictConfig(LOGGING)
```
