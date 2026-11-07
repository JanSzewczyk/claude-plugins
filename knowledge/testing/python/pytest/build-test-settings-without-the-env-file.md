---
title: Build test Settings with _env_file=None
summary: A test that reads the developer's .env passes on one machine and fails on another.
impact: high
applies: [python, pytest, pydantic-settings]
implements: testing/builders/principles/set-asserted-values-explicitly
sources: [https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/]
---

## Rule

Create settings in tests with `Settings(_env_file=None, ...)`, ideally through one helper in `conftest.py`, and pass explicitly each value the test depends on. Do not call `Settings()` bare in a test.

## Why

A bare `Settings()` picks up the developer's `.env`, so the same test passes locally and fails in CI, or the reverse, for a reason no one can see in the test.

## Incorrect

```python
def test_page_size() -> None:
    settings = Settings()
    assert settings.default_page_size == 20
```

## Correct

```python
def make_settings(**overrides: Any) -> Settings:
    return Settings(_env_file=None, environment="test", **overrides)

def test_page_size() -> None:
    assert make_settings(default_page_size=5).default_page_size == 5
```

## Exceptions

`_env_file=None` skips the file only. Exported shell variables still fill any field the test does not pass, so a suite that must be immune to them also clears the relevant ones with `monkeypatch.delenv`.
