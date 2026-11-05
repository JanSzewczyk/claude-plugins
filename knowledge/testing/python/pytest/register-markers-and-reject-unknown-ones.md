---
title: Register every marker and run pytest with --strict-markers
summary: A misspelled marker is only a warning, so -m "not slow" still runs the test you meant to exclude.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/mark.html#registering-marks]
---

## Rule

Register each custom marker in `pyproject.toml` and put `--strict-markers` in `addopts`.

## Why

A misspelled marker is only a warning, so `-m "not integration"` still runs the test you meant to leave out.

## Incorrect

```toml
[tool.pytest.ini_options]
addopts = "-ra"
```

## Correct

```toml
[tool.pytest.ini_options]
addopts = "-ra --strict-markers"
markers = ["integration: needs external services"]
```
