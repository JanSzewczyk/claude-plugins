---
title: Register every test directory in testpaths and in the type checker's files
summary: A test directory that testpaths and the type checker do not list is skipped by make check.
impact: high
applies: [python, pytest, ruff, mypy]
sources: [https://docs.pytest.org/en/stable/reference/reference.html#confval-testpaths, https://docs.astral.sh/ruff/settings/#lint_isort_known-first-party]
---

## Rule

List each test directory in pytest's `testpaths` and in mypy's `files`, so the bare `pytest` and `mypy` calls in `make check` cover it (a `check` recipe that passes explicit paths needs the directory there too). A directory outside the package also gets an `__init__.py` and a `known-first-party` entry in Ruff's isort settings, so `from tests_e2e.conftest import ...` resolves the same way for pytest, mypy and Ruff.

## Why

A test directory missing from the gate passes only when someone runs it by hand: a whole second suite of 97 tests sat outside `make check` and CI, and nobody noticed.

## Incorrect

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]          # tests_e2e/ is never run by make check

[tool.mypy]
files = ["src", "tests"]
```

## Correct

```toml
[tool.pytest.ini_options]
testpaths = ["tests", "tests_e2e"]

[tool.mypy]
files = ["src", "tests", "tests_e2e"]

[tool.ruff.lint.isort]
known-first-party = ["myapp", "tests", "tests_e2e"]   # each with an __init__.py
```

## Exceptions

A suite that is too slow for every push (load tests, a nightly fuzz run) may live outside the gate; give it its own named make target and a scheduled CI job, so it is run on purpose. Do not open a second directory for ordinary tests: add them to the existing suite, see `testing/python/pytest/add-tests-to-the-existing-suite-by-topic`.
