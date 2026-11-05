---
title: Keep pytest-asyncio in strict mode and mark every async test and fixture
summary: Strict mode runs only marked coroutine tests, so it never claims tests meant for another async framework.
impact: medium
applies: [python, pytest, pytest-asyncio]
sources: [https://pytest-asyncio.readthedocs.io/en/stable/concepts.html]
---

## Rule

Leave `pytest-asyncio` in its default `strict` mode. Mark each coroutine test with `@pytest.mark.asyncio` and each async fixture with `@pytest_asyncio.fixture`.

## Why

In `auto` mode pytest-asyncio takes over every `async def` test, including those meant for another async plugin such as AnyIO's; in strict mode an unmarked coroutine test is not handled by pytest-asyncio, so pytest skips or fails it depending on the version.

## Incorrect

```python
async def test_fetch_user(client):
    assert (await client.fetch_user(1)).id == 1
```

## Correct

```python
@pytest.mark.asyncio
async def test_fetch_user(client):
    assert (await client.fetch_user(1)).id == 1
```

## Exceptions

Use `asyncio_mode = "auto"` only when pytest-asyncio is the only async plugin in the project.
