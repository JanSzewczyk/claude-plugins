---
title: Build Settings once at startup and inject them with Depends
summary: Settings are created at startup so bad configuration stops the service, and tests pass their own instead of patching.
impact: medium
applies: [python, fastapi, pydantic-settings]
sources: [https://fastapi.tiangolo.com/advanced/settings/]
---

## Rule

Create `Settings` in one place at startup, the entry point or the default inside `create_app(settings)`, store it on `app.state` and expose it through one `get_settings` dependency. No other code constructs `Settings`; it receives them as an argument or through `Depends(get_settings)`.

## Why

A `Settings()` created at import or on the first request reads the environment too early or too late, so bad configuration surfaces on the first request and a test cannot vary it without patching module state.

## Incorrect

```python
settings = Settings()                    # at import, shared by every module

@router.get("/limit")
def limit() -> int:
    return settings.page_size
```

## Correct

```python
def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI()
    app.state.settings = settings or Settings()   # invalid configuration stops startup here
    return app

def get_settings(request: Request) -> Settings:
    return request.app.state.settings           # tests: create_app(Settings(_env_file=None, ...))
```

## Exceptions

FastAPI's documentation uses `@lru_cache def get_settings()` and replaces it through `app.dependency_overrides`. That builds `Settings` lazily, on the first request that resolves it, so bad configuration is found late. Use it only if the entry point also calls `get_settings()` once at startup to fail fast.
