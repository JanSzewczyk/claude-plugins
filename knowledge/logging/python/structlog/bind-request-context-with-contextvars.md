---
title: Bind request_id with structlog contextvars at the start of each request or task
summary: Context variables are isolated per asyncio task; a module-level global is overwritten by concurrent requests.
impact: medium
applies: [python, structlog]
sources: [https://www.structlog.org/en/stable/contextvars.html]
---

## Rule

At the start of each request or task call `structlog.contextvars.clear_contextvars()` and then `bind_contextvars(request_id=...)`, and keep `merge_contextvars` first in the processor chain.

## Why

A global `request_id` is overwritten by the next concurrent request, so log lines get attributed to the wrong one.

## Incorrect

```python
REQUEST_ID = None

async def middleware(request, call_next):
    global REQUEST_ID
    REQUEST_ID = request.headers.get("x-request-id")
```

## Correct

```python
async def middleware(request, call_next):
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request.headers.get("x-request-id") or str(uuid.uuid4()))
    return await call_next(request)
```
