---
title: Return every API error in one Problem Details model
summary: One RFC 9457 shape (type, title, status, detail) for all endpoints, declared in responses.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9457, https://fastapi.tiangolo.com/advanced/additional-responses/, https://schemathesis.readthedocs.io/en/stable/reference/checks/]
---

## Rule

Return all errors in one Pydantic model shaped after RFC 9457 (`type`, `title`, `status`, `detail`), reference it from `responses`, and register exception handlers so framework errors (`HTTPException`, `RequestValidationError`) use it too.

## Why

When each endpoint invents its own error body, every client needs a parser per endpoint.

## Incorrect

```python
return JSONResponse({"error": "no user"}, status_code=404)   # elsewhere: {"message": ...}
```

## Correct

```python
class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str                       # stable per status; the occurrence goes in detail
    status: int
    detail: str | None = None
    errors: list[dict] | None = None # field-level problems on 422

PROBLEM = {
    "model": ProblemDetail,
    "content": {"application/problem+json": {
        "schema": {"$ref": "#/components/schemas/ProblemDetail"}}},
}

def problem(status: int, detail: str, **extra) -> JSONResponse:
    body = ProblemDetail(title=HTTPStatus(status).phrase, status=status, detail=detail, **extra)
    return JSONResponse(body.model_dump(exclude_none=True), status,
                        media_type="application/problem+json")

@app.exception_handler(StarletteHTTPException)   # also the 404 and 405 the framework raises
async def http_problem(request, exc):
    return problem(exc.status_code, str(exc.detail))

@app.exception_handler(RequestValidationError)
async def validation_problem(request, exc):
    return problem(422, "The request did not pass validation.", errors=jsonable_encoder(exc.errors()))

@router.post("/cups", responses={409: PROBLEM, 422: PROBLEM})
def log_cup(...): ...
```

## Exceptions

A `media_type` key in `responses` is not read by FastAPI; the media type of an error goes in `content`. Without it the spec documents only `application/json` while the server sends `application/problem+json`, which Schemathesis reports as ST105.
