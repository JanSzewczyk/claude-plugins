---
title: Prefer asyncio.TaskGroup over gather and loose create_task for concurrent work
summary: A TaskGroup owns its tasks and cancels the siblings when one fails.
impact: high
applies: [python, asyncio]
sources: [https://docs.python.org/3/library/asyncio-task.html#task-groups]
---

## Rule

Start concurrent coroutines inside `async with asyncio.TaskGroup()` instead of `gather()` or unowned `create_task()`. Handle several failures with `except*`.

## Why

A loose task outlives the code that started it and its error goes unobserved, while a `TaskGroup` cancels the remaining tasks on the first failure and raises an `ExceptionGroup`.

## Incorrect

```python
async def fetch_all(urls):
    tasks = [asyncio.create_task(fetch(u)) for u in urls]
    return await asyncio.gather(*tasks)
```

## Correct

```python
async def fetch_all(urls):
    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(fetch(u)) for u in urls]
    return [task.result() for task in tasks]
```

## Exceptions

Use `gather(..., return_exceptions=True)` when you want every result or error back and no cancellation of the others.
