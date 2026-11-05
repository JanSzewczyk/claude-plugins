---
title: Always re-raise asyncio.CancelledError after cleanup
summary: Swallowing CancelledError breaks cancellation, timeouts and TaskGroup shutdown.
impact: high
applies: [python, asyncio]
sources: [https://docs.python.org/3/library/asyncio-task.html#task-cancellation]
---

## Rule

When you catch `asyncio.CancelledError` to clean up, run the cleanup and then `raise` it again. Prefer `try`/`finally` when no other handling is needed.

## Why

`asyncio.timeout()` and `TaskGroup` rely on the cancellation propagating, so a swallowed `CancelledError` leaves the task running and the timeout never fires.

## Incorrect

```python
async def worker():
    try:
        await job()
    except asyncio.CancelledError:
        await cleanup()  # cancellation is lost
```

## Correct

```python
async def worker():
    try:
        await job()
    except asyncio.CancelledError:
        await cleanup()
        raise
```
