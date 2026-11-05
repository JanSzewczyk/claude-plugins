---
title: Configure logging once in the application entry point, never in a library
summary: A library only emits records (at most a NullHandler); the application sets handlers and format at startup.
impact: medium
applies: [python]
sources: [https://docs.python.org/3/howto/logging.html#configuring-logging-for-a-library]
---

## Rule

A library only emits log records and adds at most a `NullHandler` to its top-level logger. The application configures handlers and format once at startup, for example with `logging.config.dictConfig`.

## Why

Handlers added by a library take the choice of log destinations away from the application and interfere with its tests; the docs call configuration the prerogative of the application developer.

## Incorrect

```python
# mylib/__init__.py
import logging

logging.basicConfig(level=logging.DEBUG)
```

## Correct

```python
# mylib/__init__.py
import logging

logging.getLogger(__name__).addHandler(logging.NullHandler())

# app/main.py
logging.config.dictConfig(LOGGING)
```
