---
title: Start the Ruff rule set at E, F, I, UP, B and S and add families gradually
summary: Begin with pycodestyle, Pyflakes, isort, pyupgrade, bugbear and security rules; add PTH, TC, FURB, TD later.
impact: low
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/rules/]
---

## Rule

Select `E`, `F`, `I`, `UP`, `B` and `S` in `[tool.ruff.lint]`. Add `PTH`, `TC`, `FURB` and `TD` one family at a time, fixing the findings in the same change that enables each.

## Why

Turning on every family at once produces thousands of findings nobody reviews, while `S` (a port of Bandit) catches hard-coded passwords, `yaml.load`, `shell=True` and weak hashes from day one.

## Incorrect

```python
[tool.ruff.lint]
select = ["ALL"]
```

## Correct

```python
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S"]
```
