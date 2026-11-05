---
title: Generate the OpenAPI document from the FastAPI app and never edit it by hand
summary: The app and its Pydantic models are the one source; export with app.openapi() in CI.
impact: high
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/metadata/, https://fastapi.tiangolo.com/reference/fastapi/#fastapi.FastAPI.openapi]
---

## Rule

Treat the FastAPI app and its Pydantic models as the only source of the OpenAPI document. Export it in CI with `app.openapi()` and never edit the exported file.

## Why

A hand-edited spec drifts from the code, so clients and docs generated from it call endpoints that no longer behave that way.

## Incorrect

```bash
vim openapi.json   # fix the schema by hand
```

## Correct

```bash
python -c "import json; from myapp.main import app; print(json.dumps(app.openapi()))" > openapi.json
```
