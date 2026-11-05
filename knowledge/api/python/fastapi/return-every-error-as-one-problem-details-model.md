---
title: Return every API error in one Problem Details model
summary: One RFC 9457 shape (type, title, status, detail) for all endpoints, declared in responses.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9457]
---

## Rule

Return all errors in one Pydantic model shaped after RFC 9457 (`type`, `title`, `status`, `detail`) reference it from `responses`, and register exception handlers so framework errors (`HTTPException`, `RequestValidationError`) use it too.

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
    title: str
    status: int
    detail: str | None = None

@app.exception_handler(HTTPException)
async def problem(request, exc):
    body = ProblemDetail(title=exc.detail, status=exc.status_code)
    return JSONResponse(body.model_dump(), exc.status_code,
                        media_type="application/problem+json")
```
