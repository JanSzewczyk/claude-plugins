---
title: Turn off slash redirects so an unknown path answers 404 Problem Details
summary: FastAPI redirects /events/1/ to /events/1 with a bodyless 307; redirect_slashes=False makes it a 404 problem.
impact: medium
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/reference/fastapi/, https://www.rfc-editor.org/rfc/rfc9457]
---

## Rule

Create the app with `FastAPI(redirect_slashes=False)`, so a path with or without a trailing slash that the spec does not list is an unknown route and gets the same 404 Problem Details as any other, produced by the `StarletteHTTPException` handler of `api/python/fastapi/return-every-error-as-one-problem-details-model`.

## Why

By default `GET /events/1/` answers 307 with an empty body, which breaks "every error is Problem Details", and the redirect answers a path the spec never lists.

## Incorrect

```python
app = FastAPI()   # GET /events/1/ -> 307 Temporary Redirect, empty body
```

## Correct

```python
app = FastAPI(redirect_slashes=False)   # GET /events/1/ -> 404 application/problem+json, with the handler registered
```

## Exceptions

A public API whose clients already depend on the redirect keeps it and documents it; a new service has no such clients.
