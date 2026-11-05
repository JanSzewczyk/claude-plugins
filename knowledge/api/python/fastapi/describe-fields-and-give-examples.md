---
title: Describe every field and parameter of a public model and add an example
summary: Field(description=..., examples=[...]) and Path/Query(description=...) reach the spec and the generated docs.
impact: low
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/schema-extra-example/, https://fastapi.tiangolo.com/tutorial/path-params-numeric-validations/]
---

## Rule

In every request and response model, give fields `Field(description=..., examples=[...])`, and describe path and query parameters through `Path` and `Query`.

## Why

The generated docs show only names and types, so consumers guess units, formats and allowed values.

## Incorrect

```python
class UserOut(BaseModel):
    id: int
    email: str
```

## Correct

```python
class UserOut(BaseModel):
    id: int = Field(description="Unique user identifier.", examples=[1])
    email: str = Field(description="Primary e-mail address.", examples=["ada@example.com"])
```
