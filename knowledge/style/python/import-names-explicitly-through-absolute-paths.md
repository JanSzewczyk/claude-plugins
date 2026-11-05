---
title: Import names explicitly through absolute paths, never with a star
summary: Prefer absolute imports and never from module import *, so every name has a visible origin.
impact: low
applies: [python]
sources: [https://peps.python.org/pep-0008/#imports]
---

## Rule

Import the names you use, spelled with their absolute module path, and never write `from module import *`. Sorting and grouping imports is left to the formatter and linter.

## Why

A star import hides where a name comes from, so readers and linters cannot tell a typo from a real symbol, and a relative path breaks when the file moves.

## Incorrect

```python
from .helpers import *
```

## Correct

```python
from myapp.helpers import slugify
```

## Exceptions

Explicit relative imports are acceptable inside a complex package layout, where PEP 8 allows them.
