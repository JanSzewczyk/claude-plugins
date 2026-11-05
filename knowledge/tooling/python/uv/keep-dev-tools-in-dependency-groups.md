---
title: Keep developer tools in [dependency-groups], not in optional-dependencies extras
summary: PEP 735 groups are not published to PyPI; extras are, and become part of the public API.
impact: medium
applies: [python, uv]
sources: [https://peps.python.org/pep-0735/]
---

## Rule

Declare test, lint and docs tools under `[dependency-groups]` (PEP 735) and add them with `uv add --dev` or `--group`. Use `[project.optional-dependencies]` only for features users can opt into.

## Why

Extras travel with the published package, so `pip install pkg[dev]` becomes a promise you must keep, while groups stay in the repository.

## Incorrect

```python
[project.optional-dependencies]
dev = ["pytest", "ruff"]
```

## Correct

```python
[dependency-groups]
dev = ["pytest", "ruff"]
```
