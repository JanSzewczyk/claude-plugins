---
title: Define the check commands once in a Makefile that wraps uv run
summary: One check target runs format check, lint, type check and tests, so the README, CI and the developer run the same thing.
impact: low
applies: [python, uv]
sources: [https://docs.astral.sh/uv/concepts/projects/run/]
---

## Rule

Put the check commands in one `check` target of a `Makefile` whose recipes only call `uv run ...`: the format check, the linter, the type checker and the tests. The README and CI call `make check`; CI installs with `uv sync --locked` before it.

## Why

When the README, CI and the developer each spell out the commands, they drift apart, and CI passes a check nobody runs locally or the reverse.

## Incorrect

```make
test:
	pytest
```

## Correct

```make
.PHONY: install check

install:
	uv sync

check:
	uv run ruff format --check
	uv run ruff check
	uv run mypy
	uv run pytest
```

## Exceptions

A project that already uses another task runner (`just`, `nox`, `poethepoet`) keeps it; the commands still live in one place and CI calls that runner.
