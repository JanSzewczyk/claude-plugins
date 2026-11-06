---
title: Mark an endpoint deprecated and send Deprecation and Sunset headers before removing it
summary: deprecated=True shows in the spec; the headers tell machine clients when it goes away.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9745, https://www.rfc-editor.org/rfc/rfc8594]
---

## Rule

Before removing an endpoint, set `deprecated=True` on the route and send `Deprecation` and `Sunset` headers. Remove it only in a new API version.

## Why

A client that never heard of the removal finds out when its calls start failing in production.

## Incorrect

```python
# v2: the /v1/users route is simply gone
```

## Correct

```python
@router.get("/v1/users/{user_id}", deprecated=True)
async def get_user_v1(user_id: int, response: Response) -> UserResponse:
    response.headers["Deprecation"] = "@1767225600"
    response.headers["Sunset"] = "Thu, 01 Jul 2027 00:00:00 GMT"
    ...
```
