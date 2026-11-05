---
title: Run an informational free-threaded Python job in CI before adopting that build
summary: The free-threaded build is supported (PEP 779) but exposes races the GIL hid; run it as a non-blocking CI job first.
impact: low
applies: [python]
sources: [https://peps.python.org/pep-0779/]
---

## Rule

Add a CI job on the free-threaded build of the latest release (`3.15t`) that reports failures without blocking merges, and read its results before moving any service to that build.

## Why

The GIL hid many data races, so code that passes on the regular build can fail on the free-threaded one, and the only way to learn this early is to run the tests there.

## Incorrect

```yaml
# .github/workflows/ci.yml
strategy:
  matrix:
    python: ["3.15"]
```

## Correct

```yaml
# .github/workflows/ci.yml
strategy:
  matrix:
    python: ["3.15"]
    include:
      - python: "3.15t"
        experimental: true
continue-on-error: ${{ matrix.experimental == true }}
```

## Exceptions

A second job on the free-threaded build of the same latest release is not a compatibility matrix for older interpreters, so it does not conflict with using only the latest Python.
