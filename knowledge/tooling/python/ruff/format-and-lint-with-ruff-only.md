---
title: Use Ruff as the only formatter and linter
summary: Ruff replaces Black, Flake8 and isort; run it through pre-commit and nothing next to it.
impact: medium
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/formatter/, https://docs.astral.sh/ruff/linter/, https://docs.astral.sh/ruff/integrations/]
---

## Rule

Format with `ruff format` and lint with `ruff check`, configured in `pyproject.toml`; do not add Black, Flake8 or isort next to it. Run both as pre-commit hooks.

## Why

Two tools that format the same code disagree on edge cases and rewrite each other's output, so diffs fill with churn; one tool with one configuration removes the argument.

## Incorrect

```yaml
repos:
  - repo: https://github.com/psf/black
    hooks: [{id: black}]
  - repo: https://github.com/PyCQA/flake8
    hooks: [{id: flake8}]
  - repo: https://github.com/PyCQA/isort
    hooks: [{id: isort}]
```

## Correct

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
```
