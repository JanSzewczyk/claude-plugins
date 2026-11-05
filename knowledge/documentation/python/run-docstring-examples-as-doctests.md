---
title: Write docstring examples as doctests and run them in CI
summary: An example nobody executes goes stale; pytest --doctest-modules turns it into a test.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/doctest.html]
---

## Rule

Write the `Example` section of a docstring as a doctest and run `pytest --doctest-modules src/` in CI.

## Why

An example that is never executed keeps showing output the function stopped producing after the next change.

## Incorrect

```python
def double(x: int) -> int:
    """Return twice ``x``.

    Example:
        double(2) returns 5
    """
```

## Correct

```python
def double(x: int) -> int:
    """Return twice ``x``.

    Example:
        >>> double(2)
        4
    """
```
