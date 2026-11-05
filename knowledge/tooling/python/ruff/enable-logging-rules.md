---
title: Enable Ruff rules that enforce logging conventions: G, LOG, T20, TRY400, TRY401
summary: They flag f-strings in log calls, root-logger use, print() and exception logging that drops the traceback.
impact: low
applies: [python, ruff]
sources: [https://docs.astral.sh/ruff/rules/logging-f-string/, https://docs.astral.sh/ruff/rules/error-instead-of-exception/, https://docs.astral.sh/ruff/rules/verbose-log-message/, https://docs.astral.sh/ruff/rules/print/]
---

## Rule

Add `G`, `LOG`, `T20`, `TRY400` and `TRY401` to the selected Ruff rules.

## Why

Without `G` and `LOG` an f-string in `logger.info` or a root-logger call passes review, and without `T20` a stray `print()` reaches production.

## Incorrect

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S"]
```

## Correct

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "S", "G", "LOG", "T20", "TRY400", "TRY401"]
```

## Exceptions

Command-line entry points whose purpose is to print their result ignore `T201` in `per-file-ignores`.
