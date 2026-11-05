---
title: Run an informational free-threaded Python job in CI before adopting that build
summary: The free-threaded build is supported (PEP 779) but exposes races the GIL hid; test it before switching services.
impact: low
applies: [python]
sources: [https://peps.python.org/pep-0779/]
---

## Rule

Add a CI job on the free-threaded build of the latest release (`3.15t`) that reports failures without blocking merges. Do not move production services to the free-threaded build until it is green and every native extension you ship or depend on declares thread safety.

## Why

The GIL hid many data races, and one extension that does not declare thread safety turns the GIL back on for the whole process, so the only way to learn this is to run the code.

## Incorrect

```python
# .github/workflows/ci.yml
matrix:
  python: ["3.15"]
```

## Correct

```python
# .github/workflows/ci.yml
matrix:
  python: ["3.15", "3.15t"]
  # 3.15t is informational: continue-on-error: true
```
