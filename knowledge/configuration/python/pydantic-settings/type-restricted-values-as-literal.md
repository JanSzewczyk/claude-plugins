---
title: Type a setting with a fixed set of values as Literal or an enum
summary: A typo such as ENVIRONMENT=prod fails at startup instead of silently selecting the non-production branch.
impact: medium
applies: [python, pydantic-settings]
sources: [https://docs.pydantic.dev/latest/api/standard_library_types/, https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/]
---

## Rule

Declare a setting that accepts a closed set of values (environment, log level, log format) as a `Literal[...]` or an `Enum`, not `str`.

## Why

With `environment: str`, a value of `prod` matches neither `"production"` nor `"local"`, so code that branches on it quietly takes the wrong path while the service starts without complaint.

## Incorrect

```python
class Settings(BaseSettings):
    environment: str = "local"
```

## Correct

```python
class Settings(BaseSettings):
    environment: Literal["local", "test", "production"] = "local"
```
