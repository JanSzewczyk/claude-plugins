---
title: Measure branch coverage and never lower an existing fail_under
summary: branch = true catches the else that never ran; lowering the threshold to go green stops guarding.
impact: medium
applies: [python, pytest]
sources: [https://coverage.readthedocs.io/en/latest/config.html]
---

## Rule

Set `branch = true`. If the project has a `fail_under`, treat it as a regression guard: raise it when coverage rises and never lower it to make CI pass. Justify every `# pragma: no cover` in a comment.

## Why

Line coverage counts an `if` as covered when only one branch ran, and a threshold lowered to make CI pass no longer guards anything.

## Incorrect

```toml
[tool.coverage.report]
fail_under = 60   # was 85, lowered to pass
```

## Correct

```toml
[tool.coverage.run]
branch = true

[tool.coverage.report]
fail_under = 85
```

## Exceptions

An application that follows `testing/strategy/principles/cover-use-cases-not-lines` sets no percentage target: it keeps `branch = true` and omits `fail_under`.
