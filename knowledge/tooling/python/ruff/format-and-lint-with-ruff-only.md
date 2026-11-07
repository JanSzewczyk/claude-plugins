---
title: Use Ruff as the only formatter and linter
summary: Ruff replaces Black, Flake8 and isort; run it from the check target and nothing next to it.
impact: medium
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/formatter/, https://docs.astral.sh/ruff/linter/, https://docs.astral.sh/ruff/integrations/]
---

## Rule

Format with `ruff format` and lint with `ruff check`, configured in `pyproject.toml`; do not add Black, Flake8 or isort next to it. Run both from the project's `check` target, so the developer and CI run the same commands.

## Why

Two tools that format the same code disagree on edge cases and rewrite each other's output, so diffs fill with churn; one tool with one configuration removes the argument.

## Incorrect

```makefile
check:
	uv run black --check .
	uv run flake8 .
	uv run isort --check .
```

## Correct

```makefile
check:
	uv run ruff format --check .
	uv run ruff check .
```
