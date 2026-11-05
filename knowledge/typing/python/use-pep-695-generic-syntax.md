---
title: Declare generics and type aliases with PEP 695 syntax, not TypeVar and Generic
summary: class Box[T], def first[T] and type Maybe[T] = T | None replace TypeVar, Generic and TypeAlias.
impact: medium
applies: [python]
sources: [https://peps.python.org/pep-0695/]
---

## Rule

Declare generic classes and functions with the bracket syntax (`class Box[T]`, `def first[T]`) and aliases with the `type` statement (`type Maybe[T] = T | None`). Do not create a `TypeVar` or inherit from `Generic`.

## Why

The old forms need extra imports and a module-level variable whose scope is unclear, while the bracket syntax scopes the parameter to the declaration that uses it.

## Incorrect

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Box(Generic[T]):
    def get(self) -> T: ...
```

## Correct

```python
class Box[T]:
    def get(self) -> T: ...
```
