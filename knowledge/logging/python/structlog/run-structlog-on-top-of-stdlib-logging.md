---
title: Run structlog on top of stdlib logging so library logs share one pipeline
summary: Configure structlog with LoggerFactory and a ProcessorFormatter whose foreign_pre_chain matches its processors.
impact: medium
applies: [python, structlog]
sources: [https://www.structlog.org/en/stable/standard-library.html]
---

## Rule

Configure structlog with `structlog.stdlib.LoggerFactory()` and a `ProcessorFormatter` on the root handler, with a `foreign_pre_chain` that matches the shared processors, so records from libraries such as SQLAlchemy and httpx pass through the same processors.

## Why

A separate logging stack leaves third-party records in their own format, so one request produces two kinds of lines in two shapes.

## Incorrect

```python
structlog.configure(processors=[structlog.processors.JSONRenderer()])   # library logs bypass it
```

## Correct

```python
shared = [
    structlog.contextvars.merge_contextvars,
    structlog.stdlib.add_log_level,
    structlog.stdlib.add_logger_name,
    structlog.processors.TimeStamper(fmt="iso", utc=True),
]
structlog.configure(
    processors=[*shared, structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
    logger_factory=structlog.stdlib.LoggerFactory(),
)
handler.setFormatter(structlog.stdlib.ProcessorFormatter(
    foreign_pre_chain=shared,
    processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, renderer],
))
logging.getLogger().addHandler(handler)
```

## Exceptions

uvicorn gives its own loggers handlers; run it with `log_config=None` so its records reach the root handler.
