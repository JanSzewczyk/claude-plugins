---
title: Use the src/ layout for libraries and CLI tools
summary: src/package_name/ stops tests and tools from importing raw sources instead of the installed package.
impact: medium
applies: [python]
sources: [https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/]
---

## Rule

Put a library or CLI package under `src/<package_name>/`, not at the repository root.

## Why

In a flat layout the working directory comes first on the import path, so tests pass against uninstalled sources and a file missing from the built package is only discovered after release.

## Incorrect

```text
mypkg/
  __init__.py
tests/
```

## Correct

```text
src/
  mypkg/
    __init__.py
tests/
```

## Exceptions

Single scripts use PEP 723 inline metadata and `uv run script.py` instead of a package.
