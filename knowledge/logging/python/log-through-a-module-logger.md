---
title: Log through a module logger named with __name__, not print
summary: logger = logging.getLogger(__name__) in each module; diagnostic output goes through it, never through print().
impact: medium
applies: [python]
sources: [https://docs.python.org/3/howto/logging.html#advanced-logging-tutorial]
---

## Rule

Create `logger = logging.getLogger(__name__)` in each module and send diagnostic output through it at the right level.

## Why

`print()` carries no level, logger name or destination, so output cannot be filtered, routed or silenced, while a named logger lets the application decide per module.

## Incorrect

```python
import sys

def connect(host):
    print(f"connecting to {host}", file=sys.stderr)
```

## Correct

```python
import logging

logger = logging.getLogger(__name__)

def connect(host):
    logger.info("connecting to %s", host)
```

## Exceptions

Output that is the program's purpose, such as a command-line tool printing its result to stdout, is not logging and may use `print()`.
