---
title: Point Python log handlers at sys.stdout, not at a file
summary: StreamHandler on sys.stdout in the logging config; RotatingFileHandler only on hosts without a collector.
impact: medium
applies: [python]
implements: logging/principles/write-logs-to-a-stream-not-a-file
sources: [https://12factor.net/logs]
---

## Rule

A containerised or cloud app writes logs to `stdout`/`stderr` through a `StreamHandler` set to `sys.stdout`. Use `RotatingFileHandler` only where no log collector exists.

## Why

A log file inside a container disappears with it, and the platform's collector never sees it.

## Incorrect

```python
"handlers": {"file": {"class": "logging.handlers.RotatingFileHandler", "filename": "app.log"}}
```

## Correct

```python
"handlers": {"stdout": {"class": "logging.StreamHandler", "stream": "ext://sys.stdout"}}
```

## Exceptions

On a machine with no log collector (a VM, a desktop tool) a rotating file handler is acceptable.
