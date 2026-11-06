---
title: List every method of the path in the Allow header of a 405
summary: Starlette reports only the first matching route's methods, so the handler reads them from the OpenAPI paths.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9110#name-405-method-not-allowed, https://schemathesis.readthedocs.io/en/stable/reference/checks/, https://github.com/encode/starlette/blob/master/starlette/routing.py]
---

## Rule

In the `StarletteHTTPException` handler, answer a 405 with an `Allow` header built from the methods that the OpenAPI document lists for the request path, and keep `exc.headers` when the path is not documented.

## Why

With `GET /books` and `POST /books` registered as two routes, `DELETE /books` and `OPTIONS /books` get `Allow: POST`, which tells a client that listing is impossible, and Schemathesis reports the OPTIONS answer as a mismatch (ST205); excluding that check hides the bug instead of fixing it.

## Incorrect

```python
@app.exception_handler(StarletteHTTPException)
async def http_problem(request, exc):
    return problem(exc.status_code, str(exc.detail), headers=exc.headers)  # Allow: POST
```

## Correct

```python
def allowed_methods(request: Request) -> str | None:
    parts = request.url.path.strip("/").split("/")
    methods: set[str] = set()
    for template, operations in request.app.openapi()["paths"].items():
        template_parts = template.strip("/").split("/")
        if len(template_parts) == len(parts) and all(
            t.startswith("{") or t == p for t, p in zip(template_parts, parts)
        ):
            methods |= {m.upper() for m in operations}
    if "GET" in methods:
        methods.add("HEAD")
    return ", ".join(sorted(methods)) or None

@app.exception_handler(StarletteHTTPException)
async def http_problem(request, exc):
    headers = dict(exc.headers or {})
    if exc.status_code == 405 and (allow := allowed_methods(request)):
        headers["Allow"] = allow                      # GET, HEAD, POST
    return problem(exc.status_code, str(exc.detail), headers=headers)  # problem(): Problem Details note
```

## Exceptions

Do not walk `app.router.routes` instead: in current FastAPI `include_router` stores an included router as one entry without `methods`, so routes declared in feature modules would produce an empty header.
