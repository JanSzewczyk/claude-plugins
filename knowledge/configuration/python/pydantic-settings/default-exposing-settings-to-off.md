---
title: Default a setting that exposes something to off or empty
summary: Docs, debug output and CORS default to off or empty, so a deployment that forgets a variable opens nothing.
impact: high
applies: [python, pydantic-settings]
sources: [https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/]
---

## Rule

Give every setting that exposes something (API docs, debug output, permissive CORS, admin routes) a default of off or empty, and let a developer turn it on in a local `.env`. The setting then feeds the code that exposes it, for example `docs_url=None` when `docs_enabled` is false.

## Why

A production deployment that forgets one variable falls back to the default, and an exposing default silently publishes the docs, opens CORS or leaves debug on.

## Incorrect

```python
class Settings(BaseSettings):
    docs_enabled: bool = True
    cors_origins: list[str] = ["*"]
```

## Correct

```python
class Settings(BaseSettings):
    docs_enabled: bool = False
    cors_origins: list[str] = []     # from the environment as JSON: CORS_ORIGINS=["https://app.example.com"]
```

## Exceptions

A value that has no safe default, such as a database URL, should have no default at all so that startup fails when it is missing.
