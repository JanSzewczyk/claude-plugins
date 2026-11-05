---
title: Enable Ruff rule families gradually, starting from E, F, I, UP, B and S
summary: Begin with pycodestyle, Pyflakes, isort, pyupgrade, bugbear and security rules; add PTH, TC, FURB, TD one at a time.
impact: low
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/linter/, https://docs.astral.sh/ruff/configuration/]
---

## Rule

Select `E`, `F`, `I`, `UP`, `B` and `S` in `[tool.ruff.lint]`, which also sorts imports (`I`). Add `PTH`, `TC`, `FURB` and `TD` one family at a time, fixing the findings in the same change that enables each.

## Why

Turning on every family at once produces thousands of findings nobody reviews; this starter set is the team's judgement of what catches real bugs first, and `S` ports Bandit's security checks from day one.

## Incorrect

```toml
[tool.ruff.lint]
select = ["ALL"]
```

## Correct

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]
```

## Exceptions

`S` flags every `assert` (S101), so ignore that rule under `tests/`, as shown.
