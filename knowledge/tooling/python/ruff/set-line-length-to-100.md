---
title: Set Ruff's line length to 100 once, in pyproject.toml
summary: PEP 8 allows up to 99 with team agreement; 100 is our choice, set once so editors and CI agree.
impact: low
applies: [python, ruff]
sources: [https://peps.python.org/pep-0008/#maximum-line-length, https://docs.astral.sh/ruff/settings/#line-length]
---

## Rule

Set `line-length = 100` once in `[tool.ruff]`. The formatter wraps to it and the `E501` lint rule flags what it cannot wrap. Do not wrap lines by hand to reach it.

## Why

PEP 8 stops at 99 for teams that agree, so 100 is a deliberate team choice; without one value in the configuration the limit drifts per editor and reviews argue about wrapping instead of logic.

## Incorrect

```toml
[tool.ruff]
# line-length not set: the editor, CI and the docs each assume a different value
```

## Correct

```toml
[tool.ruff]
line-length = 100
```
