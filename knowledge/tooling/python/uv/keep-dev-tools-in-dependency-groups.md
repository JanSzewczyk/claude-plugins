---
title: Keep developer tools in [dependency-groups], not in optional-dependencies extras
summary: PEP 735 groups are left out of built distributions; extras are published and become part of the public API.
impact: medium
applies: [python, uv]
sources: [https://peps.python.org/pep-0735/, https://docs.astral.sh/uv/concepts/projects/dependencies/]
---

## Rule

Declare test, lint and docs tools under `[dependency-groups]` (PEP 735) and add them with `uv add --dev` or `--group`. Use `[project.optional-dependencies]` only for features users can opt into.

## Why

Extras travel with the published package, so `pip install pkg[dev]` becomes a promise you must keep, while groups stay in the repository.

## Incorrect

```toml
[project.optional-dependencies]
dev = ["pytest", "ruff"]
```

## Correct

```toml
[dependency-groups]
dev = ["pytest", "ruff"]
```
