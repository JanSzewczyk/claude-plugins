---
title: Use Ruff as the only formatter and linter, and sort imports with its I rules
summary: Ruff replaces Black, Flake8, isort, pydocstyle and pyupgrade; run it in pre-commit and CI.
impact: medium
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/formatter/, https://docs.astral.sh/ruff/linter/]
---

## Rule

Format with `ruff format` and lint with `ruff check`, configured in `pyproject.toml`; do not add Black, Flake8 or isort next to it. Enable the `I` rules to sort imports, because the formatter does not. Run both through pre-commit hooks (`ruff-check --fix`, `ruff-format`) and in CI.

## Why

Two tools that format the same code disagree on edge cases and rewrite each other's output, so diffs fill with churn; one tool with one configuration removes the argument.

## Incorrect

```python
# pyproject.toml
[tool.black]
line-length = 88
[tool.isort]
profile = "black"
[tool.flake8]
max-line-length = 88
```

## Correct

```python
# pyproject.toml
[tool.ruff]
line-length = 100
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S"]
```
