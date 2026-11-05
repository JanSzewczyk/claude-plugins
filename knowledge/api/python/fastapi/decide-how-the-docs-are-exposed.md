---
title: Turn off the built-in docs and openapi.json endpoints on a public API
summary: A public API publishes a static reference; /docs, /redoc and /openapi.json stay only behind network authentication.
impact: medium
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/metadata/#docs-urls]
---

## Rule

For a public API create the app with `docs_url=None, redoc_url=None, openapi_url=None` and publish the exported spec as a static site. Internal APIs may keep the defaults behind network authentication.

## Why

The default `/docs` and `/openapi.json` on a public host list every route, including internal ones, to anyone who asks.

## Incorrect

```python
app = FastAPI()
```

## Correct

```python
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
```
