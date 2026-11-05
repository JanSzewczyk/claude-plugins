---
title: Manage dependencies and run commands through uv, from pyproject.toml
summary: uv add, uv sync and uv run keep the environment and the lockfile in step with pyproject.toml.
impact: high
applies: [python, uv]
sources: [https://docs.astral.sh/uv/concepts/projects/dependencies/, https://docs.astral.sh/uv/concepts/projects/sync/]
---

## Rule

Keep project configuration in `pyproject.toml`. Add dependencies with `uv add`, recreate the environment with `uv sync`, and run project commands with `uv run`.

## Why

Hand-edited requirements files and bare `python` calls make each machine resolve and run something different, which shows up as bugs that only reproduce on one laptop.

## Incorrect

```bash
pip install requests
python -m pytest
```

## Correct

```bash
uv add requests
uv run pytest
```
