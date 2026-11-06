---
title: Add a CI workflow that installs from the lockfile and runs the check suite
summary: A workflow on push and pull_request runs uv sync --locked, then the one check command, so every change is checked.
impact: medium
applies: [python, uv]
sources: [https://docs.astral.sh/uv/guides/integration/github/]
---

## Rule

A new project on GitHub ships `.github/workflows/ci.yml` that runs on `push` and `pull_request`, installs uv with `astral-sh/setup-uv` at a pinned uv version, runs `uv sync --locked`, then runs the project's single check command (`make check`, see the Makefile note).

## Why

Checks that only run on the author's machine are skipped under deadline, so a broken main branch is the first sign that a rule was never enforced.

## Incorrect

```yaml
on: push
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt && pytest
```

## Correct

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: astral-sh/setup-uv@v9
        with:
          version: "0.13.6"
      - run: uv sync --locked
      - run: make check
```

## Exceptions

A project without a Makefile lists the check commands directly after `uv sync --locked`. A project that is not on GitHub keeps the same steps in its own CI system.
