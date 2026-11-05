---
title: Group imports as stdlib, third party, local; use absolute imports and no star imports
summary: One import per line at the top of the file, three blank-line-separated groups, never from x import *.
impact: low
applies: [python]
sources: [https://peps.python.org/pep-0008/#imports]
---

## Rule

Place imports at the top of the module after the docstring, one per line, in three groups separated by a blank line: standard library, third party, local. Use absolute imports and never `from module import *`.

## Why

A star import hides where a name comes from, so readers and linters cannot tell a typo from a real symbol.

## Incorrect

```python
from os import *
import sys, json
from .helpers import slugify
```

## Correct

```python
import json
import sys

from myapp.helpers import slugify
```
