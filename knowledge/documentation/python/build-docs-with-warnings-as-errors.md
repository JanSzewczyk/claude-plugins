---
title: Build the documentation in CI with warnings treated as errors
summary: sphinx-build -W -n or mkdocs build --strict turns a broken reference into a failed build.
impact: medium
applies: [python]
sources: [https://www.sphinx-doc.org/en/master/man/sphinx-build.html, https://www.mkdocs.org/user-guide/cli/#mkdocs-build]
---

## Rule

Build the docs in CI with `sphinx-build -W -n -b html docs docs/_build/html`, or `mkdocs build --strict`, so every warning fails the job.

## Why

A broken cross-reference or an unresolved docstring is only a warning by default, so it ships as a dead link on the published site.

## Incorrect

```bash
sphinx-build -b html docs docs/_build/html
```

## Correct

```bash
sphinx-build -W -n -b html docs docs/_build/html
```
