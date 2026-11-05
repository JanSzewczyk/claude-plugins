---
title: Declare the public API in __all__ of each package
summary: Without __all__ every name is public by accident, so renames break callers and API checks cannot tell what you promised.
impact: medium
applies: [python]
sources: [https://peps.python.org/pep-0008/#public-and-internal-interfaces]
---

## Rule

List the public names in `__all__` of each package's `__init__.py` and prefix every internal name with `_`.

## Why

Without `__all__` every imported name is public by accident, so a rename breaks callers and nobody can tell what you promised.

## Incorrect

```python
# mypkg/__init__.py
from mypkg.client import Client, build_session
```

## Correct

```python
# mypkg/__init__.py
from mypkg.client import Client

__all__ = ["Client"]
```
