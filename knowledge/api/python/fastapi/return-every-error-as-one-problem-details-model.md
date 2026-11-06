---
title: Return every API error in one Problem Details model
summary: One RFC 9457 shape (type, title, status, detail) for all endpoints, declared in responses.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9457, https://fastapi.tiangolo.com/advanced/additional-responses/, https://fastapi.tiangolo.com/tutorial/handling-errors/]
---

## Rule

Return all errors in one Pydantic model shaped after RFC 9457 (`type`, `title`, `status`, `detail`), reference it from `responses` through `content` with the `application/problem+json` media type, and register exception handlers so framework errors (`HTTPException`, `RequestValidationError`) use it too.

## Why

When each endpoint invents its own error body, every client needs a parser per endpoint, and a spec that documents `application/json` for a body the server sends as `application/problem+json` misleads generated clients.

## Incorrect

```python
return JSONResponse({"error": "no user"}, status_code=404)   # elsewhere: {"message": ...}
```

## Correct

```python
class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str                       # stable per problem type; the occurrence goes in detail
    status: int
    detail: str | None = None
    errors: list[dict] | None = None # field-level problems on 422

# FastAPI reads `content`, not a `media_type` key, from a responses entry
PROBLEM = {
    "model": ProblemDetail,
    "content": {"application/problem+json": {
        "schema": {"$ref": "#/components/schemas/ProblemDetail"}}},
}

def problem(status: int, detail: str, headers=None, *, type: str = "about:blank",
            title: str | None = None, **extra) -> JSONResponse:
    if title is None:
        try:
            title = HTTPStatus(status).phrase
        except ValueError:
            title = "Error"
    body = ProblemDetail(type=type, title=title, status=status, detail=detail, **extra)
    return JSONResponse(body.model_dump(exclude_none=True), status, headers=headers,
                        media_type="application/problem+json")

@app.exception_handler(StarletteHTTPException)   # also the 404 and 405 the framework raises
async def http_problem(request, exc):
    return problem(exc.status_code, str(exc.detail), headers=exc.headers)  # 405: see the Allow note

@app.exception_handler(RequestValidationError)
async def validation_problem(request, exc):
    errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return problem(422, "The request did not pass validation.", errors=errors)  # only loc, msg, type: see the validation-errors note

@router.post("/cups", responses={409: PROBLEM, 422: PROBLEM})
def log_cup(...): ...
```

## Exceptions

FastAPI 0.162 lists `application/json` next to the `application/problem+json` entry because of `model` (checked by generating the spec). The server never sends that type, so remove it in a custom `app.openapi` function that is cached and set on the app, so the CI export stays `app.openapi()`, and assert in a test that no error response lists `application/json`. Re-check after a FastAPI upgrade.

If a status needs a typed subclass of `ProblemDetail` (a 422 with a typed `errors` list), give it its own `$ref` under `application/problem+json`. Never leave that entry as `{}`: it documents no schema, so generated clients cannot type the error body.
