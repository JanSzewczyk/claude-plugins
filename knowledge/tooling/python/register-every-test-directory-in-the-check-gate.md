---
title: Register every test directory in testpaths, the type checker and the check target
summary: A test directory outside the gate passes only when someone runs it by hand.
impact: high
applies: [python, pytest, ruff]
sources: [https://docs.pytest.org/en/stable/reference/reference.html#confval-testpaths, https://docs.astral.sh/ruff/settings/#lint_isort_known-first-party]
---

## Rule

List each test directory in `testpaths`, in the type checker's `files` and in the `check` target. A directory outside the package also gets an `__init__.py` and a `known-first-party` entry in Ruff's isort settings, so `from tests_extra.conftest import ...` resolves the same way for pytest, mypy and Ruff.

## Why

A test directory missing from the gate passes only when someone runs it by hand: 97 contract tests sat outside `make check` and CI, and nobody noticed.

## Incorrect

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]          # tests_contract/ is never run by make check

[tool.mypy]
files = ["src", "tests"]
```

## Correct

```toml
[tool.pytest.ini_options]
testpaths = ["tests", "tests_contract"]

[tool.mypy]
files = ["src", "tests", "tests_contract"]

[tool.ruff.lint.isort]
known-first-party = ["myapp", "tests", "tests_contract"]   # each with an __init__.py
```

## Exceptions

A suite that is too slow for every push (load tests, a nightly fuzz run) may live outside the gate; give it its own named make target and a scheduled CI job, so it is run on purpose.
