---
title: Give every endpoint a response model and list its real error statuses in responses
summary: response_model filters and documents the output; responses puts 401, 404, 409 into the spec.
impact: high
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/response-model/, https://fastapi.tiangolo.com/advanced/additional-responses/]
---

## Rule

Declare `response_model` (or a return annotation) on every endpoint and list every error status it can return in `responses`, with the error model.

## Why

Without a response model nothing filters the output, so an ORM object leaks columns such as password hashes, and undeclared errors are missing from the spec, so generated clients cannot handle them.

## Incorrect

```python
@router.get("/{user_id}")
async def get_user(user_id: int):
    return await db.get(User, user_id)
```

## Correct

```python
@router.get(
    "/{user_id}",
    response_model=UserOut,
    responses={404: {"model": ProblemDetail}},
)
async def get_user(user_id: int) -> UserOut: ...
```
