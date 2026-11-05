---
title: Re-raise asyncio.CancelledError after cleanup
summary: Swallowing CancelledError can break cancellation, timeouts and TaskGroup shutdown.
impact: high
applies: [python, asyncio]
sources: [https://docs.python.org/3/library/asyncio-task.html#task-cancellation]
---

## Rule

When you catch `asyncio.CancelledError` to clean up, run the cleanup and then `raise` it again. Prefer `try`/`finally` when no other handling is needed.

## Why

The asyncio docs warn that `asyncio.timeout()` and `TaskGroup` "might misbehave" when a coroutine swallows `CancelledError`: the task keeps running after it was told to stop.

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

## Exceptions

Suppress the cancellation only when this code deliberately owns it, and then call `Task.uncancel()` so the cancellation count stays correct.
