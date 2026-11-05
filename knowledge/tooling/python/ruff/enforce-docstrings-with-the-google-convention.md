---
title: Enforce docstrings with Ruff D rules set to the Google convention
summary: convention = "google" switches off the D rules that contradict each other; tests are exempt.
impact: low
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/rules/#pydocstyle-d, https://docs.astral.sh/ruff/settings/#lint_pydocstyle_convention]
---

## Rule

Add `D` to the selected Ruff rule families, set `[tool.ruff.lint.pydocstyle] convention = "google"`, and ignore `D` under `tests/`.

## Why

Without a convention the `D` families include NumPy-style section rules (D406-D409) that reject Google sections, plus mutually exclusive pairs; the convention selects one consistent set. It does not enforce the imperative mood (D401), so reviewers check that.

## Incorrect

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S", "D"]
```

## Correct

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S", "D"]

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101", "D"]
```
