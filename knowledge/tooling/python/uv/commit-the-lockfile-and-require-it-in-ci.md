---
title: Commit uv.lock and make CI fail when it is out of date
summary: A committed uv.lock plus uv sync --locked in CI makes a stale lockfile fail the build.
impact: high
applies: [python, uv]
sources: [https://docs.astral.sh/uv/concepts/projects/layout/, https://docs.astral.sh/uv/concepts/projects/sync/]
---

## Rule

Commit `uv.lock` to version control. In CI install with `uv sync --locked`, which raises an error instead of updating a lockfile that no longer matches `pyproject.toml`.

## Why

Without the check, CI silently re-resolves dependencies, so the build tests versions nobody committed and a change to `pyproject.toml` can ship without its lockfile update.

## Incorrect

```yaml
- run: uv sync
```

## Correct

```yaml
- run: uv sync --locked
```
