---
title: Use the src/ layout with a tests/ directory beside it for libraries and CLI tools
summary: src/package_name/ plus tests/ stops tests from importing raw sources instead of the installed package.
impact: medium
applies: [python]
sources: [https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/]
---

## Rule

Put a library or CLI package under `src/<package_name>/` and its tests in `tests/` next to `src/`. Create it with `uv init --lib` or `--package`.

## Why

In a flat layout the repository root is on `sys.path`, so tests pass against uninstalled sources and a missing file in the built package is only discovered after release.

## Incorrect

```python
mypkg/
  __init__.py
tests/
```

## Correct

```python
src/
  mypkg/
    __init__.py
tests/
```

## Exceptions

Single scripts use PEP 723 inline metadata and `uv run script.py`; move them into a project when they need a lockfile with hashes.
