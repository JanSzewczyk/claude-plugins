---
title: Write optional types as X | None, never Optional[X]
summary: The PEP 604 union operator needs no import and reads the same in every annotation.
impact: low
applies: [python]
sources: [https://peps.python.org/pep-0604/]
---

## Rule

Write unions with `|`, such as `X | None`, and do not import `Optional` or `Union` from `typing`.

## Why

`Optional[X]` needs an import and reads as if the argument were optional, while `X | None` states the type itself and works in every annotation.

## Incorrect

```python
from typing import Optional

def find(name: str) -> Optional[User]: ...
```

## Correct

```python
def find(name: str) -> User | None: ...
```
