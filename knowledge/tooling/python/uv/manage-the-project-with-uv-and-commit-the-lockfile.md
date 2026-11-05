---
title: Manage dependencies with uv from pyproject.toml and commit uv.lock and .python-version
summary: uv add, uv sync and uv run; CI uses uv sync --locked so a stale lockfile fails the build.
impact: high
applies: [python, uv]
sources: [https://docs.astral.sh/uv/concepts/projects/]
---

## Rule

Keep all configuration in `pyproject.toml`. Add dependencies with `uv add`, recreate the environment with `uv sync`, and run project commands with `uv run`. Commit `uv.lock` and `.python-version`; in CI run `uv sync --locked`.

## Why

Hand-edited requirements files and bare `python` calls make each machine resolve and run something different, which shows up as bugs that only reproduce on one laptop.

## Incorrect

```python
pip install requests
python -m pytest
```

## Correct

```python
uv add requests
uv run pytest
```
