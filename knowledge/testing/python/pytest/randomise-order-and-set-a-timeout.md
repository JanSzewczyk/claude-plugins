---
title: Install pytest-randomly and pytest-timeout so hidden coupling and hangs fail loudly
summary: Random order exposes order dependence and a global timeout stops a hung test from stalling CI.
impact: medium
applies: [python, pytest]
implements: testing/principles/tests-pass-alone-in-any-order
sources: [https://github.com/pytest-dev/pytest-randomly, https://github.com/pytest-dev/pytest-timeout]
---

## Rule

Add `pytest-randomly` and `pytest-timeout` to the test dependency group and set a global `timeout` in the pytest configuration.

## Why

A test that only passes in file order, or hangs on a missing mock, passes on the author's machine and stalls CI for everyone else.

## Incorrect

```toml
[dependency-groups]
test = ["pytest"]
```

## Correct

```toml
[dependency-groups]
test = ["pytest", "pytest-randomly", "pytest-timeout"]

[tool.pytest.ini_options]
timeout = 60
```
