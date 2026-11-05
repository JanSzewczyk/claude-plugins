---
title: Set the line length to 100 and let the formatter enforce it
summary: PEP 8 allows more than 79 with team agreement; one team-wide value, enforced by ruff format, ends manual wrapping.
impact: low
applies: [python, ruff]
sources: [https://peps.python.org/pep-0008/#maximum-line-length, https://docs.astral.sh/ruff/settings/#line-length]
---

## Rule

Set `line-length = 100` once in `[tool.ruff]` and keep docstrings and comments within PEP 8's 72 characters where practical. Do not wrap lines by hand to reach it.

## Why

Without one agreed value the limit drifts per editor, and reviews argue about wrapping instead of logic.

## Incorrect

```python
# editor says 79, CI says 88, a colleague uses 120
[tool.ruff]
line-length = 88
```

## Correct

```python
[tool.ruff]
line-length = 100
```
