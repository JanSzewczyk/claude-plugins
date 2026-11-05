---
title: Set operation_id explicitly so generated SDK method names stay stable
summary: The default id is built from the function and path, so a rename changes every client method name.
impact: medium
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/advanced/path-operation-advanced-configuration/, https://fastapi.tiangolo.com/advanced/generate-clients/]
---

## Rule

Set `operation_id` on each route, or give the app one `generate_unique_id_function` that derives it from something you do not rename.

## Why

SDK generators name client methods after the operation id; the default (`get_user_v1_users__user_id__get`) changes with the path or function name, so a refactor breaks client code.

## Incorrect

```python
@router.get("/{user_id}")
async def get_user(user_id: int): ...
```

## Correct

```python
@router.get("/{user_id}", operation_id="get_user")
async def get_user(user_id: int): ...
```
