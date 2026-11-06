---
title: Answer an unhandled exception with a generic 500 problem and no exception text
summary: A catch-all Exception handler returns a fixed Problem Details 500; the server's error log keeps the traceback.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9457, https://www.starlette.dev/exceptions/]
---

## Rule

Register an `Exception` handler that returns the shared Problem Details model with status 500 and a fixed `detail`, never `str(exc)`. Do not log in it: Starlette re-raises after the handler, so the server's error log already records the traceback.

## Why

Without it a crash answers with plain-text "Internal Server Error" that breaks the error contract, and a handler that echoes the exception leaks internals to the client.

## Incorrect

```python
@app.exception_handler(Exception)
async def boom(request, exc):
    logger.exception("unhandled")                   # the server logs it again: two entries
    return problem(500, str(exc))                   # internals in the body
```

## Correct

```python
@app.exception_handler(Exception)
async def unexpected_problem(request, exc):
    return problem(500, "Internal server error.")   # problem(): see the Problem Details note
```

## Exceptions

The handler runs in Starlette's outermost error middleware, so its response carries no CORS headers. Under `TestClient` pass `raise_server_exceptions=False` to see the 500 instead of the re-raised exception.
