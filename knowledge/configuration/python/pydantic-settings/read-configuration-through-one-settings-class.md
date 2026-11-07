---
title: Read all configuration through one typed Settings class
summary: One BaseSettings class owns every environment variable; no other code reads os.environ.
impact: high
applies: [python, pydantic-settings]
sources: [https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/, https://12factor.net/config]
---

## Rule

Declare every setting as a typed field of one `BaseSettings` class and read configuration only from an instance of it. No other module calls `os.environ`, `os.getenv` or reads `.env` itself.

## Why

A variable read with `os.getenv` somewhere deep in the code is an untyped string that nobody validates, nobody documents and a test cannot replace, and a typo in its name surfaces only when that code path runs.

## Incorrect

```python
import os

def send(message: str) -> None:
    timeout = int(os.getenv("SMTP_TIMEOUT", "10"))
    ...
```

## Correct

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    smtp_timeout: int = 10

def send(message: str, settings: Settings) -> None:
    timeout = settings.smtp_timeout
    ...
```

## Exceptions

The entry point builds the one `Settings` instance. A value that comes from elsewhere, such as a secrets manager, is loaded there and passed into `Settings`, so the class stays the only source.
