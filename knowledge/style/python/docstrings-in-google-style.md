---
title: Write docstrings for public API in Google style without repeating annotated types
summary: PEP 257 sets the shape; Google style (Args, Returns, Raises) gives sections, and the signature already states types.
impact: low
applies: [python]
sources: [https://peps.python.org/pep-0257/]
---

## Rule

Give every module, public function, class and public method a docstring in triple double quotes. Use an imperative one-line summary ending in a period; add a blank line and Google-style sections (`Args`, `Returns`, `Raises`) when behaviour needs them. Do not repeat types that the annotations already state. Comments explain why, not what.

## Why

PEP 257 does not prescribe sections, so each author invents a layout, and types copied into docstrings go stale the first time a signature changes.

## Incorrect

```python
def root(path):
    """Returns the root path.

    Args:
        path (str): the path
    """
```

## Correct

```python
def root(path: str) -> Path:
    """Return the root of ``path``.

    Args:
        path: Location to resolve.

    Raises:
        ValueError: If ``path`` is empty.
    """
```
