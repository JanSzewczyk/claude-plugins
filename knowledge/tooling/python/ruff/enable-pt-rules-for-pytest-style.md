---
title: Enable Ruff PT rules to keep pytest tests in one style
summary: PT011, PT012 and PT018 catch too-broad raises, multi-statement raises blocks and compound asserts.
impact: low
applies: [python, ruff, pytest]
sources: [https://docs.astral.sh/ruff/rules/#flake8-pytest-style-pt]
---

## Rule

Add `PT` to the selected Ruff families so tests follow pytest's own style.

## Why

Without `PT` nothing flags a too-broad `pytest.raises` (PT011), a block with several statements (PT012) or a compound assert (PT018); the family also enforces pytest's fixture and parametrize conventions.

## Incorrect

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S"]
```

## Correct

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S", "PT"]
```
