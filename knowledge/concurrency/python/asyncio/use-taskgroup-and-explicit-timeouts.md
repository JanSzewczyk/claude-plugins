---
title: Run concurrent coroutines in a TaskGroup and put a timeout on every external call
summary: asyncio.TaskGroup replaces gather and loose create_task; wrap outbound calls in asyncio.timeout().
impact: high
applies: [python, asyncio]
sources: [https://docs.python.org/3/library/asyncio-task.html#task-groups, https://docs.python.org/3/library/asyncio-task.html#timeouts]
---

## Rule

Start concurrent work inside `async with asyncio.TaskGroup()` instead of `gather()` or unowned `create_task()`. Wrap each call to an external system in `async with asyncio.timeout(seconds)`, bound fan-out with `asyncio.Semaphore`, and move blocking calls to `asyncio.to_thread()`.

## Why

A loose task outlives the code that started it and its error goes unobserved, and a call without a timeout can hang the whole request forever. A `TaskGroup` cancels its siblings on the first failure and reports errors as an `ExceptionGroup` (handle with `except*`).

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

async def fetch(url):
    async with asyncio.timeout(5.0):
        return await client.get(url)
```
