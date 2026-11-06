---
title: Name request and response schemas by their role, not by In and Out or a DTO suffix
summary: ItemCreate, ItemUpdate, ItemResponse: the name says the role in the operation, with one style per project.
impact: medium
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/sql-databases/, https://fastapi.tiangolo.com/tutorial/response-model/, https://jd-solanki.github.io/blog/the-ultimate-guide-to-naming-conventions-for-pydantic-schemas-in-fastapi]
---

## Rule

Name a Pydantic schema after its role in the operation: requests `ItemCreate`, `ItemUpdate`, `ItemPatch`; responses `ItemResponse` (or `ItemPublic` when it hides internal fields), and `ItemDetails` and `ItemListItem` when one entity has several views. Use `ItemInDB` only for an internal schema that adds fields such as `owner_id`. Pick one style for the project.

## Why

`ItemIn` and `ItemOut` say only which way the data flows, so a second response for the same entity (list versus details) has no good name, and a Pydantic model already is the DTO, so a `DTO` suffix repeats what the class is.

## Incorrect

```python
class ItemBase(BaseModel): ...
class ItemIn(ItemBase): ...      # in what operation?
class ItemOut(ItemBase): ...     # the list and the detail view need different shapes
```

## Correct

```python
class ItemCreate(BaseModel): ...
class ItemUpdate(BaseModel): ...
class ItemResponse(BaseModel): ...   # the one response of an entity
class ItemListItem(BaseModel): ...   # with several views: one row of the list
class ItemDetails(BaseModel): ...    # and the full view
class ItemInDB(ItemResponse):        # internal only: adds owner_id
    owner_id: int
```

## Exceptions

FastAPI itself has no naming convention: `UserIn` and `UserOut` in its response-model tutorial are example names. Do not rename the schemas of a stable API only for this rule; name the new ones by role. A team coming from Java or .NET may use `Request` and `Response` suffixes (`BookCreateRequest`, `BookResponse`), applied throughout.
