---
title: Write logs to stdout or stderr and let the platform collect them
summary: A containerised app emits a stream; rotation and shipping belong to the platform. Files only where no collector exists.
impact: medium
applies: [python]
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
