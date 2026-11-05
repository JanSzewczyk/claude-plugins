---
title: Make optional parameters of public functions keyword-only
summary: Put optional parameters after a bare * so they can be added or reordered without breaking callers.
impact: medium
applies: [python]
sources: [https://peps.python.org/pep-3102/, https://mkdocstrings.github.io/griffe/guide/users/checking/]
---

## Rule

In public functions and methods, put optional parameters after a bare `*`.

## Why

Positional optional parameters freeze their order, so adding or reordering one breaks every caller that passed them by position; keyword-only ones leave the signature free to grow.

## Incorrect

```python
def retry(func, attempts=3, delay=0.5): ...

retry(job, 5, 1.0)
```

## Correct

```python
def retry(func, *, attempts=3, delay=0.5): ...

retry(job, attempts=5, delay=1.0)
```
