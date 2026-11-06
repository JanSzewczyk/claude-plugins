---
title: Install httpx2 for the FastAPI test client
summary: Starlette's TestClient prefers httpx2 and warns when it falls back to httpx; list httpx2 in the test group.
impact: low
applies: [python, fastapi, uv]
sources: [https://github.com/encode/starlette/blob/master/starlette/testclient.py, https://github.com/fastapi/fastapi/blob/master/pyproject.toml]
---

## Rule

When tests use `TestClient`, put `httpx2` in the test dependency group and not `httpx`.

## Why

With only `httpx` installed, current Starlette emits a `StarletteDeprecationWarning` when the test client is imported, and a project that turns warnings into errors fails at import before any test runs (FastAPI's tutorial still says `httpx`).

## Incorrect

```toml
[dependency-groups]
test = ["pytest", "httpx"]
```

## Correct

```toml
[dependency-groups]
test = ["pytest", "httpx2"]
```

## Exceptions

`fastapi[standard]` already installs `httpx2`.
