---
title: Put asyncio.timeout on every call to an external system
summary: A call without a deadline can hang the whole request; wrap it in async with asyncio.timeout(seconds).
impact: high
applies: [python, asyncio]
sources: [https://docs.python.org/3/library/asyncio-task.html#timeouts]
---

## Rule

Wrap each awaited call to a network, database or other external system in `async with asyncio.timeout(seconds)` and choose the value from what the caller can afford to wait.

## Why

A call without a deadline waits as long as the other side does, so one stalled dependency holds the request, its connection and its worker indefinitely.

## Incorrect

```python
async def fetch(url):
    return await client.get(url)
```

## Correct

```python
async def fetch(url):
    async with asyncio.timeout(5.0):
        return await client.get(url)
```
