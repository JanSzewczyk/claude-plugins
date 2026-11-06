---
title: Return only loc, msg and type for each validation error
summary: exc.errors() includes the submitted input; copy three fields so a 422 does not echo it back.
impact: high
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/handling-errors/, https://pydantic.dev/docs/validation/latest/errors/errors/]
---

## Rule

In the `RequestValidationError` handler build the `errors` list from `loc`, `msg` and `type` of each item, and return neither `input`, `ctx` nor `exc.body`.

## Why

`exc.errors()` carries the value the client submitted, so a handler that serialises it whole sends a rejected password or token back in the response body; `ctx` is dropped too because it holds the constraint values and objects of the failed check, which are not for clients.

## Incorrect

```python
errors=jsonable_encoder(exc.errors())
# {"loc": ["body", "password"], "msg": "String should have at least 8 characters",
#  "input": "hunter2", "ctx": {"min_length": 8}, ...}
```

## Correct

```python
errors=[{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
```

## Exceptions

A custom validator that puts the value in its message (`raise ValueError(f"{v} not allowed")`) leaks it through `msg`; word such messages without the value.
