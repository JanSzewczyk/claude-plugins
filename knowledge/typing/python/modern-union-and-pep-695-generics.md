---
title: Write annotations with X | None and PEP 695 generic syntax
summary: Use X | None instead of Optional[X]; class Box[T], def first[T]() and type aliases replace TypeVar and Generic.
impact: medium
applies: [python]
sources: [https://peps.python.org/pep-0604/, https://peps.python.org/pep-0695/]
---

## Rule

Write unions as `X | None`, never `Optional[X]`. Declare generics with `class Box[T]`, `def first[T]` and `type Maybe[T] = T | None` instead of `TypeVar` and `Generic`. Do not quote forward references, because annotations are evaluated lazily. Let `ruff` rules `UP040`, `UP046` and `UP047` rewrite old syntax.

## Why

The old forms need extra imports and quoting that carry no information, and PEP 695 syntax needs no imports at all.

## Incorrect

```python
from typing import Generic, Optional, TypeVar
T = TypeVar("T")
class Box(Generic[T]):
    def get(self) -> Optional[T]: ...
```

## Correct

```python
class Box[T]:
    def get(self) -> T | None: ...
```
